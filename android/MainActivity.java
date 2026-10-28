package com.pocket.horizon;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.*;
import android.hardware.*;
import android.view.*;
import java.io.*;
import android.content.pm.PackageManager;
import org.json.JSONObject;

public class MainActivity extends Activity implements SensorEventListener {
 private WebView web; private Uri mediaUri; private String mediaType; private SensorManager sensors; private Sensor sensor; private long last; private PermissionRequest pendingCamera;
 private static final String HOST="pocket.local";
 @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setFlags(1024,1024);getWindow().getDecorView().setSystemUiVisibility(5894);
 web=new WebView(this);setContentView(web);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setMediaPlaybackRequiresUserGesture(false);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);web.addJavascriptInterface(new Bridge(),"Android");
 web.setWebViewClient(new WebViewClient(){
 @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){Uri u=req.getUrl();if(!HOST.equals(u.getHost())||!"https".equals(u.getScheme()))return null;try{if("/media".equals(u.getPath())&&mediaUri!=null){return new WebResourceResponse(mediaType,null,getContentResolver().openInputStream(mediaUri));}if("/".equals(u.getPath())||"/index.html".equals(u.getPath()))return new WebResourceResponse("text/html","UTF-8",getAssets().open("index.html"));}catch(Exception e){}return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new ByteArrayInputStream(new byte[0]));}
 @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){Uri u=req.getUrl();if("https".equals(u.getScheme())&&HOST.equals(u.getHost()))return false;open(u.toString());return true;}
 });web.setWebChromeClient(new WebChromeClient(){
 @Override public void onPermissionRequest(final PermissionRequest r){runOnUiThread(()->{if(!"https://pocket.local".equals(r.getOrigin().toString())&&!"https://pocket.local/".equals(r.getOrigin().toString())){r.deny();return;}boolean camera=false;for(String a:r.getResources())if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(a))camera=true;if(!camera){r.deny();return;}if(checkSelfPermission("android.permission.CAMERA")==PackageManager.PERMISSION_GRANTED)r.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else {if(pendingCamera!=null)pendingCamera.deny();pendingCamera=r;requestPermissions(new String[]{"android.permission.CAMERA"},9);}});}
 @Override public void onPermissionRequestCanceled(PermissionRequest r){if(pendingCamera==r)pendingCamera=null;}
 });web.loadUrl("https://pocket.local/index.html");sensors=(SensorManager)getSystemService(SENSOR_SERVICE);sensor=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
 }
 public class Bridge{
 @JavascriptInterface public void pick(final String type){runOnUiThread(()->{mediaType="video".equals(type)?"video/*":"image/*";Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType(mediaType);try{startActivityForResult(i,7);}catch(Exception e){web.evaluateJavascript("toast('Seletor de arquivos indisponível')",null);}});}
 @JavascriptInterface public void openExternal(final String url){runOnUiThread(()->open(url));}
 }
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==9&&pendingCamera!=null){if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)pendingCamera.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else pendingCamera.deny();pendingCamera=null;}}
 private void open(String url){Uri u=Uri.parse(url);if(!"https".equals(u.getScheme())&&!"http".equals(u.getScheme()))return;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){web.evaluateJavascript("toast('Nenhum navegador disponível')",null);}}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==7&&result==RESULT_OK&&data!=null&&data.getData()!=null){mediaUri=data.getData();String type=getContentResolver().getType(mediaUri);mediaType=type!=null?type:mediaType;String kind=mediaType.startsWith("video")?"video":"image";web.evaluateJavascript("window.onNativeMedia("+JSONObject.quote("https://pocket.local/media?t="+System.currentTimeMillis())+","+JSONObject.quote(kind)+")",null);}}
 @Override public void onSensorChanged(SensorEvent e){long t=android.os.SystemClock.elapsedRealtime();if(t-last<40)return;last=t;float[] r=new float[9],out=new float[9],o=new float[3];SensorManager.getRotationMatrixFromVector(r,e.values);int rot=getWindowManager().getDefaultDisplay().getRotation();int x=SensorManager.AXIS_X,y=SensorManager.AXIS_Y;if(rot==Surface.ROTATION_90){x=SensorManager.AXIS_Y;y=SensorManager.AXIS_MINUS_X;}else if(rot==Surface.ROTATION_270){x=SensorManager.AXIS_MINUS_Y;y=SensorManager.AXIS_X;}else if(rot==Surface.ROTATION_180){x=SensorManager.AXIS_MINUS_X;y=SensorManager.AXIS_MINUS_Y;}SensorManager.remapCoordinateSystem(r,x,y,out);SensorManager.getOrientation(out,o);double a=Math.toDegrees(o[0]),b=Math.toDegrees(o[1]);web.evaluateJavascript("window.dispatchEvent(Object.assign(new Event('deviceorientation'),{alpha:"+a+",beta:"+b+"}))",null);}
 @Override public void onAccuracyChanged(Sensor s,int accuracy){}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();if(sensor!=null)sensors.registerListener(this,sensor,SensorManager.SENSOR_DELAY_GAME);}
 @Override protected void onPause(){if(sensors!=null)sensors.unregisterListener(this);if(web!=null){web.evaluateJavascript("if(video)video.pause();stopCamera()",null);web.onPause();}super.onPause();}
 @Override public void onBackPressed(){web.evaluateJavascript("navigate('apps')",null);}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}super.onDestroy();}
}
