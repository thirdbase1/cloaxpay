import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cloaxpay.app',
  appName: 'CloaxPay',
  webDir: 'out',
  server: {
    // Change this to your actual production URL to keep everything 100% the same
    url: 'https://cloaxpay.com',
    cleartext: true
  }
};

export default config;
