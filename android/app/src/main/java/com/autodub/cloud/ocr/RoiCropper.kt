package com.autodub.cloud.ocr

import android.graphics.Bitmap
import com.autodub.cloud.data.local.entity.RoiConfigEntity
import kotlin.math.roundToInt

data class CroppedRoiBitmaps(
    val speakerBitmap: Bitmap,
    val dialogBitmap: Bitmap
)

object RoiCropper {
    fun cropBoth(source: Bitmap, config: RoiConfigEntity): CroppedRoiBitmaps {
        val speakerBitmap = cropNormalized(
            source = source,
            normX = config.nameRoiX,
            normY = config.nameRoiY,
            normW = config.nameRoiWidth,
            normH = config.nameRoiHeight
        )
        val dialogBitmap = cropNormalized(
            source = source,
            normX = config.dialogRoiX,
            normY = config.dialogRoiY,
            normW = config.dialogRoiWidth,
            normH = config.dialogRoiHeight
        )
        return CroppedRoiBitmaps(speakerBitmap = speakerBitmap, dialogBitmap = dialogBitmap)
    }

    fun cropNormalized(
        source: Bitmap,
        normX: Float,
        normY: Float,
        normW: Float,
        normH: Float
    ): Bitmap {
        val srcW = source.width.coerceAtLeast(1)
        val srcH = source.height.coerceAtLeast(1)

        val x = (normX.coerceIn(0f, 0.98f) * srcW).roundToInt().coerceIn(0, srcW - 1)
        val y = (normY.coerceIn(0f, 0.98f) * srcH).roundToInt().coerceIn(0, srcH - 1)
        val w = (normW.coerceIn(0.02f, 1f) * srcW).roundToInt().coerceIn(1, srcW - x)
        val h = (normH.coerceIn(0.02f, 1f) * srcH).roundToInt().coerceIn(1, srcH - y)

        return Bitmap.createBitmap(source, x, y, w, h)
    }
}
