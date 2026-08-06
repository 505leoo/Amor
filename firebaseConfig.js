import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogBox } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyBksEJLaWlj5uRo0ipJU1dec5h7p18wdy8',
  projectId: 'amor-9df0d',
  storageBucket: 'amor-9df0d.firebasestorage.app',
  messagingSenderId: '580063862777',
  appId: '1:580063862777:android:dc7c47da3566b574fe2728',
};

LogBox.ignoreLogs(['@firebase/firestore']);

let app;
let db;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  });
} else {
  app = getApp();
  db = getFirestore(app);
}

// Guard: initializeAuth lanza si ya fue llamado en hot-reload
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const functions = getFunctions(app);
const storage = getStorage(app);

export { auth, db, functions, storage };
export default app;
