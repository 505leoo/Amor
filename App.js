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
import { ThemeProvider } from './ThemeContext';
import { SeasonProvider } from './SeasonContext';
import { DebugProvider } from './DebugContext';
import { NewIndicatorProvider } from './NewIndicatorContext';
import { TrofeosProvider } from './TrofeosContext';
import { MusicProvider } from './MusicContext';
import Loading from './components/Loading';
import Intro from './Intro';
import Login from './pantallas/Login';
import Register from './pantallas/Register';
import Inicio from './menus/Inicio';
import Menu from './Menu';
import Pistas from './menus/Pistas';
import Ecos from './menus/Ecos';
import Buzon from './menus/Buzon';
import Tienda from './menus/Tienda';
import Trofeos from './menus/Trofeos';
import Coleccion from './Coleccion';
import Stickers from './menus/Stickers';
import Temas from './menus/Temas';
import SeasonInfo from './menus/SeasonInfo';
import Perfil from './menus/Perfil';
import CartaExpandida from './components/CartaExpandida';
import Vestuario from './menus/Vestuario';
import FrasesExpandida from './FrasesExpandida';

export default function App() {
  const [loading, setLoading]           = useState(true);
  const [authChecked, setAuthChecked]   = useState(false);
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [cartaMessage, setCartaMessage] = useState('');
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [frase, setFrase] = useState(null);
  const [fraseColor, setFraseColor] = useState(null);
  const [isConnected, setIsConnected]   = useState(true);
  const [inicioReady, setInicioReady]   = useState(false);
  const userRef = useRef(null);
  const loadingRef = useRef(null);

  const ANIMATED_TRANSITIONS = new Set([
    'main|Vestuario', 'Vestuario|main',
  ]);

  // navigation estable — useCallback + ref para que nunca cambie de referencia
  // y no cause re-renders en cascada en todos los hijos
  const currentScreenRef = useRef('intro');

  const navigateToScreen = useCallback((screenName, params) => {
    const key = `${currentScreenRef.current}|${screenName}`;
    const doNavigate = () => {
      if (params?.message !== undefined)        setCartaMessage(params.message);
      if (params?.selectedSticker !== undefined) setSelectedSticker(params.selectedSticker);
      if (params?.frase !== undefined)           setFrase(params.frase);
      if (params?.fraseColor !== undefined)      setFraseColor(params.fraseColor);
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
      await Promise.all(urls.map(url => ExpoImage.prefetch(url, { cachePolicy: 'memory-disk', priority: 'high' })));
    } catch {}
  }, []);

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        userRef.current = currentUser;

        Promise.all([
          NotificationSystem.registerForPushNotifications(),
          NotificationSystem.notifyUserOnline(),
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
      <ThemeProvider>
        <SeasonProvider>
          <DebugProvider>
            <NewIndicatorProvider>
              <TrofeosProvider>
                <MusicProvider>
                  <RNStatusBar backgroundColor="#FF6B6B" barStyle="light-content" />

                  {/* Intro — sin pre-render oculto de Inicio, inicioReady siempre true */}
                  {currentScreen === 'intro' && (
                    <Intro
                      onComplete={() => setCurrentScreen(userRef.current ? 'main' : 'login')}
                      isAuthenticated={!!userRef.current}
                      isConnected={isConnected}
                    />
                  )}

                  {currentScreen === 'login'    && <Login    navigation={navigation} />}
                  {currentScreen === 'register' && <Register navigation={navigation} />}

                  {currentScreen === 'main'           && <Inicio          navigation={navigation} onReady={() => setInicioReady(true)} cartaMessage={cartaMessage} selectedSticker={selectedSticker} frase={frase} fraseColor={fraseColor} />}
                  {currentScreen === 'Vestuario'       && <Vestuario        navigation={navigation} />}
                  {currentScreen === 'carta'           && <CartaExpandida   navigation={navigation} message={cartaMessage} selectedSticker={selectedSticker} />}
                  {currentScreen === 'frasesExpandida' && <FrasesExpandida  navigation={navigation} />}
                  {currentScreen === 'coleccion'       && <Coleccion        navigation={navigation} />}
                  {currentScreen === 'stickers'        && <Stickers         navigation={navigation} />}
                  {currentScreen === 'tienda'          && <Tienda           navigation={navigation} />}
                  {currentScreen === 'ecos'            && <Ecos             navigation={navigation} />}
                  {currentScreen === 'perfil'          && <Perfil           navigation={navigation} />}
                  {currentScreen === 'buzon'           && <Buzon            navigation={navigation} />}
                  {currentScreen === 'trofeos'         && <Trofeos          navigation={navigation} />}
                  {currentScreen === 'menu'            && <Menu             navigation={navigation} />}
                  {currentScreen === 'pistas'          && <Pistas           navigation={navigation} />}
                  {currentScreen === 'Temas'           && <Temas            navigation={navigation} />}
                  {currentScreen === 'seasonInfo'      && <SeasonInfo       navigation={navigation} />}

                  <Loading ref={loadingRef} />

                </MusicProvider>
              </TrofeosProvider>
            </NewIndicatorProvider>
          </DebugProvider>
        </SeasonProvider>
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
