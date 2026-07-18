# Tech Stack — Amor App

## Platform
- React Native 0.86.0 with Expo SDK 57
- Targets: Android (primary), iOS
- Entry: index.js → App.js

## Languages
- JavaScript (ES2022+), JSX — no TypeScript

## Core Dependencies

### Framework & Navigation
- `expo` ^57.0.4
- `react` 19.2.3
- `react-native` 0.86.0
- No React Navigation — custom manual screen router in App.js

### Firebase (Backend)
- `firebase` ^12.10.0 — Web SDK (Auth, Firestore, Storage, Functions)
- `@react-native-firebase/app` ^17.4.2 — Native SDK (used in FirebaseService.js)
- Firestore initialized with `experimentalForceLongPolling: true`
- Auth persistence via `AsyncStorage` (`getReactNativePersistence`)

### Push Notifications
- `pushy-react-native` ^1.0.61 — primary push provider
- `expo-notifications` ^57.0.3 — permission handling and local notification config
- Rate limiting stored in Firestore `notification_limits` collection

### UI & Styling
- `expo-linear-gradient` ~57.0.0 — gradients throughout the app
- `@expo/vector-icons` ^15.1.1 — Feather, Ionicons, MaterialIcons
- `lottie-react-native` ~7.3.8 — Lottie animations
- `react-native-svg` 15.15.4 — SVG support
- `@react-native-community/blur` ^4.4.1 — blur effects
- All styles via `StyleSheet.create()` — no CSS-in-JS libraries

### Media & Assets
- `expo-image` ~57.0.0 — optimized image rendering with `cachePolicy`
- `expo-image-picker` ~57.0.2 — gallery access
- `expo-audio` ~57.0.0 — background music
- `expo-document-picker` ~57.0.0 — file picking
- `expo-file-system` ~57.0.0 — file operations
- Custom fonts: Delius.ttf, Mensa.ttf, Omori.ttf (in /fonts)

### Storage & Persistence
- `@react-native-async-storage/async-storage` ^2.2.0 — local persistence (debug mode, cache)
- Firebase Storage — image uploads (posts, stickers)

### Networking & Device
- `@react-native-community/netinfo` 12.0.1 — connectivity detection
- `@react-native-community/geolocation` ^3.4.0
- `expo-navigation-bar` ~57.0.1 — hide Android nav bar

### OTA Updates
- `expo-updates` ^57.0.6
- `expo-dev-client` ^57.0.5
- EAS Build configured via `eas.json`

### Game Engine
- `react-native-game-engine` ^1.2.0 — used for game-like interactions

## Build & Dev Commands
```bash
npm start          # expo start --dev-client
npm run android    # expo run:android
npm run ios        # expo run:ios
npm run actualizar # node ./scripts/actualizar.js (OTA update)
```

## Firebase Cloud Functions
Located in `/functions/index.js` (Node.js). Deployed separately via Firebase CLI.
Endpoint example: `https://us-central1-amor-9df0d.cloudfunctions.net/userEntered`

## Build Config
- `app.json` / `eas.json` — Expo/EAS configuration
- `babel.config.js` — Babel with `babel-preset-expo`
- Android: `/android/` with Gradle 8.14.3
- iOS: `/ios/` with CocoaPods (Podfile)
- Firebase: `google-services.json` (Android), `firebase.json`, `.firebaserc`
