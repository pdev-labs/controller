package com.pspcontroller.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

public class TouchMapperService extends AccessibilityService {

    public static TouchMapperService instance;

    // Virtual mouse cursor for trackpad mode (absolute touch has no hover).
    private float cursorX = -1;
    private float cursorY = -1;
    private static final float CURSOR_SCALE = 2.0f;

    // Modifier state tracked from press/release pairs (shell taps can't hold).
    private boolean shiftDown = false;

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Not used
    }

    @Override
    public void onInterrupt() {
        // Not used
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        instance = null;
        return super.onUnbind(intent);
    }

    public void simulateTap(float x, float y) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            Path clickPath = new Path();
            clickPath.moveTo(x, y);
            GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(clickPath, 0, 100);
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(stroke);
            dispatchGesture(builder.build(), null, null);
        }
    }

    public void simulateLongPress(float x, float y) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            Path pressPath = new Path();
            pressPath.moveTo(x, y);
            GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(pressPath, 0, 600);
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(stroke);
            dispatchGesture(builder.build(), null, null);
        }
    }

    public void simulateSwipe(float startX, float startY, float endX, float endY, int durationMs) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            Path swipePath = new Path();
            swipePath.moveTo(startX, startY);
            swipePath.lineTo(endX, endY);
            GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(swipePath, 0, durationMs);
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(stroke);
            dispatchGesture(builder.build(), null, null);
        }
    }

    public void handleAxis(String axis, float value) {
        // Find mapped center coordinates for analog stick
        int[] coords = TouchOverlayManager.getInstance(this).getMappedCoordinates("analog-center");
        if (coords != null) {
            float maxRadius = 100f; // Max swipe radius in pixels
            float startX = coords[0];
            float startY = coords[1];
            float endX = startX;
            float endY = startY;

            if (axis.equals("analog_x")) {
                endX = startX + (value * maxRadius);
            } else if (axis.equals("analog_y")) {
                endY = startY + (value * maxRadius);
            }

            simulateSwipe(startX, startY, endX, endY, 50); // Fast swipe duration
        }
    }

    // ---------- Trackpad (mouse) injection ----------

    private void ensureCursor() {
        if (cursorX >= 0) return;
        DisplayMetrics dm = getResources().getDisplayMetrics();
        cursorX = dm.widthPixels / 2f;
        cursorY = dm.heightPixels / 2f;
    }

    /** Relative move: advance the virtual cursor and drag to it. */
    public void handleMouseMove(float dx, float dy) {
        ensureCursor();
        DisplayMetrics dm = getResources().getDisplayMetrics();
        float nx = Math.max(0, Math.min(dm.widthPixels - 1, cursorX + dx * CURSOR_SCALE));
        float ny = Math.max(0, Math.min(dm.heightPixels - 1, cursorY + dy * CURSOR_SCALE));
        if (Math.abs(nx - cursorX) >= 1 || Math.abs(ny - cursorY) >= 1) {
            simulateSwipe(cursorX, cursorY, nx, ny, 40);
            cursorX = nx;
            cursorY = ny;
        }
    }

    /** Left = tap, right = long-press (accessibility has no true right-click). */
    public void handleMouseClick(String btn, int val) {
        if (val != 1) return; // act on press only
        ensureCursor();
        if ("right".equals(btn)) {
            simulateLongPress(cursorX, cursorY);
        } else {
            simulateTap(cursorX, cursorY);
        }
    }

    /** Mirror the flick direction as a vertical swipe. */
    public void handleMouseScroll(float dy) {
        if (dy == 0) return;
        ensureCursor();
        float dir = dy > 0 ? 1 : -1;
        simulateSwipe(cursorX, cursorY + 100 * dir, cursorX, cursorY - 100 * dir, 120);
    }

    // ---------- Keyboard injection ----------

    /**
     * evdev KEY_* codes from the controller. Text goes through the focused
     * editable node (correct case via tracked shift state); everything else
     * tries a Shizuku shell keyevent when authorized.
     */
    public void handleKey(String code, int val) {
        if (code == null) return;
        switch (code) {
            case "KEY_LEFTSHIFT":
            case "KEY_RIGHTSHIFT":
                shiftDown = (val == 1);
                return;
            case "KEY_LEFTCTRL":
            case "KEY_RIGHTCTRL":
            case "KEY_LEFTALT":
            case "KEY_RIGHTALT":
            case "KEY_LEFTMETA":
            case "KEY_RIGHTMETA":
                return; // no key combos supported; ignore lone modifiers
            default:
                break;
        }
        if (val != 1) return; // act on press only (shell taps can't hold)

        if ("KEY_ESC".equals(code)) {
            performGlobalAction(GLOBAL_ACTION_BACK);
            return;
        }
        String text = keyToText(code, shiftDown);
        if (text != null) {
            if (!inputText(text)) shellKey(code);
            return;
        }
        if ("KEY_BACKSPACE".equals(code)) {
            if (!deleteChar()) shellKey(code);
            return;
        }
        if ("KEY_LEFT".equals(code) || "KEY_RIGHT".equals(code)) {
            if (!moveCaret("KEY_LEFT".equals(code))) shellKey(code);
            return;
        }
        shellKey(code);
    }

    /** US-layout text for printable keys; null when no text equivalent. */
    private static String keyToText(String code, boolean shift) {
        switch (code) {
            case "KEY_SPACE": return " ";
            case "KEY_ENTER":
            case "KEY_KPENTER": return "\n";
            case "KEY_TAB": return "\t";
            case "KEY_MINUS": return shift ? "_" : "-";
            case "KEY_EQUAL": return shift ? "+" : "=";
            case "KEY_GRAVE": return shift ? "~" : "`";
            case "KEY_LEFTBRACE": return shift ? "{" : "[";
            case "KEY_RIGHTBRACE": return shift ? "}" : "]";
            case "KEY_BACKSLASH": return shift ? "|" : "\\";
            case "KEY_SEMICOLON": return shift ? ":" : ";";
            case "KEY_APOSTROPHE": return shift ? "\"" : "'";
            case "KEY_COMMA": return shift ? "<" : ",";
            case "KEY_DOT":
            case "KEY_KPDOT": return shift ? ">" : ".";
            case "KEY_SLASH":
            case "KEY_KPSLASH": return shift ? "?" : "/";
            case "KEY_KPASTERISK": return "*";
            case "KEY_KPMINUS": return "-";
            case "KEY_KPPLUS": return "+";
            default:
                break;
        }
        if (code.length() == 5 && code.startsWith("KEY_")) {
            char c = code.charAt(4);
            if (c >= 'A' && c <= 'Z') {
                return String.valueOf(shift ? c : Character.toLowerCase(c));
            }
            if (c >= '0' && c <= '9') {
                if (!shift) return String.valueOf(c);
                switch (c) {
                    case '1': return "!";
                    case '2': return "@";
                    case '3': return "#";
                    case '4': return "$";
                    case '5': return "%";
                    case '6': return "^";
                    case '7': return "&";
                    case '8': return "*";
                    case '9': return "(";
                    case '0': return ")";
                    default: return null;
                }
            }
        }
        if (code.startsWith("KEY_KP") && code.length() == 6 && Character.isDigit(code.charAt(5))) {
            return String.valueOf(code.charAt(5));
        }
        return null;
    }

    private AccessibilityNodeInfo focusedInput() {
        try {
            return findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean inputText(String text) {
        AccessibilityNodeInfo node = focusedInput();
        if (node == null) return false;
        try {
            if (!node.isEditable()) return false;
            CharSequence old = node.getText();
            String next = (old == null ? "" : old.toString()) + text;
            Bundle args = new Bundle();
            args.putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, next);
            return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
        } catch (Exception e) {
            return false;
        } finally {
            node.recycle();
        }
    }

    private boolean deleteChar() {
        AccessibilityNodeInfo node = focusedInput();
        if (node == null) return false;
        try {
            if (!node.isEditable()) return false;
            CharSequence old = node.getText();
            if (old == null || old.length() == 0) return true; // nothing to delete
            Bundle args = new Bundle();
            args.putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    old.subSequence(0, old.length() - 1).toString());
            return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
        } catch (Exception e) {
            return false;
        } finally {
            node.recycle();
        }
    }

    private boolean moveCaret(boolean left) {
        AccessibilityNodeInfo node = focusedInput();
        if (node == null) return false;
        try {
            Bundle args = new Bundle();
            args.putInt(AccessibilityNodeInfo.ACTION_ARGUMENT_MOVEMENT_GRANULARITY_INT,
                    AccessibilityNodeInfo.MOVEMENT_GRANULARITY_CHARACTER);
            return node.performAction(left
                    ? AccessibilityNodeInfo.ACTION_PREVIOUS_AT_MOVEMENT_GRANULARITY
                    : AccessibilityNodeInfo.ACTION_NEXT_AT_MOVEMENT_GRANULARITY, args);
        } catch (Exception e) {
            return false;
        } finally {
            node.recycle();
        }
    }

    /** Shizuku shell `input keyevent` fallback; no-op when not authorized. */
    private void shellKey(String evdevCode) {
        int kc = ShizukuHelper.toAndroidKeyCode(evdevCode);
        if (kc == 0) return;
        if (!ShizukuHelper.isAuthorized()) return;
        ShizukuHelper.runShellAsync(new String[]{"input", "keyevent", String.valueOf(kc)});
    }
}
