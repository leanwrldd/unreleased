import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.juicewrldapi.unreleased',
  appName: 'unreleased',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#000000',
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#000000',
  },
  ios: {
    backgroundColor: '#000000',
    contentInset: 'always',
  },
};

export default config;
