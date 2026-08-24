import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image as RNImage, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Asset } from 'expo-asset';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { Image } from 'expo-image';

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

  const gradientColors = ['transparent', 'transparent', 'transparent'];

  useEffect(() => {
    updateStatusRef.current = updateStatus;
    if (sequenceFinishedRef.current && ['unavailable', 'error'].includes(updateStatus) && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [updateStatus, onComplete]);

  const preloadLocalAssets = async () => {
    await Asset.loadAsync([
      require('./assets/temporadas/libro/libro1.png'),
      require('./assets/temporadas/libro/libro2.png'),
      require('./assets/temporadas/libro/Temporada1/logo1.png'),
      require('./assets/inicio/inicio.png'),
      require('./assets/temporadas/libro/Temporada1/fondo1.png'),
      require('./assets/temporadas/libro/Temporada2/fondo2.png'),
    ]).catch(error => console.warn('[Intro] Error precargando assets', error?.message || error));
  };

  const preloadFirebaseData = async () => {
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

  useEffect(() => {
    const startSequence = async () => {
      if (sequenceStartedRef.current) return;
      sequenceStartedRef.current = true;
      // El fondo ya esta montado desde el primer render. La precarga no debe
      // bloquear la intro ni retrasar la navegacion.
      Asset.loadAsync(fondoLocal).then(() => {
        console.log('[Intro] Fondo local preparado');
      }).catch(error => {
        console.warn('[Intro] No se pudo preparar el fondo', error?.message || error);
      });

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
      
      if (isAuthenticated) {
        try {
          await Promise.race([
            getDocs(query(collection(db, 'usuarios'), limit(1))),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
          ]);
        } catch (error) {
          if (!isConnected) setLoadingStatus('Sin conexión a Internet');
        }
      }
      
      setLoadingStatus('Cargando datos...');
      
      // Iniciar animación de progress bar (5 segundos garantizados)
      const progressPromise = new Promise(resolve => {
        Animated.timing(progressWidth, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: false,
        }).start(() => resolve());
      });
      
      // Preload en paralelo (no bloquea la animación)
      const preloadPromise = Promise.race([
        Promise.all([preloadLocalAssets(), isAuthenticated ? preloadFirebaseData() : Promise.resolve()]).catch(error => {
          console.warn('[Intro] Precarga incompleta, continuando', error?.message || error);
        }),
        new Promise(resolve => setTimeout(resolve, 4500)),
      ]);
      
      await Promise.all([progressPromise, preloadPromise]).catch(error => {
        console.warn('[Intro] Error no bloqueante en carga', error?.message || error);
      });
      
      setLoadingStatus('Preparando interfaz...');
      await new Promise(resolve => setTimeout(resolve, 300));
      sequenceFinishedRef.current = true;
      if (!completedRef.current && ['unavailable', 'error'].includes(updateStatusRef.current)) {
        completedRef.current = true;
        onComplete();
      }
    };

    startSequence();
    const fallbackTimer = setTimeout(() => {
      if (!completedRef.current && ['unavailable', 'error'].includes(updateStatusRef.current)) {
        completedRef.current = true;
        console.warn('[Intro] Salida de emergencia: finalizando intro');
        onComplete();
      }
    }, 7000);

    return () => clearTimeout(fallbackTimer);
  }, [isAuthenticated, isConnected]);

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
      </LinearGradient>
      <Modal visible={updateStatus === 'available' || updateStatus === 'downloading'} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.updateOverlay}>
          <View style={styles.updateCard}>
            <View style={styles.updateSparkle}><Text style={styles.updateSparkleText}>✦</Text></View>
            <Text style={styles.updateEyebrow}>UNA SORPRESA PARA USTEDES</Text>
            <Text style={styles.updateTitle}>¡Hay una nueva versión!</Text>
            {updateVersion && <View style={styles.updateVersionBadge}><Text style={styles.updateVersionText}>VERSIÓN {updateVersion}</Text></View>}
            <Text style={styles.updateDescription}>Preparamos nuevas mejoras con mucho cariño para que su rinconcito se sienta más bonito, cómodo y especial. ¿Quieren descubrirlas ahora?</Text>
            {updateStatus === 'downloading' ? (
              <View style={styles.updateLoading}>
                <ActivityIndicator color="#fff8dc" size="small" />
                <Text style={styles.updateLoadingText}>Preparando la actualización...</Text>
              </View>
            ) : (
              <View style={styles.updateActions}>
                <TouchableOpacity style={styles.updateNowButton} onPress={onAcceptUpdate} activeOpacity={0.85}>
                  <Text style={styles.updateNowText}>Actualizar ahora</Text>
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
