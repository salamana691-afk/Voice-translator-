package com.autodub.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "character_profiles",
    indices = [Index(value = ["normalizedKey"], unique = true)]
)
data class CharacterProfileEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val characterName: String,
    val normalizedKey: String,
    val voiceId: String,
    val voicePersonality: String,
    val emotion: String,
    val speechRate: Float,
    val pitch: Float,
    val voiceProvider: String = "Gemini Neural TTS",
    val isEnabled: Boolean = true
)
