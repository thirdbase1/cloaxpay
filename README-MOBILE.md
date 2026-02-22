# CloaxPay Mobile App (Android)

This project has been configured with **Capacitor** to allow it to run as a native mobile app.

## Quick Start (Download)

You can find the generated debug APK in the root directory:
- **File:** `CloaxPay-debug.apk`

## How to use

The app is currently configured as a **Web Wrapper** to ensure that 100% of the Next.js code (including Server Components, API routes, and Middleware) works exactly as it does on the website.

### 1. Update your Website URL
Open `capacitor.config.ts` and change the `server.url` to your actual production domain:

```typescript
const config: CapacitorConfig = {
  // ...
  server: {
    url: 'https://your-production-domain.com', // Change this!
    cleartext: true
  }
};
```

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
