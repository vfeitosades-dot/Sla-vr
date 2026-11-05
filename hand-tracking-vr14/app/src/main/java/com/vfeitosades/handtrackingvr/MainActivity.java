package com.vfeitosades.handtrackingvr;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.IOException;

public class MainActivity extends Activity {
    private static final int CAMERA_REQUEST = 31;
    private static final int FILE_REQUEST = 32;
    private static final String APP_HOST = "appassets.androidplatform.net";
    private WebView web;
    private PermissionRequest pendingCamera;
    private ValueCallback<Uri[]> fileCallback;

    private boolean isTrustedOrigin(Uri origin) {
        return origin != null && "https".equals(origin.getScheme()) && APP_HOST.equals(origin.getHost());
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                             WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        web.addJavascriptInterface(new VRBridge(), "AndroidVR");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isTrustedOrigin(uri)) return null;
                if (!"/assets/index.html".equals(uri.getPath())) return null;
                try {
                    return new WebResourceResponse("text/html", "UTF-8", getAssets().open("index.html"));
                } catch (IOException e) { return null; }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!isTrustedOrigin(request.getOrigin())) { request.deny(); return; }
                    boolean video = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) video = true;
                        else { request.deny(); return; }
                    }
                    if (!video) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        if (pendingCamera != null) pendingCamera.deny();
                        pendingCamera = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingCamera == request) pendingCamera = null;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                       FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent picker = params.createIntent();
                    picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(picker, FILE_REQUEST);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this,"Seletor de arquivo indisponível",Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });
        setContentView(web);
        web.loadUrl("https://" + APP_HOST + "/assets/index.html");
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == CAMERA_REQUEST && pendingCamera != null) {
            PermissionRequest req = pendingCamera;
            pendingCamera = null;
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED)
                req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else req.deny();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            Uri[] urls = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    urls = new Uri[count];
                    for (int i = 0; i < count; i++) urls[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) urls = new Uri[]{data.getData()};
            }
            fileCallback.onReceiveValue(urls);
            fileCallback = null;
        }
    }

    private class VRBridge {
        @JavascriptInterface public void setLandscape(boolean enabled) {
            runOnUiThread(() -> setRequestedOrientation(enabled ? ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                                                            : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
        }
    }

    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){if(v360.on){exit360();return true;}if(vr){setVR(false);return true;}return false})()", value -> {
            if (!"true".equals(value)) { if (web.canGoBack()) web.goBack(); else finish(); }
        });
    }
    @Override protected void onDestroy() {
        if (pendingCamera != null) pendingCamera.deny();
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        web.loadUrl("about:blank");
        web.destroy();
        super.onDestroy();
    }
}
