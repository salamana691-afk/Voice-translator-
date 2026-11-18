package com.autodub.cloud.service

import android.content.Intent

object MediaProjectionHolder {
    var resultCode: Int = 0
    var resultData: Intent? = null

    fun hasGrant(): Boolean = resultCode != 0 && resultData != null

    fun clear() {
        resultCode = 0
        resultData = null
    }
}
