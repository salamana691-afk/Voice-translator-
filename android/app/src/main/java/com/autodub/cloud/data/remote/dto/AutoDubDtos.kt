package com.autodub.cloud.data.remote.dto

data class ContextTurnDto(
    val speaker: String,
    val original: String,
    val translated: String
)

data class TranslateRequestDto(
    val text: String,
    val speakerName: String? = null,
    val sourceLang: String = "English",
    val targetLang: String = "Indonesian",
    val contextHistory: List<ContextTurnDto> = emptyList(),
    val glossary: Map<String, String> = emptyMap(),
    val preserveNames: Boolean = true,
    val preserveHonorifics: Boolean = true
)

data class TranslateResponseDto(
    val originalText: String,
    val speakerName: String,
    val sourceLang: String,
    val targetLang: String,
    val translatedText: String,
    val detectedTone: String,
    val preservedTerms: List<String>,
    val modelUsed: String,
    val cached: Boolean
)

data class TtsRequestDto(
    val text: String,
    val voiceId: String,
    val voicePersonality: String = "",
    val emotion: String = "neutral",
    val speechRate: Float = 1.0f,
    val pitch: Float = 0.0f,
    val speakerName: String = "NARRATOR"
)

data class TtsResponseDto(
    val audioBase64: String,
    val mimeType: String,
    val sampleRate: Int,
    val channels: Int,
    val bitDepth: Int,
    val durationEstimateMs: Int,
    val voiceId: String,
    val emotion: String,
    val modelUsed: String,
    val styleApplied: String,
    val cached: Boolean
)

data class VoiceDesignRequestDto(
    val personaDescription: String,
    val sampleText: String,
    val baseVoiceId: String? = null,
    val emotion: String = "neutral",
    val speechRate: Float = 1.0f,
    val pitch: Float = 0.0f
)

data class VoiceDesignResponseDto(
    val recommendedVoiceId: String,
    val stylePrompt: String,
    val audioBase64: String,
    val mimeType: String,
    val sampleRate: Int,
    val durationEstimateMs: Int,
    val modelUsed: String,
    val cached: Boolean
)

data class VoiceCatalogItemDto(
    val voiceId: String,
    val displayName: String,
    val gender: String,
    val timbre: String,
    val recommendedFor: String
)

data class VoicesResponseDto(
    val voices: List<VoiceCatalogItemDto>,
    val emotions: List<String>
)

data class CacheStatsDto(
    val translations: Int,
    val audioClips: Int
)

data class HealthResponseDto(
    val status: String,
    val service: String,
    val timestamp: String,
    val uptimeSeconds: Long,
    val geminiConfigured: Boolean,
    val cacheStats: CacheStatsDto? = null
)

data class ApiErrorEnvelope(
    val error: ApiErrorDetail?
)

data class ApiErrorDetail(
    val code: String?,
    val message: String?,
    val retryable: Boolean?
)
