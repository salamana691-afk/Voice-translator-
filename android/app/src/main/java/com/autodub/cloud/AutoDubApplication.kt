package com.autodub.cloud

import android.app.Application
import com.autodub.cloud.data.local.AutoDubDatabase
import com.autodub.cloud.data.remote.NetworkMonitor
import com.autodub.cloud.data.repository.AutoDubRepository

class AutoDubApplication : Application() {
    val database: AutoDubDatabase by lazy { AutoDubDatabase.getInstance(this) }
    val networkMonitor: NetworkMonitor by lazy { NetworkMonitor(this) }
    val repository: AutoDubRepository by lazy { AutoDubRepository(database, networkMonitor) }

    override fun onTerminate() {
        networkMonitor.unregister()
        super.onTerminate()
    }
}
