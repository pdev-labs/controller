package com.pspcontroller.app;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.KeyEvent;

import java.lang.reflect.Method;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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

    /**
     * One-line diagnostics for the setup panel, e.g.
     * "binder=yes serverUid=2000 serverVer=13 flag=granted".
     * serverUid 0 means a root backend (auto-grants, nothing to approve in
     * the Shizuku manager); 2000 means ADB-started Shizuku.
     */
    public static String getDiagnostics() {
        boolean binder = isBinderAlive();
        String uid;
        try {
            uid = String.valueOf(Shizuku.getUid());
        } catch (Exception e) {
            uid = "n/a";
        }
        String ver;
        try {
            ver = String.valueOf(Shizuku.getVersion());
        } catch (Exception e) {
            ver = "n/a";
        }
        String flag;
        try {
            flag = Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED
                    ? "granted" : "denied";
        } catch (Exception e) {
            flag = "n/a";
        }
        return "binder=" + (binder ? "yes" : "no")
                + " serverUid=" + uid
                + " serverVer=" + ver
                + " flag=" + flag;
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

    // ---------- Shizuku shell + key mapping (receiver keyboard) ----------

    private static final ExecutorService SHELL_EXEC = Executors.newSingleThreadExecutor();

    /**
     * Runs a shell command with Shizuku privileges on a background thread.
     * Uses reflection because newProcess is private in API v13 (deprecated,
     * slated for removal in v14); falls back silently when unavailable.
     */
    public static void runShellAsync(String[] cmd) {
        SHELL_EXEC.execute(() -> {
            Object proc = null;
            try {
                Method m = Shizuku.class.getDeclaredMethod(
                        "newProcess", String[].class, String[].class, String.class);
                m.setAccessible(true);
                proc = m.invoke(null, cmd, null, null);
                if (proc instanceof Process) {
                    Process p = (Process) proc;
                    long deadline = SystemClock.uptimeMillis() + 5000;
                    while (true) {
                        try {
                            p.exitValue();
                            break;
                        } catch (IllegalThreadStateException running) {
                            if (SystemClock.uptimeMillis() > deadline) break;
                            try {
                                Thread.sleep(50);
                            } catch (InterruptedException ie) {
                                Thread.currentThread().interrupt();
                                break;
                            }
                        }
                    }
                    try {
                        p.destroy();
                    } catch (Exception ignored) {
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    /**
     * Maps controller evdev KEY_* codes to Android keycodes. Returns 0 when
     * there is no Android equivalent (validated via keyCodeFromString).
     */
    public static int toAndroidKeyCode(String evdev) {
        if (evdev == null || !evdev.startsWith("KEY_")) return 0;
        String name = evdev.substring(4);
        switch (name) {
            case "EQUAL": name = "EQUALS"; break;
            case "LEFTBRACE": name = "LEFT_BRACKET"; break;
            case "RIGHTBRACE": name = "RIGHT_BRACKET"; break;
            case "DOT": name = "PERIOD"; break;
            case "KPDOT": name = "NUMPAD_DOT"; break;
            case "CAPSLOCK": name = "CAPS_LOCK"; break;
            case "LEFTCTRL": name = "CTRL_LEFT"; break;
            case "RIGHTCTRL": name = "CTRL_RIGHT"; break;
            case "LEFTSHIFT": name = "SHIFT_LEFT"; break;
            case "RIGHTSHIFT": name = "SHIFT_RIGHT"; break;
            case "LEFTALT": name = "ALT_LEFT"; break;
            case "RIGHTALT": name = "ALT_RIGHT"; break;
            case "LEFTMETA": name = "META_LEFT"; break;
            case "RIGHTMETA": name = "META_RIGHT"; break;
            case "COMPOSE": name = "MENU"; break;
            case "UP": name = "DPAD_UP"; break;
            case "DOWN": name = "DPAD_DOWN"; break;
            case "LEFT": name = "DPAD_LEFT"; break;
            case "RIGHT": name = "DPAD_RIGHT"; break;
            case "BACKSPACE": name = "DEL"; break;
            case "DELETE": name = "FORWARD_DEL"; break;
            case "END": name = "MOVE_END"; break;
            case "PAGEUP": name = "PAGE_UP"; break;
            case "PAGEDOWN": name = "PAGE_DOWN"; break;
            case "KPMINUS": name = "NUMPAD_SUBTRACT"; break;
            case "KPPLUS": name = "NUMPAD_ADD"; break;
            case "KPSLASH": name = "NUMPAD_DIVIDE"; break;
            case "KPASTERISK": name = "NUMPAD_MULTIPLY"; break;
            case "KPENTER": name = "NUMPAD_ENTER"; break;
            case "NUMLOCK": name = "NUM_LOCK"; break;
            case "SCROLLLOCK": name = "SCROLL_LOCK"; break;
            case "PAUSE": name = "BREAK"; break;
            case "ESC": name = "ESCAPE"; break;
            default: break;
        }
        if (name.length() == 3 && name.startsWith("KP") && Character.isDigit(name.charAt(2))) {
            name = "NUMPAD_" + name.charAt(2);
        }
        try {
            int code = KeyEvent.keyCodeFromString("KEYCODE_" + name);
            return code == KeyEvent.KEYCODE_UNKNOWN ? 0 : code;
        } catch (Exception e) {
            return 0;
        }
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
