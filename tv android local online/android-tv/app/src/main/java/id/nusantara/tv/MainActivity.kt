package id.nusantara.tv

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

private data class TvChannel(val name: String, val group: String, val streamUrl: String)

class MainActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private val channels = mutableListOf<TvChannel>()
    private lateinit var player: ExoPlayer
    private lateinit var playerView: PlayerView
    private lateinit var channelContainer: LinearLayout
    private lateinit var playlistUrl: EditText
    private lateinit var status: TextView
    private lateinit var emptyState: TextView
    private lateinit var loadButton: Button
    private lateinit var fileButton: Button
    private var selectedChannel: TvChannel? = null

    private val ink = Color.rgb(16, 26, 25)
    private val panel = Color.rgb(23, 35, 33)
    private val lime = Color.rgb(215, 237, 114)
    private val paper = Color.rgb(239, 242, 233)
    private val muted = Color.rgb(145, 160, 154)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility =
            (View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
        player = ExoPlayer.Builder(this).build()
        buildScreen()
        playlistUrl.setText(getPreferences(MODE_PRIVATE).getString("playlist_url", ""))
        loadButton.requestFocus()
    }

    private fun buildScreen() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(ink)
            isFocusableInTouchMode = true
        }
        val sidebar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(26), dp(24), dp(22), dp(22))
            setBackgroundColor(Color.rgb(19, 30, 28))
        }
        root.addView(sidebar, LinearLayout.LayoutParams(dp(350), LinearLayout.LayoutParams.MATCH_PARENT))

        sidebar.addView(label("OS TV ANDROID", 22, lime, true))
        sidebar.addView(label("PEMUTAR ANDROID TV", 12, muted, false).apply {
            setPadding(0, dp(5), 0, dp(26))
        })
        sidebar.addView(label("PLAYLIST RESMI / BERIZIN", 11, paper, true).apply {
            setPadding(0, 0, 0, dp(8))
        })

        playlistUrl = EditText(this).apply {
            hint = "https://alamat/playlist.m3u"
            setHintTextColor(Color.rgb(111, 126, 118))
            setTextColor(paper)
            textSize = 14f
            singleLine = true
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_URI
            imeOptions = EditorInfo.IME_ACTION_GO
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = rounded(panel, Color.rgb(58, 73, 67), 5)
            setOnEditorActionListener { _, actionId, _ ->
                if (actionId == EditorInfo.IME_ACTION_GO) {
                    loadPlaylist()
                    true
                } else false
            }
        }
        sidebar.addView(playlistUrl, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(54)
        ))

        loadButton = actionButton("MUAT DAFTAR KANAL") { loadPlaylist() }
        sidebar.addView(loadButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(52)
        ).apply { topMargin = dp(10) })

        fileButton = actionButton("PILIH FILE M3U") { openPlaylistPicker() }
        sidebar.addView(fileButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(52)
        ).apply { topMargin = dp(8) })

        status = label("Masukkan URL playlist HTTPS untuk memuat kanal.", 12, muted, false).apply {
            setPadding(0, dp(16), 0, dp(16))
        }
        sidebar.addView(status)
        sidebar.addView(label("DAFTAR KANAL", 12, paper, true).apply {
            setPadding(0, dp(7), 0, dp(10))
        })
        val channelScroll = ScrollView(this).apply { isFillViewport = true }
        channelContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        channelScroll.addView(channelContainer)
        sidebar.addView(channelScroll, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
        ))

        val viewingArea = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        root.addView(viewingArea, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f))
        playerView = PlayerView(this).apply {
            player = this@MainActivity.player
            useController = true
            resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
            visibility = View.GONE
        }
        viewingArea.addView(playerView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT
        ))
        emptyState = label("OS TV ANDROID\n\nPilih kanal dari daftar untuk mulai menonton.", 22, paper, true).apply {
            gravity = Gravity.CENTER
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            setPadding(dp(30), dp(30), dp(30), dp(30))
        }
        viewingArea.addView(emptyState, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT
        ))
        setContentView(root)
    }

    private fun loadPlaylist() {
        val address = playlistUrl.text.toString().trim()
        if (!address.startsWith("https://", ignoreCase = true)) {
            status.text = "Gunakan URL playlist HTTPS dari penyedia resmi atau berizin."
            playlistUrl.requestFocus()
            return
        }
        getPreferences(MODE_PRIVATE).edit().putString("playlist_url", address).apply()
        setLoading(true, "Memuat playlist...")
        worker.execute {
            val result = runCatching { fetchChannels(address) }
            runOnUiThread { showPlaylistResult(result) }
        }
    }

    private fun openPlaylistPicker() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
                "audio/x-mpegurl",
                "application/vnd.apple.mpegurl",
                "text/plain"
            ))
        }
        startActivityForResult(intent, REQUEST_PLAYLIST_FILE)
    }

    @Deprecated("Deprecated in Android, retained for compatibility with the Activity API")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_PLAYLIST_FILE || resultCode != RESULT_OK) return
        val uri: Uri = data?.data ?: return
        setLoading(true, "Memuat file playlist...")
        worker.execute {
            val result = runCatching {
                contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use { reader ->
                    val content = StringBuilder()
                    val buffer = CharArray(8192)
                    while (true) {
                        val count = reader.read(buffer)
                        if (count < 0) break
                        if (content.length + count > 3_000_000) error("file playlist terlalu besar")
                        content.append(buffer, 0, count)
                    }
                    parseM3u(content.toString())
                } ?: error("file tidak dapat dibuka")
            }
            runOnUiThread { showPlaylistResult(result) }
        }
    }

    private fun setLoading(loading: Boolean, message: String) {
        loadButton.isEnabled = !loading
        fileButton.isEnabled = !loading
        status.text = message
    }

    private fun showPlaylistResult(result: Result<List<TvChannel>>) {
        loadButton.isEnabled = true
        fileButton.isEnabled = true
        result.onSuccess { loaded ->
            channels.clear()
            channels.addAll(loaded)
            renderChannels()
            status.text = if (loaded.isEmpty()) "Playlist tidak berisi kanal HTTPS yang valid."
            else "${loaded.size} kanal siap diputar."
        }.onFailure { error ->
            status.text = "Gagal memuat playlist: ${error.message ?: "periksa file dan format M3U"}"
        }
    }

    private fun fetchChannels(address: String): List<TvChannel> {
        val connection = URL(address).openConnection() as HttpURLConnection
        connection.connectTimeout = 12_000
        connection.readTimeout = 15_000
        connection.instanceFollowRedirects = true
        connection.setRequestProperty("User-Agent", "OSTVAndroid/1.0 AndroidTV")
        try {
            connection.connect()
            if (connection.responseCode !in 200..299) error("server mengembalikan ${connection.responseCode}")
            val contentLength = connection.getHeaderField("Content-Length")?.toLongOrNull() ?: -1L
            if (contentLength > 3_000_000) error("file playlist terlalu besar")
            val text = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            return parseM3u(text)
        } finally {
            connection.disconnect()
        }
    }

    private fun parseM3u(text: String): List<TvChannel> {
        val parsed = mutableListOf<TvChannel>()
        var pendingName: String? = null
        var pendingGroup = "Umum"
        val seen = mutableSetOf<String>()
        text.lineSequence().forEach { rawLine ->
            val line = rawLine.trim()
            if (line.isEmpty()) return@forEach
            when {
                line.startsWith("#EXTINF", ignoreCase = true) -> {
                    val attributes = line.substringAfter(':', "")
                    val title = attributes.substringAfter(',', "").trim()
                    pendingName = title.ifEmpty { "Kanal ${parsed.size + 1}" }
                    pendingGroup = Regex("group-title=\"([^\"]*)\"")
                        .find(attributes)?.groupValues?.get(1)
                        ?.trim()?.ifEmpty { "Umum" } ?: "Umum"
                }
                line.startsWith("#") -> Unit
                else -> {
                    val streamUrl = line
                    val isHttps = streamUrl.startsWith("https://", ignoreCase = true)
                    val isLocal = streamUrl.startsWith("file://", ignoreCase = true)
                    if ((isHttps || isLocal) && seen.add(streamUrl)) {
                        parsed.add(TvChannel(
                            name = pendingName ?: "Kanal ${parsed.size + 1}",
                            group = pendingGroup,
                            streamUrl = streamUrl
                        ))
                    }
                    pendingName = null
                    pendingGroup = "Umum"
                }
            }
        }
        if (parsed.isEmpty() && text.contains("http", ignoreCase = true)) {
            error("playlist tidak memuat kanal HTTPS yang valid")
        }
        return parsed
    }

    private fun renderChannels() {
        channelContainer.removeAllViews()
        if (channels.isEmpty()) {
            channelContainer.addView(label("Kanal akan muncul di sini setelah playlist dimuat.", 12, muted, false))
            return
        }
        channels.forEach { channel ->
            val button = actionButton("${channel.name}\n${channel.group}") { playChannel(channel) }.apply {
                gravity = Gravity.CENTER_VERTICAL or Gravity.START
                textSize = 14f
                minHeight = dp(62)
                isSelected = selectedChannel == channel
            }
            channelContainer.addView(button, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(66)
            ).apply { bottomMargin = dp(5) })
        }
    }

    private fun playChannel(channel: TvChannel) {
        selectedChannel = channel
        val item = MediaItem.Builder()
            .setUri(channel.streamUrl)
            .apply {
                if (channel.streamUrl.substringBefore('?').endsWith(".m3u8", ignoreCase = true)) {
                    setMimeType(MimeTypes.APPLICATION_M3U8)
                }
            }
            .build()
        player.setMediaItem(item)
        player.prepare()
        player.playWhenReady = true
        playerView.visibility = View.VISIBLE
        emptyState.visibility = View.GONE
        status.text = "Memutar ${channel.name}"
        renderChannels()
    }

    private fun actionButton(textValue: String, action: () -> Unit): Button = Button(this).apply {
        text = textValue
        textSize = 13f
        setTextColor(paper)
        isAllCaps = false
        isFocusable = true
        isFocusableInTouchMode = true
        setPadding(dp(12), dp(7), dp(12), dp(7))
        background = rounded(panel, Color.rgb(58, 73, 67), 5)
        setOnFocusChangeListener { view, focused ->
            view.background = rounded(
                if (focused) Color.rgb(49, 64, 51) else panel,
                if (focused) lime else Color.rgb(58, 73, 67),
                5
            )
        }
        setOnClickListener { action() }
    }

    private fun label(textValue: String, size: Int, color: Int, bold: Boolean): TextView = TextView(this).apply {
        text = textValue
        textSize = size.toFloat()
        setTextColor(color)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        gravity = Gravity.CENTER_VERTICAL
    }

    private fun rounded(color: Int, stroke: Int, radius: Int) = GradientDrawable().apply {
        setColor(color)
        setCornerRadius(dp(radius).toFloat())
        setStroke(dp(1), stroke)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onStop() {
        player.pause()
        super.onStop()
    }

    override fun onDestroy() {
        worker.shutdownNow()
        player.release()
        super.onDestroy()
    }

    companion object {
        private const val REQUEST_PLAYLIST_FILE = 1001
    }
}
