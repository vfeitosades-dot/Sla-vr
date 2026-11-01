package com.handtracking.vrbox;
import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.view.WindowManager;
import java.io.InputStream;
import java.io.IOException;

public class MainActivity extends Activity {
  private WebView web;
  private PermissionRequest pending;
  private static final String ORIGIN="https://appassets.androidplatform.net";
  @Override public void onCreate(Bundle state){super.onCreate(state);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    getWindow().getDecorView().setSystemUiVisibility(5894|1024|512);
    web=new WebView(this);setContentView(web);
    web.getSettings().setJavaScriptEnabled(true);
    web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setMediaPlaybackRequiresUserGesture(false);
    web.getSettings().setAllowFileAccess(false);
    web.getSettings().setAllowContentAccess(false);
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
        android.net.Uri uri=request.getUrl();
        if(ORIGIN.equals(uri.getScheme()+"://"+uri.getHost()) && "/assets/index.html".equals(uri.getPath())){
          try{InputStream in=getAssets().open("index.html");return new WebResourceResponse("text/html","UTF-8",in);}catch(IOException e){return null;}
        }
        return super.shouldInterceptRequest(view,request);
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public void onPermissionRequest(PermissionRequest request){
        if(!ORIGIN.equals(request.getOrigin().toString().replaceAll("/$",""))){request.deny();return;}
        boolean video=false;
        for(String resource:request.getResources())if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource))video=true;
        if(!video){request.deny();return;}
        if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        else {pending=request;requestPermissions(new String[]{Manifest.permission.CAMERA},123);}
      }
      @Override public void onPermissionRequestCanceled(PermissionRequest request){if(pending==request)pending=null;}
    });
    if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.CAMERA},123);
    web.loadUrl(ORIGIN+"/assets/index.html");
  }
  @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);
    if(code==123&&pending!=null){PermissionRequest req=pending;pending=null;if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else req.deny();}
  }
  @Override protected void onDestroy(){if(pending!=null){pending.deny();pending=null;}if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
