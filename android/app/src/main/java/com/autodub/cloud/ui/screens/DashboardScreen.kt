package com.autodub.cloud.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autodub.cloud.ui.navigation.AutoDubRoute
import com.autodub.cloud.ui.theme.CyberBorder
import com.autodub.cloud.ui.theme.CyberCyan
import com.autodub.cloud.ui.theme.CyberDanger
import com.autodub.cloud.ui.theme.CyberObsidian
import com.autodub.cloud.ui.theme.CyberPurple
import com.autodub.cloud.ui.theme.CyberSuccess
import com.autodub.cloud.ui.theme.CyberSurface
import com.autodub.cloud.ui.theme.CyberTextMuted
import com.autodub.cloud.ui.theme.CyberTextPrimary
import com.autodub.cloud.viewmodel.AutoDubViewModel

@Composable
fun DashboardScreen(
    viewModel: AutoDubViewModel,
    onNavigate: (AutoDubRoute) -> Unit,
    onRequestCapture: () -> Unit,
    onStopCapture: () -> Unit,
    onToggleOverlay: () -> Unit
) {
    val pipeline by viewModel.livePipelineState.collectAsStateWithLifecycle()
    val characters by viewModel.characters.collectAsStateWithLifecycle()
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text("AutoDub Cloud", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "AI Visual Novel Screen Translator & Neural Voice Dubbing",
                style = MaterialTheme.typography.bodyMedium,
                color = CyberTextMuted
            )
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberSurface),
                border = BorderStroke(1.dp, if (isOnline) CyberCyan.copy(alpha = 0.5f) else CyberDanger),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Status Sistem", style = MaterialTheme.typography.titleMedium)
                        Text(
                            text = if (isOnline) "ONLINE" else "OFFLINE",
                            color = if (isOnline) CyberSuccess else CyberDanger,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(pipeline.statusMessage, color = CyberTextPrimary)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = {
                                if (pipeline.isScanning) onStopCapture() else onRequestCapture()
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (pipeline.isScanning) CyberDanger else CyberCyan,
                                contentColor = CyberObsidian
                            )
                        ) {
                            Text(if (pipeline.isScanning) "Stop Scanner" else "Mulai Dubbing")
                        }
                        OutlinedButton(onClick = onToggleOverlay) {
                            Text(
                                if (pipeline.isOverlayActive) "Tutup Overlay" else "Aktifkan Overlay",
                                color = CyberPurple
                            )
                        }
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SummaryTile(
                    title = "Karakter Aktif",
                    value = "${characters.count { it.isEnabled }} / ${characters.size}",
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate(AutoDubRoute.Characters) }
                )
                SummaryTile(
                    title = "Bahasa",
                    value = "${settings.sourceLang} -> ${settings.targetLang}",
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate(AutoDubRoute.Translation) }
                )
            }
        }

        item {
            Text("Riwayat Dubbing Terkini", style = MaterialTheme.typography.titleLarge)
        }

        if (pipeline.recentLogs.isEmpty()) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = CyberSurface),
                    border = BorderStroke(1.dp, CyberBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Belum ada dialog diproses. Buka game Visual Novel, aktifkan ROI & mulai Scanner.",
                        color = CyberTextMuted,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        } else {
            items(pipeline.recentLogs.take(6)) { log ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = CyberSurface),
                    border = BorderStroke(1.dp, CyberBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(log.speaker, color = CyberCyan, style = MaterialTheme.typography.titleMedium)
                            Text(log.voiceUsed, color = CyberPurple, style = MaterialTheme.typography.labelMedium)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(log.originalText, color = CyberTextMuted, style = MaterialTheme.typography.bodyMedium)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(log.translatedText, color = CyberTextPrimary, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryTile(
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = CyberSurface),
        border = BorderStroke(1.dp, CyberBorder),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, color = CyberTextMuted, style = MaterialTheme.typography.labelMedium)
            Spacer(modifier = Modifier.height(6.dp))
            Text(value, color = CyberTextPrimary, style = MaterialTheme.typography.titleMedium)
        }
    }
}
