package com.autodub.cloud.data.repository

import android.util.LruCache
import com.autodub.cloud.data.local.AutoDubDatabase
import com.autodub.cloud.data.local.entity.AppSettingsEntity
import com.autodub.cloud.data.local.entity.CharacterProfileEntity
import com.autodub.cloud.data.local.entity.RoiConfigEntity
import com.autodub.cloud.data.remote.NetworkClient
import com.autodub.cloud.data.remote.NetworkMonitor
import com.autodub.cloud.data.remote.dto.ApiErrorEnvelope
import com.autodub.cloud.data.remote.dto.ContextTurnDto
import com.autodub.cloud.data.remote.dto.HealthResponseDto
import com.autodub.cloud.data.remote.dto.TranslateRequestDto
import com.autodub.cloud.data.remote.dto.TranslateResponseDto
import com.autodub.cloud.data.remote.dto.TtsRequestDto
import com.autodub.cloud.data.remote.dto.TtsResponseDto
import com.autodub.cloud.data.remote.dto.VoiceDesignRequestDto
import com.autodub.cloud.data.remote.dto.VoiceDesignResponseDto
import com.autodub.cloud.data.remote.dto.VoicesResponseDto
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import retrofit2.Response

sealed class CloudResult<out T> {
    data class Success<T>(val data: T) : CloudResult<T>()
    data class Offline(val message: String = "Koneksi internet terputus. Permintaan cloud dihentikan.") : CloudResult<Nothing>()
    data class Error(val code: String, val message: String) : CloudResult<Nothing>()
}

class AutoDubRepository(
    private val db: AutoDubDatabase,
    private val networkMonitor: NetworkMonitor
) {
    private val gson = Gson()
    private val translationCache = LruCache<String, TranslateResponseDto>(200)
    private val audioCache = LruCache<String, TtsResponseDto>(60)

    val charactersFlow: Flow<List<CharacterProfileEntity>> = db.characterDao().observeAll()
    val roiConfigFlow: Flow<RoiConfigEntity?> = db.roiConfigDao().observeConfig()
    val settingsFlow: Flow<AppSettingsEntity?> = db.settingsDao().observeSettings()
    val isOnlineFlow = networkMonitor.isOnline

    suspend fun getSettings(): AppSettingsEntity {
        return db.settingsDao().getSettings() ?: AppSettingsEntity().also {
            db.settingsDao().saveSettings(it)
        }
    }

    suspend fun saveSettings(settings: AppSettingsEntity) {
        db.settingsDao().saveSettings(settings)
    }

    suspend fun getRoiConfig(): RoiConfigEntity {
        return db.roiConfigDao().getConfig() ?: RoiConfigEntity().also {
            db.roiConfigDao().saveConfig(it)
        }
    }

    suspend fun saveRoiConfig(config: RoiConfigEntity) {
        db.roiConfigDao().saveConfig(config)
    }

    suspend fun upsertCharacter(profile: CharacterProfileEntity) {
        val normalized = profile.copy(
            characterName = profile.characterName.trim().uppercase(),
            normalizedKey = profile.characterName.trim().lowercase()
        )
        db.characterDao().upsert(normalized)
    }

    suspend fun deleteCharacter(profile: CharacterProfileEntity) {
        if (profile.normalizedKey == "narrator") return
        db.characterDao().delete(profile)
    }

    suspend fun resolveCharacterOrNarrator(rawSpeakerName: String?): CharacterProfileEntity {
        val cleaned = rawSpeakerName?.trim()?.replace(":", "")?.lowercase().orEmpty()
        if (cleaned.isNotEmpty()) {
            val found = db.characterDao().findByNormalizedKey(cleaned)
            if (found != null && found.isEnabled) {
                return found
            }
        }
        return db.characterDao().findByNormalizedKey("narrator")
            ?: AutoDubDatabase.defaultProfiles.first { it.normalizedKey == "narrator" }
    }

    suspend fun checkHealth(baseUrl: String): CloudResult<HealthResponseDto> {
        if (!networkMonitor.checkCurrentConnectivity()) {
            return CloudResult.Offline()
        }
        return executeCall {
            NetworkClient.getService(baseUrl).getHealth()
        }
    }

    suspend fun fetchVoices(): CloudResult<VoicesResponseDto> {
        if (!networkMonitor.checkCurrentConnectivity()) {
            return CloudResult.Offline()
        }
        val settings = getSettings()
        return executeCall {
            NetworkClient.getService(settings.backendBaseUrl).getVoices()
        }
    }

    suspend fun translateDialogue(
        text: String,
        speakerName: String?,
        contextHistory: List<ContextTurnDto>
    ): CloudResult<TranslateResponseDto> {
        val settings = getSettings()
        val glossary: Map<String, String> = try {
            val type = object : TypeToken<Map<String, String>>() {}.type
            gson.fromJson(settings.glossaryJson, type) ?: emptyMap()
        } catch (_: Exception) {
            emptyMap()
        }

        val cacheKey = "${settings.sourceLang}|${settings.targetLang}|${speakerName.orEmpty()}|${text.trim()}"
        translationCache.get(cacheKey)?.let { cached ->
            return CloudResult.Success(cached.copy(cached = true))
        }

        if (!networkMonitor.checkCurrentConnectivity()) {
            return CloudResult.Offline()
        }

        val request = TranslateRequestDto(
            text = text.trim(),
            speakerName = speakerName?.takeIf { it.isNotBlank() },
            sourceLang = settings.sourceLang,
            targetLang = settings.targetLang,
            contextHistory = if (settings.vnContextEnabled) {
                contextHistory.takeLast(settings.maxContextTurns)
            } else {
                emptyList()
            },
            glossary = glossary,
            preserveNames = settings.preserveNames,
            preserveHonorifics = settings.preserveHonorifics
        )

        val result = executeCall {
            NetworkClient.getService(settings.backendBaseUrl).translate(request)
        }
        if (result is CloudResult.Success) {
            translationCache.put(cacheKey, result.data)
        }
        return result
    }

    suspend fun generateTts(
        text: String,
        profile: CharacterProfileEntity
    ): CloudResult<TtsResponseDto> {
        val cacheKey = "${profile.voiceId}|${profile.emotion}|${profile.speechRate}|${profile.pitch}|${profile.voicePersonality}|${text.trim()}"
        audioCache.get(cacheKey)?.let { cached ->
            return CloudResult.Success(cached.copy(cached = true))
        }

        if (!networkMonitor.checkCurrentConnectivity()) {
            return CloudResult.Offline()
        }

        val settings = getSettings()
        val request = TtsRequestDto(
            text = text.trim(),
            voiceId = profile.voiceId,
            voicePersonality = profile.voicePersonality,
            emotion = profile.emotion,
            speechRate = profile.speechRate,
            pitch = profile.pitch,
            speakerName = profile.characterName
        )

        val result = executeCall {
            NetworkClient.getService(settings.backendBaseUrl).generateTts(request)
        }
        if (result is CloudResult.Success) {
            audioCache.put(cacheKey, result.data)
        }
        return result
    }

    suspend fun designVoice(
        personaDescription: String,
        sampleText: String,
        baseVoiceId: String?,
        emotion: String,
        speechRate: Float,
        pitch: Float
    ): CloudResult<VoiceDesignResponseDto> {
        if (!networkMonitor.checkCurrentConnectivity()) {
            return CloudResult.Offline()
        }
        val settings = getSettings()
        val request = VoiceDesignRequestDto(
            personaDescription = personaDescription,
            sampleText = sampleText,
            baseVoiceId = baseVoiceId,
            emotion = emotion,
            speechRate = speechRate,
            pitch = pitch
        )
        return executeCall {
            NetworkClient.getService(settings.backendBaseUrl).designVoice(request)
        }
    }

    fun clearLocalCaches() {
        translationCache.evictAll()
        audioCache.evictAll()
    }

    private suspend fun <T> executeCall(call: suspend () -> Response<T>): CloudResult<T> {
        return try {
            val response = call()
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    CloudResult.Success(body)
                } else {
                    CloudResult.Error("EMPTY_BODY", "Server returned empty response body.")
                }
            } else {
                val errorJson = response.errorBody()?.string()
                val parsed = try {
                    gson.fromJson(errorJson, ApiErrorEnvelope::class.java)
                } catch (_: Exception) {
                    null
                }
                CloudResult.Error(
                    code = parsed?.error?.code ?: "HTTP_${response.code()}",
                    message = parsed?.error?.message ?: "Koneksi ke server gagal (HTTP ${response.code()})."
                )
            }
        } catch (e: Exception) {
            CloudResult.Error(
                code = "CONNECTION_FAILED",
                message = e.localizedMessage ?: "Koneksi ke server AutoDub Cloud gagal."
            )
        }
    }
}
