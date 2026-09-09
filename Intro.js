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

const Intro = ({ onComplete, isAuthenticated = false, isConnected = true, temporada = 't1', updateStatus = 'unavailable', updateVersion = null, onAcceptUpdate }) => {
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
  const mountedRef = useRef(true);
  const isConnectedRef = useRef(isConnected);

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
    if (!isConnectedRef.current || isOfflineModeEnabled()) {
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
    if (!isConnectedRef.current || isOfflineModeEnabled()) return;
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
      const hayConexion = isConnectedRef.current
        && networkState?.isConnected !== false
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
            <Text style={styles.updateEyebrow}>{updateStatus === 'error' ? 'NO PUDIMOS TERMINAR' : 'UNA SORPRESA PARA USTEDES'}</Text>
            <Text style={styles.updateTitle}>{updateStatus === 'error' ? 'La actualización quedó pendiente' : '¡Hay una nueva versión!'}</Text>
            {updateVersion && <View style={styles.updateVersionBadge}><Text style={styles.updateVersionText}>VERSIÓN {updateVersion}</Text></View>}
            <Text style={styles.updateDescription}>{updateStatus === 'error' ? 'No se pudo aplicar todavía. Revisá tu conexión e intentá nuevamente.' : 'Preparamos nuevas mejoras con mucho cariño para que su rinconcito se sienta más bonito, cómodo y especial. ¿Quieren descubrirlas ahora?'}</Text>
            {updateStatus === 'downloading' ? (
              <View style={styles.updateLoading}>
                <ActivityIndicator color="#fff8dc" size="small" />
                <Text style={styles.updateLoadingText}>Preparando la actualización...</Text>
              </View>
            ) : (
              <View style={styles.updateActions}>
                <TouchableOpacity style={styles.updateNowButton} onPress={onAcceptUpdate} activeOpacity={0.85}>
                  <Text style={styles.updateNowText}>{updateStatus === 'error' ? 'Reintentar' : 'Actualizar ahora'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.updateHint}>La app se abrirá de nuevo al terminar.</Text>
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
  updateCard: { width: '86%', maxWidth: 430, alignItems: 'center', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 19, borderRadius: 24, backgroundColor: '#fff7e8', borderWidth: 3, borderColor: '#e8b77d', shadowColor: '#351b19', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.45, shadowRadius: 15, elevation: 24 },
  updateSparkle: { width: 43, height: 43, marginTop: -47, marginBottom: 10, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#df7f75', borderWidth: 3, borderColor: '#ffe9bd' },
  updateSparkleText: { color: '#fff8dc', fontSize: 23, fontWeight: '900' },
  updateEyebrow: { color: '#b26b62', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  updateTitle: { color: '#75483e', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  updateVersionBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, backgroundColor: '#f5dfbd', borderWidth: 1, borderColor: '#e3bd86' },
  updateVersionText: { color: '#a25f56', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  updateDescription: { maxWidth: 350, color: '#8b685d', fontSize: 11, lineHeight: 17, fontWeight: '600', textAlign: 'center', marginTop: 9 },
  updateActions: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 },
  updateNowButton: { minWidth: 151, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#dc7b71', borderWidth: 1, borderColor: '#bd625b', shadowColor: '#9c514b', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 4, elevation: 4 },
  updateNowText: { color: '#fff9e9', fontSize: 11, fontWeight: '900' },
  updateLoading: { height: 39, minWidth: 245, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18, borderRadius: 13, backgroundColor: '#dc7b71' },
  updateLoadingText: { color: '#fff9e9', fontSize: 10, fontWeight: '800' },
  updateHint: { color: '#aa8879', fontSize: 7.5, fontWeight: '700', marginTop: 11 },

});

export default Intro;
