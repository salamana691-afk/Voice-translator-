package com.autodub.cloud.ocr

import kotlin.math.max
import kotlin.math.min

data class OcrFrameCapture(
    val speakerName: String,
    val dialogText: String
)

class DialogChangeDetector(
    private var similarityThreshold: Float = 0.86f
) {
    private var lastSpeaker: String = ""
    private var lastDialogNormalized: String = ""
    private var pendingDialogNormalized: String = ""
    private var stableFrames: Int = 0

    fun updateThreshold(threshold: Float) {
        similarityThreshold = threshold.coerceIn(0.50f, 0.99f)
    }

    fun reset() {
        lastSpeaker = ""
        lastDialogNormalized = ""
        pendingDialogNormalized = ""
        stableFrames = 0
    }

    /**
     * Returns true only when dialog text is non-empty, stabilized across OCR frames,
     * and sufficiently distinct from the last dubbed dialog.
     */
    fun shouldProcess(speaker: String, rawDialog: String): Boolean {
        val normalizedDialog = normalizeText(rawDialog)
        val normalizedSpeaker = normalizeSpeaker(speaker)

        if (normalizedDialog.length < 2) {
            return false
        }

        // Wait for 1-frame stability so fast typewriter animations finish settling
        if (normalizedDialog != pendingDialogNormalized) {
            pendingDialogNormalized = normalizedDialog
            stableFrames = 1
            return false
        }
        stableFrames++

        if (lastDialogNormalized.isEmpty()) {
            lastSpeaker = normalizedSpeaker
            lastDialogNormalized = normalizedDialog
            return true
        }

        val similarity = computeSimilarity(lastDialogNormalized, normalizedDialog)
        val speakerChanged = normalizedSpeaker.isNotEmpty() && normalizedSpeaker != lastSpeaker

        if (similarity < similarityThreshold || (speakerChanged && similarity < 0.96f)) {
            lastSpeaker = normalizedSpeaker
            lastDialogNormalized = normalizedDialog
            return true
        }

        return false
    }

    companion object {
        fun normalizeText(input: String): String {
            return input
                .replace(Regex("\\s+"), " ")
                .trim()
        }

        fun normalizeSpeaker(input: String): String {
            return input
                .replace(Regex("[^A-Za-z0-9\\s_-]"), "")
                .trim()
                .uppercase()
        }

        fun computeSimilarity(a: String, b: String): Float {
            if (a == b) return 1.0f
            val maxLen = max(a.length, b.length)
            if (maxLen == 0) return 1.0f
            val dist = levenshteinDistance(a.lowercase(), b.lowercase())
            return 1.0f - (dist.toFloat() / maxLen.toFloat())
        }

        private fun levenshteinDistance(s: String, t: String): Int {
            val n = s.length
            val m = t.length
            if (n == 0) return m
            if (m == 0) return n

            var prev = IntArray(m + 1) { it }
            var curr = IntArray(m + 1)

            for (i in 1..n) {
                curr[0] = i
                for (j in 1..m) {
                    val cost = if (s[i - 1] == t[j - 1]) 0 else 1
                    curr[j] = min(min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost)
                }
                val tmp = prev
                prev = curr
                curr = tmp
            }
            return prev[m]
        }
    }
}
