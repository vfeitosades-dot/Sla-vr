package com.handtracking.vrbox;

import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.graphics.Color;
import android.content.Context;
import android.util.DisplayMetrics;
import android.view.KeyEvent;
import org.json.JSONObject;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;
import java.io.InputStream;
import java.io.IOException;
import java.io.ByteArrayInputStream;

public class MainActivity extends Activity {
  private static final String ORIGIN="https://appassets.androidplatform.net";
  private static final int CAMERA_CODE=123;
  private FrameLayout root;
  private WebView web;
  private WebView browser;
  private LinearLayout browserPanel;
  private EditText addressBar;
  private PermissionRequest pending;
  private boolean browserVisible=false;
  // Volume keys tune inter-lens distance only in an explicitly activated VR test.
  private volatile boolean vrCalibrationActive=false;

  private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
  private static boolean isLocal(Uri uri){
    return uri!=null && "https".equalsIgnoreCase(uri.getScheme())
        && "appassets.androidplatform.net".equalsIgnoreCase(uri.getHost());
  }
  private WebResourceResponse localAsset(Uri uri){
    String path=uri.getPath(),name,mime;
    if("/assets/index.html".equals(path)){name="index.html";mime="text/html";}
    else if("/assets/hand-worker.js".equals(path)){name="hand-worker.js";mime="application/javascript";}
    else if("/assets/vr-ui.js".equals(path)){name="vr-ui.js";mime="application/javascript";}
    else if("/assets/worlds.js".equals(path)){name="worlds.js";mime="application/javascript";}
    else return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));
    try{
      InputStream in=getAssets().open(name);
      return new WebResourceResponse(mime,"UTF-8",in);
    }catch(IOException e){
      return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));
    }
  }

  @Override public void onCreate(Bundle state){
    super.onCreate(state);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    getWindow().getDecorView().setSystemUiVisibility(5894|1024|512);
    root=new FrameLayout(this);
    web=new WebView(this);
    root.addView(web,new FrameLayout.LayoutParams(-1,-1));
    setContentView(root);
    WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    // Only the packaged page receives this interface. Never attach it to the browser WebView.
    web.addJavascriptInterface(new Object(){
      @JavascriptInterface public void openBrowser(String address){
        runOnUiThread(()->openBrowserInside(address));
      }
      @JavascriptInterface public void closeBrowser(){
        runOnUiThread(()->closeBrowserInside());
      }
      @JavascriptInterface public String getDisplayInfo(){
        DisplayMetrics metrics=new DisplayMetrics();
        getWindowManager().getDefaultDisplay().getRealMetrics(metrics);
        float w=metrics.widthPixels*25.4f/Math.max(1,metrics.xdpi);
        float h=metrics.heightPixels*25.4f/Math.max(1,metrics.ydpi);
        try{
          JSONObject data=new JSONObject();
          data.put("longEdgeMm",Math.max(w,h));
          data.put("shortEdgeMm",Math.min(w,h));
          data.put("widthPx",metrics.widthPixels);
          data.put("heightPx",metrics.heightPixels);
          data.put("xdpi",metrics.xdpi);
          data.put("ydpi",metrics.ydpi);
          return data.toString();
        }catch(Exception e){return "{}";}
      }
      @JavascriptInterface public void setVrCalibrationActive(boolean active){
        vrCalibrationActive=active;
      }
      @JavascriptInterface public void setVrMode(boolean on){
        runOnUiThread(()->setRequestedOrientation(on?ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE:ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
      }
    },"VRNative");
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
        if(isLocal(request.getUrl()))return localAsset(request.getUrl());
        return super.shouldInterceptRequest(view,request);
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
        Uri uri=request.getUrl();
        if(isLocal(uri))return false;
        if(request.isForMainFrame())openBrowserInside(uri.toString());
        return true;
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public void onPermissionRequest(PermissionRequest request){
        runOnUiThread(()->{
          if(!isLocal(request.getOrigin())){request.deny();return;}
          boolean video=false;
          for(String r:request.getResources())
            if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r))video=true;
          if(!video){request.deny();return;}
          if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
          else{
            if(pending!=null)pending.deny();
            pending=request;
            requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_CODE);
          }
        });
      }
      @Override public void onPermissionRequestCanceled(PermissionRequest request){
        if(pending==request)pending=null;
      }
    });
    if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)
      requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_CODE);
    web.loadUrl(ORIGIN+"/assets/index.html");
  }

  private Button toolbarButton(String label){
    Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setTextColor(Color.WHITE);
    b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(37,44,65)));
    b.setPadding(dp(4),0,dp(4),0);
    return b;
  }
  private void createBrowser(){
    if(browserPanel!=null)return;
    browserPanel=new LinearLayout(this);
    browserPanel.setOrientation(LinearLayout.VERTICAL);
    browserPanel.setBackgroundColor(Color.rgb(8,13,26));
    LinearLayout toolbar=new LinearLayout(this);
    toolbar.setOrientation(LinearLayout.HORIZONTAL);
    toolbar.setPadding(dp(6),dp(3),dp(6),dp(3));
    toolbar.setBackgroundColor(Color.rgb(14,22,42));
    browserPanel.addView(toolbar,new LinearLayout.LayoutParams(-1,dp(56)));
    Button back=toolbarButton("‹");
    Button home=toolbarButton("⌂");
    Button refresh=toolbarButton("⟳");
    Button close=toolbarButton("✕");
    for(Button b:new Button[]{back,home,refresh})
      toolbar.addView(b,new LinearLayout.LayoutParams(dp(46),-1));
    addressBar=new EditText(this);
    addressBar.setSingleLine(true);
    addressBar.setTextColor(Color.WHITE);
    addressBar.setHintTextColor(Color.LTGRAY);
    addressBar.setBackgroundColor(Color.rgb(33,43,65));
    addressBar.setHint("https:// ou pesquisar");
    addressBar.setTextSize(14);
    addressBar.setPadding(dp(12),0,dp(12),0);
    addressBar.setImeOptions(EditorInfo.IME_ACTION_GO);
    toolbar.addView(addressBar,new LinearLayout.LayoutParams(0,-1,1f));
    toolbar.addView(close,new LinearLayout.LayoutParams(dp(48),-1));
    browser=new WebView(this);
    browser.setBackgroundColor(Color.WHITE);
    WebSettings bs=browser.getSettings();
    bs.setJavaScriptEnabled(true);
    bs.setDomStorageEnabled(true);
    bs.setAllowFileAccess(false);
    bs.setAllowContentAccess(false);
    bs.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    bs.setSupportMultipleWindows(false);
    browser.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
        Uri uri=request.getUrl();
        String scheme=uri.getScheme();
        if("https".equalsIgnoreCase(scheme)||"about".equalsIgnoreCase(scheme))
          return false;
        Toast.makeText(MainActivity.this,"Use sites HTTPS",Toast.LENGTH_SHORT).show();
        return true;
      }
      @Override public void onPageFinished(WebView view,String url){
        if(addressBar!=null&&url!=null&&!url.startsWith("about:"))addressBar.setText(url);
      }
    });
    browser.setWebChromeClient(new WebChromeClient());
    browserPanel.addView(browser,new LinearLayout.LayoutParams(-1,0,1f));
    root.addView(browserPanel,new FrameLayout.LayoutParams(-1,-1));
    browserPanel.setVisibility(View.GONE);
    back.setOnClickListener(v->{if(browser.canGoBack())browser.goBack();});
    home.setOnClickListener(v->loadBrowserAddress("https://www.google.com/"));
    refresh.setOnClickListener(v->browser.reload());
    close.setOnClickListener(v->closeBrowserInside());
    addressBar.setOnEditorActionListener((view,action,event)->{
      if(action==EditorInfo.IME_ACTION_GO){loadBrowserAddress(addressBar.getText().toString());return true;}
      return false;
    });
  }
  private void loadBrowserAddress(String raw){
    if(browser==null)return;
    String value=raw==null?"":raw.trim();
    if(value.length()>2048)value=value.substring(0,2048);
    if(value.isEmpty())value="https://www.google.com/";
    if(value.indexOf(' ')>=0 || (!value.contains(".")&&!value.contains("://")))
      value="https://www.google.com/search?q="+Uri.encode(value);
    else if(!value.contains("://"))value="https://"+value;
    Uri uri=Uri.parse(value);
    if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null){
      Toast.makeText(this,"Apenas sites HTTPS",Toast.LENGTH_SHORT).show();return;
    }
    addressBar.setText(value);
    browser.loadUrl(value);
  }
  private void openBrowserInside(String url){
    createBrowser();
    browserVisible=true;
    browserPanel.setVisibility(View.VISIBLE);
    web.evaluateJavascript("window.onVRBrowserVisibility&&window.onVRBrowserVisibility(true)",null);
    loadBrowserAddress(url);
  }
  private void closeBrowserInside(){
    if(!browserVisible)return;
    browserVisible=false;
    browserPanel.setVisibility(View.GONE);
    if(browser!=null)browser.loadUrl("about:blank");
    web.evaluateJavascript("window.onVRBrowserVisibility&&window.onVRBrowserVisibility(false)",null);
  }
  @Override public void onBackPressed(){
    if(browserVisible){
      if(browser!=null&&browser.canGoBack())browser.goBack();
      else closeBrowserInside();
      return;
    }
    super.onBackPressed();
  }
  @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){
    super.onRequestPermissionsResult(code,permissions,results);
    if(code==CAMERA_CODE&&pending!=null){
      PermissionRequest req=pending;pending=null;
      if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)
        req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
      else req.deny();
    }
  }
  @Override public boolean dispatchKeyEvent(KeyEvent event){
    int key=event.getKeyCode();
    if(vrCalibrationActive&&(key==KeyEvent.KEYCODE_VOLUME_UP||key==KeyEvent.KEYCODE_VOLUME_DOWN)){
      if(event.getAction()==KeyEvent.ACTION_DOWN&&event.getRepeatCount()==0&&web!=null){
        int step=key==KeyEvent.KEYCODE_VOLUME_UP?1:-1;
        web.evaluateJavascript("window.onVRVolumeAdjust&&window.onVRVolumeAdjust("+step+")",null);
      }
      return true;
    }
    return super.dispatchKeyEvent(event);
  }

  @Override protected void onDestroy(){
    if(pending!=null){pending.deny();pending=null;}
    if(browser!=null){browser.destroy();browser=null;}
    if(web!=null){web.destroy();web=null;}
    super.onDestroy();
  }
}
