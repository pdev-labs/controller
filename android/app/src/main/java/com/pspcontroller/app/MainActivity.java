package com.pspcontroller.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int NOTIFICATION_PERMISSION_CODE = 9001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );

        // Mirror service status into the WebView while the Activity is alive.
        // When the app is backgrounded / swiped away, the service keeps running
        // and only the notification shows status.
        ReceiverService.setStatusListener(status ->
            runOnUiThread(() -> {
                if (bridge != null && bridge.getWebView() != null) {
                    String escaped = status.replace("\\", "\\\\").replace("'", "\\'");
                    bridge.getWebView().evaluateJavascript(
                        "if(window.onReceiverStatus) window.onReceiverStatus('" + escaped + "');", null);
                }
            })
        );

        this.bridge.getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void setLandscape() {
                runOnUiThread(() -> {
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                    hideSystemUI();
                });
            }

            @JavascriptInterface
            public void setPortrait() {
                runOnUiThread(() -> {
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                    hideSystemUI();
                });
            }

            @JavascriptInterface
            public void openTouchMapper() {
                runOnUiThread(() -> {
                    if (!android.provider.Settings.canDrawOverlays(MainActivity.this)) {
                        android.content.Intent intent = new android.content.Intent(
                            android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            android.net.Uri.parse("package:" + getPackageName())
                        );
                        startActivity(intent);
                        return;
                    }
                    TouchOverlayManager.getInstance(MainActivity.this).showOverlay();
                });
            }

            @JavascriptInterface
            public void injectButton(String button, boolean isPressed) {
                if (isPressed && TouchMapperService.instance != null) {
                    int[] coords = TouchOverlayManager.getInstance(MainActivity.this).getMappedCoordinates(button);
                    if (coords != null) {
                        TouchMapperService.instance.simulateTap(coords[0], coords[1]);
                    }
                }
            }

            @JavascriptInterface
            public void injectAxis(String axis, float value) {
                if (TouchMapperService.instance != null) {
                    TouchMapperService.instance.handleAxis(axis, value);
                }
            }

            @JavascriptInterface
            public void startServer(String pin) {
                runOnUiThread(() -> {
                    requestNotificationPermissionIfNeeded();
                    Intent intent = new Intent(MainActivity.this, ReceiverService.class);
                    intent.setAction(ReceiverService.ACTION_START);
                    intent.putExtra(ReceiverService.EXTRA_PIN, pin);
                    ContextCompat.startForegroundService(MainActivity.this, intent);
                });
            }

            @JavascriptInterface
            public void stopServer() {
                Intent intent = new Intent(MainActivity.this, ReceiverService.class);
                intent.setAction(ReceiverService.ACTION_STOP);
                startService(intent);
            }

            // Lets the Web UI restore receiver state when the Activity is
            // recreated (e.g. user swiped the app away and reopened it while
            // the foreground service kept running).
            @JavascriptInterface
            public boolean isReceiverRunning() {
                return ReceiverService.isRunning();
            }

            @JavascriptInterface
            public String getReceiverStatus() {
                return ReceiverService.lastStatus;
            }

            @JavascriptInterface
            public String getReceiverPin() {
                return ReceiverService.currentPin;
            }
        }, "AndroidNative");
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_CODE);
            }
        }
    }

    @Override
    protected void onDestroy() {
        ReceiverService.clearStatusListener();
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }
}
