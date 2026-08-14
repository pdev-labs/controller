import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pspcontroller.app',
  appName: 'pspcontroller',
  webDir: 'public',
  server: {
    cleartext: true,
    androidScheme: 'http'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true
    }
  }
};

export default config;
