package com.pspcontroller.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONObject;

import java.net.InetSocketAddress;

/**
 * Foreground service hosting the Android-to-Android receiver WebSocket server.
 *
 * Previously the server socket lived inside MainActivity, so pressing Home and
 * (especially) swiping the app away from recents destroyed the Activity and
 * killed the connection. A foreground service with START_STICKY survives both:
 * Home only backgrounds the task, and task removal does not stop a started
 * service — the system keeps (or restarts) it.
 */
public class ReceiverService extends Service {

    public static final String ACTION_START = "com.pspcontroller.app.action.START_RECEIVER";
    public static final String ACTION_STOP = "com.pspcontroller.app.action.STOP_RECEIVER";
    public static final String EXTRA_PIN = "extra_pin";

    private static final String CHANNEL_ID = "receiver_service";
    private static final int NOTIFICATION_ID = 1001;
    private static final int WS_PORT = 3000;

    /** Listener attached by MainActivity (when alive) to mirror status into the WebView. */
    public interface StatusListener {
        void onStatus(String status);
    }

    public static volatile StatusListener statusListener;
    public static volatile String lastStatus = "Stopped";
    public static volatile String currentPin = "";
    private static volatile Context appCtx;

    private static AppWebSocketServer wsServer;

    public static synchronized boolean isRunning() {
        return wsServer != null;
    }

    public static void setStatusListener(StatusListener listener) {
        statusListener = listener;
        if (listener != null) {
            listener.onStatus(lastStatus);
        }
    }

    public static void clearStatusListener() {
        statusListener = null;
    }

    static void publishStatus(Context ctx, String status) {
        lastStatus = status;
        StatusListener listener = statusListener;
        if (listener != null) {
            listener.onStatus(status);
        }
        // Keep the persistent notification truthful when the Activity is gone.
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && isRunning()) {
            nm.notify(NOTIFICATION_ID, buildNotification(ctx, status));
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        appCtx = getApplicationContext();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopReceiver();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (intent != null && intent.hasExtra(EXTRA_PIN)) {
            currentPin = intent.getStringExtra(EXTRA_PIN);
            // Persist so a system-triggered restart (START_STICKY without
            // intent extras) resumes with the same PIN.
            getSharedPreferences("receiver", MODE_PRIVATE)
                    .edit().putString("pin", currentPin).apply();
        } else if (currentPin == null || currentPin.isEmpty()) {
            currentPin = getSharedPreferences("receiver", MODE_PRIVATE)
                    .getString("pin", "");
        }

        // Must call startForeground promptly (ANR timeout) after startForegroundService().
        try {
            startForeground(NOTIFICATION_ID, buildNotification(this, "Waiting for controller..."));
            startReceiver();
        } catch (Exception e) {
            // Never crash the app from a service start (e.g. FGS restrictions
            // on some OEM builds) — report and stop instead.
            e.printStackTrace();
            lastStatus = "Failed to start receiver: " + e.getMessage();
            stopSelf();
            return START_NOT_STICKY;
        }
        // START_STICKY: if the system kills us under pressure, recreate without
        // the intent and resume listening with the last known PIN.
        return START_STICKY;
    }

    /**
     * Intentionally does NOT stop the server: swiping the app from recents
     * removes the task, but a started service must keep running.
     */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        stopReceiver();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private synchronized void startReceiver() {
        if (wsServer != null) {
            publishStatus(this, lastStatus);
            return;
        }
        try {
            AppWebSocketServer server = new AppWebSocketServer(this, new InetSocketAddress(WS_PORT));
            server.start();
            wsServer = server;
        } catch (Exception e) {
            wsServer = null;
            throw new RuntimeException("WebSocket server failed to start", e);
        }
        publishStatus(this, "Server started on port " + WS_PORT + ". Waiting for controller...");
    }

    private synchronized void stopReceiver() {
        if (wsServer != null) {
            try {
                wsServer.stop();
            } catch (Exception e) {
                e.printStackTrace();
            }
            wsServer = null;
        }
        lastStatus = "Stopped";
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Controller Receiver",
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Keeps the controller receiver running while you use other apps.");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private static Notification buildNotification(Context ctx, String status) {
        Intent launchIntent = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            pendingIntent = PendingIntent.getActivity(ctx, 0, launchIntent, pendingFlags);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setContentTitle("PSP Controller Receiver")
                .setContentText(status)
                .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
                .setOngoing(true)
                .setOnlyAlertOnce(true);
        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent);
        }
        return builder.build();
    }

    private static class AppWebSocketServer extends WebSocketServer {
        private final Context appContext;

        AppWebSocketServer(Context context, InetSocketAddress address) {
            super(address);
            this.appContext = context.getApplicationContext();
        }

        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
            publishStatusStatic("Controller connected! Waiting for PIN...");
        }

        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
            publishStatusStatic("Controller disconnected. Waiting...");
        }

        @Override
        public void onMessage(WebSocket conn, String message) {
            try {
                JSONObject msg = new JSONObject(message);
                String type = msg.optString("type");

                if ("auth".equals(type)) {
                    if (currentPin.equals(msg.optString("pin"))) {
                        conn.send("{\"type\":\"auth_success\"}");
                        publishStatusStatic("Controller Authenticated!");
                    } else {
                        conn.send("{\"type\":\"auth_fail\"}");
                    }
                } else if ("ping".equals(type)) {
                    conn.send("{\"type\":\"pong\"}");
                } else if ("button".equals(type)) {
                    String button = msg.optString("button");
                    boolean isPressed = "pressed".equals(msg.optString("status"));
                    if (isPressed && TouchMapperService.instance != null) {
                        int[] coords = TouchOverlayManager.getInstance(appContext).getMappedCoordinates(button);
                        if (coords != null) {
                            TouchMapperService.instance.simulateTap(coords[0], coords[1]);
                        }
                    }
                } else if ("analog".equals(type) || "gyro".equals(type)) {
                    if (TouchMapperService.instance != null) {
                        if (msg.has("x")) TouchMapperService.instance.handleAxis(type + "_x", (float) msg.getDouble("x"));
                        if (msg.has("y")) TouchMapperService.instance.handleAxis(type + "_y", (float) msg.getDouble("y"));
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @Override
        public void onError(WebSocket conn, Exception ex) {
            ex.printStackTrace();
            publishStatusStatic("Server error: " + ex.getMessage());
        }

        @Override
        public void onStart() {
        }
    }

    private static void publishStatusStatic(String status) {
        lastStatus = status;
        StatusListener listener = statusListener;
        if (listener != null) {
            listener.onStatus(status);
        }
        Context ctx = appCtx;
        if (ctx != null && wsServer != null) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildNotification(ctx, status));
            }
        }
    }
}
