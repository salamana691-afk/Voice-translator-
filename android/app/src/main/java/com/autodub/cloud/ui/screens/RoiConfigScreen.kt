package com.autodub.cloud.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autodub.cloud.data.local.entity.RoiConfigEntity
import com.autodub.cloud.ui.theme.CyberBorder
import com.autodub.cloud.ui.theme.CyberCyan
import com.autodub.cloud.ui.theme.CyberObsidian
import com.autodub.cloud.ui.theme.CyberPurple
import com.autodub.cloud.ui.theme.CyberSurface
import com.autodub.cloud.ui.theme.CyberTextMuted
import com.autodub.cloud.viewmodel.AutoDubViewModel

@Composable
fun RoiConfigScreen(viewModel: AutoDubViewModel) {
    val savedConfig by viewModel.roiConfig.collectAsStateWithLifecycle()
    var draft by remember { mutableStateOf(savedConfig) }

    LaunchedEffect(savedConfig) {
        draft = savedConfig
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("ROI Configuration", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Atur area OCR lokal: ROI 1 (Nama Karakter) dan ROI 2 (Kotak Dialog).",
            color = CyberTextMuted
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .padding(8.dp)
                    .background(CyberObsidian, RoundedCornerShape(10.dp))
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    drawRect(
                        color = CyberCyan,
                        topLeft = Offset(draft.nameRoiX * size.width, draft.nameRoiY * size.height),
                        size = Size(draft.nameRoiWidth * size.width, draft.nameRoiHeight * size.height),
                        style = Stroke(width = 4f)
                    )
                    drawRect(
                        color = CyberPurple,
                        topLeft = Offset(draft.dialogRoiX * size.width, draft.dialogRoiY * size.height),
                        size = Size(draft.dialogRoiWidth * size.width, draft.dialogRoiHeight * size.height),
                        style = Stroke(width = 4f)
                    )
                }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("ROI 1 — Nama Karakter (Cyan)", color = CyberCyan, style = MaterialTheme.typography.titleMedium)
                RoiSlider("X", draft.nameRoiX) { draft = draft.copy(nameRoiX = it) }
                RoiSlider("Y", draft.nameRoiY) { draft = draft.copy(nameRoiY = it) }
                RoiSlider("Lebar", draft.nameRoiWidth) { draft = draft.copy(nameRoiWidth = it) }
                RoiSlider("Tinggi", draft.nameRoiHeight) { draft = draft.copy(nameRoiHeight = it) }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("ROI 2 — Dialog Box (Purple)", color = CyberPurple, style = MaterialTheme.typography.titleMedium)
                RoiSlider("X", draft.dialogRoiX) { draft = draft.copy(dialogRoiX = it) }
                RoiSlider("Y", draft.dialogRoiY) { draft = draft.copy(dialogRoiY = it) }
                RoiSlider("Lebar", draft.dialogRoiWidth) { draft = draft.copy(dialogRoiWidth = it) }
                RoiSlider("Tinggi", draft.dialogRoiHeight) { draft = draft.copy(dialogRoiHeight = it) }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = { viewModel.saveRoiConfig(draft) },
                colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberObsidian)
            ) {
                Text("Simpan ROI")
            }
            OutlinedButton(onClick = {
                val defaults = RoiConfigEntity()
                draft = defaults
                viewModel.saveRoiConfig(defaults)
            }) {
                Text("Reset Default")
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
    }
}

@Composable
private fun RoiSlider(label: String, value: Float, onValueChange: (Float) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = CyberTextMuted, modifier = Modifier.weight(0.22f))
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = 0.02f..0.95f,
            modifier = Modifier.weight(0.60f)
        )
        Text("${(value * 100).toInt()}%", style = MaterialTheme.typography.labelMedium, modifier = Modifier.weight(0.18f))
    }
}
