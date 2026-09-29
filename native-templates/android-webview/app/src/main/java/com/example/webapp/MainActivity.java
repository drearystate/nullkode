package com.example.webapp;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

/**
 * Thin native shell for a published app: a full-screen WebView pointed at the
 * app's live address (R.string.start_url). Because it loads the live site,
 * publishing changes updates the app with no rebuild. Each build moves this
 * class into the app's own package (src/lib/apk-build.ts).
 */
public class MainActivity extends Activity {

    private WebView web;
    private BackNavigation back; // Android 13 and newer
    private int themeColor;
    private int pageColor;
    private String offlineTemplate;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        themeColor = parseColor(getString(R.string.theme_color), Color.parseColor("#0b0b0b"));
        pageColor = parseColor(getString(R.string.page_background), themeColor);

        web = new WebView(this);
        web.setBackgroundColor(pageColor);

        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setLoadWithOverviewMode(true);
        ws.setUseWideViewPort(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        // The app only loads its live https site, never local files.
        ws.setAllowFileAccess(false);
        ws.setSupportMultipleWindows(false);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setWebViewClient(new WebViewClient() {
            // Every web address stays inside the app. That includes the
            // redirect from the platform's /app/<slug> (where older installs
            // start) to the app's own domain or <label>.<APPS_DOMAIN> origin,
            // and sign-in or payment pages that return to the app. Other kinds
            // of links (tel:, mailto:, maps, other apps) open the app that
            // handles them instead of an error page.
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
                switch (scheme) {
                    case "http":
                    case "https":
                    case "about":
                    case "data":
                    case "blob":
                    case "javascript":
                        return false;
                    default:
                        openOutside(uri, scheme);
                        return true;
                }
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                updateBackNavigation();
            }

            // No connection, or the server can't be reached: show our own page
            // in the app's colors instead of WebView's built-in error page,
            // which is dark text that can't be read on a dark background.
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (!request.isForMainFrame()) return;
                CharSequence description = error.getDescription();
                if (description != null && description.toString().contains("ERR_ABORTED")) return;
                showOfflinePage(view, request.getUrl().toString());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(themeColor);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        if (Build.VERSION.SDK_INT >= 35) {
            EdgeToEdge.apply(this, root, themeColor);
        }
        if (Build.VERSION.SDK_INT >= 33) {
            back = new BackNavigation(web);
        }

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(getString(R.string.start_url));
        }
        updateBackNavigation();
    }

    private void updateBackNavigation() {
        if (back != null) back.update(this, web.canGoBack());
    }

    /** Opens a non-web link (tel:, mailto:, intent:, …) in the app that handles it. */
    private void openOutside(Uri uri, String scheme) {
        try {
            Intent intent;
            if ("intent".equals(scheme)) {
                intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                // Links from a web page may only open browsable activities.
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
                intent.setFlags(intent.getFlags() & ~(Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION));
            } else {
                intent = new Intent(Intent.ACTION_VIEW, uri);
            }
            startActivity(intent);
        } catch (Exception ignored) {
            // No app on this phone handles the link.
        }
    }

    /**
     * Replaces the failed page with assets/offline.html, filled in with the
     * app's colors. "Try again" (or the connection coming back) reloads the
     * page that failed. The failed address stays in the back history.
     * Placeholders: {{BG}} {{FG}} {{ACCENT}} {{ACCENT_FG}} (colors),
     * {{APP_NAME}} (HTML-escaped) and {{RETRY_URL_JSON}} (a JSON string).
     * src/lib/native.ts fills the same file for the iOS app.
     */
    private void showOfflinePage(WebView view, String failedUrl) {
        String retryUrl = failedUrl != null && failedUrl.startsWith("http")
                ? failedUrl
                : getString(R.string.start_url);
        String html = offlinePage(retryUrl);
        if (html == null) return;
        view.stopLoading();
        view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", retryUrl);
    }

    private String offlinePage(String retryUrl) {
        if (offlineTemplate == null) {
            try (InputStream in = getAssets().open("offline.html")) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                offlineTemplate = out.toString("UTF-8");
            } catch (IOException e) {
                return null;
            }
        }
        int text = Colors.readableOn(pageColor);
        // A button in the theme color, unless it would blend into the background.
        boolean themeShows = Colors.contrast(themeColor, pageColor) >= 1.6;
        int button = themeShows ? themeColor : text;
        int buttonText = themeShows ? Colors.readableOn(themeColor) : pageColor;
        return offlineTemplate
                .replace("{{BG}}", Colors.css(pageColor))
                .replace("{{FG}}", Colors.css(text))
                .replace("{{ACCENT}}", Colors.css(button))
                .replace("{{ACCENT_FG}}", Colors.css(buttonText))
                .replace("{{APP_NAME}}", escapeHtml(getString(R.string.app_name)))
                .replace("{{RETRY_URL_JSON}}", JSONObject.quote(retryUrl));
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static int parseColor(String value, int fallback) {
        try {
            return Color.parseColor(value);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    // Used up to Android 12, and on Android 13-15 for apps that have not opted
    // in to predictive back. Android 16 no longer calls it for apps that target
    // API 36; BackNavigation handles those.
    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    /** Contrast helpers (WCAG relative luminance). Color.luminance() needs API 24. */
    private static final class Colors {
        static double luminance(int c) {
            return 0.2126 * channel(Color.red(c)) + 0.7152 * channel(Color.green(c))
                    + 0.0722 * channel(Color.blue(c));
        }

        private static double channel(int v) {
            double s = v / 255.0;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        }

        static double contrast(int a, int b) {
            double la = luminance(a);
            double lb = luminance(b);
            return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        }

        /** White or near-black, whichever is easier to read on the given color. */
        static int readableOn(int background) {
            int dark = Color.rgb(17, 17, 17);
            return contrast(Color.WHITE, background) >= contrast(dark, background) ? Color.WHITE : dark;
        }

        static String css(int c) {
            return String.format("#%06X", 0xFFFFFF & c);
        }
    }

    /**
     * Android 13+: Back returns to the previous page while there is one. The
     * callback is registered only then, so on the first page Back leaves the
     * app with the system's predictive back animation.
     */
    private static final class BackNavigation {
        private final OnBackInvokedCallback callback;
        private boolean registered;

        BackNavigation(WebView web) {
            callback = web::goBack;
        }

        void update(Activity activity, boolean canGoBack) {
            OnBackInvokedDispatcher dispatcher = activity.getOnBackInvokedDispatcher();
            if (canGoBack && !registered) {
                dispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
                registered = true;
            } else if (!canGoBack && registered) {
                dispatcher.unregisterOnBackInvokedCallback(callback);
                registered = false;
            }
        }
    }

    /**
     * Android 15+ draws apps that target API 35 or newer edge to edge. Keep the
     * page clear of the status bar, navigation bar, display cutout and keyboard,
     * and pick bar icons that stay readable on the app's background color.
     */
    private static final class EdgeToEdge {
        static void apply(Activity activity, View root, int background) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return WindowInsets.CONSUMED;
            });
            int lightBars = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            WindowInsetsController controller = activity.getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                        Color.luminance(background) > 0.5f ? lightBars : 0, lightBars);
            }
        }
    }
}
