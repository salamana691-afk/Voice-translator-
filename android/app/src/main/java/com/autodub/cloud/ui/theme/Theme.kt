package com.autodub.cloud.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val CyberDarkColorScheme = darkColorScheme(
    primary = CyberCyan,
    onPrimary = CyberObsidian,
    secondary = CyberPurple,
    onSecondary = CyberTextPrimary,
    background = CyberObsidian,
    onBackground = CyberTextPrimary,
    surface = CyberSurface,
    onSurface = CyberTextPrimary,
    surfaceVariant = CyberSurfaceElevated,
    onSurfaceVariant = CyberTextMuted,
    outline = CyberBorder,
    error = CyberDanger,
    onError = CyberObsidian
)

@Composable
fun AutoDubCyberTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CyberDarkColorScheme,
        typography = CyberTypography,
        content = content
    )
}
