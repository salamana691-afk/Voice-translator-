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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autodub.cloud.ui.theme.CyberBorder
import com.autodub.cloud.ui.theme.CyberCyan
import com.autodub.cloud.ui.theme.CyberDanger
import com.autodub.cloud.ui.theme.CyberObsidian
import com.autodub.cloud.ui.theme.CyberSuccess
import com.autodub.cloud.ui.theme.CyberSurface
import com.autodub.cloud.ui.theme.CyberTextMuted
import com.autodub.cloud.viewmodel.AutoDubViewModel

@Composable
fun ServerSettingsScreen(viewModel: AutoDubViewModel) {
    val saved by viewModel.settings.collectAsStateWithLifecycle()
    val serverState by viewModel.serverState.collectAsStateWithLifecycle()
    var urlInput by remember { mutableStateOf(saved.backendBaseUrl) }

    LaunchedEffect(saved.backendBaseUrl) {
        urlInput = saved.backendBaseUrl
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("API & Server Settings", style = MaterialTheme.typography.headlineMedium)
        Text(
            "API key Gemini hanya disimpan di Cloud Server. APK tidak menyimpan secret key.",
            color = CyberTextMuted
        )

        OutlinedTextField(
            value = urlInput,
            onValueChange = { urlInput = it },
            label = { Text("Backend Cloud Run URL") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = { viewModel.updateSettings(saved.copy(backendBaseUrl = urlInput.trim())) },
                colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberObsidian)
            ) {
                Text("Simpan URL")
            }
            OutlinedButton(
                enabled = !serverState.isChecking,
                onClick = { viewModel.checkServerHealth(urlInput.trim()) }
            ) {
                Text(if (serverState.isChecking) "Memeriksa..." else "Uji /health")
            }
        }

        serverState.error?.let { err ->
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberDanger.copy(alpha = 0.14f)),
                border = BorderStroke(1.dp, CyberDanger),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(err, color = CyberDanger, modifier = Modifier.padding(14.dp))
            }
        }

        serverState.health?.let { health ->
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberSurface),
                border = BorderStroke(1.dp, CyberSuccess),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Server Terhubung: ${health.status.uppercase()}", color = CyberSuccess)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Service: ${health.service}", color = CyberTextMuted)
                    Text("Gemini Configured: ${health.geminiConfigured}", color = CyberTextMuted)
                    Text("Uptime: ${health.uptimeSeconds}s", color = CyberTextMuted)
                }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("Kebijakan Online-Only", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Jika internet terputus, aplikasi menghentikan permintaan cloud, menampilkan indikator offline, dan tidak akan mengganti suara ke Android Native TTS.",
                    color = CyberTextMuted
                )
            }
        }
    }
}
