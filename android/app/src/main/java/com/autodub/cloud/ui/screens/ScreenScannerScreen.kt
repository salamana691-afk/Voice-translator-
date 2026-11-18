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
import com.autodub.cloud.ui.theme.CyberBorder
import com.autodub.cloud.ui.theme.CyberCyan
import com.autodub.cloud.ui.theme.CyberDanger
import com.autodub.cloud.ui.theme.CyberObsidian
import com.autodub.cloud.ui.theme.CyberPurple
import com.autodub.cloud.ui.theme.CyberSurface
import com.autodub.cloud.ui.theme.CyberTextMuted
import com.autodub.cloud.ui.theme.CyberTextPrimary
import com.autodub.cloud.viewmodel.AutoDubViewModel

@Composable
fun ScreenScannerScreen(
    viewModel: AutoDubViewModel,
    onStartCapture: () -> Unit,
    onStopCapture: () -> Unit,
    onToggleOverlay: () -> Unit
) {
    val pipeline by viewModel.livePipelineState.collectAsStateWithLifecycle()
    val roi by viewModel.roiConfig.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Screen Scanner", style = MaterialTheme.typography.headlineMedium)
            Text(
                "MediaProjection + ML Kit OCR Lokal (Screenshot tidak dikirim ke server)",
                style = MaterialTheme.typography.bodyMedium,
                color = CyberTextMuted
            )
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberSurface),
                border = BorderStroke(1.dp, CyberBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Kontrol Capture & Overlay", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Interval Scan: ${roi.scanIntervalMs} ms · Threshold Perubahan: ${(roi.changeThreshold * 100).toInt()}%",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { if (pipeline.isScanning) onStopCapture() else onStartCapture() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (pipeline.isScanning) CyberDanger else CyberCyan,
                                contentColor = CyberObsidian
                            )
                        ) {
                            Text(if (pipeline.isScanning) "Stop MediaProjection" else "Start MediaProjection")
                        }
                        OutlinedButton(onClick = onToggleOverlay) {
                            Text(if (pipeline.isOverlayActive) "Hide Overlay" else "Show Overlay", color = CyberPurple)
                        }
                    }
                }
            }
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberSurface),
                border = BorderStroke(1.dp, CyberBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Deteksi Saat Ini", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Speaker (ROI 1): ${pipeline.activeSpeaker}", color = CyberCyan)
                    Text("Suara: ${pipeline.activeVoiceLabel}", color = CyberPurple)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Teks Asli (ROI 2):", color = CyberTextMuted, style = MaterialTheme.typography.labelMedium)
                    Text(pipeline.originalDialog.ifBlank { "-" }, color = CyberTextPrimary)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Terjemahan:", color = CyberTextMuted, style = MaterialTheme.typography.labelMedium)
                    Text(pipeline.translatedDialog.ifBlank { "-" }, color = CyberTextPrimary)
                }
            }
        }

        item {
            Text("Log Pipeline (${pipeline.recentLogs.size})", style = MaterialTheme.typography.titleMedium)
        }

        items(pipeline.recentLogs) { item ->
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
                        Text(item.speaker, color = CyberCyan)
                        Text(item.status, color = CyberPurple, style = MaterialTheme.typography.labelMedium)
                    }
                    Text(item.translatedText, color = CyberTextPrimary)
                }
            }
        }
    }
}
