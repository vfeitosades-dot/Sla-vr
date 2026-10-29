package com.pocket.horizon;

import android.app.Activity;
import android.os.Bundle;
import android.os.SystemClock;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.*;
import android.hardware.*;
import android.view.*;
import java.io.*;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;

/** Local-only WebView host. Camera and motion are enabled by explicit UI actions. */
public class MainActivity extends Activity implements SensorEventListener {
    private static final String HOST = "pocket.local";
    private static final String CAMERA = "android.permission.CAMERA";
    private static final int PICK_MEDIA = 7, CAMERA_PERMISSION = 9;
    private WebView web;
    private volatile Uri mediaUri;
    private volatile String mediaType;
    private PermissionRequest pendingCamera;
    private boolean cameraPermissionInFlight, notifyCameraResult, resumed, sensorsEnabled;
    private Boolean deferredCameraResult;
    private SensorManager sensors;
    private Sensor rotation, accelerometer, magnetometer;
    private final float[] gravity = new float[3], magnetic = new float[3];
    private boolean haveGravity, haveMagnetic;
    private long lastPose;
    private double lastHeading;
    private boolean headingValid;
    private int sensorAccuracy = SensorManager.SENSOR_STATUS_UNRELIABLE;
    private String sensorSource = "unavailable";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setFlags(1024, 1024);
        getWindow().getDecorView().setSystemUiVisibility(5894);
        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        if (sensors != null) {
            rotation = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
            if (rotation != null) sensorSource = "rotation-vector";
            else {
                rotation = sensors.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
                if (rotation != null) sensorSource = "game-rotation-vector";
                else {
                    rotation = sensors.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
                    if (rotation != null) sensorSource = "geomagnetic-rotation-vector";
                }
            }
            accelerometer = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            magnetometer = sensors.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
            if (rotation == null && accelerometer != null)
                sensorSource = magnetometer != null ? "accelerometer-magnetometer" : "accelerometer";
        }
        web = new WebView(this);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isLocal(uri)) return null;
                try {
                    String path = uri.getPath();
                    if ("/media".equals(path) && mediaUri != null)
                        return serveMedia(request);
                    if ("/".equals(path) || "/index.html".equals(path))
                        return new WebResourceResponse("text/html", "UTF-8", getAssets().open("index.html"));
                    // Exact allowlist prevents reading arbitrary packaged/native resources.
                    if ("/app.js".equals(path) || "/tracking.js".equals(path) || "/three.min.js".equals(path)
                        || "/hands.js".equals(path) || "/hands-overlay.js".equals(path))
                        return new WebResourceResponse("application/javascript", "UTF-8", getAssets().open(path.substring(1)));
                } catch (IOException ignored) { }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", null, new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (isLocal(request.getUrl())) return false;
                if (request.isForMainFrame()) open(request.getUrl().toString());
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!isLocal(request.getOrigin())) { request.deny(); return; }
                    boolean wantsCamera = false;
                    for (String resource : request.getResources())
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) wantsCamera = true;
                    if (!wantsCamera) { request.deny(); return; }
                    if (cameraGranted()) {
                        request.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
                    } else {
                        if (pendingCamera != null) pendingCamera.deny();
                        pendingCamera = request;
                        askCameraPermission(false);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingCamera == request) pendingCamera = null;
            }
        });
        web.loadUrl("https://pocket.local/index.html");
    }


    /** Provider streams stay on-device; single byte ranges permit seeking without full buffering. */
    private WebResourceResponse serveMedia(WebResourceRequest request) throws IOException {
        Uri uri = mediaUri;
        String mime = mediaType;
        AssetFileDescriptor descriptor = getContentResolver().openAssetFileDescriptor(uri, "r");
        if (descriptor == null) throw new FileNotFoundException("Media unavailable");
        InputStream input;
        try { input = descriptor.createInputStream(); }
        catch (IOException error) { descriptor.close(); throw error; }
        long length = descriptor.getLength();
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-store");
        headers.put("Accept-Ranges", length >= 0 ? "bytes" : "none");
        String range = null;
        for (Map.Entry<String, String> entry : request.getRequestHeaders().entrySet())
            if ("Range".equalsIgnoreCase(entry.getKey())) range = entry.getValue();
        if (range != null && length >= 0) {
            Matcher match = Pattern.compile("bytes=(\\d*)-(\\d*)").matcher(range.trim());
            long start = 0, end = length - 1;
            boolean valid = match.matches() && length > 0;
            if (valid) {
                try {
                    if (match.group(1).isEmpty()) {
                        long suffix = Long.parseLong(match.group(2));
                        valid = suffix > 0;
                        start = Math.max(0, length - suffix);
                    } else {
                        start = Long.parseLong(match.group(1));
                        if (!match.group(2).isEmpty()) end = Math.min(end, Long.parseLong(match.group(2)));
                    }
                    valid = valid && start >= 0 && start < length && end >= start;
                } catch (NumberFormatException error) { valid = false; }
            }
            if (!valid) {
                input.close();
                headers.put("Content-Range", "bytes */" + length);
                return new WebResourceResponse(mime, null, 416, "Range Not Satisfiable", headers, new ByteArrayInputStream(new byte[0]));
            }
            try {
                long skip = start;
                while (skip > 0) {
                    long n = input.skip(skip);
                    if (n > 0) skip -= n;
                    else if (input.read() != -1) skip--;
                    else throw new EOFException("Short media stream");
                }
            } catch (IOException error) { input.close(); throw error; }
            long count = end - start + 1;
            headers.put("Content-Length", Long.toString(count));
            headers.put("Content-Range", "bytes " + start + "-" + end + "/" + length);
            return new WebResourceResponse(mime, null, 206, "Partial Content", headers, new LimitedInputStream(input, count));
        }
        if (length >= 0) headers.put("Content-Length", Long.toString(length));
        return new WebResourceResponse(mime, null, 200, "OK", headers, input);
    }
    private static final class LimitedInputStream extends FilterInputStream {
        private long remaining;
        LimitedInputStream(InputStream input, long count) { super(input); remaining = count; }
        @Override public int read() throws IOException {
            if (remaining == 0) return -1;
            int value = in.read();
            if (value >= 0) remaining--;
            return value;
        }
        @Override public int read(byte[] bytes, int offset, int count) throws IOException {
            if (count == 0) return 0;
            if (remaining == 0) return -1;
            int n = in.read(bytes, offset, (int)Math.min(count, remaining));
            if (n > 0) remaining -= n;
            return n;
        }
        @Override public long skip(long count) throws IOException {
            long n = in.skip(Math.min(Math.max(0, count), remaining));
            remaining -= n;
            return n;
        }
        @Override public int available() throws IOException { return (int)Math.min(in.available(), remaining); }
    }

    private boolean isLocal(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443);
    }
    private boolean cameraGranted() { return checkSelfPermission(CAMERA) == PackageManager.PERMISSION_GRANTED; }
    private void js(String script) { if (web != null) web.evaluateJavascript(script, null); }
    private void reportCamera(boolean granted) {
        js("if(window.onCameraPermission)window.onCameraPermission(" + granted + ")");
        js("if(window.onCameraPermissionDetail)window.onCameraPermissionDetail({granted:"
            + granted + ",canAskAgain:" + shouldShowRequestPermissionRationale(CAMERA) + "})");
    }
    private void askCameraPermission(boolean fromBridge) {
        notifyCameraResult |= fromBridge;
        if (cameraGranted()) { completeCameraPermission(true); return; }
        if (!cameraPermissionInFlight) {
            cameraPermissionInFlight = true;
            requestPermissions(new String[] { CAMERA }, CAMERA_PERMISSION);
        }
    }
    private void completeCameraPermission(boolean granted) {
        cameraPermissionInFlight = false;
        PermissionRequest pending = pendingCamera;
        pendingCamera = null;
        if (pending != null) {
            if (granted) pending.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
            else pending.deny();
        }
        if (notifyCameraResult) {
            notifyCameraResult = false;
            if (resumed) reportCamera(granted);
            else deferredCameraResult = granted;
        }
    }
    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(request, permissions, results);
        if (request == CAMERA_PERMISSION)
            completeCameraPermission(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
    }

    public class Bridge {
        @JavascriptInterface public void requestCamera() { runOnUiThread(() -> askCameraPermission(true)); }
        @JavascriptInterface public boolean hasCameraPermission() { return cameraGranted(); }
        @JavascriptInterface public void openAppSettings() {
            runOnUiThread(() -> {
                try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); }
                catch (Exception ignored) { }
            });
        }
        @JavascriptInterface public String getSensorInfo() {
            return "{\"available\":" + (rotation != null || accelerometer != null)
                + ",\"source\":" + JSONObject.quote(sensorSource)
                + ",\"hasYaw\":" + (rotation != null || (accelerometer != null && magnetometer != null))
                + ",\"accuracy\":" + sensorAccuracy + "}";
        }
        @JavascriptInterface public void setSensorsEnabled(final boolean enabled) {
            runOnUiThread(() -> { sensorsEnabled = enabled; updateSensorRegistration(); });
        }
        @JavascriptInterface public void pick(final String type) {
            runOnUiThread(() -> {
                mediaType = "video".equals(type) ? "video/*" : "image/*";
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mediaType);
                try { startActivityForResult(intent, PICK_MEDIA); }
                catch (Exception ignored) { js("if(window.toast)toast('Seletor de arquivos indisponível')"); }
            });
        }
        @JavascriptInterface public void openExternal(final String url) { runOnUiThread(() -> open(url)); }
    }
    private void open(String url) {
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme()) && !"http".equals(uri.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception ignored) { js("if(window.toast)toast('Nenhum navegador disponível')"); }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_MEDIA && result == RESULT_OK && data != null && data.getData() != null) {
            mediaUri = data.getData();
            String type = getContentResolver().getType(mediaUri);
            mediaType = type != null ? type : mediaType;
            String kind = mediaType.startsWith("video") ? "video" : "image";
            js("if(window.onNativeMedia)window.onNativeMedia("
                + JSONObject.quote("https://pocket.local/media?t=" + System.currentTimeMillis())
                + "," + JSONObject.quote(kind) + ")");
        }
    }
    private void updateSensorRegistration() {
        if (sensors == null) return;
        sensors.unregisterListener(this);
        haveGravity = haveMagnetic = false;
        lastPose = 0;
        if (!resumed || !sensorsEnabled) return;
        if (rotation != null) sensors.registerListener(this, rotation, SensorManager.SENSOR_DELAY_GAME);
        else {
            if (accelerometer != null) sensors.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
            if (magnetometer != null) sensors.registerListener(this, magnetometer, SensorManager.SENSOR_DELAY_GAME);
        }
    }
    @Override public void onSensorChanged(SensorEvent event) {
        if (!resumed || !sensorsEnabled) return;
        float[] matrix = new float[9];
        if (event.sensor == rotation) SensorManager.getRotationMatrixFromVector(matrix, event.values);
        else {
            if (event.sensor == accelerometer) {
                for (int i = 0; i < 3; i++) gravity[i] = haveGravity ? gravity[i] * .75f + event.values[i] * .25f : event.values[i];
                haveGravity = true;
            } else if (event.sensor == magnetometer) {
                for (int i = 0; i < 3; i++) magnetic[i] = haveMagnetic ? magnetic[i] * .8f + event.values[i] * .2f : event.values[i];
                haveMagnetic = true;
            }
            if (!haveGravity) return;
            if (magnetometer == null) { emitTilt(); return; }
            if (!haveMagnetic || !SensorManager.getRotationMatrix(matrix, null, gravity, magnetic)) return;
        }
        int display = getWindowManager().getDefaultDisplay().getRotation();
        int x = SensorManager.AXIS_X, y = SensorManager.AXIS_Y;
        if (display == Surface.ROTATION_90) { x = SensorManager.AXIS_Y; y = SensorManager.AXIS_MINUS_X; }
        else if (display == Surface.ROTATION_270) { x = SensorManager.AXIS_MINUS_Y; y = SensorManager.AXIS_X; }
        else if (display == Surface.ROTATION_180) { x = SensorManager.AXIS_MINUS_X; y = SensorManager.AXIS_MINUS_Y; }
        float[] remapped = new float[9];
        if (!SensorManager.remapCoordinateSystem(matrix, x, y, remapped)) return;
        // Aim along the rear camera (-screen Z), not the screen-top azimuth.
        double[] aim = CameraAim.fromMatrix(remapped, lastHeading);
        lastHeading = aim[0]; headingValid = aim[2] > 0;
        emitPose(aim[0], aim[1], 0);
    }
    private void emitTilt() {
        headingValid = false;
        emitPose(0, CameraAim.tilt(gravity), 0);
    }
    private void emitPose(double alpha, double beta, double gamma) {
        long now = SystemClock.elapsedRealtime();
        if (now - lastPose < 32 || !Double.isFinite(alpha) || !Double.isFinite(beta) || !Double.isFinite(gamma)) return;
        lastPose = now;
        js("if(window.onNativePose)window.onNativePose({alpha:" + alpha + ",beta:" + beta + ",gamma:" + gamma
            + ",space:\"camera-forward\",hasYaw:" + headingValid + ",source:" + JSONObject.quote(sensorSource) + ",accuracy:" + sensorAccuracy + ",timestamp:" + now + "})");
    }
    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { sensorAccuracy = accuracy; }
    @Override protected void onResume() {
        super.onResume(); resumed = true;
        if (web != null) {
            web.onResume();
            // The permission dialog may pause this activity. Start getUserMedia only once resumed.
            web.post(() -> {
                if (web == null || !resumed) return;
                if (deferredCameraResult != null) {
                    boolean granted = deferredCameraResult;
                    deferredCameraResult = null;
                    reportCamera(granted);
                }
                js("if(window.onNativeResume)window.onNativeResume({cameraGranted:" + cameraGranted() + "})");
            });
        }
        updateSensorRegistration();
    }
    @Override protected void onPause() {
        resumed = false;
        if (sensors != null) sensors.unregisterListener(this);
        if (web != null) {
            js("if(window.onNativePause)window.onNativePause({permissionPending:" + cameraPermissionInFlight + "});else{if(typeof video!=='undefined'&&video)video.pause();if(typeof stopCamera==='function')stopCamera()}");
            web.onPause();
        }
        super.onPause();
    }
    @Override public void onBackPressed() { js("if(window.onNativeBack)window.onNativeBack();else if(typeof navigate==='function')navigate('apps')"); }
    @Override protected void onDestroy() {
        if (sensors != null) sensors.unregisterListener(this);
        if (pendingCamera != null) { pendingCamera.deny(); pendingCamera = null; }
        if (web != null) { web.removeJavascriptInterface("Android"); web.destroy(); web = null; }
        super.onDestroy();
    }
}
