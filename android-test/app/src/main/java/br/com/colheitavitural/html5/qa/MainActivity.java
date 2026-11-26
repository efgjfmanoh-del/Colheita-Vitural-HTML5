package br.com.colheitavitural.html5.qa;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/index.html";
    private WebView web;
    private UpdateCenter updates;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(0xff263d29);
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOME.equals(request.getUrl().toString());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String file, mime;
                if (HOME.equals(url)) { file = "index.html"; mime = "text/html"; }
                else if ((ORIGIN + "/assets/game.js").equals(url)) { file = "game.js"; mime = "application/javascript"; }
                else return notFound();
                try {
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK",
                        Collections.singletonMap("Cache-Control", "no-store"), getAssets().open(file));
                } catch (IOException e) { return notFound(); }
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                showFailure("O motor gráfico foi interrompido. Feche e reabra este teste.");
                return true;
            }
        });
        android.widget.FrameLayout frame = new android.widget.FrameLayout(this);
        frame.addView(web, new android.widget.FrameLayout.LayoutParams(-1,-1));
        updates = new UpdateCenter(this, frame);
        setContentView(frame);
        hideBars();
        web.loadUrl(HOME);
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private void showFailure(String message) {
        if (updates != null) { updates.close(); updates = null; }
        TextView text = new TextView(this);
        text.setText(message);
        text.setTextColor(0xffffffff);
        text.setBackgroundColor(0xff263d29);
        text.setGravity(android.view.Gravity.CENTER);
        setContentView(text);
        if (web != null) { web.destroy(); web = null; }
    }

    private void hideBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) hideBars();
    }
    @Override protected void onPause() {
        if (web != null) { web.onPause(); web.pauseTimers(); }
        if (updates != null) updates.pause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) { web.resumeTimers(); web.onResume(); }
        if (updates != null) updates.resume();
    }
    @Override protected void onDestroy() {
        if (updates != null) { updates.close(); updates = null; }
        if (web != null) {
            ((android.view.ViewGroup)web.getParent()).removeView(web);
            web.destroy(); web = null;
        }
        super.onDestroy();
    }
}
