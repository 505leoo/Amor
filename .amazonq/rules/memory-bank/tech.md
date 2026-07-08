# Technology Stack

## Core
- **React Native** 0.81.5
- **React** 19.1.0
- **Expo** ~54.0.12 (with dev client, not Expo Go)
- **JavaScript** (no TypeScript)

## Key Dependencies
| Package | Version | Purpose |
|---|---|---|
| firebase | ^12.10.0 | Auth + Firestore + Storage |
| pushy-react-native | ^1.0.61 | Push notifications |
| expo-notifications | ^0.32.12 | Local notification handling |
| expo-image | ^3.0.9 | Cached image loading |
| expo-image-picker | ^17.0.8 | Gallery/camera access |
| expo-audio | ^1.1.1 | Background music |
| expo-linear-gradient | ^15.0.7 | Gradient backgrounds |
| expo-navigation-bar | ^5.0.9 | Hide Android nav bar |
| expo-updates | ^29.0.16 | OTA updates |
| @shopify/react-native-skia | 2.2.12 | Canvas/graphics |
| react-native-reanimated | ~4.1.1 | Advanced animations |
| react-native-svg | 15.12.1 | SVG rendering |
| react-native-game-engine | ^1.2.0 | Game loop (used in Inicio) |
| @expo/vector-icons | ^15.1.1 | Ionicons, MaterialIcons, Feather |
| @react-native-community/netinfo | 11.4.1 | Network connectivity |
| expo-file-system | ^19.0.16 | File operations |
| expo-document-picker | ^14.0.8 | Document selection |

## Build System
- **EAS Build** (eas.json) for Android/iOS production builds
- **Expo Dev Client** for local development
- `expo start --dev-client` to run

## Development Commands
```bash
npm start          # Start dev server (expo start --dev-client)
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run actualizar # Run version update script
```

## Firebase Services Used
- **Authentication** — email/password
- **Firestore** — primary database
- **Storage** — image uploads
- **Cloud Functions** — backend logic (functions/index.js), deployed to us-central1

## Fonts
- `Omori.ttf` — primary display font, loaded via `expo-font` / `useFonts` hook
- `Mensa.ttf` — secondary font

## Platform
- Primary target: **Android** (MainActivity.kt, PushReceiver.kt)
- iOS support included
- Navigation bar hidden on Android via `expo-navigation-bar`
