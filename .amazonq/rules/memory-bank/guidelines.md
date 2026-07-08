# Development Guidelines

## Code Style

### Component Structure
All components follow this pattern:
```js
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ... } from 'react-native';
// Third-party imports
// Local imports

const ComponentName = ({ prop1, prop2 }) => {
  // State declarations
  // Refs
  // Effects
  // Handler functions
  // Render helpers
  return ( ... );
};

const styles = StyleSheet.create({ ... });

export default ComponentName;
```

### Naming Conventions
- Components: PascalCase (`ThemeParticles`, `NotificationSystem`)
- State variables: camelCase, descriptive (`isCorrect`, `showError`, `dataLoaded`)
- Handler functions: `handle` prefix (`handleAnswer`, `handleLogout`, `handleScratch`)
- Firebase refs: `xRef` / `xSnap` pattern (`userRef`, `userSnap`, `postRef`, `postSnap`)
- Style keys: camelCase matching component purpose (`clueCard`, `optionButton`, `correctOption`)

### State Naming Pattern
Boolean states use `is` / `show` prefixes:
```js
const [isCorrect, setIsCorrect] = useState(false);
const [showError, setShowError] = useState(false);
const [dataLoaded, setDataLoaded] = useState(false);
const [isEditing, setIsEditing] = useState(false);
```

---

## React Patterns

### Font Loading Guard
Every component using custom fonts must guard render:
```js
const [fontsLoaded] = useFonts({ Omori: require('../fonts/Omori.ttf') });
if (!fontsLoaded) return null;
```

### Firebase Data Loading with Fade-in
Show nothing while loading, then fade in:
```js
const [dataLoaded, setDataLoaded] = useState(false);
const [opacity] = useState(new Animated.Value(0));

const loadData = async () => {
  // ... fetch
  setDataLoaded(true);
  Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
};

if (!dataLoaded) return <View style={styles.container}><LinearGradient .../></View>;
return <Animated.View style={{ opacity }}> ... </Animated.View>;
```

### Firestore Progress Persistence
Save/load user progress with `setDoc` + `merge: true`:
```js
await setDoc(doc(db, 'usuarios', user.uid), {
  [`pista${number}`]: true
}, { merge: true });
```

### Error Feedback with Auto-dismiss
```js
setShowError(true);
setTimeout(() => setShowError(false), 1000);
```

### Animated Sequences
Use `Animated.sequence` + `Animated.loop` for continuous animations:
```js
Animated.loop(
  Animated.sequence([
    Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
    Animated.delay(1500),
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
  ])
).start();
```
Always use `useNativeDriver: true` for transform/opacity animations.

### Cleanup Animations on Unmount
```js
useEffect(() => {
  const anim = Animated.loop(...);
  anim.start();
  return () => anim.stop();
}, []);
```

---

## Navigation Pattern
No React Navigation — custom state-based routing in App.js:
```js
// Navigate
navigation.navigate('pistas');

// In App.js
{currentScreen === 'pistas' && <Pistas navigation={{ navigate: navigateToScreen }} />}
```
Screen names are lowercase strings: `'main'`, `'login'`, `'pistas'`, `'menu'`, `'trofeos'`, etc.

---

## Firebase Patterns

### Firestore CRUD
```js
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

// Read
const snap = await getDoc(doc(db, 'usuarios', uid));
if (snap.exists()) { const data = snap.data(); }

// Update (safe: use setDoc+merge when doc may not exist)
await setDoc(doc(db, 'collection', id), { field: value }, { merge: true });

// Update (when doc is guaranteed to exist)
await updateDoc(doc(db, 'collection', id), { field: value });
```

### Image Upload to Storage
```js
const response = await fetch(uri);
const blob = await response.blob();
const storageRef = ref(storage, `posts/${Date.now()}.jpg`);
const uploadTask = uploadBytesResumable(storageRef, blob);
// Wrap in Promise, listen to state_changed, resolve with getDownloadURL
```

### Error Handling
All async Firebase calls use try/catch with `console.error`. Non-critical errors are caught and logged without blocking the UI:
```js
someAsyncCall().catch(err => console.error('Context message:', err));
```

---

## Notification System

### Sending to Partner
```js
import NotificationSystem from './utils/NotificationSystem';

// Send to partner with rate limiting
await NotificationSystem.sendToPartner(userId, title, body, data, {
  windowHours: 6,
  maxCount: 1,
  type: 'unique_type_key'
});
```

### Rate Limiting
All notifications use `_canSendLimitedNotificationMinutes` or `_canSendLimitedNotification` before sending. Always provide a unique `type` string per notification category to avoid cross-throttling.

---

## Styling Conventions

### StyleSheet.create
All styles defined at file bottom in a single `StyleSheet.create({})` call. No inline styles except for dynamic values:
```js
// Dynamic values inline
style={[styles.base, { fontSize: dynamicSize, opacity: animValue }]}

// Conditional styles via array
style={[styles.button, isActive && styles.activeButton, isError && styles.errorButton]}
```

### Color Palette
- Primary pink: `#FF69B4`, `#FF6B6B`, `#FFB6C1`
- Purple accent: `#8b5a83`, `#9C27B0`, `#667eea`
- Success green: `#4CAF50`
- Error red: `#F44336`
- Background: `rgba(255,255,255,0.9)` cards on gradient backgrounds
- Borders: `rgba(color, 0.3)` semi-transparent

### Shadow Pattern (cross-platform)
```js
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.15,
shadowRadius: 12,
elevation: 8,  // Android
```

### Overlay Pattern (lock/success cards)
```js
cardOverlay: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
}
```

---

## Component Patterns

### Particle/Animation Components
Sub-components (Star, Bubble, BioParticle, etc.) are defined in the same file as the parent. Each manages its own `Animated.Value` state and starts animations in `useEffect`. Always return cleanup in useEffect for looping animations.

### Conditional Rendering by Type
```js
if (particleType === 'stars') return <View>...</View>;
if (particleType === 'ocean') return <View>...</View>;
return null;
```

### Array.from for Generated Elements
```js
Array.from({ length: 80 }, () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  delay: Math.random() * 2000,
}))
```

---

## Firestore Data Model (usuarios document)
```js
{
  uid, email, displayName, nombre,
  pareja,           // partner's uid
  dinero,           // virtual currency
  nivel, exp,       // gamification
  racha,            // streak counter
  ultimaActividad, fechaUltimaRacha,
  pushyToken, MyPushyToken,  // push notification tokens
  isOnline, lastSeen,
  pista1..pista7,   // clue game progress
  photoURL,
  dniUsuario        // unique display ID
}
```
