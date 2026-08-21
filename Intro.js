import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image as RNImage } from 'react-native';
import { Asset } from 'expo-asset';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { Image } from 'expo-image';

import { LinearGradient } from 'expo-linear-gradient';

const Intro = ({ onComplete, isAuthenticated = false, isConnected = true, temporada = 't1' }) => {
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
  const containerFade = useRef(new Animated.Value(0)).current;
  const [showContent, setShowContent] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  const gradientColors = ['transparent', 'transparent', 'transparent'];

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
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    };

    startSequence();
    const fallbackTimer = setTimeout(() => {
      if (!completedRef.current) {
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

});

export default Intro;
