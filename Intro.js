import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image as RNImage, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Asset } from 'expo-asset';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { Image } from 'expo-image';
import { isOfflineModeEnabled } from './utils/offlineSync';
import { CACHE_STATE_KEY, RECURSOS_APP, claveRecurso, recursosPreparados } from './Descargas';

import { LinearGradient } from 'expo-linear-gradient';

const Intro = ({ onComplete, isAuthenticated = false, isConnected = null, temporada = 't1', updateStatus = 'unavailable', updateVersion = null, updateProgress = null, updatePending = false, onAcceptUpdate }) => {
  const temporadaInicial = temporada;
  const fondoTemporada = temporadaInicial;
  const fondoLocal = fondoTemporada === 't2'
    ? require('./assets/temporadas/libro/Temporada2/fondo2.png')
    : require('./assets/temporadas/libro/Temporada1/fondo1.png');

  useEffect(() => {
    console.log('[Intro] Fondo local seleccionado', fondoTemporada === 't2' ? 'fondo2.png' : 'fondo1.png');
  }, [fondoTemporada]);

  const brandFade = useRef(new Animated.Value(0)).current;
  const brandSlide = useRef(new Animated.Value(20)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressAnimRef = useRef(null);
  const sequenceStartedRef = useRef(false);
  const completedRef = useRef(false);
  const sequenceFinishedRef = useRef(false);
  const updateStatusRef = useRef(updateStatus);
  const containerFade = useRef(new Animated.Value(0)).current;
  const [showContent, setShowContent] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [updateElapsedSeconds, setUpdateElapsedSeconds] = useState(0);
  const mountedRef = useRef(true);
  const isConnectedRef = useRef(isConnected);
  const updateSweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (updateStatus !== 'downloading') {
      updateSweep.stopAnimation();
      updateSweep.setValue(0);
      setUpdateElapsedSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    const refreshElapsed = () => setUpdateElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    refreshElapsed();
    const timer = setInterval(refreshElapsed, 1000);
    const animation = Animated.loop(Animated.timing(updateSweep, { toValue: 1, duration: 1100, useNativeDriver: true }));
    animation.start();
    return () => {
      clearInterval(timer);
      animation.stop();
      updateSweep.stopAnimation();
    };
  }, [updateStatus, updateSweep]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const gradientColors = ['transparent', 'transparent', 'transparent'];

  useEffect(() => {
    updateStatusRef.current = updateStatus;
    if (sequenceFinishedRef.current && updateStatus === 'unavailable' && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [updateStatus, onComplete]);

  const preloadLocalAssets = async () => {
    if (isConnectedRef.current === false || isOfflineModeEnabled()) {
      if (mountedRef.current) {
        progressWidth.setValue(1);
        setLoadingStatus('Sin conexión · usando recursos incluidos');
      }
      return { skipped: true };
    }

    const failed = [];
    let loaded = 0;
    const total = RECURSOS_APP.length;
    const batchSize = 5;
    const cargarUno = async (modulo, indice) => {
      let ultimoError = null;
      let asset = null;
      for (let intento = 1; intento <= 3; intento += 1) {
        try {
          asset = Asset.fromModule(modulo);
          await asset.downloadAsync();
          break;
        } catch (error) {
          ultimoError = error;
          if (intento < 3) await new Promise(resolve => setTimeout(resolve, 180 * intento));
        }
      }
      if (!asset) {
        // Algunos recursos estáticos (JSON/Lottie/audio) forman parte del
        // bundle, pero expo-asset no siempre puede convertirlos en un Asset
        // descargable. Al estar incluidos por require(), ya están disponibles
        // sin conexión y no deben bloquear la entrada a la app.
        console.warn('[Intro] Recurso estático disponible desde el bundle', {
          indice: indice + 1,
          error: ultimoError?.message || String(ultimoError || 'desconocido'),
        });
        return true;
      }

      // Algunos recursos ya están dentro del bundle y no exponen una URI
      // descargable en el dispositivo de desarrollo. El require() sigue
      // siendo una fuente válida; la precarga visual es una optimización y no
      // debe convertir un asset local correcto en un fallo fatal.
      const tipo = String(asset.type || '').toLowerCase();
      if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(tipo) && (asset.localUri || asset.uri)) {
        Image.prefetch(asset.localUri || asset.uri, { cachePolicy: 'memory-disk', priority: 'high' }).catch(error => {
          console.warn('[Intro] Imagen local disponible, pero no se pudo calentar la caché', { indice: indice + 1, error: error?.message || error });
        });
      }
      return true;
    };

    for (let inicio = 0; inicio < total; inicio += batchSize) {
      const lote = RECURSOS_APP.slice(inicio, inicio + batchSize);
      await Promise.all(lote.map((modulo, offset) => cargarUno(modulo, inicio + offset)));
      loaded += lote.length;
      if (mountedRef.current) {
        setLoadingStatus(`Preparando recursos · ${loaded}/${total}`);
        Animated.timing(progressWidth, { toValue: loaded / total, duration: 140, useNativeDriver: false }).start();
      }
    }

    if (failed.length) {
      const detalle = failed.slice(0, 3).map(item => `#${item.indice}`).join(', ');
      throw new Error(`No se pudieron preparar ${failed.length} recursos (${detalle})`);
    }

    await AsyncStorage.setItem(CACHE_STATE_KEY, JSON.stringify({
      estado: 'ready',
      recursos: RECURSOS_APP.map((modulo, indice) => claveRecurso(modulo, indice)),
      omitidos: [],
      preparadoEn: Date.now(),
    })).catch(error => console.warn('[Intro] No se pudo guardar el manifiesto local', error?.message || error));
    return { skipped: false, total };
  };

  const preloadFirebaseData = async () => {
    if (isConnectedRef.current === false || isOfflineModeEnabled()) return;
    try {
      const preloadPromises = [
        getDocs(query(collection(db, 'stickers'), limit(5))).catch(() => null),
        isAuthenticated && auth.currentUser ? 
          getDoc(doc(db, 'usuarios', auth.currentUser.uid)).catch(() => null) : 
          Promise.resolve(null)
      ].filter(Boolean);
      
      const results = await Promise.allSettled(preloadPromises);
      
      const imageUrls = [];
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value && result.value.docs) {
          result.value.docs.forEach(doc => {
            const data = doc.data();
            if (data.imageUrl) imageUrls.push(data.imageUrl);
          });
        }
      });
      
      if (imageUrls.length > 0) {
        const imagePreloadPromises = imageUrls.slice(0, 3).map(url => 
          Image.prefetch(url).catch(() => {})
        );
        await Promise.allSettled(imagePreloadPromises);
      }
    } catch (error) {}
  };

  const validarRecursosParaModoOffline = async () => {
    const preparado = await recursosPreparados();
    if (preparado) return true;
    if (mountedRef.current) {
      progressWidth.setValue(0);
      setLoadingStatus('Sin conexión · preparación requerida');
      setLoadError('Sin internet. Conéctate a una red y pulsa REINTENTAR para preparar los recursos antes de usar la app sin conexión.');
    }
    return false;
  };

  useEffect(() => {
    const startSequence = async () => {
      if (sequenceStartedRef.current) return;
      sequenceStartedRef.current = true;
      setShowContent(true);
      
      // Animaciones suaves con useNativeDriver: true
      Animated.parallel([
        Animated.timing(containerFade, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(brandFade, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(brandSlide, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
      
      setLoadError(null);
      const networkState = await NetInfo.fetch().catch(() => null);
      const hayConexion = isConnectedRef.current !== false
        && networkState?.isConnected !== false
        && networkState?.isInternetReachable !== false
        && !isOfflineModeEnabled();
      if (hayConexion) {
        setLoadingStatus('Preparando recursos…');
        try {
          await preloadLocalAssets();
          // Los datos remotos son auxiliares; no deben retrasar la entrada
          // después de que todos los recursos locales quedaron preparados.
          if (isAuthenticated && isConnectedRef.current) preloadFirebaseData().catch(() => {});
        } catch (error) {
          console.warn('[Intro] Precarga incompleta', error?.message || error);
          if (mountedRef.current) {
            setLoadError(error?.message || 'No se pudieron preparar todos los recursos.');
            setLoadingStatus('No se pudo completar la preparación');
          }
          return;
        }
      } else {
        const puedeContinuar = await validarRecursosParaModoOffline();
        if (!puedeContinuar) return;
        await preloadLocalAssets();
      }

      if (mountedRef.current) setLoadingStatus('Preparando interfaz…');
      await new Promise(resolve => setTimeout(resolve, 220));
      sequenceFinishedRef.current = true;
      if (!completedRef.current && updateStatusRef.current === 'unavailable') {
        completedRef.current = true;
        onComplete();
      }
    };

    startSequence();
    return undefined;
  }, [isAuthenticated, isConnected, retryNonce]);

  const progresoOTA = Number.isFinite(Number(updateProgress))
    ? Math.max(0, Math.min(1, Number(updateProgress)))
    : null;
  const updateStage = updatePending && updateStatus !== 'error'
    ? (updateStatus === 'downloading' ? 'Aplicando actualización' : 'Descarga lista')
    : updateStatus === 'error'
    ? 'No se pudo completar'
    : updateStatus === 'downloading'
      ? (progresoOTA !== null ? `Descargando · ${Math.round(progresoOTA * 100)}%` : `Descargando · ${updateElapsedSeconds}s`)
      : 'Actualización encontrada';
  const updateTitle = updatePending && updateStatus !== 'error'
    ? (updateStatus === 'downloading' ? 'Aplicando la mejora' : 'Lista para reiniciar')
    : updateStatus === 'error'
    ? 'No pudimos aplicarla'
    : updateStatus === 'downloading'
      ? 'Descargando mejoras'
      : 'Hay una mejora lista';
  const updateDescription = updatePending && updateStatus !== 'error'
    ? 'La descarga ya está en el dispositivo. Solo falta reiniciar la app.'
    : updateStatus === 'error'
    ? 'Revisá tu conexión y volvé a intentarlo.'
    : updateStatus === 'downloading'
      ? (progresoOTA !== null && progresoOTA >= 0.99 ? 'Terminando la descarga y preparando el reinicio…' : 'La app sigue trabajando. Puede tardar un poquito según tu conexión.')
      : 'Encontramos una versión nueva para tu rinconcito.';

  return (
    <Animated.View style={styles.container}> 
      <StatusBar hidden={true} />
      <RNImage source={fondoLocal} style={styles.background} resizeMode="cover" onLoad={() => console.log('[Intro] Fondo local cargado')} onError={error => console.warn('[Intro] Error cargando fondo local', error?.nativeEvent || error)} />
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {showContent && (
          <View style={styles.content}>
            <Animated.View 
              style={[
                styles.brandContainer,
                {
                  opacity: brandFade,
                  transform: [{ translateY: brandSlide }]
                }
              ]}
            >
              <Text style={styles.brand}>AMOR</Text>
              <Text style={styles.brandSub}>un rinconcito para ustedes</Text>
            </Animated.View>
          </View>
        )}
        
        <Animated.View 
          style={[
            styles.progressBar,
            { transform: [{ scaleX: progressWidth }], transformOrigin: '0 0' }
          ]} 
        />
        <Animated.View 
          style={[
            styles.progressBarGray,
            { transform: [{ scaleX: progressWidth }], transformOrigin: '0 0' }
          ]} 
        />
        
        <Text style={styles.loadingText}>{loadingStatus}</Text>
        {loadError && <TouchableOpacity style={styles.retryButton} onPress={() => { sequenceStartedRef.current = false; setLoadError(null); progressWidth.setValue(0); setRetryNonce(value => value + 1); }} activeOpacity={0.85}>
          <Text style={styles.retryText}>REINTENTAR</Text>
        </TouchableOpacity>}
      </LinearGradient>
      <Modal visible={updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'error'} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.updateOverlay}>
          <View style={styles.updateCard}>
            <View style={styles.updateSparkle}><Text style={styles.updateSparkleText}>✦</Text></View>
            <Text style={styles.updateEyebrow}>{updateStage.toUpperCase()}</Text>
            <Text style={styles.updateTitle}>{updateTitle}</Text>
            {updateVersion && <View style={styles.updateVersionBadge}><Text style={styles.updateVersionText}>VERSIÓN {updateVersion}</Text></View>}
            <Text style={styles.updateDescription}>{updateDescription}</Text>
            <View style={styles.updateProgressBox}>
              <View style={styles.updateProgressHeader}>
                <Text style={styles.updateProgressLabel}>ESTADO</Text>
                <Text style={styles.updateProgressValue}>{updateStage}</Text>
              </View>
              <View style={styles.updateProgressTrack}>
                {updatePending && updateStatus !== 'error' && updateStatus !== 'downloading' ? (
                  <View style={[styles.updateProgressFill, { width: '100%' }]} />
                ) : updateStatus === 'downloading' && progresoOTA !== null ? (
                  <View style={[styles.updateProgressFill, { width: `${Math.max(4, progresoOTA * 100)}%` }]} />
                ) : updateStatus === 'downloading' ? (
                  <Animated.View style={[styles.updateProgressIndeterminate, { transform: [{ translateX: updateSweep.interpolate({ inputRange: [0, 1], outputRange: [-58, 178] }) }] }]} />
                ) : (
                  <View style={[styles.updateProgressFill, { width: updateStatus === 'error' ? '100%' : '12%' }]} />
                )}
              </View>
            </View>
            {updateStatus === 'downloading' ? (
              <View style={styles.updateLoading}>
                <ActivityIndicator color="#fff8dc" size="small" />
                <Text style={styles.updateLoadingText}>{updatePending ? 'Preparando reinicio…' : progresoOTA !== null ? `${Math.round(progresoOTA * 100)}% completado` : `Llevamos ${updateElapsedSeconds}s`}</Text>
              </View>
            ) : (
              <View style={styles.updateActions}>
                <TouchableOpacity style={styles.updateNowButton} onPress={onAcceptUpdate} activeOpacity={0.85}>
                  <Text style={styles.updateNowText}>{updateStatus === 'error' ? 'Reintentar' : updatePending ? 'Reiniciar ahora' : 'Actualizar ahora'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.updateHint}>{updateStatus === 'error' ? 'No se perdió nada de tu cuenta.' : 'La app se abrirá de nuevo al terminar.'}</Text>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    backgroundColor: '#f2c4bd',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 46,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: {
    fontSize: 18,
    color: '#fff8dc',
    fontWeight: '900',
    textShadowColor: 'rgba(84,54,34,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
    letterSpacing: 4,
    marginBottom: 8,
  },
  brandSub: {
    fontSize: 12,
    color: '#fff1d0',
    fontWeight: '700',
    letterSpacing: 2,
    textShadowColor: 'rgba(84,54,34,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressBar: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    width: '100%',
    height: 9,
    backgroundColor: '#fff',
  },
  progressBarGray: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    width: '100%',
    height: 2,
    backgroundColor: '#bbb',
  },
  progressBarDark: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  appContainer: {
    alignItems: 'center',
  },
  app: {
    fontSize: 42,
    color: '#fff',
    fontWeight: '300',
    letterSpacing: 2,
    marginBottom: 12,
  },
  appSub: {
    fontSize: 12,
    color: '#666',
    fontWeight: '200',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  loadingText: {
    position: 'absolute',
    bottom: 20,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  retryButton: { position: 'absolute', bottom: 43, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(96,53,47,0.82)', borderWidth: 1, borderColor: 'rgba(255,248,220,0.65)' },
  retryText: { color: '#fff8dc', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  updateOverlay: { flex: 1, backgroundColor: 'rgba(46, 25, 27, 0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  updateCard: { width: '82%', maxWidth: 370, alignItems: 'center', paddingHorizontal: 21, paddingTop: 18, paddingBottom: 14, borderRadius: 20, backgroundColor: '#fff7e8', borderWidth: 2, borderColor: '#e8b77d', shadowColor: '#351b19', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 20 },
  updateSparkle: { width: 35, height: 35, marginTop: -38, marginBottom: 7, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#df7f75', borderWidth: 2, borderColor: '#ffe9bd' },
  updateSparkleText: { color: '#fff8dc', fontSize: 19, fontWeight: '900' },
  updateEyebrow: { color: '#b26b62', fontSize: 7, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  updateTitle: { color: '#75483e', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  updateVersionBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: '#f5dfbd', borderWidth: 1, borderColor: '#e3bd86' },
  updateVersionText: { color: '#a25f56', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  updateDescription: { maxWidth: 310, color: '#8b685d', fontSize: 9.5, lineHeight: 14, fontWeight: '600', textAlign: 'center', marginTop: 7 },
  updateProgressBox: { width: '100%', marginTop: 11, padding: 9, borderRadius: 11, backgroundColor: 'rgba(245,223,189,0.42)', borderWidth: 1, borderColor: 'rgba(227,189,134,0.65)' },
  updateProgressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  updateProgressLabel: { color: '#b26b62', fontSize: 6.5, fontWeight: '900', letterSpacing: 1 },
  updateProgressValue: { maxWidth: '72%', color: '#75483e', fontSize: 7.5, fontWeight: '800', textAlign: 'right' },
  updateProgressTrack: { height: 6, overflow: 'hidden', borderRadius: 4, backgroundColor: 'rgba(178,107,98,0.18)' },
  updateProgressFill: { height: '100%', borderRadius: 4, backgroundColor: '#dc7b71' },
  updateProgressIndeterminate: { width: 58, height: '100%', borderRadius: 4, backgroundColor: '#dc7b71' },
  updateActions: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
  updateNowButton: { minWidth: 138, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#dc7b71', borderWidth: 1, borderColor: '#bd625b', shadowColor: '#9c514b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 3 },
  updateNowText: { color: '#fff9e9', fontSize: 10, fontWeight: '900' },
  updateLoading: { height: 31, minWidth: 190, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 11, borderRadius: 10, backgroundColor: '#dc7b71' },
  updateLoadingText: { color: '#fff9e9', fontSize: 8.5, fontWeight: '800' },
  updateHint: { color: '#aa8879', fontSize: 7, fontWeight: '700', marginTop: 8 },

});

export default Intro;
