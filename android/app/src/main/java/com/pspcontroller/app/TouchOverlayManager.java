package com.pspcontroller.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;

import java.util.HashMap;
import java.util.Map;

public class TouchOverlayManager {

    private static TouchOverlayManager instance;
    private final Context context;
    private WindowManager windowManager;
    private FrameLayout overlayContainer;
    private Map<String, Button> virtualButtons = new HashMap<>();

    private TouchOverlayManager(Context context) {
        this.context = context.getApplicationContext();
        this.windowManager = (WindowManager) this.context.getSystemService(Context.WINDOW_SERVICE);
    }

    public static TouchOverlayManager getInstance(Context context) {
        if (instance == null) {
            instance = new TouchOverlayManager(context);
        }
        return instance;
    }

    public void showOverlay() {
        if (overlayContainer != null) return;

        overlayContainer = new FrameLayout(context);
        overlayContainer.setBackgroundColor(Color.parseColor("#44000000")); // Semi-transparent for mapping

        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);

        windowManager.addView(overlayContainer, params);

        // Add some default draggable buttons
        addButton("dpad-up", 200, 200);
        addButton("dpad-down", 200, 400);
        addButton("dpad-left", 100, 300);
        addButton("dpad-right", 300, 300);
        addButton("btn-cross", 800, 400);
        addButton("btn-circle", 900, 300);
        addButton("btn-square", 700, 300);
        addButton("btn-triangle", 800, 200);
        addButton("analog-center", 200, 600);
        
        Button saveBtn = new Button(context);
        saveBtn.setText("SAVE & CLOSE");
        saveBtn.setBackgroundColor(Color.parseColor("#4CAF50"));
        saveBtn.setTextColor(Color.WHITE);
        saveBtn.setOnClickListener(v -> hideOverlay());
        
        FrameLayout.LayoutParams saveParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT);
        saveParams.gravity = Gravity.CENTER_HORIZONTAL | Gravity.TOP;
        saveParams.topMargin = 50;
        overlayContainer.addView(saveBtn, saveParams);
    }

    private void addButton(String id, int initialX, int initialY) {
        Button btn = new Button(context);
        btn.setText(id);
        btn.setAlpha(0.7f);
        btn.setBackgroundColor(Color.parseColor("#FF9800"));
        btn.setTextColor(Color.WHITE);
        
        SharedPreferences prefs = context.getSharedPreferences("touch_mapper", Context.MODE_PRIVATE);
        int savedX = prefs.getInt(id + "_x", initialX);
        int savedY = prefs.getInt(id + "_y", initialY);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(150, 150);
        params.leftMargin = savedX;
        params.topMargin = savedY;
        overlayContainer.addView(btn, params);
        
        virtualButtons.put(id, btn);

        btn.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.leftMargin;
                        initialY = params.topMargin;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.leftMargin = initialX + (int) (event.getRawX() - initialTouchX);
                        params.topMargin = initialY + (int) (event.getRawY() - initialTouchY);
                        overlayContainer.updateViewLayout(v, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        prefs.edit()
                             .putInt(id + "_x", params.leftMargin)
                             .putInt(id + "_y", params.topMargin)
                             .apply();
                        return true;
                }
                return false;
            }
        });
    }

    public void hideOverlay() {
        if (overlayContainer != null) {
            windowManager.removeView(overlayContainer);
            overlayContainer = null;
            virtualButtons.clear();
        }
    }
    
    public int[] getMappedCoordinates(String buttonId) {
        SharedPreferences prefs = context.getSharedPreferences("touch_mapper", Context.MODE_PRIVATE);
        int x = prefs.getInt(buttonId + "_x", -1);
        int y = prefs.getInt(buttonId + "_y", -1);
        if (x == -1 || y == -1) return null;
        return new int[]{x + 75, y + 75}; // Return center of the 150x150 button
    }
}
