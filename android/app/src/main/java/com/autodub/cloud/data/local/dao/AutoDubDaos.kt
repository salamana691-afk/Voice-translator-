package com.autodub.cloud.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.autodub.cloud.data.local.entity.AppSettingsEntity
import com.autodub.cloud.data.local.entity.CharacterProfileEntity
import com.autodub.cloud.data.local.entity.RoiConfigEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CharacterDao {
    @Query("SELECT * FROM character_profiles ORDER BY characterName ASC")
    fun observeAll(): Flow<List<CharacterProfileEntity>>

    @Query("SELECT * FROM character_profiles ORDER BY characterName ASC")
    suspend fun getAll(): List<CharacterProfileEntity>

    @Query("SELECT * FROM character_profiles WHERE normalizedKey = :key LIMIT 1")
    suspend fun findByNormalizedKey(key: String): CharacterProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(profile: CharacterProfileEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(profiles: List<CharacterProfileEntity>)

    @Update
    suspend fun update(profile: CharacterProfileEntity)

    @Delete
    suspend fun delete(profile: CharacterProfileEntity)
}

@Dao
interface RoiConfigDao {
    @Query("SELECT * FROM roi_config WHERE id = 1")
    fun observeConfig(): Flow<RoiConfigEntity?>

    @Query("SELECT * FROM roi_config WHERE id = 1")
    suspend fun getConfig(): RoiConfigEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveConfig(config: RoiConfigEntity)
}

@Dao
interface SettingsDao {
    @Query("SELECT * FROM app_settings WHERE id = 1")
    fun observeSettings(): Flow<AppSettingsEntity?>

    @Query("SELECT * FROM app_settings WHERE id = 1")
    suspend fun getSettings(): AppSettingsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSettings(settings: AppSettingsEntity)
}
