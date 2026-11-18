package com.autodub.cloud.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.material3.Switch
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
import com.autodub.cloud.ui.theme.CyberObsidian
import com.autodub.cloud.ui.theme.CyberSurface
import com.autodub.cloud.ui.theme.CyberTextMuted
import com.autodub.cloud.viewmodel.AutoDubViewModel

@Composable
fun TranslationSettingsScreen(viewModel: AutoDubViewModel) {
    val saved by viewModel.settings.collectAsStateWithLifecycle()
    var draft by remember { mutableStateOf(saved) }

    LaunchedEffect(saved) {
        draft = saved
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Translation Settings", style = MaterialTheme.typography.headlineMedium)
        Text("Konfigurasi mesin terjemahan konteks Visual Novel (Gemini Cloud).", color = CyberTextMuted)

        OutlinedTextField(
            value = draft.sourceLang,
            onValueChange = { draft = draft.copy(sourceLang = it) },
            label = { Text("Bahasa Sumber") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = draft.targetLang,
            onValueChange = { draft = draft.copy(targetLang = it) },
            label = { Text("Bahasa Target") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ToggleRow("Pertahankan Nama Karakter & Istilah", draft.preserveNames) {
                    draft = draft.copy(preserveNames = it)
                }
                ToggleRow("Pertahankan Honorific (-san, -chan, -senpai)", draft.preserveHonorifics) {
                    draft = draft.copy(preserveHonorifics = it)
                }
                ToggleRow("Gunakan Konteks Dialog Sebelumnya", draft.vnContextEnabled) {
                    draft = draft.copy(vnContextEnabled = it)
                }
                ToggleRow("Putar Dubbing Otomatis (ExoPlayer)", draft.autoPlayDub) {
                    draft = draft.copy(autoPlayDub = it)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = { viewModel.updateSettings(draft) },
                colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberObsidian)
            ) {
                Text("Simpan Pengaturan")
            }
            OutlinedButton(onClick = { viewModel.clearCaches() }) {
                Text("Bersihkan Cache Lokal")
            }
        }
    }
}

@Composable
private fun ToggleRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, modifier = Modifier.weight(1f).padding(end = 8.dp))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
