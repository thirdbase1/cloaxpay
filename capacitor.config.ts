import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cloaxpay.app',
  appName: 'CloaxPay',
  webDir: 'out',
  server: {
    // Append ?platform=mobile to detect app mode in Next.js
    url: 'https://cloaxpay.fogopulse.com?platform=mobile',
    cleartext: true
  }
};

export default config;
