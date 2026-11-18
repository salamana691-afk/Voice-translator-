package com.autodub.cloud.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
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
import com.autodub.cloud.viewmodel.AutoDubViewModel

@Composable
fun AiVoiceStudioScreen(viewModel: AutoDubViewModel) {
    val studio by viewModel.studioState.collectAsStateWithLifecycle()
    val emotions by viewModel.emotions.collectAsStateWithLifecycle()
    val voices = listOf("Kore", "Zephyr", "Puck", "Charon", "Fenrir")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("AI Voice Studio", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Desain persona suara neural orisinal melalui Gemini TTS API.",
            color = CyberTextMuted
        )

        OutlinedTextField(
            value = studio.personaDescription,
            onValueChange = { value -> viewModel.updateStudioState { it.copy(personaDescription = value) } },
            label = { Text("Voice Personality Editor") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2
        )

        OutlinedTextField(
            value = studio.sampleText,
            onValueChange = { value -> viewModel.updateStudioState { it.copy(sampleText = value) } },
            label = { Text("Teks Uji Suara (Indonesia)") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2
        )

        Text("Pilihan Suara Dasar", style = MaterialTheme.typography.titleMedium)
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            voices.forEach { voice ->
                FilterChip(
                    selected = studio.selectedVoiceId == voice,
                    onClick = { viewModel.updateStudioState { it.copy(selectedVoiceId = voice) } },
                    label = { Text(voice) }
                )
            }
        }

        Text("Emotion Selector", style = MaterialTheme.typography.titleMedium)
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            emotions.forEach { emo ->
                FilterChip(
                    selected = studio.emotion == emo,
                    onClick = { viewModel.updateStudioState { it.copy(emotion = emo) } },
                    label = { Text(emo) }
                )
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("Speech Rate: ${String.format("%.2f", studio.speechRate)}x", color = CyberCyan)
                Slider(
                    value = studio.speechRate,
                    onValueChange = { v -> viewModel.updateStudioState { it.copy(speechRate = v) } },
                    valueRange = 0.6f..1.6f
                )
                Text("Pitch Shift: ${String.format("%.1f", studio.pitch)} st", color = CyberPurple)
                Slider(
                    value = studio.pitch,
                    onValueChange = { v -> viewModel.updateStudioState { it.copy(pitch = v) } },
                    valueRange = -5.0f..5.0f
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                enabled = !studio.isGenerating,
                onClick = { viewModel.generateVoiceDesignPreview() },
                colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberObsidian)
            ) {
                Text(if (studio.isGenerating) "Memproses..." else "Generate Preview")
            }
            OutlinedButton(
                enabled = !studio.isGenerating,
                onClick = { viewModel.testCurrentVoice() }
            ) {
                Text("Test Voice", color = CyberPurple)
            }
            if (studio.hasPreviewAudio) {
                OutlinedButton(onClick = { viewModel.replayLastPreview() }) {
                    Text("Putar Ulang")
                }
            }
        }

        studio.lastError?.let { err ->
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberDanger.copy(alpha = 0.14f)),
                border = BorderStroke(1.dp, CyberDanger),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(err, color = CyberDanger, modifier = Modifier.padding(12.dp))
            }
        }

        if (studio.lastModelUsed.isNotBlank()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberSurface),
                border = BorderStroke(1.dp, CyberBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Model: ${studio.lastModelUsed}", color = CyberCyan, style = MaterialTheme.typography.labelMedium)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Style Applied: ${studio.lastStyleApplied}", color = CyberTextMuted)
                }
            }
        }
    }
}
