package com.pspcontroller.app;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import org.java_websocket.server.WebSocketServer;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.WebSocket;
import org.json.JSONObject;
import java.net.InetSocketAddress;

public class MainActivity extends BridgeActivity {
    private AppWebSocketServer wsServer;
    private String currentPin = "";

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
                currentPin = pin;
                if (wsServer != null) {
                    try { wsServer.stop(); } catch (Exception e) {}
                }
                wsServer = new AppWebSocketServer(new InetSocketAddress(3000));
                wsServer.start();
                runOnUiThread(() -> {
                    bridge.getWebView().evaluateJavascript("if(window.onReceiverStatus) window.onReceiverStatus('Server started on port 3000. Waiting for controller...');", null);
                });
            }

            @JavascriptInterface
            public void stopServer() {
                if (wsServer != null) {
                    try { wsServer.stop(); } catch (Exception e) {}
                    wsServer = null;
                }
            }
        }, "AndroidNative");
    }

    private class AppWebSocketServer extends WebSocketServer {
        public AppWebSocketServer(InetSocketAddress address) {
            super(address);
        }

        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
            runOnUiThread(() -> {
                bridge.getWebView().evaluateJavascript("if(window.onReceiverStatus) window.onReceiverStatus('Controller connected! Waiting for PIN...');", null);
            });
        }

        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
            runOnUiThread(() -> {
                bridge.getWebView().evaluateJavascript("if(window.onReceiverStatus) window.onReceiverStatus('Controller disconnected. Waiting...');", null);
            });
        }

        @Override
        public void onMessage(WebSocket conn, String message) {
            try {
                JSONObject msg = new JSONObject(message);
                String type = msg.optString("type");
                
                if ("auth".equals(type)) {
                    if (currentPin.equals(msg.optString("pin"))) {
                        conn.send("{\"type\":\"auth_success\"}");
                        runOnUiThread(() -> {
                            bridge.getWebView().evaluateJavascript("if(window.onReceiverStatus) window.onReceiverStatus('Controller Authenticated!');", null);
                        });
                    } else {
                        conn.send("{\"type\":\"auth_fail\"}");
                    }
                } else if ("ping".equals(type)) {
                    conn.send("{\"type\":\"pong\"}");
                } else if ("button".equals(type)) {
                    String button = msg.optString("button");
                    boolean isPressed = "pressed".equals(msg.optString("status"));
                    if (isPressed && TouchMapperService.instance != null) {
                        int[] coords = TouchOverlayManager.getInstance(MainActivity.this).getMappedCoordinates(button);
                        if (coords != null) {
                            TouchMapperService.instance.simulateTap(coords[0], coords[1]);
                        }
                    }
                } else if ("analog".equals(type) || "gyro".equals(type)) {
                    if (TouchMapperService.instance != null) {
                        if (msg.has("x")) TouchMapperService.instance.handleAxis(type + "_x", (float)msg.getDouble("x"));
                        if (msg.has("y")) TouchMapperService.instance.handleAxis(type + "_y", (float)msg.getDouble("y"));
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @Override
        public void onError(WebSocket conn, Exception ex) {
            ex.printStackTrace();
            runOnUiThread(() -> {
                bridge.getWebView().evaluateJavascript("if(window.onReceiverStatus) window.onReceiverStatus('Server error: " + ex.getMessage() + "');", null);
            });
        }

        @Override
        public void onStart() {
        }
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
