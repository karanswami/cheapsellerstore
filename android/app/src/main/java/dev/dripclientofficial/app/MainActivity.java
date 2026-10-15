package dev.dripclientofficial.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String PROD_HOST = "dripclientofficial.dev";
    private static final String OFFLINE_URL = "https://localhost/offline.html";
    private static final int SHELL_BG = 0xff0c0c0e;
    private static final int SPLASH_MAX_MS = 12_000;

    /** Kept until web hide or hard timeout — prevents Android 12+ white flash. */
    private boolean keepSplash = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Must run before super.onCreate so Theme.SplashScreen attrs actually show.
        SplashScreen.installSplashScreen(this).setKeepOnScreenCondition(() -> keepSplash);

        // Capacitor android.adjustMarginsForEdgeToEdge=force handles insets via margins.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        super.onCreate(savedInstanceState);
        // Block screenshots / recent-apps previews inside the APK WebView shell.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(SHELL_BG);
        getWindow().getDecorView().setBackgroundColor(SHELL_BG);
        configureWebView();
        maybeLoadOfflineOnColdStart();
        handleAuthCallbackIntent(getIntent());

        // Hard failsafe if JS never calls hide (offline / broken WebView).
        new Handler(Looper.getMainLooper()).postDelayed(this::releaseNativeSplash, SPLASH_MAX_MS);
    }

    /** Called from JS (`DripNative.releaseSplash`) after first paint. */
    public void releaseNativeSplash() {
        keepSplash = false;
    }

    private final class DripNativeBridge {
        @JavascriptInterface
        public void releaseSplash() {
            runOnUiThread(MainActivity.this::releaseNativeSplash);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAuthCallbackIntent(intent);
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebView();
    }

    private boolean hasUsableNetwork() {
        ConnectivityManager cm =
            (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) {
            return true;
        }
        Network network = cm.getActiveNetwork();
        if (network == null) {
            return false;
        }
        NetworkCapabilities caps = cm.getNetworkCapabilities(network);
        if (caps == null) {
            return false;
        }
        boolean hasInternet =
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        boolean validated =
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        // Prefer validated; fall back to INTERNET when VALIDATED is still pending.
        return hasInternet && (validated || caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
            || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
            || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
    }

    /** Skip waiting for WebView DNS/TLS failure when already offline. */
    private void maybeLoadOfflineOnColdStart() {
        if (hasUsableNetwork()) {
            return;
        }
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }
        bridge.getWebView().loadUrl(OFFLINE_URL);
    }

    private void configureWebView() {
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }
        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }

        webView.setBackgroundColor(SHELL_BG);
        View parent = (View) webView.getParent();
        if (parent != null) {
            parent.setBackgroundColor(SHELL_BG);
        }

        WebSettings settings = webView.getSettings();
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Belt-and-suspenders splash dismiss if Capacitor plugin hide races.
        webView.removeJavascriptInterface("DripNative");
        webView.addJavascriptInterface(new DripNativeBridge(), "DripNative");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        if (webView.getWebViewClient() instanceof DripWebViewClient) {
            return;
        }
        WebViewClient existing = webView.getWebViewClient();
        webView.setWebViewClient(new DripWebViewClient(existing));
    }

    /** CSS px for the status bar — belt-and-suspenders if margins ever lag. */
    private int statusBarCssPx() {
        int px = 0;
        int resId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resId > 0) {
            px = getResources().getDimensionPixelSize(resId);
        }
        if (px <= 0) {
            px = Math.round(24f * getResources().getDisplayMetrics().density);
        }
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        return Math.max(24, Math.round(px / metrics.density));
    }

    private void injectNativeSafeArea(WebView view) {
        int topCss = statusBarCssPx();
        // Prefer live top margin from adjustMarginsForEdgeToEdge when present.
        ViewGroup.LayoutParams lp = view.getLayoutParams();
        if (lp instanceof ViewGroup.MarginLayoutParams) {
            int marginTop = ((ViewGroup.MarginLayoutParams) lp).topMargin;
            if (marginTop > 0) {
                // Margins already reserved the status bar — don't double-pad CSS.
                topCss = 0;
            }
        }
        String js =
            "(function(){" +
            "var d=document.documentElement;" +
            "d.classList.add('native-app');" +
            "d.style.setProperty('--safe-area-top-pad','" +
            topCss +
            "px');" +
            "})();";
        view.evaluateJavascript(js, null);
    }

    private void handleAuthCallbackIntent(Intent intent) {
        if (intent == null) {
            return;
        }
        Uri data = intent.getData();
        if (data == null) {
            return;
        }

        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        String scheme = data.getScheme();
        // Custom Tabs completes Google OAuth then redirects dripclient://oauth?token=…
        // so the session cookie is set inside the WebView jar (not Chrome).
        if (scheme != null && scheme.equals("dripclient") && "oauth".equals(data.getHost())) {
            String error = data.getQueryParameter("error");
            if (error != null && !error.isEmpty()) {
                bridge.getWebView().loadUrl(
                    "https://" + PROD_HOST + "/?auth=login&google_error=" + Uri.encode(error)
                );
                return;
            }
            String token = data.getQueryParameter("token");
            if (token != null && !token.isEmpty()) {
                bridge.getWebView().loadUrl(
                    "https://" + PROD_HOST + "/api/auth/native-handoff?token=" + Uri.encode(token)
                );
            }
            return;
        }

        if (!isAppHost(data.getHost())) {
            return;
        }
        String path = data.getPath();
        if (path == null || !path.startsWith("/api/auth/google/callback")) {
            return;
        }
        bridge.getWebView().loadUrl(data.toString());
    }

    private boolean isAppHost(String host) {
        if (host == null) {
            return false;
        }
        String normalized = host.toLowerCase();
        return normalized.equals(PROD_HOST) || normalized.equals("www." + PROD_HOST);
    }

    private boolean shouldOpenInCustomTab(Uri uri) {
        if (uri == null) {
            return false;
        }
        String scheme = uri.getScheme();
        if (scheme == null) {
            return false;
        }
        if (!scheme.equals("http") && !scheme.equals("https")) {
            return false;
        }
        String host = uri.getHost();
        if (host == null) {
            return false;
        }
        String normalized = host.toLowerCase();

        if (normalized.equals("accounts.google.com")) {
            return true;
        }
        if (normalized.equals("google.com") || normalized.endsWith(".google.com")) {
            String path = uri.getPath();
            return path != null && path.contains("/oauth");
        }
        if (normalized.contains("cashfree.com")) {
            return true;
        }
        if (normalized.contains("binance.com")) {
            return true;
        }
        if (normalized.contains("ramashop.my.id")) {
            return true;
        }
        return false;
    }

    private void openCustomTab(Uri uri) {
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
        builder.setShowTitle(true);
        // Stay in our task so dripclient://oauth returns to this MainActivity cleanly.
        CustomTabsIntent customTabsIntent = builder.build();
        customTabsIntent.launchUrl(this, uri);
    }

    private final class DripWebViewClient extends WebViewClient {

        private final WebViewClient delegate;

        DripWebViewClient(WebViewClient delegate) {
            this.delegate = delegate;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            if (scheme != null && scheme.equals("intent")) {
                return true;
            }
            if (shouldOpenInCustomTab(uri)) {
                openCustomTab(uri);
                return true;
            }
            if (delegate != null) {
                return delegate.shouldOverrideUrlLoading(view, request);
            }
            return false;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            injectNativeSafeArea(view);
            if (delegate != null) {
                delegate.onPageStarted(view, url, favicon);
            } else {
                super.onPageStarted(view, url, favicon);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            injectNativeSafeArea(view);
            // Re-check after layout applies Capacitor edge-to-edge margins.
            view.postDelayed(() -> injectNativeSafeArea(view), 120);
            if (delegate != null) {
                delegate.onPageFinished(view, url);
            } else {
                super.onPageFinished(view, url);
            }
        }

        @Override
        public void onReceivedError(
            WebView view,
            WebResourceRequest request,
            WebResourceError error
        ) {
            if (request.isForMainFrame()) {
                view.loadUrl(OFFLINE_URL);
                return;
            }
            if (delegate != null) {
                delegate.onReceivedError(view, request, error);
            } else {
                super.onReceivedError(view, request, error);
            }
        }

        @Override
        public void onReceivedHttpError(
            WebView view,
            WebResourceRequest request,
            WebResourceResponse errorResponse
        ) {
            if (
                request.isForMainFrame() &&
                errorResponse != null &&
                errorResponse.getStatusCode() >= 500
            ) {
                view.loadUrl(OFFLINE_URL);
                return;
            }
            if (delegate != null) {
                delegate.onReceivedHttpError(view, request, errorResponse);
            } else {
                super.onReceivedHttpError(view, request, errorResponse);
            }
        }

        @Override
        public void onReceivedSslError(
            WebView view,
            SslErrorHandler handler,
            SslError error
        ) {
            handler.cancel();
            view.loadUrl(OFFLINE_URL);
        }
    }
}
