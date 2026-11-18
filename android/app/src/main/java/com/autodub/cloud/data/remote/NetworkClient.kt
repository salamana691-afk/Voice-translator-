package com.autodub.cloud.data.remote

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

object NetworkClient {
    @Volatile
    private var currentBaseUrl: String = ""
    @Volatile
    private var cachedService: AutoDubApiService? = null

    private val retryInterceptor = Interceptor { chain ->
        val request = chain.request()
        var attempt = 0
        var lastException: IOException? = null
        while (attempt < 2) {
            try {
                val response = chain.proceed(request)
                if (response.code in listOf(502, 503, 504) && attempt == 0) {
                    response.close()
                    attempt++
                    Thread.sleep(350L)
                    continue
                }
                return@Interceptor response
            } catch (e: IOException) {
                lastException = e
                attempt++
                if (attempt >= 2) break
                Thread.sleep(350L)
            }
        }
        throw lastException ?: IOException("Connection to AutoDub Cloud server failed.")
    }

    private val okHttpClient: OkHttpClient by lazy {
        val logger = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        OkHttpClient.Builder()
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(35, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .addInterceptor(retryInterceptor)
            .addInterceptor(logger)
            .build()
    }

    @Synchronized
    fun getService(baseUrl: String): AutoDubApiService {
        val normalized = normalizeUrl(baseUrl)
        val existing = cachedService
        if (existing != null && currentBaseUrl == normalized) {
            return existing
        }
        val retrofit = Retrofit.Builder()
            .baseUrl(normalized)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        val created = retrofit.create(AutoDubApiService::class.java)
        currentBaseUrl = normalized
        cachedService = created
        return created
    }

    fun normalizeUrl(raw: String): String {
        val trimmed = raw.trim().ifEmpty { "https://autodub-cloud-backend-url.run.app/" }
        val withScheme = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            trimmed
        } else {
            "https://$trimmed"
        }
        return if (withScheme.endsWith("/")) withScheme else "$withScheme/"
    }
}
