# Development Guidelines — Amor App

## Code Style & Formatting

### General
- JavaScript ES2022+, JSX — no TypeScript, no PropTypes
- Functional components only — no class components
- `const` for all component definitions and most variables
- Arrow functions for handlers: `const handleX = () => {}`
- Inline ternaries preferred over if/else in JSX
- Optional chaining used extensively: `auth.currentUser?.uid`, `navigation?.navigate?.()`

### Imports Order (consistent across files)
1. React and React Native core
2. Expo packages (`expo-linear-gradient`, `expo-image`, etc.)
3. Firebase imports
4. Third-party icon libraries (`@expo/vector-icons`)
5. Local components and screens
6. Local contexts and utils

### Naming Conventions
- Components: PascalCase (`RoomBackground`, `NotificationSystem`)
- Files: PascalCase for components/screens, camelCase for utils (`firebase.js`, `eventBus.js`)
- State variables: camelCase, boolean states prefixed with `is`/`has` (`isDebugMode`, `hasNewBuzon`)
- Handler functions: `handleX` or `onX` (`handleLogout`, `handleAnswer`, `onPress`)
- Navigation callbacks: `goX` pattern (`goFrases`, `goVestuario`, `goTemas`)
- Style objects: always named `styles` (or `s` for compact components like Toast)

---

## Component Patterns

### Standard Component Structure
```js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MyComponent = ({ navigation }) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // side effects
  }, []);

  return (
    <View style={styles.container}>
      {/* JSX */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default MyComponent;
```

### Performance Optimizations
- `memo()` wrapping for screens that receive stable props: `export default memo(Inicio)`
- `useCallback` for navigation handlers passed as props to avoid re-renders:
  ```js
  const goFrases = useCallback(() => navigation.navigate('frasesExpandida'), [navigation]);
  ```
- `useMemo` for expensive computations: `const bars = useMemo(() => generarMiniBarcode(), [])`
- `useRef` for stable navigation object to prevent cascade re-renders:
  ```js
  const navigation = useRef({ navigate: navigateToScreen }).current;
  ```

### forwardRef Pattern (Toast, Loading)
```js
const Toast = forwardRef((_, ref) => {
  useImperativeHandle(ref, () => ({
    show({ text1, text2, type, duration }) { /* ... */ }
  }));
});
```
Global access via: `global.showToast = (opts) => toastRef.current?.show(opts)`

---

## Context Pattern

All contexts follow the same structure:
```js
const MyContext = createContext();

export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) throw new Error('useMyContext must be used within MyProvider');
  return context;
};

export const MyProvider = ({ children }) => {
  const [state, setState] = useState(null);
  return (
    <MyContext.Provider value={{ state, setState }}>
      {children}
    </MyContext.Provider>
  );
};
```
- Always throw descriptive error if hook used outside provider
- Contexts: ThemeContext, SeasonContext, DebugContext, TrofeosContext, MusicContext, NewIndicatorContext

---

## Navigation Pattern

No React Navigation library. Custom manual router in App.js:
```js
const navigateToScreen = useCallback((screenName, params) => {
  if (params?.message !== undefined) setCartaMessage(params.message);
  currentScreenRef.current = screenName;
  setCurrentScreen(screenName);
}, []);

const navigation = useRef({ navigate: navigateToScreen }).current;
```

Screens receive `navigation` prop and call:
```js
navigation.navigate('screenName')
navigation.navigate('screenName', { param: value })
navigation?.navigate?.('screenName')  // safe call when navigation may be undefined
```

Screen names (lowercase unless legacy): `'main'`, `'login'`, `'register'`, `'menu'`, `'pistas'`, `'carta'`, `'Vestuario'`, `'Temas'`, `'ecos'`, `'perfil'`, `'buzon'`, `'trofeos'`, `'tienda'`, `'stickers'`, `'coleccion'`, `'frasesExpandida'`, `'seasonInfo'`

---

## Firebase Patterns

### Firestore Read
```js
const snap = await getDoc(doc(db, 'usuarios', uid));
if (snap.exists()) {
  const data = snap.data();
}
```

### Firestore Write (merge pattern)
```js
await setDoc(doc(db, 'usuarios', uid), { field: value }, { merge: true });
// or
await updateDoc(doc(db, 'usuarios', uid), { field: value });
```

### Error Handling
All Firebase calls wrapped in try/catch. Errors logged with `console.error('Context:', error)`. Non-critical failures silently caught with empty catch `catch {}` or `catch (_) {}`.

### Pista Progress Save Pattern
```js
const savePistaProgress = async (pistaNumber, completed) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, 'usuarios', user.uid), {
        [`pista${pistaNumber}`]: completed
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error saving pista progress:', error);
  }
};
```

### Image Upload Pattern (firebase.js)
```js
const response = await fetch(uri);
const blob = await response.blob();
const storageRef = ref(storage, `posts/${imageName}`);
const uploadTask = uploadBytesResumable(storageRef, blob);
// resolve/reject in uploadTask.on('state_changed', ...)
```

---

## Styling Patterns

### StyleSheet
- Always `StyleSheet.create({})` at bottom of file, named `styles` (or `s` for compact)
- Absolute positioning used heavily for overlapping UI elements
- `position: 'absolute'` with explicit `top/bottom/left/right` values
- Shadow pattern (cross-platform):
  ```js
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 8,
  ```

### Color Palette
- Primary pink: `#FF69B4`, `#FF6B6B`, `#f9a8d4`, `#e879f9`
- Purple accent: `#8b5a83`, `#9C27B0`, `#2d1b3d`
- Success green: `#4CAF50`
- Error red: `#F44336`, `#ff6b6b`
- Backgrounds: `rgba(255,255,255,0.9x)` semi-transparent whites
- Text on dark: `rgba(255,255,255,0.6-0.9)`

### LinearGradient Usage
```js
<LinearGradient
  colors={['#color1', '#color2']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.gradient}
>
```
Used for: backgrounds, buttons, HUD, toast icons, card headers.

### Themed Styling
Components read from context to apply season/theme colors:
```js
const { currentTheme, themes } = useTheme();
const { getDisplaySeason } = useSeason();
const theme = themes[currentTheme];
const displaySeason = getDisplaySeason();
const gradientColors = displaySeason ? displaySeason.gradient : theme?.gradient;
```

---

## Animation Patterns

### Animated.Value with useRef
```js
const opacity = useRef(new Animated.Value(0)).current;
// or useState for component-level:
const [fadeAnim] = useState(new Animated.Value(0));
```

### Sequence + Parallel
```js
Animated.sequence([
  Animated.parallel([
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    Animated.spring(translateY, { toValue: 0, speed: 7, bounciness: 4, useNativeDriver: true }),
  ]),
  Animated.timing(barWidth, { toValue: TOAST_W, duration, useNativeDriver: false }),
]).start(({ finished }) => { if (finished) cleanup(); });
```

- `useNativeDriver: true` for opacity/transform animations
- `useNativeDriver: false` for layout properties (width, height)
- Store sequence ref to allow stopping: `seqRef.current = Animated.sequence(...); seqRef.current.stop()`

---

## Notification System Patterns

### Sending to Partner
```js
await NotificationSystem.sendToPartner(userId, title, body, data, {
  windowHours: 6,
  maxCount: 1,
  type: 'partner_alert'
});
```

### Rate Limiting
Uses Firestore `notification_limits` collection with atomic transactions for minute-level throttling, and in-memory static timestamps for session-level throttling:
```js
static _lastUserOnlineSent = 0;
static _MEMORY_THROTTLE_MS = 10 * 60 * 1000;
```

### Token Resolution
```js
const preferred = this._getPreferredToken(userData);
// Returns { token, provider } — prefers MyPushyToken, falls back to pushyToken
if (!preferred.token) return;
await this.sendPushNotification(preferred.token, title, body, data);
```

---

## Debug Mode Pattern

- `DebugContext` stores `isDebugMode` in AsyncStorage
- Only `admin@gmail.com` can toggle debug mode (enforced in Menu.js)
- Debug-only UI wrapped in: `{isDebugMode && <Component />}`
- `DevModeDot` component always rendered in App.js, shows only when debug active
- Season dev mode separate from app debug mode (`isDevMode` in SeasonContext)

---

## Multi-Step Form Pattern (Menu.js creation flow)

State machine using integer step index:
```js
const [creationStep, setCreationStep] = useState(0);
// Render switch:
switch (creationStep) {
  case 0: return <StepOne />;
  case 1: return <StepTwo />;
  // ...
}
```
Reset functions clear all related state: `resetCreationSteps()`, `resetEditSteps()`

---

## Common Anti-Patterns to Avoid
- Don't use React Navigation — use `navigation.navigate('screenName')` with the custom router
- Don't import from `@react-native-firebase/firestore` in new code — use `firebase/firestore` (Web SDK) from `firebaseConfig.js`
- Don't add `console.log` in production paths — only `console.error` for caught errors
- Don't use `defaultValue` on controlled inputs — use `value` + `onChangeText` state
- Don't create new `Animated.Value` inside render — use `useRef` or `useState`
