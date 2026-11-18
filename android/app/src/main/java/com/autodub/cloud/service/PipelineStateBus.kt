package com.autodub.cloud.service

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PipelineLogEntry(
    val timestampMs: Long,
    val speaker: String,
    val originalText: String,
    val translatedText: String,
    val voiceUsed: String,
    val status: String
)

data class LiveDubState(
    val isScanning: Boolean = false,
    val isOverlayActive: Boolean = false,
    val showRoiBoxesOnOverlay: Boolean = false,
    val isOfflineError: Boolean = false,
    val statusMessage: String = "Siap memindai layar Visual Novel",
    val activeSpeaker: String = "NARRATOR",
    val activeVoiceLabel: String = "Kore (Gemini Neural TTS)",
    val originalDialog: String = "",
    val translatedDialog: String = "",
    val isPlayingAudio: Boolean = false,
    val isMuted: Boolean = false,
    val recentLogs: List<PipelineLogEntry> = emptyList()
)

object PipelineStateBus {
    private val _state = MutableStateFlow(LiveDubState())
    val state: StateFlow<LiveDubState> = _state.asStateFlow()

    fun update(transform: (LiveDubState) -> LiveDubState) {
        _state.value = transform(_state.value)
    }

    fun appendLog(entry: PipelineLogEntry) {
        _state.value = _state.value.copy(
            recentLogs = (listOf(entry) + _state.value.recentLogs).take(30)
        )
    }
}
