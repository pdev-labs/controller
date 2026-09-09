package com.pspcontroller.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.view.accessibility.AccessibilityEvent;
import android.os.Handler;
import android.os.Looper;

public class TouchMapperService extends AccessibilityService {

    public static TouchMapperService instance;

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
            GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(clickPath, 0, 50);
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
}
