package com.autodub.cloud.data.repository

import android.util.LruCache
import com.autodub.cloud.data.local.AutoDubDatabase
import com.autodub.cloud.data.local.entity.AppSettingsEntity
import com.autodub.cloud.data.local.entity.CharacterProfileEntity
import com.autodub.cloud.data.local.entity.RoiConfigEntity
import com.autodub.cloud.data.remote.NetworkMonitor
import com.autodub.cloud.data.remote.dto.CacheStatsDto
import com.autodub.cloud.data.remote.dto.ContextTurnDto
import com.autodub.cloud.data.remote.dto.HealthResponseDto
import com.autodub.cloud.data.remote.dto.TranslateResponseDto
import com.autodub.cloud.data.remote.dto.TtsResponseDto
import com.autodub.cloud.data.remote.dto.VoiceCatalogItemDto
import com.autodub.cloud.data.remote.dto.VoiceDesignResponseDto
import com.autodub.cloud.data.remote.dto.VoicesResponseDto
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

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

    private val directClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()
    }

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

    private fun extractApiKey(rawInput: String): String {
        val cleaned = rawInput.trim()
            .removePrefix("https://")
            .removePrefix("http://")
            .trimEnd('/')
        return if (cleaned.isBlank() || cleaned.contains("autodub-cloud-backend-url")) "" else cleaned
    }

    private suspend fun postGemini(model: String, apiKey: String, payload: JsonObject): Result<JsonObject> =
        withContext(Dispatchers.IO) {
            try {
                val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"
                val body = payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                val request = Request.Builder()
                    .url(url)
                    .post(body)
                    .build()
                directClient.newCall(request).execute().use { response ->
                    val respText = response.body?.string().orEmpty()
                    if (!response.isSuccessful) {
                        val errMsg = runCatching {
                            JsonParser.parseString(respText).asJsonObject
                                .getAsJsonObject("error")?.get("message")?.asString
                        }.getOrNull() ?: "HTTP ${response.code}: $respText"
                        return@withContext Result.failure(IllegalStateException(errMsg))
                    }
                    Result.success(JsonParser.parseString(respText).asJsonObject)
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun checkHealth(baseUrl: String): CloudResult<HealthResponseDto> {
        if (!networkMonitor.checkCurrentConnectivity()) {
            return CloudResult.Offline()
        }
        val apiKey = extractApiKey(baseUrl)
        if (apiKey.isEmpty()) {
            return CloudResult.Error(
                "MISSING_API_KEY",
                "Tempel Gemini API Key (AIzaSy... atau AQ.Ab8...) di kotak ini lalu klik Simpan URL!"
            )
        }
        val testPayload = JsonObject().apply {
            add("contents", JsonArray().apply {
                add(JsonObject().apply {
                    add("parts", JsonArray().apply {
                        add(JsonObject().apply { addProperty("text", "OK") })
                    })
                })
            })
        }
        val res = postGemini("gemini-2.5-flash", apiKey, testPayload)
        return res.fold(
            onSuccess = {
                CloudResult.Success(
                    HealthResponseDto(
                        status = "ok",
                        service = "Gemini Direct Cloud API",
                        timestamp = System.currentTimeMillis().toString(),
                        uptimeSeconds = 9999L,
                        geminiConfigured = true,
                        cacheStats = CacheStatsDto(translationCache.size(), audioCache.size())
                    )
                )
            },
            onFailure = { err ->
                CloudResult.Error("GEMINI_AUTH_FAILED", err.message ?: "API Key tidak valid.")
            }
        )
    }

    suspend fun fetchVoices(): CloudResult<VoicesResponseDto> {
        val catalog = listOf(
            VoiceCatalogItemDto("Zephyr", "Zephyr (Cerah & Ekspresif)", "Female", "Bright", "Heroine / Ceria"),
            VoiceCatalogItemDto("Kore", "Kore (Lembut & Anime)", "Female", "Warm", "Karakter Perempuan"),
            VoiceCatalogItemDto("Aoede", "Aoede (Anggun & Tenang)", "Female", "Melodic", "Narator / Kakak"),
            VoiceCatalogItemDto("Puck", "Puck (Energik & Muda)", "Male", "Upbeat", "Protagonis / Remaja"),
            VoiceCatalogItemDto("Fenrir", "Fenrir (Tegas & Berat)", "Male", "Deep", "Antagonis / Ksatria"),
            VoiceCatalogItemDto("Charon", "Charon (Wibawa & Dalam)", "Male", "Calm", "Narator Pria / Mentor")
        )
        val emotions = listOf("neutral", "cheerful", "sad", "angry", "whisper", "excited", "dramatic")
        return CloudResult.Success(VoicesResponseDto(voices = catalog, emotions = emotions))
    }

    suspend fun translateDialogue(
        text: String,
        speakerName: String?,
        contextHistory: List<ContextTurnDto>
    ): CloudResult<TranslateResponseDto> {
        val settings = getSettings()
        val cacheKey = "${settings.sourceLang}|${settings.targetLang}|${speakerName.orEmpty()}|${text.trim()}"
        translationCache.get(cacheKey)?.let { cached ->
            return CloudResult.Success(cached.copy(cached = true))
        }
        if (!networkMonitor.checkCurrentConnectivity()) {
            return CloudResult.Offline()
        }
        val apiKey = extractApiKey(settings.backendBaseUrl)
        if (apiKey.isEmpty()) {
            return CloudResult.Error("MISSING_API_KEY", "Isi Gemini API Key dulu di tab Serv!")
        }

        val glossary: Map<String, String> = runCatching {
            val type = object : TypeToken>() {}.type
            gson.fromJson>(settings.glossaryJson, type) ?: emptyMap()
        }.getOrDefault(emptyMap())

        val prompt = buildString {
            appendLine("Terjemahkan dialog Visual Novel berikut dari ${settings.sourceLang} ke ${settings.targetLang} secara natural, emosional, dan sesuai konteks.")
            appendLine("Hanya balas hasil terjemahannya saja tanpa tanda kutip atau penjelasan tambahan.")
            if (!speakerName.isNullOrBlank()) appendLine("Pembicara: $speakerName")
            if (settings.preserveNames) appendLine("Pertahankan nama karakter asli.")
            if (settings.preserveHonorifics) appendLine("Pertahankan panggilan/honorifics (-san, -kun, -chan, senpai, dll).")
            if (glossary.isNotEmpty()) appendLine("Glosarium wajib: $glossary")
            if (settings.vnContextEnabled && contextHistory.isNotEmpty()) {
                appendLine("Konteks percakapan sebelumnya:")
                contextHistory.takeLast(settings.maxContextTurns).forEach {
                    appendLine("- ${it.speaker}: ${it.translated}")
                }
            }
            appendLine("Teks asli: ${text.trim()}")
        }

        val payload = JsonObject().apply {
            add("contents", JsonArray().apply {
                add(JsonObject().apply {
                    add("parts", JsonArray().apply {
                        add(JsonObject().apply { addProperty("text", prompt) })
                    })
                })
            })
        }

        val res = postGemini("gemini-2.5-flash", apiKey, payload)
        return res.fold(
            onSuccess = { json ->
                val translated = runCatching {
                    json.getAsJsonArray("candidates")[0].asJsonObject
                        .getAsJsonObject("content")
                        .getAsJsonArray("parts")[0].asJsonObject
                        .get("text").asString.trim()
                }.getOrDefault(text.trim())

                val dto = TranslateResponseDto(
                    originalText = text.trim(),
                    speakerName = speakerName ?: "NARRATOR",
                    sourceLang = settings.sourceLang,
                    targetLang = settings.targetLang,
                    translatedText = translated,
                    detectedTone = "expressive",
                    preservedTerms = emptyList(),
                    modelUsed = "gemini-2.5-flash",
                    cached = false
                )
                translationCache.put(cacheKey, dto)
                CloudResult.Success(dto)
            },
            onFailure = { err ->
                CloudResult.Error("TRANSLATE_FAILED", err.message ?: "Gagal menerjemahkan dialog.")
            }
        )
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
        val apiKey = extractApiKey(settings.backendBaseUrl)
        if (apiKey.isEmpty()) {
            return CloudResult.Error("MISSING_API_KEY", "Isi Gemini API Key dulu di tab Serv!")
        }

        val voiceName = profile.voiceId.ifBlank { "Kore" }
        val styleDirection = buildString {
            if (profile.voicePersonality.isNotBlank()) {
                append("Gaya suara: ${profile.voicePersonality}. ")
            }
            if (profile.emotion.isNotBlank() && profile.emotion != "neutral") {
                append("Emosi: ${profile.emotion}. ")
            }
            append("Ucapkan dialog berikut secara alami dan ekspresif dalam bahasa Indonesia: ${text.trim()}")
        }

        val payload = JsonObject().apply {
            add("contents", JsonArray().apply {
                add(JsonObject().apply {
                    add("parts", JsonArray().apply {
                        add(JsonObject().apply { addProperty("text", styleDirection) })
                    })
                })
            })
            add("generationConfig", JsonObject().apply {
                add("responseModalities", JsonArray().apply { add("AUDIO") })
                add("speechConfig", JsonObject().apply {
                    add("voiceConfig", JsonObject().apply {
                        add("prebuiltVoiceConfig", JsonObject().apply {
                            addProperty("voiceName", voiceName)
                        })
                    })
                })
            })
        }

        val res = postGemini("gemini-2.5-flash-preview-tts", apiKey, payload)
        return res.fold(
            onSuccess = { json ->
                val inlineData = runCatching {
                    json.getAsJsonArray("candidates")[0].asJsonObject
                        .getAsJsonObject("content")
                        .getAsJsonArray("parts")[0].asJsonObject
                        .getAsJsonObject("inlineData")
                }.getOrNull()

                val base64Audio = inlineData?.get("data")?.asString.orEmpty()
                val mimeType = inlineData?.get("mimeType")?.asString ?: "audio/pcm;rate=24000"

                if (base64Audio.isEmpty()) {
                    return@fold CloudResult.Error("EMPTY_AUDIO", "Server Gemini tidak mengembalikan data audio.")
                }

                val dto = TtsResponseDto(
                    audioBase64 = base64Audio,
                    mimeType = mimeType,
                    sampleRate = 24000,
                    channels = 1,
                    bitDepth = 16,
                    durationEstimateMs = (text.length * 75).coerceAtLeast(1000),
                    voiceId = voiceName,
                    emotion = profile.emotion,
                    modelUsed = "gemini-2.5-flash-preview-tts",
                    styleApplied = profile.voicePersonality,
                    cached = false
                )
                audioCache.put(cacheKey, dto)
                CloudResult.Success(dto)
            },
            onFailure = { err ->
                CloudResult.Error("TTS_FAILED", err.message ?: "Gagal membuat suara Gemini TTS.")
            }
        )
    }

    suspend fun designVoice(
        personaDescription: String,
        sampleText: String,
        baseVoiceId: String?,
        emotion: String,
        speechRate: Float,
        pitch: Float
    ): CloudResult<VoiceDesignResponseDto> {
        val chosenVoice = baseVoiceId?.ifBlank { "Kore" } ?: "Kore"
        val tempProfile = CharacterProfileEntity(
            characterName = "PREVIEW",
            normalizedKey = "preview",
            voiceId = chosenVoice,
            voicePersonality = personaDescription,
            emotion = emotion,
            speechRate = speechRate,
            pitch = pitch,
            isEnabled = true
        )
        return when (val ttsRes = generateTts(sampleText, tempProfile)) {
            is CloudResult.Success -> CloudResult.Success(
                VoiceDesignResponseDto(
                    recommendedVoiceId = chosenVoice,
                    stylePrompt = personaDescription,
                    audioBase64 = ttsRes.data.audioBase64,
                    mimeType = ttsRes.data.mimeType,
                    sampleRate = ttsRes.data.sampleRate,
                    durationEstimateMs = ttsRes.data.durationEstimateMs,
                    modelUsed = ttsRes.data.modelUsed,
                    cached = ttsRes.data.cached
                )
            )
            is CloudResult.Offline -> ttsRes
            is CloudResult.Error -> ttsRes
        }
    }

    fun clearLocalCaches() {
        translationCache.evictAll()
        audioCache.evictAll()
    }
}
