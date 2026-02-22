import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cloaxpay.app',
  appName: 'CloaxPay',
  webDir: 'out',
  server: {
    url: 'https://cloaxpay.fogopulse.com',
    cleartext: true
  }
};

export default config;
