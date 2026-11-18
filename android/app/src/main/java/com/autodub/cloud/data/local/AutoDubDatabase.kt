package com.autodub.cloud.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.autodub.cloud.data.local.dao.CharacterDao
import com.autodub.cloud.data.local.dao.RoiConfigDao
import com.autodub.cloud.data.local.dao.SettingsDao
import com.autodub.cloud.data.local.entity.AppSettingsEntity
import com.autodub.cloud.data.local.entity.CharacterProfileEntity
import com.autodub.cloud.data.local.entity.RoiConfigEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        CharacterProfileEntity::class,
        RoiConfigEntity::class,
        AppSettingsEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AutoDubDatabase : RoomDatabase() {
    abstract fun characterDao(): CharacterDao
    abstract fun roiConfigDao(): RoiConfigDao
    abstract fun settingsDao(): SettingsDao

    companion object {
        @Volatile
        private var INSTANCE: AutoDubDatabase? = null

        fun getInstance(context: Context): AutoDubDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AutoDubDatabase::class.java,
                    "autodub_cloud.db"
                )
                    .addCallback(SeedCallback(context.applicationContext))
                    .build()
                INSTANCE = instance
                instance
            }
        }

        val defaultProfiles = listOf(
            CharacterProfileEntity(
                characterName = "NORA",
                normalizedKey = "nora",
                voiceId = "Kore",
                voicePersonality = "Suara perempuan dewasa bergaya anime Jepang, lembut, ceria, dan ekspresif.",
                emotion = "cheerful",
                speechRate = 1.02f,
                pitch = 1.0f,
                voiceProvider = "Gemini Neural TTS",
                isEnabled = true
            ),
            CharacterProfileEntity(
                characterName = "LUCY",
                normalizedKey = "lucy",
                voiceId = "Zephyr",
                voicePersonality = "Suara perempuan dewasa, energik, ramah, dan sedikit playful.",
                emotion = "playful",
                speechRate = 1.06f,
                pitch = 1.5f,
                voiceProvider = "Gemini Neural TTS",
                isEnabled = true
            ),
            CharacterProfileEntity(
                characterName = "NARRATOR",
                normalizedKey = "narrator",
                voiceId = "Kore",
                voicePersonality = "Suara perempuan dewasa, tenang, natural, dan jelas.",
                emotion = "calm",
                speechRate = 0.98f,
                pitch = 0.0f,
                voiceProvider = "Gemini Neural TTS",
                isEnabled = true
            ),
            CharacterProfileEntity(
                characterName = "SALMAN",
                normalizedKey = "salman",
                voiceId = "Charon",
                voicePersonality = "Suara laki-laki dewasa, rendah, tenang, dan percaya diri.",
                emotion = "calm",
                speechRate = 0.96f,
                pitch = -1.5f,
                voiceProvider = "Gemini Neural TTS",
                isEnabled = true
            )
        )
    }

    private class SeedCallback(private val appContext: Context) : Callback() {
        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            CoroutineScope(Dispatchers.IO).launch {
                val database = getInstance(appContext)
                database.characterDao().insertAll(defaultProfiles)
                database.roiConfigDao().saveConfig(RoiConfigEntity())
                database.settingsDao().saveSettings(AppSettingsEntity())
            }
        }
    }
}
