package com.autodub.cloud

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import com.autodub.cloud.service.FloatingOverlayService
import com.autodub.cloud.service.MediaProjectionHolder
import com.autodub.cloud.service.PipelineStateBus
import com.autodub.cloud.service.ScreenCaptureService
import com.autodub.cloud.ui.navigation.AutoDubNavHost
import com.autodub.cloud.ui.theme.AutoDubCyberTheme
import com.autodub.cloud.viewmodel.AutoDubViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: AutoDubViewModel by viewModels()

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { _ -> }

    private val mediaProjectionLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == Activity.RESULT_OK && result.data != null) {
                MediaProjectionHolder.resultCode = result.resultCode
                MediaProjectionHolder.resultData = result.data
                ContextCompat.startForegroundService(
                    this,
                    Intent(this, ScreenCaptureService::class.java)
                )
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        setContent {
            AutoDubCyberTheme {
                AutoDubNavHost(
                    viewModel = viewModel,
                    onRequestScreenCapture = { launchMediaProjection() },
                    onStopScreenCapture = { stopCaptureService() },
                    onToggleOverlay = { toggleOverlayService() }
                )
            }
        }
    }

    private fun launchMediaProjection() {
        val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjectionLauncher.launch(manager.createScreenCaptureIntent())
    }

    private fun stopCaptureService() {
        val intent = Intent(this, ScreenCaptureService::class.java).apply {
            action = ScreenCaptureService.ACTION_STOP
        }
        startService(intent)
    }

    private fun toggleOverlayService() {
        if (!Settings.canDrawOverlays(this)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivity(intent)
            return
        }

        val isActive = PipelineStateBus.state.value.isOverlayActive
        val overlayIntent = Intent(this, FloatingOverlayService::class.java)
        if (isActive) {
            stopService(overlayIntent)
        } else {
            startService(overlayIntent)
        }
    }
}
