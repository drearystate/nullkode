package com.example.webapp;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Thin native shell for a published app: a full-screen WebView pointed at the
 * app's live address (R.string.start_url). Because it loads the live site,
 * publishing changes updates the app with no rebuild. Each build moves this
 * class (and SharedFileProvider) into the app's own package
 * (src/lib/apk-build.ts).
 *
 * Phone features, for pages on the app's own addresses (R.string.app_hosts):
 * - File inputs open the phone's file picker, with "take a photo" (and "take
 *   a video" for video inputs) through the camera app.
 * - The camera, microphone and location are only granted to pages on the
 *   app's own addresses, only when this build declares the permission (see
 *   src/lib/native-permissions.ts), and only after the person allows it.
 * - Downloads: web files go to the phone's Downloads (PDFs open in a
 *   viewer); files a page makes itself (blob: and data: links) are saved
 *   where the person picks.
 */
public class MainActivity extends Activity {

    private static final int REQUEST_FILES = 1001;
    private static final int REQUEST_SAVE_FILE = 1002;
    private static final int PERMISSIONS_FOR_PAGE = 2001;
    private static final int PERMISSIONS_FOR_LOCATION = 2002;
    private static final int PERMISSIONS_FOR_CAMERA_PICKER = 2003;
    /** Largest file a page may hand over for saving (it travels as text). */
    private static final int MAX_SAVE_BYTES = 20 * 1024 * 1024;

    private WebView web;
    private BackNavigation back; // Android 13 and newer
    private int themeColor;
    private int pageColor;
    private String offlineTemplate;
    private String saveFileScript;
    private Set<String> appHosts;
    private Set<String> declaredPermissions;
    /** The page in the main frame, for the file-saving bridge (read on another thread). */
    private volatile String currentPageUrl = "";

    // File picker in progress.
    private ValueCallback<Uri[]> fileCallback;
    private WebChromeClient.FileChooserParams fileParams;
    private final List<Capture> captures = new ArrayList<>();

    // Permission requests waiting for the person's answer.
    private PermissionRequest pendingPageRequest;
    private List<String> pendingPageResources;
    private String pendingGeoOrigin;
    private GeolocationPermissions.Callback pendingGeoCallback;

    // Saving a file a page made.
    private final Object downloadLock = new Object();
    private PendingDownload pendingDownload;
    private byte[] pendingSaveBytes;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        themeColor = parseColor(getString(R.string.theme_color), Color.parseColor("#0b0b0b"));
        pageColor = parseColor(getString(R.string.page_background), themeColor);
        appHosts = parseHosts(getString(R.string.app_hosts));
        declaredPermissions = declaredPermissions();
        cleanOldCaptures();

        web = new WebView(this);
        web.setBackgroundColor(pageColor);

        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setLoadWithOverviewMode(true);
        ws.setUseWideViewPort(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setGeolocationEnabled(true);
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
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                currentPageUrl = url == null ? "" : url;
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                currentPageUrl = url == null ? "" : url;
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
                runOnUiThread(() -> handlePageRequest(request));
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (request == pendingPageRequest) {
                    pendingPageRequest = null;
                    pendingPageResources = null;
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                handleLocationRequest(origin, callback);
            }

            @Override
            public void onGeolocationPermissionsHidePrompt() {
                pendingGeoOrigin = null;
                pendingGeoCallback = null;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                return showFileChooser(callback, params);
            }
        });
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                handleDownload(url, userAgent, contentDisposition, mimeType));
        // Only answers pages on the app's own addresses, and only with the
        // one-time token MainActivity gives the save-file script.
        web.addJavascriptInterface(new FileBridge(), "NativeFiles");

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

    /* ── The app's own addresses and permissions ─────────────────────── */

    private static Set<String> parseHosts(String value) {
        Set<String> hosts = new HashSet<>();
        for (String host : value.split(",")) {
            String h = host.trim().toLowerCase(Locale.ROOT);
            if (!h.isEmpty()) hosts.add(h);
        }
        return hosts;
    }

    /** Whether an address is one of the app's own https addresses. */
    private boolean isAppAddress(Uri uri) {
        if (uri == null || uri.getHost() == null) return false;
        return "https".equalsIgnoreCase(uri.getScheme())
                && appHosts.contains(uri.getHost().toLowerCase(Locale.ROOT));
    }

    private Set<String> declaredPermissions() {
        Set<String> out = new HashSet<>();
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_PERMISSIONS);
            if (info.requestedPermissions != null) out.addAll(Arrays.asList(info.requestedPermissions));
        } catch (PackageManager.NameNotFoundException ignored) {
            // Our own package is always there.
        }
        return out;
    }

    private boolean declares(String permission) {
        return declaredPermissions.contains(permission);
    }

    private boolean granted(String permission) {
        return checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * A page asks for the camera or microphone. Only pages on the app's own
     * addresses get them, only for what this build declared, and only after
     * the person allows it on the phone.
     */
    private void handlePageRequest(PermissionRequest request) {
        if (!isAppAddress(request.getOrigin())) {
            request.deny();
            return;
        }
        List<String> resources = new ArrayList<>();
        Set<String> missing = new LinkedHashSet<>();
        for (String resource : request.getResources()) {
            String permission = permissionFor(resource);
            if (permission == null || !declares(permission)) continue;
            resources.add(resource);
            if (!granted(permission)) missing.add(permission);
        }
        if (resources.isEmpty()) {
            request.deny();
            return;
        }
        if (missing.isEmpty()) {
            request.grant(resources.toArray(new String[0]));
            return;
        }
        if (pendingPageRequest != null) pendingPageRequest.deny();
        pendingPageRequest = request;
        pendingPageResources = resources;
        requestPermissions(missing.toArray(new String[0]), PERMISSIONS_FOR_PAGE);
    }

    private static String permissionFor(String resource) {
        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) return Manifest.permission.CAMERA;
        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) return Manifest.permission.RECORD_AUDIO;
        return null;
    }

    /** A page asks for the location: same rules as the camera. */
    private void handleLocationRequest(String origin, GeolocationPermissions.Callback callback) {
        boolean declared = declares(Manifest.permission.ACCESS_FINE_LOCATION)
                || declares(Manifest.permission.ACCESS_COARSE_LOCATION);
        if (!declared || !isAppAddress(Uri.parse(origin))) {
            callback.invoke(origin, false, false);
            return;
        }
        if (hasLocation()) {
            callback.invoke(origin, true, false);
            return;
        }
        if (pendingGeoCallback != null) pendingGeoCallback.invoke(pendingGeoOrigin, false, false);
        pendingGeoOrigin = origin;
        pendingGeoCallback = callback;
        requestPermissions(new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                PERMISSIONS_FOR_LOCATION);
    }

    /** Precise or approximate location (Android 12 lets people pick approximate). */
    private boolean hasLocation() {
        return granted(Manifest.permission.ACCESS_FINE_LOCATION)
                || granted(Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSIONS_FOR_PAGE) {
            PermissionRequest request = pendingPageRequest;
            List<String> resources = pendingPageResources;
            pendingPageRequest = null;
            pendingPageResources = null;
            if (request == null || resources == null) return;
            List<String> allowed = new ArrayList<>();
            for (String resource : resources) {
                String permission = permissionFor(resource);
                if (permission != null && granted(permission)) allowed.add(resource);
            }
            if (allowed.isEmpty()) request.deny();
            else request.grant(allowed.toArray(new String[0]));
        } else if (requestCode == PERMISSIONS_FOR_LOCATION) {
            GeolocationPermissions.Callback callback = pendingGeoCallback;
            String origin = pendingGeoOrigin;
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
            if (callback != null) callback.invoke(origin, hasLocation(), false);
        } else if (requestCode == PERMISSIONS_FOR_CAMERA_PICKER) {
            // Allowed or not, the file picker opens (with or without "take a photo").
            if (fileParams != null) launchFilePicker(fileParams, granted(Manifest.permission.CAMERA));
        }
    }

    /* ── File inputs ─────────────────────────────────────────────────── */

    /** A photo or video the camera app may write for the current file input. */
    private static final class Capture {
        final File file;
        final Uri uri;

        Capture(File file, Uri uri) {
            this.file = file;
            this.uri = uri;
        }
    }

    private boolean showFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        // A picker left open (the page asked again) gets its answer first, or
        // that file input would stop working.
        finishFileChooser(null);
        fileCallback = callback;
        fileParams = params;
        boolean wantsCamera = acceptsType(params, "image/") || acceptsType(params, "video/");
        boolean hasCamera = getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY);
        // A build that declares the camera permission (for in-page cameras)
        // may only start the camera app once the person has allowed it.
        if (wantsCamera && hasCamera && declares(Manifest.permission.CAMERA)
                && !granted(Manifest.permission.CAMERA)) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, PERMISSIONS_FOR_CAMERA_PICKER);
            return true;
        }
        launchFilePicker(params, hasCamera);
        return true;
    }

    private void launchFilePicker(WebChromeClient.FileChooserParams params, boolean cameraAllowed) {
        Intent content;
        try {
            content = params.createIntent();
        } catch (Exception e) {
            content = null;
        }
        if (content == null) content = new Intent(Intent.ACTION_GET_CONTENT);
        content.addCategory(Intent.CATEGORY_OPENABLE);
        // The page's accept list, as MIME types (".pdf" becomes application/pdf).
        String[] types = mimeTypes(params.getAcceptTypes());
        if (types.length == 1) {
            content.setType(types[0]);
        } else {
            content.setType("*/*");
            if (types.length > 1) content.putExtra(Intent.EXTRA_MIME_TYPES, types);
        }
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            content.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }

        captures.clear();
        List<Intent> cameraApps = new ArrayList<>();
        if (cameraAllowed) {
            if (acceptsType(params, "image/")) addCapture(cameraApps, MediaStore.ACTION_IMAGE_CAPTURE, ".jpg");
            if (acceptsType(params, "video/")) addCapture(cameraApps, MediaStore.ACTION_VIDEO_CAPTURE, ".mp4");
        }

        Intent target;
        if (params.isCaptureEnabled() && !cameraApps.isEmpty()) {
            // <input capture>: straight to the camera, as in a phone's browser.
            target = cameraApps.get(0);
        } else {
            target = Intent.createChooser(content, null);
            if (!cameraApps.isEmpty()) {
                target.putExtra(Intent.EXTRA_INITIAL_INTENTS, cameraApps.toArray(new Intent[0]));
            }
        }
        try {
            startActivityForResult(target, REQUEST_FILES);
        } catch (ActivityNotFoundException e) {
            finishFileChooser(null);
            toast("There's no app on this phone for choosing files.");
        }
    }

    /** Adds "take a photo" (or video) through the camera app, saving into our shared captures folder. */
    private void addCapture(List<Intent> into, String action, String suffix) {
        Intent intent = new Intent(action);
        if (intent.resolveActivity(getPackageManager()) == null) return;
        try {
            File dir = new File(getCacheDir(), "captures");
            if (!dir.isDirectory() && !dir.mkdirs()) return;
            File file = File.createTempFile("capture-", suffix, dir);
            Uri uri = SharedFileProvider.uriForFile(this, file);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, uri);
            intent.setClipData(ClipData.newRawUri("", uri));
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            captures.add(new Capture(file, uri));
            into.add(intent);
        } catch (IOException | IllegalArgumentException ignored) {
            // No camera option this time; files still work.
        }
    }

    private void onFilesChosen(int resultCode, Intent data) {
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            result = pickedUris(data);
            if (result == null) {
                // The camera app answered: use the photo or video it saved.
                for (Capture capture : captures) {
                    if (capture.file.length() > 0) {
                        result = new Uri[]{capture.uri};
                        break;
                    }
                }
            }
        }
        for (Capture capture : captures) {
            if (result == null || !Arrays.asList(result).contains(capture.uri)) capture.file.delete();
        }
        captures.clear();
        finishFileChooser(result);
    }

    private static Uri[] pickedUris(Intent data) {
        if (data == null) return null;
        List<Uri> uris = new ArrayList<>();
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) {
                Uri uri = clip.getItemAt(i).getUri();
                if (uri != null) uris.add(uri);
            }
        }
        if (uris.isEmpty() && data.getData() != null) uris.add(data.getData());
        return uris.isEmpty() ? null : uris.toArray(new Uri[0]);
    }

    /** Always answers the page, with null when nothing was picked, or later taps stop working. */
    private void finishFileChooser(Uri[] result) {
        ValueCallback<Uri[]> callback = fileCallback;
        fileCallback = null;
        fileParams = null;
        if (callback != null) callback.onReceiveValue(result);
    }

    /** Whether the input accepts this kind of file ("image/"), or anything. */
    private static boolean acceptsType(WebChromeClient.FileChooserParams params, String prefix) {
        String[] types = mimeTypes(params.getAcceptTypes());
        if (types.length == 0) return prefix.equals("image/");
        for (String type : types) {
            if (type.startsWith(prefix) || type.equals("*/*")) return true;
        }
        return false;
    }

    private static String[] mimeTypes(String[] accept) {
        Set<String> out = new LinkedHashSet<>();
        if (accept != null) {
            for (String entry : accept) {
                if (entry == null) continue;
                for (String part : entry.split(",")) {
                    String type = part.trim().toLowerCase(Locale.ROOT);
                    if (type.isEmpty()) continue;
                    if (type.startsWith(".")) {
                        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(type.substring(1));
                        if (mime != null) out.add(mime);
                    } else if (type.contains("/")) {
                        out.add(type);
                    }
                }
            }
        }
        return out.toArray(new String[0]);
    }

    /** Removes photos taken for uploads more than a day ago. */
    private void cleanOldCaptures() {
        File[] files = new File(getCacheDir(), "captures").listFiles();
        if (files == null) return;
        long dayAgo = System.currentTimeMillis() - 24L * 60 * 60 * 1000;
        for (File file : files) {
            if (file.lastModified() < dayAgo) file.delete();
        }
    }

    /* ── Downloads ───────────────────────────────────────────────────── */

    private void handleDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        if (url == null) return;
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.startsWith("blob:")) {
            saveBlob(url, URLUtil.guessFileName(url, contentDisposition, mimeType), mimeType);
        } else if (lower.startsWith("data:")) {
            byte[] bytes = decodeDataUrl(url);
            if (bytes == null) toast("This file is too big to save, or it's damaged.");
            else askWhereToSave(bytes, URLUtil.guessFileName(url, contentDisposition, mimeTypeOf(url)), mimeTypeOf(url));
        } else if (lower.startsWith("http://") || lower.startsWith("https://")) {
            downloadFromWeb(url, userAgent, contentDisposition, mimeType);
        }
    }

    /** Web files go to the phone's Downloads; PDFs open in the phone's viewer. */
    private void downloadFromWeb(String url, String userAgent, String contentDisposition, String mimeType) {
        String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
        Uri uri = Uri.parse(url);
        if ("application/pdf".equalsIgnoreCase(mimeType) || name.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            openOutside(uri, "https");
            return;
        }
        try {
            DownloadManager.Request request = new DownloadManager.Request(uri);
            if (mimeType != null && !mimeType.isEmpty()) request.setMimeType(mimeType);
            // Signed-in downloads need the page's cookies.
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) request.addRequestHeader("Cookie", cookies);
            if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
            request.setTitle(name);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            if (Build.VERSION.SDK_INT >= 29) {
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            } else {
                // Older phones need a storage permission for the shared
                // Downloads folder; the app's own folder needs none, and the
                // notification opens the file.
                request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, name);
            }
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            manager.enqueue(request);
            toast("Downloading " + name);
        } catch (Exception e) {
            // No download manager here: let the phone's browser fetch it.
            openOutside(uri, "https");
        }
    }

    /** A file the page made itself: the page reads it (save-file.js) and hands it over. */
    private void saveBlob(String url, String fallbackName, String mimeType) {
        String script = saveFileScript();
        if (script == null || !isAppAddress(Uri.parse(currentPageUrl))) {
            toast("Couldn't save this file.");
            return;
        }
        String token = UUID.randomUUID().toString();
        synchronized (downloadLock) {
            pendingDownload = new PendingDownload(token, fallbackName, mimeType);
        }
        web.evaluateJavascript(script + "(" + JSONObject.quote(url) + "," + JSONObject.quote(token) + ","
                + MAX_SAVE_BYTES + ");", null);
    }

    private String saveFileScript() {
        if (saveFileScript == null) {
            try (InputStream in = getAssets().open("save-file.js")) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                saveFileScript = out.toString("UTF-8").trim();
            } catch (IOException e) {
                return null;
            }
        }
        return saveFileScript;
    }

    private static final class PendingDownload {
        final String token;
        final String fallbackName;
        final String mimeType;

        PendingDownload(String token, String fallbackName, String mimeType) {
            this.token = token;
            this.fallbackName = fallbackName;
            this.mimeType = mimeType;
        }
    }

    /** The download waiting for this token, used once. */
    private PendingDownload takeDownload(String token) {
        synchronized (downloadLock) {
            PendingDownload pending = pendingDownload;
            if (pending == null || token == null || !pending.token.equals(token)) return null;
            pendingDownload = null;
            return pending;
        }
    }

    /**
     * What save-file.js calls. Runs on a background thread. Public, so the
     * WebView can call its methods.
     */
    public final class FileBridge {
        @JavascriptInterface
        public void save(String token, String dataUrl, String name, String mimeType) {
            PendingDownload pending = takeDownload(token);
            if (pending == null || !isAppAddress(Uri.parse(currentPageUrl))) return;
            byte[] bytes = decodeDataUrl(dataUrl);
            String type = mimeType == null || mimeType.isEmpty() ? pending.mimeType : mimeType;
            String fileName = safeFileName(name, pending.fallbackName);
            runOnUiThread(() -> {
                if (bytes == null) toast("Couldn't save this file.");
                else askWhereToSave(bytes, fileName, type);
            });
        }

        @JavascriptInterface
        public void failed(String token, String why) {
            if (takeDownload(token) == null) return;
            runOnUiThread(() -> toast("too-big".equals(why)
                    ? "This file is too big to save." : "Couldn't save this file."));
        }
    }

    /** The file's bytes from a data: address, or null when it's damaged or too big. */
    private static byte[] decodeDataUrl(String url) {
        if (url == null || !url.regionMatches(true, 0, "data:", 0, 5)) return null;
        int comma = url.indexOf(',');
        if (comma < 0 || url.length() - comma > MAX_SAVE_BYTES / 3 * 4 + 8) return null;
        String meta = url.substring(5, comma);
        String payload = url.substring(comma + 1);
        try {
            byte[] bytes = meta.toLowerCase(Locale.ROOT).endsWith(";base64")
                    ? Base64.decode(payload, Base64.DEFAULT)
                    : URLDecoder.decode(payload, "UTF-8").getBytes("UTF-8");
            return bytes.length > MAX_SAVE_BYTES ? null : bytes;
        } catch (Exception e) {
            return null;
        }
    }

    private static String mimeTypeOf(String dataUrl) {
        int end = dataUrl.indexOf(';');
        int comma = dataUrl.indexOf(',');
        if (end < 0 || (comma >= 0 && comma < end)) end = comma;
        String type = end > 5 ? dataUrl.substring(5, end).trim() : "";
        return type.isEmpty() ? "application/octet-stream" : type;
    }

    /** The name the page chose (its download attribute), without folder parts. */
    private static String safeFileName(String name, String fallback) {
        String clean = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "").trim();
        if (clean.isEmpty() || clean.startsWith(".")) clean = fallback;
        return clean == null || clean.isEmpty() ? "download" : clean;
    }

    /** Asks where to save (no storage permission needed), then writes the file. */
    private void askWhereToSave(byte[] bytes, String name, String mimeType) {
        pendingSaveBytes = bytes;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType == null || mimeType.isEmpty() ? "application/octet-stream" : mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(intent, REQUEST_SAVE_FILE);
        } catch (ActivityNotFoundException e) {
            pendingSaveBytes = null;
            toast("There's no app on this phone for saving files.");
        }
    }

    private void onSaveLocationChosen(int resultCode, Intent data) {
        final byte[] bytes = pendingSaveBytes;
        pendingSaveBytes = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null || bytes == null) return;
        final Uri target = data.getData();
        new Thread(() -> {
            boolean saved;
            try (OutputStream out = getContentResolver().openOutputStream(target)) {
                if (out == null) throw new IOException("No output");
                out.write(bytes);
                saved = true;
            } catch (IOException | SecurityException e) {
                saved = false;
            }
            final boolean ok = saved;
            runOnUiThread(() -> toast(ok ? "Saved" : "Couldn't save the file."));
        }).start();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_FILES) {
            onFilesChosen(resultCode, data);
        } else if (requestCode == REQUEST_SAVE_FILE) {
            onSaveLocationChosen(resultCode, data);
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    /* ── Offline page ────────────────────────────────────────────────── */

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
