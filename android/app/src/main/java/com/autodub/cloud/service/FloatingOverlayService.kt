package com.autodub.cloud.service

import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class FloatingOverlayService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var windowManager: WindowManager
    private var overlayRoot: LinearLayout? = null
    private lateinit var layoutParams: WindowManager.LayoutParams

    private lateinit var speakerView: TextView
    private lateinit var voiceBadgeView: TextView
    private lateinit var translationView: TextView
    private lateinit var statusView: TextView
    private lateinit var muteButton: Button

    @SuppressLint("ClickableViewAccessibility")
    override fun onCreate() {
        super.onCreate()
        if (!Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        layoutParams = WindowManager.LayoutParams(
            (resources.displayMetrics.widthPixels * 0.88f).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = 140
        }

        buildOverlayView()
        windowManager.addView(overlayRoot, layoutParams)
        PipelineStateBus.update { it.copy(isOverlayActive = true) }

        scope.launch {
            PipelineStateBus.state.collectLatest { state ->
                speakerView.text = state.activeSpeaker
                voiceBadgeView.text = state.activeVoiceLabel
                translationView.text = state.translatedDialog.ifBlank {
                    "Menunggu dialog Visual Novel terdeteksi di ROI 2..."
                }
                statusView.text = state.statusMessage
                statusView.setTextColor(
                    if (state.isOfflineError) Color.parseColor("#FB7185") else Color.parseColor("#22D3EE")
                )
                muteButton.text = if (state.isMuted) "Unmute" else "Mute"
            }
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun buildOverlayView() {
        val bg = GradientDrawable().apply {
            setColor(Color.argb(232, 13, 18, 30))
            cornerRadius = 28f
            setStroke(2, Color.parseColor("#06B6D4"))
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = bg
            setPadding(32, 24, 32, 24)
        }

        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        speakerView = TextView(this).apply {
            text = "NARRATOR"
            textSize = 14f
            setTextColor(Color.parseColor("#22D3EE"))
            setPadding(0, 0, 16, 0)
        }

        voiceBadgeView = TextView(this).apply {
            text = "Kore (Gemini Neural TTS)"
            textSize = 11f
            setTextColor(Color.parseColor("#C084FC"))
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        muteButton = Button(this).apply {
            text = "Mute"
            textSize = 11f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#1E293B"))
            setOnClickListener {
                val intent = Intent(this@FloatingOverlayService, ScreenCaptureService::class.java).apply {
                    action = ScreenCaptureService.ACTION_TOGGLE_MUTE
                }
                startService(intent)
            }
        }

        val closeButton = Button(this).apply {
            text = "Close"
            textSize = 11f
            setTextColor(Color.parseColor("#FCA5A5"))
            setBackgroundColor(Color.parseColor("#1E293B"))
            setOnClickListener { stopSelf() }
        }

        headerRow.addView(speakerView)
        headerRow.addView(voiceBadgeView)
        headerRow.addView(muteButton)
        headerRow.addView(closeButton)

        translationView = TextView(this).apply {
            text = "Menunggu dialog..."
            textSize = 15f
            setTextColor(Color.parseColor("#F1F5F9"))
            setPadding(0, 14, 0, 10)
        }

        statusView = TextView(this).apply {
            text = "Siap"
            textSize = 11f
            setTextColor(Color.parseColor("#22D3EE"))
        }

        root.addView(headerRow)
        root.addView(translationView)
        root.addView(statusView)

        var initialY = 0
        var initialTouchY = 0f
        var initialX = 0
        var initialTouchX = 0f

        root.setOnTouchListener { _: View, event: MotionEvent ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams.x
                    initialY = layoutParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    layoutParams.x = initialX + (event.rawX - initialTouchX).toInt()
                    layoutParams.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager.updateViewLayout(root, layoutParams)
                    true
                }
                else -> false
            }
        }

        overlayRoot = root
    }

    override fun onDestroy() {
        overlayRoot?.let {
            if (it.isAttachedToWindow) {
                windowManager.removeView(it)
            }
        }
        PipelineStateBus.update { it.copy(isOverlayActive = false) }
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
