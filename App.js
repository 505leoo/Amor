import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import { Asset } from 'expo-asset';
import * as Updates from 'expo-updates';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, collection, getDocs, query, limit, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import * as NavigationBar from 'expo-navigation-bar';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationSystem from './utils/NotificationSystem';
import { TrofeosProvider } from './TrofeosContext';
import { MusicProvider } from './MusicContext';
import { MisionesProvider } from './MisionesContext';
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
import Temporada2 from './Temporadas/Temporada2/temporada2';
import Kitty from './Temporadas/Temporada2/Kitty';
import Paleta from './Temporadas/Temporada2/Eventos/paleta';
import Animalitos from './Animalitos';
import Canjear from './menus/Canjear';
import AdminCodigos from './menus/AdminCodigos';
import Iconos from './menus/Iconos';
import Pase from './menus/Pase';
import Juegos from './Juegos/Juegos';
import ConexionesGame from './Juegos/Conexiones/ConexionesGame';
import Comerciante from './Comerciante';
import Anuncios from './components/Anuncios';
import Tutorial from './components/Tutorial';
import { ReporteSemanal } from './components/ReporteSemanal';
import { reporteId, semanaActual } from './components/ReporteSemanal';

export default function App() {
  const [loading, setLoading]           = useState(true);
  const [authChecked, setAuthChecked]   = useState(false);
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [screenParams, setScreenParams]   = useState({});
  const [isConnected, setIsConnected]   = useState(true);
  const [inicioReady, setInicioReady]   = useState(false);
  const [temporadaInicio, setTemporadaInicio] = useState('t1');
  const [tipoAnuncio, setTipoAnuncio] = useState('reporte');
  const [eventosAnuncio, setEventosAnuncio] = useState(['reporte']);
  const [tutorialActivo, setTutorialActivo] = useState(false);
  const toastRef = useRef(null);
  const userRef = useRef(null);
  const loadingRef = useRef(null);

  useEffect(() => {
    // El cliente de desarrollo usa Metro y no debe aplicar OTA de producción.
    if (__DEV__ || !Updates.isEnabled) return undefined;
    let activo = true;
    Updates.checkForUpdateAsync()
      .then(async ({ isAvailable }) => {
        if (!activo || !isAvailable) return;
        await Updates.fetchUpdateAsync();
        if (activo) await Updates.reloadAsync();
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  useEffect(() => { global.showToast = (opts) => toastRef.current?.show(opts); }, []);

  const ANIMATED_TRANSITIONS = new Set([
    'main|temporadas', 'temporadas|main',
    'temporadas|temporada1',
    'temporada1|historia1', 'historia1|temporada1',
    'temporada1|capsula1', 'capsula1|temporada1',
    'temporada1|librotemp1', 'librotemp1|temporada1',
    'temporadas|temporada2', 'temporada2|temporadas',
    'main|animalitos', 'animalitos|main',
  ]);

  // navigation estable — useCallback + ref para que nunca cambie de referencia
  // y no cause re-renders en cascada en todos los hijos
  const currentScreenRef = useRef('intro');

  const navigateToScreen = useCallback((screenName, params) => {
    const key = `${currentScreenRef.current}|${screenName}`;
    const doNavigate = () => {
      currentScreenRef.current = screenName;
      global.currentScreen = screenName;
      setCurrentScreen(screenName);
      setScreenParams(params ?? {});
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

  // Precargar imágenes después de que Firestore esté listo — con throttle
  const preloadImages = useCallback(async () => {
    try {
      // Precargar solo la más importante
      await ExpoImage.prefetch(require('./assets/temporadas/libro/panel1.png'), { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
      await ExpoImage.prefetch(require('./assets/inicio/pareja.png'), { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
      await ExpoImage.prefetch(require('./assets/inicio/jugar.png'), { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
      await ExpoImage.prefetch(require('./assets/inicio/inicio.png'), { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
      await ExpoImage.prefetch(require('./assets/inicio/regalodiario.png'), { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
      await ExpoImage.prefetch(require('./assets/inicio/eventos/eventochicle.png'), { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
      await ExpoImage.prefetch(require('./assets/temporadas/libro/libroanimal.png'), { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
      await ExpoImage.prefetch(require('./assets/temporadas/libro/libroanimal2.png'), { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
      // Precargar las skins del Halcón para que el selector no muestre imágenes tarde.
      [
        require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
        require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont1.png'),
        require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont2.png'),
      ].forEach(source => ExpoImage.prefetch(source, { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {}));
      
      // Cargar stickers en background sin bloquear
      getDocs(collection(db, 'stickers')).then(snap => {
        const urls = snap.docs.map(d => d.data().imageUrl).filter(Boolean);
        // Precargar máximo 3 en paralelo, no todos
        urls.slice(0, 3).forEach(url => {
          setTimeout(() => {
            ExpoImage.prefetch(url, { cachePolicy: 'memory-disk', priority: 'low' }).catch(() => {});
          }, Math.random() * 2000); // Distribuir en 2 segundos
        });
      }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      let temporada = 't1';
      try {
        const temporadaSnap = await getDoc(doc(db, 'Temporada', 'actual'));
        const datos = temporadaSnap.data() || {};
        temporada = String(datos.Temporada || datos.temporadaActual || 't1').toLowerCase();
        if (!temporadaSnap.exists()) await setDoc(doc(db, 'Temporada', 'actual'), { Temporada: 't1', creadaEn: serverTimestamp(), actualizadaEn: serverTimestamp() });
      } catch (error) { console.warn('[App] No se pudo leer la temporada, usando t1', error?.message || error); }
      const temporadaSeleccionada = temporada === 't2' ? 't2' : 't1';
      setTemporadaInicio(temporadaSeleccionada);

      // Decodificar el fondo antes de montar Intro evita un frame vacio/parpadeo.
      const fondoInicio = temporadaSeleccionada === 't2'
        ? require('./assets/temporadas/libro/Temporada2/fondo2.png')
        : require('./assets/temporadas/libro/Temporada1/fondo1.png');
      await Asset.loadAsync(fondoInicio).catch(error => {
        console.warn('[App] No se pudo precargar el fondo de inicio', error?.message || error);
      });
      if (currentUser) {
        userRef.current = currentUser;

        // La configuración de temporada se administra desde Firestore. Solo se
        // crea la primera vez: nunca reemplaza el valor que cambies manualmente.
        // Ejecutar en background sin bloquear
        setImmediate(() => {
          // El callback puede sobrevivir a un cambio rapido de cuenta.
          // Nunca registrar ni notificar usando una sesion que ya no es activa.
          if (auth.currentUser?.uid !== currentUser.uid) return;
          NotificationSystem.registerForPushNotifications().catch(() => {});
          if (auth.currentUser?.uid === currentUser.uid) {
            NotificationSystem.notifyPartnerUserEntered(currentUser.uid, currentUser.displayName).catch(() => {});
          }
          NotificationSystem.setupNotificationListeners();
        });

        // Inicializar usuario una sola vez
        getDoc(doc(db, 'usuarios', currentUser.uid)).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            setTutorialActivo(data.tutorial === 'no');
            if (data.tutorial === 'no' && Number(data.tutorialPaso || 0) < 2 && data.animalito) {
              updateDoc(doc(db, 'usuarios', currentUser.uid), { animalito: null }).catch(() => {});
            }
            if (data.tutorial === 'si' && Number(data.tutorialPaso || 0) !== 0) {
              updateDoc(doc(db, 'usuarios', currentUser.uid), { tutorialPaso: 0 }).catch(() => {});
            }
            if (data.pareja) {
              getDoc(doc(db, 'usuarios', data.pareja)).then(partnerSnap => {
                if (partnerSnap.exists()) AsyncStorage.setItem(`pareja_cache_${currentUser.uid}`, JSON.stringify({ id: partnerSnap.id, ...partnerSnap.data() })).catch(() => {});
              }).catch(() => {});
            }
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
          
          preloadImages();
        }).catch(() => {});
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
        <MisionesProvider>
        <MusicProvider>
          <RNStatusBar backgroundColor="#FF6B6B" barStyle="light-content" />

          {currentScreen === 'intro' && (
              <Intro
                onComplete={() => {
                if (!userRef.current) {
                  currentScreenRef.current = 'login';
                  setCurrentScreen('login');
                  return;
                }
                (async () => {
                  const usuarioSnap = await getDoc(doc(db, 'usuarios', userRef.current.uid));
                  const usuarioData = usuarioSnap.data() || {};
                  const tutorialActual = usuarioData.tutorial === 'no';
                  setTutorialActivo(tutorialActual);
                  if (tutorialActual) {
                    currentScreenRef.current = 'main';
                    setCurrentScreen('main');
                    return;
                  }
                  const parejaUid = usuarioSnap.data()?.pareja;
                  let completo = false;
                  if (parejaUid) {
                    const reporteSnap = await getDoc(doc(db, 'reportes_semanales', reporteId(userRef.current.uid, parejaUid, semanaActual())));
                    const reportes = reporteSnap.data()?.reportes || {};
                    completo = Boolean(reportes[userRef.current.uid]);
                  }
                  setTipoAnuncio(completo ? 'fechas' : 'reporte');
                  setEventosAnuncio(completo ? ['fechas'] : ['reporte', 'fechas']);
                  currentScreenRef.current = 'anuncios';
                  setCurrentScreen('anuncios');
                })().catch(() => {
                  setTipoAnuncio('reporte');
                  setEventosAnuncio(['reporte', 'fechas']);
                  currentScreenRef.current = 'anuncios';
                  setCurrentScreen('anuncios');
                });
                }}
                temporada={temporadaInicio}
              isAuthenticated={!!userRef.current}
              isConnected={isConnected}
              />
          )}

          {currentScreen === 'anuncios' && (
            <Anuncios
              key={tipoAnuncio}
              visible
              preview
              evento={tipoAnuncio}
              eventosDisponibles={eventosAnuncio}
              onOpen={(evento) => {
                if (evento !== 'reporte') return;
                currentScreenRef.current = 'reporteSemanal';
                setScreenParams({});
                setCurrentScreen('reporteSemanal');
              }}
              onClose={() => {
                currentScreenRef.current = 'main';
                setScreenParams({});
                setCurrentScreen('main');
              }}
            />
          )}

          {currentScreen === 'login'    && <Login    navigation={navigation} temporada={temporadaInicio} />}
          {currentScreen === 'register' && <Register navigation={navigation} temporada={temporadaInicio} />}
          {currentScreen === 'main'     && <Inicio   navigation={navigation} tutorialActivo={tutorialActivo} openReporteSemanal={screenParams?.openReporteSemanal} onReady={() => setInicioReady(true)} />}
          {currentScreen === 'main' && tutorialActivo && <Tutorial visible onFinish={async () => {
            const uid = auth.currentUser?.uid;
            if (uid) await updateDoc(doc(db, 'usuarios', uid), {
              tutorial: 'si',
              tutorialPaso: 0,
              chicles: increment(2),
            }).catch(() => {});
            setTutorialActivo(false);
            currentScreenRef.current = 'intro';
            setCurrentScreen('intro');
          }} />}
          {currentScreen === 'reporteSemanal' && <ReporteSemanal onTerminado={() => { currentScreenRef.current = 'main'; setCurrentScreen('main'); }} />}
          {currentScreen === 'coleccion'       && <Coleccion        navigation={navigation} />}
          {currentScreen === 'tienda'          && <Tienda           navigation={navigation} />}
          {currentScreen === 'perfil'          && <Perfil           navigation={navigation} route={{ params: screenParams }} />}
          {currentScreen === 'buzon'           && <Buzon            navigation={navigation} />}
          {currentScreen === 'trofeos'         && <Trofeos          navigation={navigation} />}
          {currentScreen === 'menu'            && <Menu             navigation={navigation} />}
          {currentScreen === 'pistas'          && <Pistas           navigation={navigation} />}
          {currentScreen === 'temporadas'      && <Temporadas       navigation={navigation} />}
          {currentScreen === 'temporada1'      && <Temporada1       navigation={navigation} />}
          {currentScreen === 'temporada2'      && <Temporada2       navigation={navigation} />}
          {currentScreen === 'kitty'             && <Kitty            navigation={navigation} route={{ params: screenParams }} />}
          {currentScreen === 'paleta'            && <Paleta           navigation={navigation} route={{ params: screenParams }} />}
          {currentScreen === 'historia1'       && <Historia1        navigation={navigation} />}
          {currentScreen === 'capsula1'        && <Capsula1         navigation={navigation} route={{ params: screenParams }} />}
          {currentScreen === 'librotemp1'      && <LibroTemp1       navigation={navigation} route={{ params: screenParams }} />}
          {currentScreen === 'animalitos'      && <Animalitos       navigation={navigation} mode={screenParams?.mode} />}
          {currentScreen === 'canjear'          && <Canjear          navigation={navigation} />}
          {currentScreen === 'comerciante'      && <Comerciante      navigation={navigation} />}
          {currentScreen === 'adminCodigos'      && <AdminCodigos     navigation={navigation} />}
          {currentScreen === 'iconos'             && <Iconos           navigation={navigation} />}
          {currentScreen === 'pase'               && <Pase             navigation={navigation} />}
          {currentScreen === 'juegos'             && <Juegos           navigation={navigation} />}
          {currentScreen === 'conexiones'         && <ConexionesGame   navigation={navigation} />}
          <Loading ref={loadingRef} />
          <Toast ref={toastRef} />

        </MusicProvider>
        </MisionesProvider>
      </TrofeosProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
