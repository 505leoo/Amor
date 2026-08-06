import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, collection, getDocs, query, limit, updateDoc, setDoc } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import * as NavigationBar from 'expo-navigation-bar';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import NotificationSystem from './utils/NotificationSystem';
import { TrofeosProvider } from './TrofeosContext';
import { MusicProvider } from './MusicContext';
import Loading from './components/Loading';
import Toast from './components/Toast';
import Intro from './Intro';
import Login from './pantallas/Login';
import Register from './pantallas/Register';
import Inicio from './menus/Inicio';
import Menu from './Menu';
import Pistas from './menus/Pistas';
import Buzon from './menus/Buzon';
import Tienda from './menus/Tienda';
import Trofeos from './menus/Trofeos';
import Coleccion from './Coleccion';
import Perfil from './menus/Perfil';
import Temporadas from './Temporadas/Temporadas';
import Temporada1 from './Temporadas/Temporada1/temporada1';
import Historia1 from './Temporadas/Temporada1/Historia/Historia1';
import LibroTemp1 from './Temporadas/Temporada1/librotemp1';
import Capsula1 from './Temporadas/Temporada1/Eventos/capsula';
import Animalitos from './Animalitos';
import Canjear from './menus/Canjear';
import AdminCodigos from './menus/AdminCodigos';

export default function App() {
  const [loading, setLoading]           = useState(true);
  const [authChecked, setAuthChecked]   = useState(false);
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [isConnected, setIsConnected]   = useState(true);
  const [inicioReady, setInicioReady]   = useState(false);
  const toastRef = useRef(null);
  const userRef = useRef(null);
  const loadingRef = useRef(null);

  useEffect(() => { global.showToast = (opts) => toastRef.current?.show(opts); }, []);

  const ANIMATED_TRANSITIONS = new Set([
    'main|temporadas', 'temporadas|main',
    'temporadas|temporada1',
    'temporada1|historia1', 'historia1|temporada1',
    'temporada1|capsula1', 'capsula1|temporada1',
    'temporada1|librotemp1', 'librotemp1|temporada1',
    'main|animalitos', 'animalitos|main',
  ]);

  // navigation estable — useCallback + ref para que nunca cambie de referencia
  // y no cause re-renders en cascada en todos los hijos
  const currentScreenRef = useRef('intro');

  const navigateToScreen = useCallback((screenName, params) => {
    const key = `${currentScreenRef.current}|${screenName}`;
    const doNavigate = () => {
      currentScreenRef.current = screenName;
      setCurrentScreen(screenName);
    };

    if (ANIMATED_TRANSITIONS.has(key) && loadingRef.current) {
      loadingRef.current.fadeIn(() => {
        doNavigate();
        // Pequeño delay para que el nuevo componente monte antes de abrir
        setTimeout(() => loadingRef.current?.fadeOut(), 80);
      });
    } else {
      doNavigate();
    }
  }, []);

  const navigation = useRef({ navigate: navigateToScreen }).current;
  useEffect(() => { navigation.navigate = navigateToScreen; }, [navigateToScreen]);

  // Precargar imágenes después de que Firestore esté listo
  const preloadImages = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'stickers'));
      const urls = snap.docs.map(d => d.data().imageUrl).filter(Boolean);
      await Promise.all([
        ...urls.map(url => ExpoImage.prefetch(url, { cachePolicy: 'memory-disk', priority: 'high' })),
        ExpoImage.prefetch(require('./assets/temporadas/libro/libro1.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
        ExpoImage.prefetch(require('./assets/temporadas/libro/libro2.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
        ExpoImage.prefetch(require('./assets/temporadas/neutral.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
        ExpoImage.prefetch(require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
        ExpoImage.prefetch(require('./assets/temporadas/libro/Temporada1/logo1.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
        ExpoImage.prefetch(require('./assets/temporadas/libro/Temporada2/logo1.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
        ExpoImage.prefetch(require('./assets/paredes/pared3.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
        ExpoImage.prefetch(require('./assets/temporadas/libro/libro3.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
        ExpoImage.prefetch(require('./assets/temporadas/libro/panel2.png'), { cachePolicy: 'memory-disk', priority: 'high' }),
      ]);
    } catch {}
  }, []);

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        userRef.current = currentUser;

        Promise.all([
          NotificationSystem.registerForPushNotifications(),
          NotificationSystem.notifyPartnerUserEntered(currentUser.uid, currentUser.displayName),
        ]).catch(() => {});

        NotificationSystem.setupNotificationListeners();

        getDoc(doc(db, 'usuarios', currentUser.uid)).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            const updates = {};
            if (data.dinero        === undefined) updates.dinero        = 0;
            if (data.nivel         === undefined) updates.nivel         = 1;
            if (data.exp           === undefined) updates.exp           = 0;
            if (data.racha         === undefined) updates.racha         = 1;
            if (data.animalito     === undefined) updates.animalito     = 'halcon';
            if (data.ultimaActividad    === undefined) updates.ultimaActividad    = new Date().toISOString();
            if (data.fechaUltimaRacha   === undefined) updates.fechaUltimaRacha   = new Date().toISOString();
            if (Object.keys(updates).length > 0)
              updateDoc(doc(db, 'usuarios', currentUser.uid), updates).catch(() => {});
          } else {
            setDoc(doc(db, 'usuarios', currentUser.uid), {
              dinero: 0, nivel: 1, exp: 0, racha: 1,
              ultimaActividad: new Date().toISOString(),
              fechaUltimaRacha: new Date().toISOString(),
            }).catch(() => {});
          }
        }).catch(() => {});

        preloadImages();
      } else {
        userRef.current = null;
      }
      setAuthChecked(true);
      setLoading(false);
    });

    ImagePicker.getMediaLibraryPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') ImagePicker.requestMediaLibraryPermissionsAsync();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => setIsConnected(state.isConnected));
    return () => unsub();
  }, []);

  if (loading || !authChecked) return null;

  return (
    <View style={styles.container}>
      <TrofeosProvider>
        <MusicProvider>
          <RNStatusBar backgroundColor="#FF6B6B" barStyle="light-content" />

          {currentScreen === 'intro' && (
            <Intro
              onComplete={() => {
                const next = userRef.current ? 'main' : 'login';
                currentScreenRef.current = next;
                setCurrentScreen(next);
              }}
              isAuthenticated={!!userRef.current}
              isConnected={isConnected}
            />
          )}

          {currentScreen === 'login'    && <Login    navigation={navigation} />}
          {currentScreen === 'register' && <Register navigation={navigation} />}

          <Inicio style={{ display: currentScreen === 'main' ? 'flex' : 'none' }} navigation={navigation} onReady={() => setInicioReady(true)} />
          {currentScreen === 'coleccion'       && <Coleccion        navigation={navigation} />}
          {currentScreen === 'tienda'          && <Tienda           navigation={navigation} />}
          {currentScreen === 'perfil'          && <Perfil           navigation={navigation} />}
          {currentScreen === 'buzon'           && <Buzon            navigation={navigation} />}
          {currentScreen === 'trofeos'         && <Trofeos          navigation={navigation} />}
          {currentScreen === 'menu'            && <Menu             navigation={navigation} />}
          {currentScreen === 'pistas'          && <Pistas           navigation={navigation} />}
          {currentScreen === 'temporadas'      && <Temporadas       navigation={navigation} />}
          {currentScreen === 'temporada1'      && <Temporada1       navigation={navigation} />}
          {currentScreen === 'historia1'       && <Historia1        navigation={navigation} />}
          {currentScreen === 'capsula1'        && <Capsula1         navigation={navigation} />}
          {currentScreen === 'librotemp1'      && <LibroTemp1       navigation={navigation} />}
          {currentScreen === 'animalitos'      && <Animalitos       navigation={navigation} />}
          {currentScreen === 'canjear'          && <Canjear          navigation={navigation} />}
          {currentScreen === 'adminCodigos'      && <AdminCodigos     navigation={navigation} />}
          <Loading ref={loadingRef} />
          <Toast ref={toastRef} />

        </MusicProvider>
      </TrofeosProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
