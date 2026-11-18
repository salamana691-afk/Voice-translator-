package com.autodub.cloud.audio

import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.io.File

class ExoDubPlayer(context: Context) {
    private val appContext = context.applicationContext
    private var exoPlayer: ExoPlayer? = null
    private var currentFile: File? = null

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _isMuted = MutableStateFlow(false)
    val isMuted: StateFlow<Boolean> = _isMuted.asStateFlow()

    private suspend fun ensurePlayer(): ExoPlayer = withContext(Dispatchers.Main) {
        exoPlayer ?: ExoPlayer.Builder(appContext).build().apply {
            addListener(object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    _isPlaying.value = isPlaying
                }

                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_ENDED) {
                        _isPlaying.value = false
                    }
                }
            })
            exoPlayer = this
        }
    }

    suspend fun playWavBase64(
        audioBase64: String,
        speechRate: Float = 1.0f
    ) {
        val wavBytes = withContext(Dispatchers.IO) {
            Base64.decode(audioBase64, Base64.DEFAULT)
        }
        val tempFile = withContext(Dispatchers.IO) {
            val out = File(appContext.cacheDir, "dub_${System.currentTimeMillis()}.wav")
            out.writeBytes(wavBytes)
            currentFile?.delete()
            currentFile = out
            out
        }

        withContext(Dispatchers.Main) {
            val player = ensurePlayer()
            player.stop()
            player.clearMediaItems()
            player.setMediaItem(MediaItem.fromUri(Uri.fromFile(tempFile)))
            player.playbackParameters = PlaybackParameters(speechRate.coerceIn(0.5f, 2.0f))
            player.volume = if (_isMuted.value) 0f else 1f
            player.prepare()
            player.play()
        }
    }

    suspend fun setMuted(muted: Boolean) {
        _isMuted.value = muted
        withContext(Dispatchers.Main) {
            exoPlayer?.volume = if (muted) 0f else 1f
        }
    }

    suspend fun stop() {
        withContext(Dispatchers.Main) {
            exoPlayer?.stop()
            _isPlaying.value = false
        }
    }

    suspend fun release() {
        withContext(Dispatchers.Main) {
            exoPlayer?.release()
            exoPlayer = null
            _isPlaying.value = false
        }
        withContext(Dispatchers.IO) {
            currentFile?.delete()
            currentFile = null
        }
    }
}
