# Development Guidelines

## Code Quality Standards

### File & Component Structure
- Every screen/component is a single default-exported functional component
- StyleSheet always named `s` (short alias) in screens, `styles` in components
- Styles defined at the bottom of the file with `StyleSheet.create({...})`
- Imports grouped: React → React Native → Expo → Firebase → local utils → local components

### Naming Conventions
- Components: PascalCase (`Temporadas`, `TabButtons`, `CartaExpandida`)
- Style objects: short alias `s` in screens, `styles` in components/utils
- Firebase collections: Spanish nouns (`usuarios`, `posts`, `pistas`, `notification_limits`)
- Firestore field names: camelCase Spanish (`dinero`, `ultimaActividad`, `fechaUltimaRacha`, `pareja`)
- State variables: camelCase, numbered suffixes for repeated patterns (`isCorrect`, `isCorrect2`, `isCorrect3`)
- Event handlers: `handle` prefix (`handleAnswer`, `handleLetterPress`, `handleColorPress`)

### Language
- All UI text, comments, variable names, and Firestore fields are in **Spanish**
- Error messages and console logs mix Spanish and English

---

## Architectural Patterns

### Navigation Pattern
Navigation is a custom ref-based state machine — never use React Navigation:
```js
// Correct: navigate via prop
navigation.navigate('screenName', { param: value });

// In App.js: screens rendered conditionally
{currentScreen === 'screenName' && <Screen navigation={navigation} />}

// Inicio is always mounted (hidden via display:none to preserve state)
<Inicio style={{ display: currentScreen === 'main' ? 'flex' : 'none' }} ... />
```

### Firebase Access Pattern
Always import `auth` and `db` from `../firebaseConfig` (or `./firebaseConfig` from root):
```js
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

// Always use merge:true for partial updates
await setDoc(doc(db, 'usuarios', uid), { field: value }, { merge: true });

// Always check existence before updateDoc
const snap = await getDoc(ref);
if (snap.exists()) {
  await updateDoc(ref, updates);
} else {
  await setDoc(ref, fullData);
}
```

### Error Handling Pattern
All async functions use try/catch and swallow errors silently (`.catch(() => {})`):
```js
// Fire-and-forget pattern (used extensively in App.js)
someAsyncCall().catch(() => {});

// In utility functions: log and rethrow
try {
  // ...
} catch (error) {
  console.error('Error al [action]:', error);
  throw error;
}

// In UI handlers: log and swallow
try {
  // ...
} catch (error) {
  console.error('Error:', error);
}
```

### Global Toast Pattern
Use the global `showToast` function (set up in App.js):
```js
global.showToast({ message: 'Texto', type: 'success' });
```

---

## UI & Styling Patterns

### Image Rendering
Always use `expo-image` (`Image as ExpoImage`) for remote/cached images, native `Image` only for backgrounds:
```js
import { Image as ExpoImage } from 'expo-image';

// Standard usage
<ExpoImage
  source={require('../assets/...')}
  style={s.image}
  contentFit="contain"
  cachePolicy="memory"
/>

// For backgrounds: native Image with StyleSheet.absoluteFill
<Image source={require('../assets/paredes/pared3.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
```

### Animation Pattern
Use `Animated.loop` + `Animated.sequence` for idle/floating animations, always `useNativeDriver: true`:
```js
const floatAnim = useRef(new Animated.Value(0)).current;

Animated.loop(
  Animated.sequence([
    Animated.timing(floatAnim, { toValue: -1.2, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    Animated.timing(floatAnim, { toValue: 1.2,  duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    Animated.timing(floatAnim, { toValue: 0,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
  ])
).start();
```

Fade-in on data load pattern:
```js
const [pistasOpacity] = React.useState(new Animated.Value(0));
// After data loads:
Animated.timing(pistasOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
```

### Screen Layout
- Root view always `flex: 1` with `justifyContent: 'center', alignItems: 'center'`
- `StatusBar hidden` on most screens (landscape immersive)
- Background image uses `StyleSheet.absoluteFill`
- `TabButtons` component included on most screens with `onExit={() => navigation?.navigate?.('main')}`

### Color Palette
- Primary pink: `#FF69B4`, `#FF6B6B`
- Success green: `#4CAF50`
- Error red: `#F44336`
- Background cards: `rgba(255,255,255,0.98)` or `rgba(255,255,255,0.9)`
- Overlay dark: `rgba(0,0,0,0.6)`
- Card background warm: `#fcf7d0`

### Shadow Pattern (consistent across cards)
```js
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.15,
shadowRadius: 12,
elevation: 8,
```

---

## Data Persistence Patterns

### User Progress (Firestore merge)
Save progress with `setDoc + merge: true` using dynamic field keys:
```js
await setDoc(doc(db, 'usuarios', user.uid), {
  [`pista${pistaNumber}`]: completed
}, { merge: true });
```

### User Document Initialization
Always check for missing fields and patch them on login (see App.js pattern):
```js
const updates = {};
if (data.dinero === undefined) updates.dinero = 0;
if (data.nivel  === undefined) updates.nivel  = 1;
if (Object.keys(updates).length > 0) updateDoc(ref, updates).catch(() => {});
```

### Image Upload Pattern (Firebase Storage)
```js
const response = await fetch(uri);
const blob = await response.blob();
const storageRef = ref(storage, `posts/${Date.now()}.${ext}`);
const uploadTask = uploadBytesResumable(storageRef, blob);
// Wrap in Promise, resolve with getDownloadURL on complete
```

---

## Notification System Patterns

### Rate Limiting
Always throttle notifications with dual-layer protection:
1. In-memory static throttle (`NotificationSystem._lastEntradaSentByUser`)
2. Firestore transaction-based rate limiter (`_canSendLimitedNotificationMinutes`)

### Push Token Storage
Tokens stored in Firestore under `usuarios/{uid}` as both `MyPushyToken` and `pushyToken` (redundant for safety).

---

## Context Usage

Three global contexts wrap the entire app:
```jsx
<NewIndicatorProvider>
  <TrofeosProvider>
    <MusicProvider>
      {/* all screens */}
    </MusicProvider>
  </TrofeosProvider>
</NewIndicatorProvider>
```

Consume with standard `useContext` hook in any child component.

---

## OTA Update Workflow

Run `npm run actualizar` to:
1. `git add .`
2. Bump patch version in `package.json`
3. Optionally sync `app.json` runtimeVersion
4. `git commit -m "<newVersion>"`
5. `git push`
6. `eas update --branch production --platform android`

Use `--no-publish`, `--no-push`, `--no-commit` flags to skip steps.
