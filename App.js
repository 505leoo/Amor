import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, AppState, BackHandler, View, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import { Asset } from 'expo-asset';
import * as Updates from 'expo-updates';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, getDocFromServer, collection, getDocs, query, limit, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import * as NavigationBar from 'expo-navigation-bar';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationSystem from './utils/NotificationSystem';
import { TrofeosProvider } from './TrofeosContext';
import { MusicProvider } from './MusicContext';
import { MisionesProvider } from './MisionesContext';
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
import Rutas from './Rutas';
import Comerciante from './Comerciante';
import Anuncios from './components/Anuncios';
import Noticias, { NOTICIAS_ID, NOTICIAS_IDS } from './components/Noticias';
import Lotes from './Lotes';
import Tutorial from './components/Tutorial';
import { ReporteSemanal } from './components/ReporteSemanal';
import { reporteId, semanaActual } from './components/ReporteSemanal';
import { temporadaParaUsuario } from './hooks/useTemporadaActual';
import AppErrorBoundary from './components/AppErrorBoundary';
import UpdateModal from './components/UpdateModal';
import GlobalClickEffect from './components/GlobalClickEffect';

const APP_VERSION = require('./app.json').expo?.extra?.updateVersion
  || require('./app.json').expo?.version
  || require('./package.json').version;

const ROOT_SCREENS = new Set(['intro', 'login', 'main']);
const KNOWN_SCREENS = new Set([
  'intro', 'noticias', 'anuncios', 'login', 'register', 'main', 'reporteSemanal', 'coleccion', 'tienda',
  'perfil', 'buzon', 'trofeos', 'menu', 'pistas', 'temporadas', 'temporada1', 'temporada2',
  'kitty', 'paleta', 'historia1', 'capsula1', 'librotemp1', 'animalitos', 'canjear',
  'comerciante', 'lotes', 'rutas', 'adminCodigos', 'iconos', 'pase', 'juegos', 'conexiones',
]);

export default function App() {
  const [loading, setLoading]           = useState(true);
  const [authChecked, setAuthChecked]   = useState(false);
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [screenParams, setScreenParams]   = useState({});
  const [isConnected, setIsConnected]   = useState(true);
  const [inicioReady, setInicioReady]   = useState(false);
  const [temporadaInicio, setTemporadaInicio] = useState('t1');
  const [tipoAnuncio, setTipoAnuncio] = useState('lotes');
  const [eventosAnuncio, setEventosAnuncio] = useState(['lotes']);
  const [tutorialActivo, setTutorialActivo] = useState(false);
  const [estadoActualizacion, setEstadoActualizacion] = useState('checking');
  const [versionActualizacion, setVersionActualizacion] = useState(null);
  const [bootVisible, setBootVisible] = useState(true);
  const bootOpacity = useRef(new Animated.Value(1)).current;
  const userRef = useRef(null);
  const globalClickEffectRef = useRef(null);
  const updateCheckInFlightRef = useRef(false);
  const lastUpdateCheckRef = useRef(0);
  const updateStatusRef = useRef('checking');

  useEffect(() => {
    updateStatusRef.current = estadoActualizacion;
  }, [estadoActualizacion]);

  const comprobarActualizacion = useCallback(async ({ force = false } = {}) => {
    if (__DEV__ || !Updates.isEnabled) {
      setEstadoActualizacion('unavailable');
      return;
    }

    const ahora = Date.now();
    if (updateCheckInFlightRef.current || (!force && ahora - lastUpdateCheckRef.current < 15000)) return;
    if (updateStatusRef.current === 'downloading') return;

    updateCheckInFlightRef.current = true;
    lastUpdateCheckRef.current = ahora;
    try {
      const { isAvailable, manifest } = await Promise.race([
        Updates.checkForUpdateAsync(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('update-check-timeout')), 12000)),
      ]);
      if (!isAvailable) {
        if (!['available', 'downloading'].includes(updateStatusRef.current)) {
          setEstadoActualizacion('unavailable');
        }
        return;
      }

      const version = manifest?.extra?.expoClient?.extra?.updateVersion
        || manifest?.extra?.updateVersion
        || manifest?.metadata?.updateVersion
        || null;
      setVersionActualizacion(version);
      setEstadoActualizacion('available');
      updateStatusRef.current = 'available';
    } catch (error) {
      console.warn('[Updates] No se pudo comprobar la actualización', error?.message || error);
      if (!['available', 'downloading'].includes(updateStatusRef.current)) {
        setEstadoActualizacion('error');
      }
    } finally {
      updateCheckInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    comprobarActualizacion({ force: true });
    const retryRapido = setTimeout(() => comprobarActualizacion({ force: true }), 10000);
    const retryPropagacion = setTimeout(() => comprobarActualizacion({ force: true }), 30000);
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') comprobarActualizacion();
    }, 60 * 1000);
    const subscription = AppState.addEventListener('change', estado => {
      if (estado === 'active') comprobarActualizacion({ force: true });
    });
    return () => {
      clearTimeout(retryRapido);
      clearTimeout(retryPropagacion);
      clearInterval(interval);
      subscription.remove();
    };
  }, [comprobarActualizacion]);

  useEffect(() => {
    if (isConnected) comprobarActualizacion({ force: true });
  }, [comprobarActualizacion, isConnected]);

  const instalarActualizacion = useCallback(async () => {
    if (estadoActualizacion === 'downloading') return;
    setEstadoActualizacion('downloading');
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.warn('[Updates] No se pudo instalar la actualización', error?.message || error);
      updateStatusRef.current = 'available';
      setEstadoActualizacion('available');
      global.showToast?.({ type: 'error', text: 'No pudimos actualizar todavía. Revisa tu conexión e inténtalo nuevamente.' });
    }
  }, [estadoActualizacion]);

  // Toast desactivado temporalmente de forma global. Las pantallas pueden
  // seguir llamando a global.showToast sin mostrar avisos mientras tanto.
  useEffect(() => { global.showToast = () => {}; }, []);

  // navigation estable — useCallback + ref para que nunca cambie de referencia
  // y no cause re-renders en cascada en todos los hijos
  const currentScreenRef = useRef('intro');
  const screenParamsRef = useRef({});
  const navigationHistoryRef = useRef([]);

  const showScreen = useCallback((screenName, params = {}) => {
    currentScreenRef.current = screenName;
    screenParamsRef.current = params;
    global.currentScreen = screenName;
    setCurrentScreen(screenName);
    setScreenParams(params);
  }, []);

  const abrirNoticiasOAnuncios = useCallback(async () => {
    const uid = userRef.current?.uid || 'invitado';
    const estados = await Promise.all(NOTICIAS_IDS.map(noticiaId => AsyncStorage.getItem(`@amor:noticias:${uid}:${noticiaId}`).catch(() => null)));
    const pendienteIndex = estados.findIndex(estado => !estado);
    showScreen(pendienteIndex < 0 ? 'anuncios' : 'noticias', pendienteIndex < 0 ? {} : { noticiaId: NOTICIAS_IDS[pendienteIndex] });
  }, [showScreen]);

  const posponerNoticias = useCallback(() => {
    showScreen('anuncios');
  }, [showScreen]);

  const continuarNoticias = useCallback(async (noticiaId = NOTICIAS_ID) => {
    const uid = userRef.current?.uid || 'invitado';
    const storageKey = `@amor:noticias:${uid}:${noticiaId}`;
    await AsyncStorage.setItem(storageKey, new Date().toISOString()).catch(() => {});
    showScreen('anuncios');
  }, [showScreen]);

  const navigateToScreen = useCallback((screenName, params) => {
    if (!KNOWN_SCREENS.has(screenName)) {
      console.warn(`[Navigation] Pantalla desconocida: ${screenName}`);
      global.showToast?.({ type: 'error', text: 'Esa sección todavía no está disponible.' });
      return;
    }
    if (currentScreenRef.current !== screenName) {
      navigationHistoryRef.current.push({ screen: currentScreenRef.current, params: screenParamsRef.current });
      if (navigationHistoryRef.current.length > 20) navigationHistoryRef.current.shift();
    }
    showScreen(screenName, params ?? {});
  }, [showScreen]);

  const goBack = useCallback(() => {
    const previous = navigationHistoryRef.current.pop();
    if (!previous) return false;
    showScreen(previous.screen, previous.params);
    return true;
  }, [showScreen]);

  const navigation = useRef({ navigate: navigateToScreen, goBack }).current;
  useEffect(() => {
    navigation.navigate = navigateToScreen;
    navigation.goBack = goBack;
    navigation.canGoBack = () => navigationHistoryRef.current.length > 0;
  }, [navigateToScreen, goBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (ROOT_SCREENS.has(currentScreenRef.current)) return false;
      return goBack();
    });
    return () => subscription.remove();
  }, [goBack]);

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
    NavigationBar.setVisibilityAsync('hidden').catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      let temporada = 't1';
      try {
        const temporadaSnap = await getDoc(doc(db, 'Temporada', 'actual'));
        const datos = temporadaSnap.data() || {};
        temporada = temporadaParaUsuario(datos, currentUser?.email);
        if (!temporadaSnap.exists()) {
          await setDoc(doc(db, 'Temporada', 'actual'), { Temporada: 't1', DebugTemporada: 't1', creadaEn: serverTimestamp(), actualizadaEn: serverTimestamp() });
        } else if (!datos.DebugTemporada) {
          await updateDoc(doc(db, 'Temporada', 'actual'), { DebugTemporada: 't1' });
        }
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
          AsyncStorage.getItem(`config_${currentUser.uid}`).then(value => {
            if (auth.currentUser?.uid !== currentUser.uid) return;
            let notificationsEnabled = true;
            try { notificationsEnabled = value ? JSON.parse(value)?.notificaciones !== false : true; } catch {}
            if (!notificationsEnabled) return;
            NotificationSystem.registerForPushNotifications().catch(() => {});
            if (auth.currentUser?.uid === currentUser.uid) {
              NotificationSystem.notifyPartnerUserEntered(currentUser.uid, currentUser.displayName).catch(() => {});
            }
            NotificationSystem.setupNotificationListeners();
          }).catch(() => {});
        });

        // La economía nunca debe inicializarse a partir de una lectura de caché.
        // Si estamos sin conexión, esta lectura falla y no escribimos nada; así
        // evitamos que un falso "documento inexistente" reinicie dinero o EXP.
        const currentUserDocRef = doc(db, 'usuarios', currentUser.uid);
        getDocFromServer(currentUserDocRef).then(snap => {
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
            // Abrir la aplicación jamás inicializa ni corrige la economía.
            // Esos campos se crean al registrar la cuenta y luego solo cambian
            // al entregar o gastar recompensas.
            // Marca la última sesión para que Pareja pueda mostrar un estado
            // online real, con expiración en lugar de un texto fijo.
            updates.ultimaActividad = new Date().toISOString();
            if (data.appVersion !== APP_VERSION) updates.appVersion = APP_VERSION;
            if (data.fechaUltimaRacha   === undefined) updates.fechaUltimaRacha   = new Date().toISOString();
            if (Object.keys(updates).length > 0)
              updateDoc(currentUserDocRef, updates).catch(() => {});
          } else {
            // Una cuenta autenticada sin perfil puede recuperar sus datos básicos,
            // pero no inventamos un saldo desde el arranque de la aplicación.
            setDoc(currentUserDocRef, {
              uid: currentUser.uid,
              correo: currentUser.email || null,
              displayName: currentUser.displayName || 'Usuario',
              appVersion: APP_VERSION,
              ultimaActividad: new Date().toISOString(),
              fechaUltimaRacha: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }
        }).catch(error => {
          console.warn('[App] No se inicializó el perfil sin confirmación del servidor', error?.message || error);
        }).finally(() => preloadImages());
      } else {
        userRef.current = null;
        navigationHistoryRef.current = [];
        setTutorialActivo(false);
        currentScreenRef.current = 'login';
        screenParamsRef.current = {};
        setScreenParams({});
        setCurrentScreen('login');
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

  useEffect(() => {
    if (loading || !authChecked) return;
    Animated.timing(bootOpacity, {
      toValue: 0,
      duration: 420,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setBootVisible(false);
    });
  }, [authChecked, bootOpacity, loading]);

  // Presencia liviana: no lee nada y solo escribe cada dos minutos mientras
  // la aplicación está realmente en primer plano.
  useEffect(() => {
    const publicarActividad = () => {
      const currentUser = auth.currentUser;
      if (!currentUser || AppState.currentState !== 'active') return;
      setDoc(doc(db, 'usuarios', currentUser.uid), {
        ultimaActividad: serverTimestamp(),
        isOnline: true,
      }, { merge: true }).catch(() => {});
    };
    publicarActividad();
    const interval = setInterval(publicarActividad, 2 * 60 * 1000);
    const subscription = AppState.addEventListener('change', estado => {
      if (estado === 'active') publicarActividad();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [authChecked]);

  if (loading || !authChecked) return <View style={styles.boot} />;

  return (
    <View style={styles.container}>
      <AppErrorBoundary onReset={() => {
        navigationHistoryRef.current = [];
        showScreen(auth.currentUser ? 'main' : 'login');
      }}>
      <TrofeosProvider>
        <MisionesProvider>
        <MusicProvider onVisualClick={(x, y) => globalClickEffectRef.current?.show(x, y)}>
          <RNStatusBar backgroundColor="#FF6B6B" barStyle="light-content" />

          {currentScreen === 'intro' && (
              <Intro
                updateStatus={estadoActualizacion}
                updateVersion={versionActualizacion}
                onAcceptUpdate={instalarActualizacion}
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
                  setTipoAnuncio('lotes');
                  setEventosAnuncio(completo ? ['lotes', 'fechas'] : ['lotes', 'reporte', 'fechas']);
                  await abrirNoticiasOAnuncios();
                })().catch(() => {
                  setTipoAnuncio('lotes');
                  setEventosAnuncio(['lotes', 'reporte', 'fechas']);
                  abrirNoticiasOAnuncios();
                });
                }}
                temporada={temporadaInicio}
              isAuthenticated={!!userRef.current}
              isConnected={isConnected}
              />
          )}

          {currentScreen === 'noticias' && <Noticias visible version={APP_VERSION} initialNoticiaId={screenParams?.noticiaId} onDismiss={posponerNoticias} onContinue={continuarNoticias} />}

          {currentScreen === 'anuncios' && (
            <Anuncios
              key={tipoAnuncio}
              visible
              preview
              evento={tipoAnuncio}
              eventosDisponibles={eventosAnuncio}
              onOpen={(evento) => {
                if (evento === 'lotes') {
                  navigation.navigate('lotes', { animalId: 'ardilla' });
                  return;
                }
                if (evento === 'fechas') {
                  navigation.navigate('rutas');
                  return;
                }
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
          {currentScreen === 'comerciante'      && <Comerciante      navigation={navigation} temporada={screenParams?.temporada} />}
          {currentScreen === 'lotes'             && <Lotes           navigation={navigation} animalId={screenParams?.animalId} />}
          {currentScreen === 'rutas'              && <Rutas           navigation={navigation} />}
          {currentScreen === 'adminCodigos'      && <AdminCodigos     navigation={navigation} />}
          {currentScreen === 'iconos'             && <Iconos           navigation={navigation} />}
          {currentScreen === 'pase'               && <Pase             navigation={navigation} />}
          {currentScreen === 'juegos'             && <Juegos           navigation={navigation} />}
          {currentScreen === 'conexiones'         && <ConexionesGame   navigation={navigation} />}
          {currentScreen !== 'intro' && (
            <UpdateModal
              status={estadoActualizacion}
              version={versionActualizacion}
              onAccept={instalarActualizacion}
            />
          )}
        </MusicProvider>
        </MisionesProvider>
      </TrofeosProvider>
      </AppErrorBoundary>
      <GlobalClickEffect ref={globalClickEffectRef} />
      {bootVisible && <Animated.View pointerEvents="none" style={[styles.bootOverlay, { opacity: bootOpacity }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  boot: { flex: 1, backgroundColor: '#8f9295' },
  bootOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#8f9295', zIndex: 9999, elevation: 9999 },
});
