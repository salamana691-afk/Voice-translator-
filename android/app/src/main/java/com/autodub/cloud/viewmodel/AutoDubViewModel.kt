package com.autodub.cloud.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.autodub.cloud.AutoDubApplication
import com.autodub.cloud.audio.ExoDubPlayer
import com.autodub.cloud.data.local.entity.AppSettingsEntity
import com.autodub.cloud.data.local.entity.CharacterProfileEntity
import com.autodub.cloud.data.local.entity.RoiConfigEntity
import com.autodub.cloud.data.remote.dto.HealthResponseDto
import com.autodub.cloud.data.remote.dto.VoiceCatalogItemDto
import com.autodub.cloud.data.repository.CloudResult
import com.autodub.cloud.service.LiveDubState
import com.autodub.cloud.service.PipelineStateBus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class VoiceStudioUiState(
    val selectedVoiceId: String = "Kore",
    val personaDescription: String = "Suara perempuan dewasa bergaya anime Jepang, lembut, ceria, dan ekspresif.",
    val emotion: String = "cheerful",
    val speechRate: Float = 1.0f,
    val pitch: Float = 0.0f,
    val sampleText: String = "Selamat sore! Aku sudah menunggumu di teras akademi sejak tadi.",
    val isGenerating: Boolean = false,
    val lastModelUsed: String = "",
    val lastStyleApplied: String = "",
    val lastError: String? = null,
    val hasPreviewAudio: Boolean = false
)

data class ServerStatusUiState(
    val isChecking: Boolean = false,
    val health: HealthResponseDto? = null,
    val error: String? = null
)

class AutoDubViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as AutoDubApplication
    private val repository = app.repository
    private val studioPlayer = ExoDubPlayer(application)

    val isOnline: StateFlow<Boolean> = repository.isOnlineFlow
    val livePipelineState: StateFlow<LiveDubState> = PipelineStateBus.state

    val characters: StateFlow<List<CharacterProfileEntity>> =
        repository.charactersFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val roiConfig: StateFlow<RoiConfigEntity> =
        repository.roiConfigFlow
            .map { it ?: RoiConfigEntity() }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), RoiConfigEntity())

    val settings: StateFlow<AppSettingsEntity> =
        repository.settingsFlow
            .map { it ?: AppSettingsEntity() }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AppSettingsEntity())

    private val _voiceCatalog = MutableStateFlow<List<VoiceCatalogItemDto>>(emptyList())
    val voiceCatalog: StateFlow<List<VoiceCatalogItemDto>> = _voiceCatalog.asStateFlow()

    private val _emotions = MutableStateFlow(
        listOf("neutral", "cheerful", "playful", "calm", "sad", "angry", "surprised", "whisper")
    )
    val emotions: StateFlow<List<String>> = _emotions.asStateFlow()

    private val _studioState = MutableStateFlow(VoiceStudioUiState())
    val studioState: StateFlow<VoiceStudioUiState> = _studioState.asStateFlow()

    private val _serverState = MutableStateFlow(ServerStatusUiState())
    val serverState: StateFlow<ServerStatusUiState> = _serverState.asStateFlow()

    private var lastPreviewBase64: String? = null

    init {
        refreshServerVoices()
    }

    fun refreshServerVoices() {
        viewModelScope.launch {
            when (val res = repository.fetchVoices()) {
                is CloudResult.Success -> {
                    _voiceCatalog.value = res.data.voices
                    if (res.data.emotions.isNotEmpty()) {
                        _emotions.value = res.data.emotions
                    }
                }
                is CloudResult.Offline -> {
                    _studioState.value = _studioState.value.copy(lastError = res.message)
                }
                is CloudResult.Error -> {
                    _studioState.value = _studioState.value.copy(lastError = res.message)
                }
            }
        }
    }

    fun saveRoiConfig(updated: RoiConfigEntity) {
        viewModelScope.launch {
            repository.saveRoiConfig(updated)
        }
    }

    fun upsertCharacter(profile: CharacterProfileEntity) {
        viewModelScope.launch {
            repository.upsertCharacter(profile)
        }
    }

    fun toggleCharacterEnabled(profile: CharacterProfileEntity) {
        viewModelScope.launch {
            repository.upsertCharacter(profile.copy(isEnabled = !profile.isEnabled))
        }
    }

    fun deleteCharacter(profile: CharacterProfileEntity) {
        viewModelScope.launch {
            repository.deleteCharacter(profile)
        }
    }

    fun updateSettings(updated: AppSettingsEntity) {
        viewModelScope.launch {
            repository.saveSettings(updated)
        }
    }

    fun clearCaches() {
        repository.clearLocalCaches()
    }

    fun updateStudioState(transform: (VoiceStudioUiState) -> VoiceStudioUiState) {
        _studioState.value = transform(_studioState.value)
    }

    fun generateVoiceDesignPreview() {
        val current = _studioState.value
        if (!isOnline.value) {
            _studioState.value = current.copy(
                lastError = "Offline: Koneksi internet terputus. Voice Design membutuhkan cloud."
            )
            return
        }
        viewModelScope.launch {
            _studioState.value = current.copy(isGenerating = true, lastError = null)
            when (
                val res = repository.designVoice(
                    personaDescription = current.personaDescription,
                    sampleText = current.sampleText,
                    baseVoiceId = current.selectedVoiceId,
                    emotion = current.emotion,
                    speechRate = current.speechRate,
                    pitch = current.pitch
                )
            ) {
                is CloudResult.Offline -> {
                    _studioState.value = _studioState.value.copy(
                        isGenerating = false,
                        lastError = res.message
                    )
                }
                is CloudResult.Error -> {
                    _studioState.value = _studioState.value.copy(
                        isGenerating = false,
                        lastError = "${res.code}: ${res.message}"
                    )
                }
                is CloudResult.Success -> {
                    lastPreviewBase64 = res.data.audioBase64
                    _studioState.value = _studioState.value.copy(
                        isGenerating = false,
                        selectedVoiceId = res.data.recommendedVoiceId,
                        lastModelUsed = res.data.modelUsed,
                        lastStyleApplied = res.data.stylePrompt,
                        hasPreviewAudio = true,
                        lastError = null
                    )
                    studioPlayer.playWavBase64(res.data.audioBase64, current.speechRate)
                }
            }
        }
    }

    fun testCurrentVoice() {
        val current = _studioState.value
        if (!isOnline.value) {
            _studioState.value = current.copy(
                lastError = "Offline: Koneksi internet terputus. Pengujian suara neural membutuhkan internet."
            )
            return
        }
        viewModelScope.launch {
            _studioState.value = current.copy(isGenerating = true, lastError = null)
            val tempProfile = CharacterProfileEntity(
                characterName = "STUDIO_TEST",
                normalizedKey = "studio_test",
                voiceId = current.selectedVoiceId,
                voicePersonality = current.personaDescription,
                emotion = current.emotion,
                speechRate = current.speechRate,
                pitch = current.pitch
            )
            when (val res = repository.generateTts(current.sampleText, tempProfile)) {
                is CloudResult.Offline -> {
                    _studioState.value = _studioState.value.copy(
                        isGenerating = false,
                        lastError = res.message
                    )
                }
                is CloudResult.Error -> {
                    _studioState.value = _studioState.value.copy(
                        isGenerating = false,
                        lastError = "${res.code}: ${res.message}"
                    )
                }
                is CloudResult.Success -> {
                    lastPreviewBase64 = res.data.audioBase64
                    _studioState.value = _studioState.value.copy(
                        isGenerating = false,
                        lastModelUsed = res.data.modelUsed,
                        lastStyleApplied = res.data.styleApplied,
                        hasPreviewAudio = true,
                        lastError = null
                    )
                    studioPlayer.playWavBase64(res.data.audioBase64, current.speechRate)
                }
            }
        }
    }

    fun replayLastPreview() {
        val b64 = lastPreviewBase64 ?: return
        viewModelScope.launch {
            studioPlayer.playWavBase64(b64, _studioState.value.speechRate)
        }
    }

    fun checkServerHealth(customUrl: String) {
        if (!isOnline.value) {
            _serverState.value = ServerStatusUiState(
                isChecking = false,
                error = "Perangkat sedang offline. Tidak dapat menghubungi server."
            )
            return
        }
        viewModelScope.launch {
            _serverState.value = ServerStatusUiState(isChecking = true)
            when (val res = repository.checkHealth(customUrl)) {
                is CloudResult.Offline -> {
                    _serverState.value = ServerStatusUiState(isChecking = false, error = res.message)
                }
                is CloudResult.Error -> {
                    _serverState.value = ServerStatusUiState(
                        isChecking = false,
                        error = "${res.code}: ${res.message}"
                    )
                }
                is CloudResult.Success -> {
                    _serverState.value = ServerStatusUiState(
                        isChecking = false,
                        health = res.data,
                        error = null
                    )
                }
            }
        }
    }

    override fun onCleared() {
        viewModelScope.launch {
            studioPlayer.release()
        }
        super.onCleared()
    }
}
