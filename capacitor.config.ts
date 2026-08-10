import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pspcontroller.app',
  appName: 'pspcontroller',
  webDir: 'public',
  server: {
    cleartext: true
  }
};

export default config;
