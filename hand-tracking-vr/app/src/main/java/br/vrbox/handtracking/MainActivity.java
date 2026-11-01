package br.vrbox.handtracking;

import android.Manifest;
import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.net.Uri;
import java.io.ByteArrayInputStream;
import java.io.IOException;

public final class MainActivity extends Activity {
    private static final int CAMERA_CODE = 401;
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private PermissionRequest pendingCamera;
    private boolean vrActive = false;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                WindowManager.LayoutParams.FLAG_FULLSCREEN |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(5894 |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        web = new WebView(this);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!"https".equalsIgnoreCase(u.getScheme()) ||
                    !HOST.equalsIgnoreCase(u.getHost())) return null;
                String path = u.getPath();
                if ("/".equals(path) || "/index.html".equals(path)) {
                    try {
                        return new WebResourceResponse("text/html", "UTF-8",
                                getAssets().open("index.html"));
                    } catch (IOException ignored) {}
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                        null, new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                return !("https".equalsIgnoreCase(u.getScheme()) &&
                        HOST.equalsIgnoreCase(u.getHost()));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final PermissionRequest req) {
                runOnUiThread(() -> {
                    Uri o = req.getOrigin();
                    if (o == null || !"https".equalsIgnoreCase(o.getScheme()) ||
                            !HOST.equalsIgnoreCase(o.getHost())) { req.deny(); return; }
                    boolean wantsVideo = false;
                    for (String r : req.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsVideo = true;
                        else { req.deny(); return; }
                    }
                    if (!wantsVideo) { req.deny(); return; }
                    if (Build.VERSION.SDK_INT < 23 ||
                        checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        if (pendingCamera != null) pendingCamera.deny();
                        pendingCamera = req;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_CODE);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest req) {
                if (pendingCamera == req) pendingCamera = null;
            }
        });
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void setVR(boolean enable) {
                runOnUiThread(() -> {
                    vrActive = enable;
                    setRequestedOrientation(enable ?
                        ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE :
                        ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                });
            }
        }, "Android");
        web.loadUrl("https://" + HOST + "/index.html");
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions,
                                                       int[] grants) {
        super.onRequestPermissionsResult(requestCode, permissions, grants);
        if (requestCode == CAMERA_CODE && pendingCamera != null) {
            PermissionRequest p = pendingCamera;
            pendingCamera = null;
            if (grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED)
                p.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else p.deny();
        }
    }
    @Override public void onBackPressed() {
        if (vrActive) {
            web.evaluateJavascript("window.HandTrackingApp&&window.HandTrackingApp.exitVR()", null);
        } else {
            super.onBackPressed();
        }
    }
    @Override protected void onDestroy() {
        if (pendingCamera != null) { pendingCamera.deny(); pendingCamera = null; }
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}