package com.autodub.cloud.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CenterFocusStrong
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.GraphicEq
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Scanner
import androidx.compose.material.icons.outlined.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.autodub.cloud.ui.screens.AiVoiceStudioScreen
import com.autodub.cloud.ui.screens.CharacterManagerScreen
import com.autodub.cloud.ui.screens.DashboardScreen
import com.autodub.cloud.ui.screens.RoiConfigScreen
import com.autodub.cloud.ui.screens.ScreenScannerScreen
import com.autodub.cloud.ui.screens.ServerSettingsScreen
import com.autodub.cloud.ui.screens.TranslationSettingsScreen
import com.autodub.cloud.ui.theme.CyberCyan
import com.autodub.cloud.ui.theme.CyberDanger
import com.autodub.cloud.ui.theme.CyberObsidian
import com.autodub.cloud.ui.theme.CyberSurface
import com.autodub.cloud.ui.theme.CyberTextMuted
import com.autodub.cloud.viewmodel.AutoDubViewModel

enum class AutoDubRoute(val route: String, val label: String, val icon: ImageVector) {
    Dashboard("dashboard", "Home", Icons.Outlined.Dashboard),
    Scanner("scanner", "Scanner", Icons.Outlined.Scanner),
    Roi("roi", "ROI", Icons.Outlined.CenterFocusStrong),
    Characters("characters", "Chars", Icons.Outlined.Group),
    VoiceStudio("voice_studio", "Studio", Icons.Outlined.GraphicEq),
    Translation("translation", "Translate", Icons.Outlined.Translate),
    Server("server", "Server", Icons.Outlined.Cloud)
}

@Composable
fun AutoDubNavHost(
    viewModel: AutoDubViewModel,
    onRequestScreenCapture: () -> Unit,
    onStopScreenCapture: () -> Unit,
    onToggleOverlay: () -> Unit
) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route ?: AutoDubRoute.Dashboard.route
    val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()

    Scaffold(
        containerColor = CyberObsidian,
        topBar = {
            if (!isOnline) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(CyberDanger.copy(alpha = 0.2f))
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "OFFLINE: Koneksi internet terputus — terjemahan & neural dubbing cloud dihentikan.",
                        color = CyberDanger
                    )
                }
            }
        },
        bottomBar = {
            NavigationBar(containerColor = CyberSurface) {
                AutoDubRoute.entries.forEach { dest ->
                    NavigationBarItem(
                        selected = currentRoute == dest.route,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(AutoDubRoute.Dashboard.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(dest.icon, contentDescription = dest.label) },
                        label = { Text(dest.label, maxLines = 1) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CyberCyan,
                            selectedTextColor = CyberCyan,
                            unselectedIconColor = CyberTextMuted,
                            unselectedTextColor = CyberTextMuted,
                            indicatorColor = CyberCyan.copy(alpha = 0.14f)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding)) {
            NavHost(
                navController = navController,
                startDestination = AutoDubRoute.Dashboard.route
            ) {
                composable(AutoDubRoute.Dashboard.route) {
                    DashboardScreen(
                        viewModel = viewModel,
                        onNavigate = { navController.navigate(it.route) },
                        onRequestCapture = onRequestScreenCapture,
                        onStopCapture = onStopScreenCapture,
                        onToggleOverlay = onToggleOverlay
                    )
                }
                composable(AutoDubRoute.Scanner.route) {
                    ScreenScannerScreen(
                        viewModel = viewModel,
                        onStartCapture = onRequestScreenCapture,
                        onStopCapture = onStopScreenCapture,
                        onToggleOverlay = onToggleOverlay
                    )
                }
                composable(AutoDubRoute.Roi.route) {
                    RoiConfigScreen(viewModel = viewModel)
                }
                composable(AutoDubRoute.Characters.route) {
                    CharacterManagerScreen(viewModel = viewModel)
                }
                composable(AutoDubRoute.VoiceStudio.route) {
                    AiVoiceStudioScreen(viewModel = viewModel)
                }
                composable(AutoDubRoute.Translation.route) {
                    TranslationSettingsScreen(viewModel = viewModel)
                }
                composable(AutoDubRoute.Server.route) {
                    ServerSettingsScreen(viewModel = viewModel)
                }
            }
        }
    }
}
