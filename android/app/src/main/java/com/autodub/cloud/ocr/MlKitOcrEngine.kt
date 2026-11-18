package com.autodub.cloud.ocr

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class MlKitOcrEngine {
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    suspend fun recognizeRois(bitmaps: CroppedRoiBitmaps): OcrFrameCapture {
        val rawSpeaker = recognizeBitmap(bitmaps.speakerBitmap)
        val rawDialog = recognizeBitmap(bitmaps.dialogBitmap)

        val cleanedSpeaker = rawSpeaker
            .lineSequence()
            .firstOrNull { it.isNotBlank() }
            ?.let { DialogChangeDetector.normalizeSpeaker(it) }
            .orEmpty()

        val cleanedDialog = DialogChangeDetector.normalizeText(rawDialog)
        return OcrFrameCapture(
            speakerName = cleanedSpeaker,
            dialogText = cleanedDialog
        )
    }

    private suspend fun recognizeBitmap(bitmap: Bitmap): String =
        suspendCancellableCoroutine { cont ->
            val image = InputImage.fromBitmap(bitmap, 0)
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    if (cont.isActive) {
                        cont.resume(visionText.text)
                    }
                }
                .addOnFailureListener { exc ->
                    if (cont.isActive) {
                        cont.resumeWithException(exc)
                    }
                }
        }

    fun close() {
        recognizer.close()
    }
}
