package com.autodub.cloud.data.remote

import com.autodub.cloud.data.remote.dto.HealthResponseDto
import com.autodub.cloud.data.remote.dto.TranslateRequestDto
import com.autodub.cloud.data.remote.dto.TranslateResponseDto
import com.autodub.cloud.data.remote.dto.TtsRequestDto
import com.autodub.cloud.data.remote.dto.TtsResponseDto
import com.autodub.cloud.data.remote.dto.VoiceDesignRequestDto
import com.autodub.cloud.data.remote.dto.VoiceDesignResponseDto
import com.autodub.cloud.data.remote.dto.VoicesResponseDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AutoDubApiService {
    @GET("health")
    suspend fun getHealth(): Response<HealthResponseDto>

    @GET("voices")
    suspend fun getVoices(): Response<VoicesResponseDto>

    @POST("translate")
    suspend fun translate(@Body request: TranslateRequestDto): Response<TranslateResponseDto>

    @POST("tts/generate")
    suspend fun generateTts(@Body request: TtsRequestDto): Response<TtsResponseDto>

    @POST("voice/design")
    suspend fun designVoice(@Body request: VoiceDesignRequestDto): Response<VoiceDesignResponseDto>
}
