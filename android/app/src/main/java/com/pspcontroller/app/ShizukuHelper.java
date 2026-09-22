package com.pspcontroller.app;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.text.TextUtils;

import rikka.shizuku.Shizuku;

/**
 * Helpers for the two privileged setup paths used by the Android-to-Android
 * receiver: the AccessibilityService (Touch Mapper engine) and Shizuku
 * (Native Gamepad engine).
 */
public final class ShizukuHelper {

    public static final int SHIZUKU_REQUEST_CODE = 10001;
    public static final String SHIZUKU_PACKAGE = "moe.shizuku.privileged.api";

    public interface PermissionCallback {
        void onResult(boolean granted);
    }

    private ShizukuHelper() {
    }

    // ---------- Shizuku ----------

    /** True when the Shizuku binder service is reachable (Shizuku started). */    public static boolean isBinderAlive() {
        try {
            return Shizuku.pingBinder();
        } catch (Exception e) {
            return false;
        }
    }

    /** True when Shizuku is running AND this app is authorized. */
    public static boolean isAuthorized() {
        try {
            return isBinderAlive()
                    && Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean isShizukuInstalled(Context ctx) {
        try {
            ctx.getPackageManager().getPackageInfo(SHIZUKU_PACKAGE, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    /**
     * Single authoritative state, binder-first: on some devices package
     * visibility stays blocked (dual apps, work profiles, OEM quirks) even
     * with &lt;queries&gt;, but a live binder proves Shizuku is present.
     * One of: "authorized", "running", "installed", "missing".
     */
    public static String getState(Context ctx) {
        try {
            if (isAuthorized()) return "authorized";
        } catch (Exception ignored) {
        }
        try {
            if (isBinderAlive()) return "running";
        } catch (Exception ignored) {
        }
        try {
            if (isShizukuInstalled(ctx)) return "installed";
        } catch (Exception ignored) {
        }
        return "missing";
    }

    /** Requests Shizuku authorization (shows up in Shizuku's Authorized apps). */
    public static void requestPermission(PermissionCallback cb) {
        if (!isBinderAlive()) {
            cb.onResult(false);
            return;
        }
        if (Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
            cb.onResult(true);
            return;
        }
        Shizuku.OnRequestPermissionResultListener listener =
                new Shizuku.OnRequestPermissionResultListener() {
                    @Override
                    public void onRequestPermissionResult(int requestCode, int grantResult) {
                        if (requestCode != SHIZUKU_REQUEST_CODE) return;
                        Shizuku.removeRequestPermissionResultListener(this);
                        cb.onResult(grantResult == PackageManager.PERMISSION_GRANTED);
                    }
                };
        Shizuku.addRequestPermissionResultListener(listener);
        try {
            Shizuku.requestPermission(SHIZUKU_REQUEST_CODE);
        } catch (Exception e) {
            Shizuku.removeRequestPermissionResultListener(listener);
            cb.onResult(false);
        }
    }

    /** Opens the Shizuku manager app so the user can start it. False if not installed. */
    public static boolean openShizukuApp(Context ctx) {
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(SHIZUKU_PACKAGE);
        if (launch == null) return false;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(launch);
        return true;
    }

    // ---------- Accessibility ----------

    /** True when our TouchMapperService is enabled in system settings. */
    public static boolean isAccessibilityEnabled(Context ctx) {
        String expected = new ComponentName(ctx, TouchMapperService.class).flattenToString();
        String enabled = Settings.Secure.getString(
                ctx.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null) return false;
        TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
        splitter.setString(enabled);
        while (splitter.hasNext()) {
            if (expected.equalsIgnoreCase(splitter.next())) return true;
        }
        return false;
    }

    public static void openAccessibilitySettings(Activity activity) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity.startActivity(intent);
    }
}
