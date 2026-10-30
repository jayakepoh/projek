package id.nusantara.tv

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.webkit.WebViewAssetLoader

class WebActivity : Activity() {
    private lateinit var container: FrameLayout
    private lateinit var webView: WebView
    private lateinit var chromeClient: WebChromeClient
    private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
    private var fullScreenView: View? = null
    private var fullScreenCallback: WebChromeClient.CustomViewCallback? = null
    private var previousSystemUiVisibility = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)) {
            window.decorView.systemUiVisibility = immersiveFlags()
        }

        container = FrameLayout(this).apply { setBackgroundColor(Color.rgb(16, 26, 25)) }
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            isFocusable = true
            isFocusableInTouchMode = true
        }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this, "www"))
            .build()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean = request.isForMainFrame && request.url.host != ASSET_HOST
        }
        chromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                pendingFileCallback?.onReceiveValue(null)
                pendingFileCallback = filePathCallback
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
                        "audio/x-mpegurl",
                        "application/vnd.apple.mpegurl",
                        "text/plain",
                        "application/octet-stream"
                    ))
                }
                startActivityForResult(intent, REQUEST_PLAYLIST_FILE)
                return true
            }

            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                if (fullScreenView != null) {
                    callback.onCustomViewHidden()
                    return
                }
                previousSystemUiVisibility = window.decorView.systemUiVisibility
                fullScreenView = view
                fullScreenCallback = callback
                webView.visibility = View.GONE
                container.addView(view, FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ))
                window.decorView.systemUiVisibility = immersiveFlags()
            }

            override fun onHideCustomView() {
                val view = fullScreenView ?: return
                container.removeView(view)
                fullScreenView = null
                webView.visibility = View.VISIBLE
                window.decorView.systemUiVisibility = previousSystemUiVisibility
                fullScreenCallback?.onCustomViewHidden()
                fullScreenCallback = null
            }
        }
        webView.webChromeClient = chromeClient

        container.addView(webView, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        setContentView(container)
        webView.loadUrl("$ASSET_ORIGIN/index.html")
        webView.requestFocus()
    }

    @Deprecated("Deprecated in Android, retained for WebView file chooser compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_PLAYLIST_FILE) return
        val selected = if (resultCode == RESULT_OK) data?.data?.let { arrayOf(it) } else null
        pendingFileCallback?.onReceiveValue(selected)
        pendingFileCallback = null
    }

    @Deprecated("Deprecated in Android, retained for compatibility with the Activity API")
    override fun onBackPressed() {
        if (fullScreenView != null) {
            chromeClient.onHideCustomView()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        pendingFileCallback?.onReceiveValue(null)
        pendingFileCallback = null
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    private fun immersiveFlags(): Int =
        View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY

    companion object {
        private const val REQUEST_PLAYLIST_FILE = 2001
        private const val ASSET_HOST = "appassets.androidplatform.net"
        private const val ASSET_ORIGIN = "https://$ASSET_HOST"
    }
}
