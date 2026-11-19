# DON'T SCAN IT — Source

This directory contains the editable game project and Android wrapper source for **DON'T SCAN IT**, a 2D game by VINSE Studio.

## Stack

- Phaser 3 for gameplay
- Vite for the web build
- Capacitor 8 for the Android wrapper

## Requirements

- Node.js 22 or newer
- For Android builds: Java/Gradle and the Android SDK required by the Capacitor project

## Run locally

From this directory:

```bash
npm ci
npm run dev
```

Create the web build with `npm run build`. To sync the web build into the Android project and build a debug APK:

```bash
npx cap sync android
cd android
./gradlew assembleDebug
```

The generated web bundle is intentionally not checked in under `android/app/src/main/assets/public`; `npx cap sync android` recreates it.

## In-game payments

Checkout and card/cash payment mechanics are gameplay simulations only. No real bank, card, or payment processor integration is included.

## Releases

- [Android APK and Windows builds](https://github.com/vinse-studio/dont-scan-it/releases)
- [Game page](https://github.com/vinse-studio/dont-scan-it)

## License

The original VINSE Studio source code and game assets in this repository are covered by the custom [VINSE Studio Source and Game Asset License](../LICENSE). Commercial use, modification, and redistribution are permitted subject to its conditions. Distributed products must display the exact credit **“Built by VINSE Studio”** and the official VINSE Studio logo. Third-party components remain under their respective licenses.
