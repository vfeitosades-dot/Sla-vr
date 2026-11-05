package br.vrbox.handtracking;

import android.Manifest;
import android.app.Activity;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Button;
import android.view.ViewGroup;
import android.graphics.Color;
import android.view.MotionEvent;
import android.os.SystemClock;
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
    private FrameLayout root, youtubePanel, videoPanel;
    private WebView youtubeWeb;
    private WebChromeClient.CustomViewCallback videoCallback;
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
        root = new FrameLayout(this);
        root.addView(web);
        setContentView(root);
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
            @JavascriptInterface public void loadYouTube(String url) {
                Uri uri = Uri.parse(url);
                if (!"https".equals(uri.getScheme()) ||
                    !("m.youtube.com".equals(uri.getHost()) || "www.youtube.com".equals(uri.getHost()))) return;
                runOnUiThread(() -> { showYouTube(false); youtubeWeb.loadUrl(url); });
            }
            @JavascriptInterface public void closeYouTubePanel() { runOnUiThread(() -> closeYouTube()); }
            @JavascriptInterface public void youtubeNavigate(int direction) {
                runOnUiThread(() -> {
                    if (youtubeWeb == null) return;
                    if (direction < 0 && youtubeWeb.canGoBack()) youtubeWeb.goBack();
                    else if (direction > 0 && youtubeWeb.canGoForward()) youtubeWeb.goForward();
                    else if (direction == 0) youtubeWeb.reload();
                });
            }
            @JavascriptInterface public void positionYouTube(boolean visible, float x, float y,
                                                             float scale, float roll, float viewportWidth) {
                runOnUiThread(() -> {
                    if (youtubePanel == null || viewportWidth <= 0) return;
                    boolean wasVisible = youtubePanel.getVisibility() == View.VISIBLE;
                    youtubePanel.setVisibility(visible ? View.VISIBLE : View.GONE);
                    if (youtubeWeb != null && wasVisible != visible) {
                        if (visible) youtubeWeb.onResume(); else youtubeWeb.onPause();
                    }
                    if (!visible) return;
                    float ratio = web.getWidth() / viewportWidth;
                    int width = Math.max(1, Math.round(600 * ratio));
                    int height = Math.max(1, Math.round(296 * ratio));
                    ViewGroup.LayoutParams lp = youtubePanel.getLayoutParams();
                    if (lp.width != width || lp.height != height) {
                        lp.width = width; lp.height = height; youtubePanel.setLayoutParams(lp);
                    }
                    youtubePanel.setPivotX(0); youtubePanel.setPivotY(0);
                    youtubePanel.setTranslationX(x * ratio); youtubePanel.setTranslationY(y * ratio);
                    youtubePanel.setScaleX(scale); youtubePanel.setScaleY(scale);
                    youtubePanel.setRotation((float) Math.toDegrees(roll));
                });
            }
            @JavascriptInterface public void youtubeTap(float x, float y) {
                runOnUiThread(() -> {
                    if (youtubeWeb == null || youtubePanel.getVisibility() != View.VISIBLE ||
                        x < 0 || x > 600 || y < 0 || y > 296) return;
                    float ratio = youtubePanel.getWidth() / 600f;
                    long now = SystemClock.uptimeMillis();
                    MotionEvent down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, x*ratio, y*ratio, 0);
                    MotionEvent up = MotionEvent.obtain(now, now+60, MotionEvent.ACTION_UP, x*ratio, y*ratio, 0);
                    youtubeWeb.dispatchTouchEvent(down); youtubeWeb.dispatchTouchEvent(up);
                    down.recycle(); up.recycle();
                });
            }
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

    private void showYouTube(boolean search360) {
        if (youtubePanel != null) closeYouTube();
        youtubePanel = new FrameLayout(this);
        youtubePanel.setBackgroundColor(Color.BLACK);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        youtubeWeb = new WebView(this);
        WebSettings ys = youtubeWeb.getSettings();
        ys.setJavaScriptEnabled(true);
        ys.setDomStorageEnabled(true);
        ys.setMediaPlaybackRequiresUserGesture(true);
        ys.setAllowFileAccess(false);
        ys.setAllowContentAccess(false);
        ys.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        youtubeWeb.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                // Keep HTTPS navigation inside this isolated WebView.
                return !"https".equalsIgnoreCase(req.getUrl().getScheme());
            }
        });
        youtubeWeb.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest req) { req.deny(); }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (videoPanel != null) { callback.onCustomViewHidden(); return; }
                videoCallback = callback;
                videoPanel = new FrameLayout(MainActivity.this);
                videoPanel.setBackgroundColor(Color.BLACK);
                videoPanel.addView(view, new FrameLayout.LayoutParams(-1, -1));
                root.addView(videoPanel, new FrameLayout.LayoutParams(-1, -1));
            }
            @Override public void onHideCustomView() { hideYouTubeVideo(); }
        });
        layout.addView(youtubeWeb, new LinearLayout.LayoutParams(-1, 0, 1));
        youtubePanel.addView(layout, new FrameLayout.LayoutParams(-1, -1));
        youtubePanel.setVisibility(View.GONE);
        root.addView(youtubePanel, new FrameLayout.LayoutParams(1, 1));

    }
    private void hideYouTubeVideo() {
        if (videoPanel == null) return;
        root.removeView(videoPanel);
        videoPanel.removeAllViews();
        videoPanel = null;
        WebChromeClient.CustomViewCallback callback = videoCallback;
        videoCallback = null;
        if (callback != null) callback.onCustomViewHidden();
    }
    private void closeYouTube() {
        hideYouTubeVideo();
        if (youtubeWeb != null) {
            youtubeWeb.stopLoading();
            youtubeWeb.loadUrl("about:blank");
            ((ViewGroup) youtubeWeb.getParent()).removeView(youtubeWeb);
            youtubeWeb.destroy();
            youtubeWeb = null;
        }
        if (youtubePanel != null) { root.removeView(youtubePanel); youtubePanel = null; }
    }
    @Override protected void onPause() {
        if (youtubeWeb != null) youtubeWeb.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (youtubeWeb != null) youtubeWeb.onResume();
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
        if (videoPanel != null) { hideYouTubeVideo(); return; }
        if (youtubeWeb != null) {
            if (youtubeWeb.canGoBack()) youtubeWeb.goBack();
            else { closeYouTube(); web.evaluateJavascript("navHome()", null); }
            return;
        }
        if (vrActive) {
            web.evaluateJavascript("window.HandTrackingApp&&window.HandTrackingApp.exitVR()", null);
        } else {
            super.onBackPressed();
        }
    }
    @Override protected void onDestroy() {
        closeYouTube();
        if (pendingCamera != null) { pendingCamera.deny(); pendingCamera = null; }
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}