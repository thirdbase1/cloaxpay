# CloaxPay Mobile App (Android)

This project has been configured with **Capacitor** to allow it to run as a native mobile app.

## Quick Start (Download)

You can download the APK from your live site:
- **Link:** `https://cloaxpay.fogopulse.com/CloaxPay.apk`
- **Local File:** `CloaxPay-debug.apk`

## How to use

The app is configured as a **Web Wrapper** pointing to `https://cloaxpay.fogopulse.com`. This ensures 100% of the Next.js code works exactly as it does on the website while providing the safest and most reliable experience.

### Configuration
The app is set up in `capacitor.config.ts` with:
- **Domain:** `https://cloaxpay.fogopulse.com`
- **Icon:** New multi-color CP gradient icon.

### 2. Sync and Rebuild
After changing the URL, run:
```bash
pnpm mobile:sync
pnpm mobile:build
```
Your new APK will be located at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Advanced: Packaging Code into APK

If you want the code to be bundled *inside* the APK (so it works without a server), you must:
1. Set `output: 'export'` in `next.config.mjs`.
2. Refactor all Server Components to Client Components.
3. Change all API calls from relative paths (`/api/...`) to absolute paths (`https://your-domain.com/api/...`).
4. Remove the `server.url` from `capacitor.config.ts`.

**Note:** The current "Web Wrapper" approach is recommended as it maintains "100% same code" compatibility with all Next.js features.

## Requirements for building
- Node.js & pnpm
- Android Studio / Android SDK
- Java 17+
