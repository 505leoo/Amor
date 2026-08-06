# Technology Stack

## Core Framework
- **React Native** 0.86.0 with **React** 19.2.3
- **Expo** ^57.0.4 (managed workflow with dev client)
- **New Architecture enabled** (`newArchEnabled: true`)

## Key Libraries

### Navigation & UI
- Custom state-machine navigation (no React Navigation)
- `expo-image` ~57.0.0 — optimized image rendering with cache policies
- `expo-linear-gradient` ~57.0.0
- `@expo/vector-icons` ^15.1.1
- `react-native-svg` 15.15.4
- `lottie-react-native` ~7.3.8 — animations
- `@react-native-community/blur` ^4.4.1

### Firebase
- `firebase` ^12.10.0 — Firestore, Auth (web SDK)
- `@react-native-firebase/app` ^17.4.2 — native Firebase (notifications)

### Notifications
- `expo-notifications` ^57.0.3
- `pushy-react-native` ^1.0.61 — alternative push service

### Media & Storage
- `expo-audio` ~57.0.0
- `expo-image-picker` ~57.0.2
- `expo-document-picker` ~57.0.0
- `expo-file-system` ~57.0.0
- `@react-native-async-storage/async-storage` ^2.2.0

### Networking
- `@react-native-community/netinfo` 12.0.1

### Other
- `react-native-game-engine` ^1.2.0
- `react-native-toast-message` ^2.4.0
- `expo-navigation-bar` ~57.0.1
- `expo-updates` ^57.0.6 — OTA updates

## Build & Tooling
- **EAS Build** (`eas-cli`) for native builds
- **Expo Updates** for OTA hot updates
- `babel-preset-expo` ~57.0.0
- `@react-native-community/cli` (devDependency)
- Android: compileSdk 35, targetSdk 35, arm64-v8a only
- Proguard + resource shrinking enabled in release

## Development Commands
```bash
npm start          # expo start --dev-client
npm run android    # expo run:android
npm run ios        # expo run:ios
npm run actualizar # node ./scripts/actualizar.js --use-app-runtime  (OTA update)
npm run actualizar:sync  # sync runtime version
```

## Firebase Cloud Functions
- Located in `functions/` directory
- Separate `package.json` with own dependencies
- Entry: `functions/index.js`

## Fonts
- `Omori.ttf` — primary display font (loaded via app.json)
- `Delius.ttf`
- `Mensa.ttf`

## App Configuration
- Orientation: **landscape only**
- Runtime version: `0.1`
- EAS project ID: `1c2f3fe2-d0a3-4fb9-bcc8-be09be0577ec`
- Android package: `com.leitof7.amor`
- iOS bundle: `com.leitof7.amor`
