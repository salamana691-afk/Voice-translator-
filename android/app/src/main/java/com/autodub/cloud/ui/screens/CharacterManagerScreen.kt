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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autodub.cloud.data.local.entity.CharacterProfileEntity
import com.autodub.cloud.ui.theme.CyberBorder
import com.autodub.cloud.ui.theme.CyberCyan
import com.autodub.cloud.ui.theme.CyberDanger
import com.autodub.cloud.ui.theme.CyberObsidian
import com.autodub.cloud.ui.theme.CyberPurple
import com.autodub.cloud.ui.theme.CyberSurface
import com.autodub.cloud.ui.theme.CyberTextMuted
import com.autodub.cloud.viewmodel.AutoDubViewModel

@Composable
fun CharacterManagerScreen(viewModel: AutoDubViewModel) {
    val characters by viewModel.characters.collectAsStateWithLifecycle()
    var editingProfile by remember { mutableStateOf<CharacterProfileEntity?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Character Manager", style = MaterialTheme.typography.headlineMedium)
                Text("Karakter tak dikenal otomatis memakai NARRATOR.", color = CyberTextMuted)
            }
            Button(
                onClick = {
                    editingProfile = CharacterProfileEntity(
                        characterName = "",
                        normalizedKey = "",
                        voiceId = "Kore",
                        voicePersonality = "",
                        emotion = "neutral",
                        speechRate = 1.0f,
                        pitch = 0.0f
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = CyberObsidian)
            ) {
                Text("Tambah")
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(characters, key = { it.id }) { item ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = CyberSurface),
                    border = BorderStroke(1.dp, CyberBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.characterName, color = CyberCyan, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "${item.voiceId} · ${item.emotion} · Rate ${item.speechRate}x · Pitch ${item.pitch}",
                                    color = CyberPurple,
                                    style = MaterialTheme.typography.labelMedium
                                )
                            }
                            Switch(
                                checked = item.isEnabled,
                                onCheckedChange = { viewModel.toggleCharacterEnabled(item) }
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(item.voicePersonality, color = CyberTextMuted, style = MaterialTheme.typography.bodyMedium)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { editingProfile = item }) {
                                Text("Edit")
                            }
                            if (item.normalizedKey != "narrator") {
                                OutlinedButton(onClick = { viewModel.deleteCharacter(item) }) {
                                    Text("Hapus", color = CyberDanger)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    editingProfile?.let { current ->
        var name by remember(current) { mutableStateOf(current.characterName) }
        var voiceId by remember(current) { mutableStateOf(current.voiceId) }
        var personality by remember(current) { mutableStateOf(current.voicePersonality) }
        var emotion by remember(current) { mutableStateOf(current.emotion) }

        AlertDialog(
            onDismissRequest = { editingProfile = null },
            containerColor = CyberSurface,
            title = { Text(if (current.id == 0L) "Karakter Baru" else "Edit Karakter") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Character Name") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = voiceId,
                        onValueChange = { voiceId = it },
                        label = { Text("Voice ID (Kore/Zephyr/Puck/Charon/Fenrir)") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = emotion,
                        onValueChange = { emotion = it },
                        label = { Text("Emotion (cheerful/playful/calm/sad/angry)") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = personality,
                        onValueChange = { personality = it },
                        label = { Text("Voice Personality") }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            viewModel.upsertCharacter(
                                current.copy(
                                    characterName = name,
                                    voiceId = voiceId.ifBlank { "Kore" },
                                    emotion = emotion.ifBlank { "neutral" },
                                    voicePersonality = personality
                                )
                            )
                            editingProfile = null
                        }
                    }
                ) {
                    Text("Simpan")
                }
            },
            dismissButton = {
                TextButton(onClick = { editingProfile = null }) {
                    Text("Batal")
                }
            }
        )
    }
}
