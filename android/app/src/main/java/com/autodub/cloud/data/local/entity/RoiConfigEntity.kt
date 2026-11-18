package com.autodub.cloud.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "roi_config")
data class RoiConfigEntity(
    @PrimaryKey val id: Int = 1,
    val nameRoiX: Float = 0.08f,
    val nameRoiY: Float = 0.62f,
    val nameRoiWidth: Float = 0.24f,
    val nameRoiHeight: Float = 0.08f,
    val dialogRoiX: Float = 0.08f,
    val dialogRoiY: Float = 0.71f,
    val dialogRoiWidth: Float = 0.84f,
    val dialogRoiHeight: Float = 0.22f,
    val scanIntervalMs: Long = 900L,
    val changeThreshold: Float = 0.86f
)
