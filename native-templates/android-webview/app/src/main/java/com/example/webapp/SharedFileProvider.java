package com.example.webapp;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.content.res.XmlResourceParser;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.text.TextUtils;
import android.webkit.MimeTypeMap;

import org.xmlpull.v1.XmlPullParser;
import org.xmlpull.v1.XmlPullParserException;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * A minimal file provider (like AndroidX's FileProvider, without the
 * library, so builds need no extra downloads). It lets the camera app write a
 * photo or video for an upload into the folders listed in
 * res/xml/file_paths.xml, through a content:// address and a one-time grant.
 * It is never exported: other apps only reach it through that grant.
 */
public class SharedFileProvider extends ContentProvider {

    private static final String PATHS_META_DATA = "android.support.FILE_PROVIDER_PATHS";
    private static final String[] COLUMNS = {OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
    private static final Map<String, Map<String, File>> ROOTS = new HashMap<>();

    /** The authority set in AndroidManifest.xml: "<application id>.files". */
    static String authority(Context context) {
        return context.getPackageName() + ".files";
    }

    /** A content:// address for a file inside one of the shared folders. */
    static Uri uriForFile(Context context, File file) {
        String authority = authority(context);
        String path = canonical(file);
        for (Map.Entry<String, File> root : roots(context, authority).entrySet()) {
            String base = canonical(root.getValue());
            if (path.startsWith(base + "/")) {
                return new Uri.Builder()
                        .scheme("content")
                        .authority(authority)
                        .appendPath(root.getKey())
                        .appendEncodedPath(Uri.encode(path.substring(base.length() + 1), "/"))
                        .build();
            }
        }
        throw new IllegalArgumentException("Not in a shared folder: " + file.getName());
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public void attachInfo(Context context, ProviderInfo info) {
        super.attachInfo(context, info);
        if (info.exported) throw new SecurityException("SharedFileProvider must not be exported");
        if (!info.grantUriPermissions) throw new SecurityException("SharedFileProvider must grant URI permissions");
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(fileFor(uri), ParcelFileDescriptor.parseMode(mode));
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File file;
        try {
            file = fileFor(uri);
        } catch (FileNotFoundException e) {
            return null;
        }
        List<String> names = new ArrayList<>();
        List<Object> values = new ArrayList<>();
        for (String column : projection == null ? COLUMNS : projection) {
            if (OpenableColumns.DISPLAY_NAME.equals(column)) {
                names.add(column);
                values.add(file.getName());
            } else if (OpenableColumns.SIZE.equals(column)) {
                names.add(column);
                values.add(file.length());
            }
        }
        MatrixCursor cursor = new MatrixCursor(names.toArray(new String[0]), 1);
        cursor.addRow(values.toArray());
        return cursor;
    }

    @Override
    public String getType(Uri uri) {
        String name = uri.getLastPathSegment();
        int dot = name == null ? -1 : name.lastIndexOf('.');
        if (dot >= 0) {
            String type = MimeTypeMap.getSingleton()
                    .getMimeTypeFromExtension(name.substring(dot + 1).toLowerCase(Locale.ROOT));
            if (type != null) return type;
        }
        return "application/octet-stream";
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("Read and write only");
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("Read and write only");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        try {
            return fileFor(uri).delete() ? 1 : 0;
        } catch (FileNotFoundException e) {
            return 0;
        }
    }

    /** The file behind an address, refusing anything outside the shared folders. */
    private File fileFor(Uri uri) throws FileNotFoundException {
        List<String> segments = uri.getPathSegments();
        if (getContext() == null || segments.size() < 2) throw new FileNotFoundException();
        File root = roots(getContext(), uri.getAuthority()).get(segments.get(0));
        if (root == null) throw new FileNotFoundException();
        File file = new File(root, TextUtils.join("/", segments.subList(1, segments.size())));
        String path = canonical(file);
        if (!path.startsWith(canonical(root) + "/")) throw new FileNotFoundException();
        return new File(path);
    }

    /** The shared folders by name, read once from the provider's res/xml/file_paths.xml. */
    private static synchronized Map<String, File> roots(Context context, String authority) {
        Map<String, File> cached = ROOTS.get(authority);
        if (cached != null) return cached;
        ProviderInfo info = context.getPackageManager()
                .resolveContentProvider(authority, PackageManager.GET_META_DATA);
        if (info == null) throw new IllegalArgumentException("No provider for " + authority);
        XmlResourceParser xml = info.loadXmlMetaData(context.getPackageManager(), PATHS_META_DATA);
        if (xml == null) throw new IllegalArgumentException("Missing " + PATHS_META_DATA);
        Map<String, File> roots = new HashMap<>();
        try {
            int type;
            while ((type = xml.next()) != XmlPullParser.END_DOCUMENT) {
                if (type != XmlPullParser.START_TAG) continue;
                String tag = xml.getName();
                String name = xml.getAttributeValue(null, "name");
                String path = xml.getAttributeValue(null, "path");
                File base = "cache-path".equals(tag) ? context.getCacheDir()
                        : "files-path".equals(tag) ? context.getFilesDir() : null;
                if (base == null || TextUtils.isEmpty(name)) continue;
                roots.put(name, TextUtils.isEmpty(path) ? base : new File(base, path));
            }
        } catch (IOException | XmlPullParserException e) {
            throw new IllegalArgumentException("Can't read " + PATHS_META_DATA, e);
        } finally {
            xml.close();
        }
        ROOTS.put(authority, roots);
        return roots;
    }

    private static String canonical(File file) {
        try {
            return file.getCanonicalPath();
        } catch (IOException e) {
            return file.getAbsolutePath();
        }
    }
}
