package com.autodub.cloud.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.autodub.cloud.AutoDubApplication
import com.autodub.cloud.R
import com.autodub.cloud.audio.ExoDubPlayer
import com.autodub.cloud.data.remote.dto.ContextTurnDto
import com.autodub.cloud.data.repository.CloudResult
import com.autodub.cloud.ocr.DialogChangeDetector
import com.autodub.cloud.ocr.MlKitOcrEngine
import com.autodub.cloud.ocr.RoiCropper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class ScreenCaptureService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var scanJob: Job? = null

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null

    private val ocrEngine = MlKitOcrEngine()
    private val changeDetector = DialogChangeDetector()
    private lateinit var dubPlayer: ExoDubPlayer
    private val contextHistory = mutableListOf<ContextTurnDto>()

    override fun onCreate() {
        super.onCreate()
        dubPlayer = ExoDubPlayer(this)
        createNotificationChannel()

        serviceScope.launch {
            dubPlayer.isPlaying.collect { playing ->
                PipelineStateBus.update { it.copy(isPlayingAudio = playing) }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopCapture()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_TOGGLE_MUTE -> {
                serviceScope.launch {
                    val nextMuted = !dubPlayer.isMuted.value
                    dubPlayer.setMuted(nextMuted)
                    PipelineStateBus.update { it.copy(isMuted = nextMuted) }
                }
                return START_STICKY
            }
        }

        startForeground(NOTIFICATION_ID, buildNotification("Memindai dialog Visual Novel..."))
        startCapturePipeline()
        return START_STICKY
    }

    private fun startCapturePipeline() {
        val resultData = MediaProjectionHolder.resultData
        if (!MediaProjectionHolder.hasGrant() || resultData == null) {
            PipelineStateBus.update {
                it.copy(
                    isScanning = false,
                    statusMessage = "Izin MediaProjection belum diberikan."
                )
            }
            stopSelf()
            return
        }

        val projectionManager =
            getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        val projection = projectionManager.getMediaProjection(
            MediaProjectionHolder.resultCode,
            resultData
        )
        mediaProjection = projection

        val metrics = resources.displayMetrics
        val width = metrics.widthPixels.coerceAtLeast(720)
        val height = metrics.heightPixels.coerceAtLeast(1280)
        val density = metrics.densityDpi

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        virtualDisplay = projection.createVirtualDisplay(
            "AutoDubCaptureDisplay",
            width,
            height,
            density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader!!.surface,
            null,
            null
        )

        PipelineStateBus.update {
            it.copy(
                isScanning = true,
                isOfflineError = false,
                statusMessage = "Scanner aktif — membaca ROI 1 & ROI 2 secara lokal"
            )
        }

        scanJob?.cancel()
        scanJob = serviceScope.launch {
            val app = application as AutoDubApplication
            val repo = app.repository
            changeDetector.reset()

            while (isActive) {
                val roiConfig = repo.getRoiConfig()
                val settings = repo.getSettings()
                changeDetector.updateThreshold(roiConfig.changeThreshold)

                val frameBitmap = acquireLatestBitmap()
                if (frameBitmap != null) {
                    try {
                        val cropped = RoiCropper.cropBoth(frameBitmap, roiConfig)
                        val capture = ocrEngine.recognizeRois(cropped)
                        cropped.speakerBitmap.recycle()
                        cropped.dialogBitmap.recycle()

                        if (changeDetector.shouldProcess(capture.speakerName, capture.dialogText)) {
                            processDetectedDialogue(
                                speakerRaw = capture.speakerName,
                                dialogRaw = capture.dialogText,
                                autoPlay = settings.autoPlayDub
                            )
                        }
                    } catch (e: Exception) {
                        PipelineStateBus.update {
                            it.copy(statusMessage = "OCR error: ${e.localizedMessage ?: "unknown"}")
                        }
                    } finally {
                        frameBitmap.recycle()
                    }
                }

                delay(roiConfig.scanIntervalMs.coerceIn(400L, 4000L))
            }
        }
    }

    private suspend fun processDetectedDialogue(
        speakerRaw: String,
        dialogRaw: String,
        autoPlay: Boolean
    ) {
        val app = application as AutoDubApplication
        val repo = app.repository

        val characterProfile = repo.resolveCharacterOrNarrator(speakerRaw)
        val speakerDisplay = if (speakerRaw.isNotBlank()) speakerRaw else characterProfile.characterName

        if (!repo.isOnlineFlow.value) {
            PipelineStateBus.update {
                it.copy(
                    isOfflineError = true,
                    activeSpeaker = speakerDisplay,
                    originalDialog = dialogRaw,
                    statusMessage = "Offline: Koneksi internet terputus. Permintaan cloud dihentikan."
                )
            }
            return
        }

        PipelineStateBus.update {
            it.copy(
                isOfflineError = false,
                activeSpeaker = speakerDisplay,
                activeVoiceLabel = "${characterProfile.voiceId} (${characterProfile.emotion})",
                originalDialog = dialogRaw,
                statusMessage = "Menerjemahkan dialog via Gemini Cloud..."
            )
        }

        when (val translation = repo.translateDialogue(dialogRaw, speakerDisplay, contextHistory)) {
            is CloudResult.Offline -> {
                PipelineStateBus.update {
                    it.copy(
                        isOfflineError = true,
                        statusMessage = translation.message
                    )
                }
            }
            is CloudResult.Error -> {
                PipelineStateBus.update {
                    it.copy(
                        isOfflineError = false,
                        statusMessage = "Terjemahan gagal (${translation.code}): ${translation.message}"
                    )
                }
            }
            is CloudResult.Success -> {
                val translatedText = translation.data.translatedText
                contextHistory.add(
                    ContextTurnDto(
                        speaker = speakerDisplay,
                        original = dialogRaw,
                        translated = translatedText
                    )
                )
                if (contextHistory.size > 10) {
                    contextHistory.removeAt(0)
                }

                PipelineStateBus.update {
                    it.copy(
                        translatedDialog = translatedText,
                        statusMessage = "Menghasilkan dubbing neural (${characterProfile.voiceId})..."
                    )
                }

                if (!autoPlay) {
                    PipelineStateBus.appendLog(
                        PipelineLogEntry(
                            timestampMs = System.currentTimeMillis(),
                            speaker = speakerDisplay,
                            originalText = dialogRaw,
                            translatedText = translatedText,
                            voiceUsed = "${characterProfile.characterName} / ${characterProfile.voiceId}",
                            status = "Translated Only"
                        )
                    )
                    return
                }

                when (val ttsResult = repo.generateTts(translatedText, characterProfile)) {
                    is CloudResult.Offline -> {
                        PipelineStateBus.update {
                            it.copy(
                                isOfflineError = true,
                                statusMessage = ttsResult.message
                            )
                        }
                    }
                    is CloudResult.Error -> {
                        PipelineStateBus.update {
                            it.copy(
                                statusMessage = "Gemini TTS gagal (${ttsResult.code}): ${ttsResult.message}"
                            )
                        }
                    }
                    is CloudResult.Success -> {
                        dubPlayer.playWavBase64(
                            audioBase64 = ttsResult.data.audioBase64,
                            speechRate = characterProfile.speechRate
                        )
                        PipelineStateBus.update {
                            it.copy(
                                isOfflineError = false,
                                statusMessage = "Memutar dubbing neural (${ttsResult.data.modelUsed})"
                            )
                        }
                        PipelineStateBus.appendLog(
                            PipelineLogEntry(
                                timestampMs = System.currentTimeMillis(),
                                speaker = speakerDisplay,
                                originalText = dialogRaw,
                                translatedText = translatedText,
                                voiceUsed = "${characterProfile.characterName} (${characterProfile.voiceId})",
                                status = if (ttsResult.data.cached) "Dubbed (Cache)" else "Dubbed (Live)"
                            )
                        )
                    }
                }
            }
        }
    }

    private fun acquireLatestBitmap(): Bitmap? {
        val reader = imageReader ?: return null
        val image = reader.acquireLatestImage() ?: return null
        return try {
            val plane = image.planes[0]
            val buffer = plane.buffer
            val pixelStride = plane.pixelStride
            val rowStride = plane.rowStride
            val rowPadding = rowStride - pixelStride * image.width
            val bitmap = Bitmap.createBitmap(
                image.width + rowPadding / pixelStride,
                image.height,
                Bitmap.Config.ARGB_8888
            )
            bitmap.copyPixelsFromBuffer(buffer)
            if (bitmap.width != image.width) {
                val cropped = Bitmap.createBitmap(bitmap, 0, 0, image.width, image.height)
                bitmap.recycle()
                cropped
            } else {
                bitmap
            }
        } finally {
            image.close()
        }
    }

    private fun stopCapture() {
        scanJob?.cancel()
        virtualDisplay?.release()
        virtualDisplay = null
        imageReader?.close()
        imageReader = null
        mediaProjection?.stop()
        mediaProjection = null
        PipelineStateBus.update {
            it.copy(
                isScanning = false,
                isPlayingAudio = false,
                statusMessage = "Scanner dihentikan"
            )
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.scanner_notification_channel),
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AutoDub Cloud")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        stopCapture()
        ocrEngine.close()
        serviceScope.launch {
            dubPlayer.release()
            serviceScope.cancel()
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val CHANNEL_ID = "autodub_scanner_channel"
        const val NOTIFICATION_ID = 4001
        const val ACTION_STOP = "com.autodub.cloud.ACTION_STOP_CAPTURE"
        const val ACTION_TOGGLE_MUTE = "com.autodub.cloud.ACTION_TOGGLE_MUTE"
    }
}
