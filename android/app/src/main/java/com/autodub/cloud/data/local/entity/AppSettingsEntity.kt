package com.autodub.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.autodub.cloud.BuildConfig

@Entity(tableName = "app_settings")
data class AppSettingsEntity(
    @PrimaryKey val id: Int = 1,
    val backendBaseUrl: String = BuildConfig.DEFAULT_BACKEND_URL,
    val sourceLang: String = "English",
    val targetLang: String = "Indonesian",
    val preserveNames: Boolean = true,
    val preserveHonorifics: Boolean = true,
    val vnContextEnabled: Boolean = true,
    val maxContextTurns: Int = 5,
    val autoPlayDub: Boolean = true,
    val overlayOpacity: Float = 0.90f,
    val showOverlaySubtitle: Boolean = true,
    val glossaryJson: String = "{}"
)
