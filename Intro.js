import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Asset } from 'expo-asset';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { Image } from 'expo-image';
import PushyService from './utils/PushyService';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';
import { useSeason } from './SeasonContext';
import ThemeParticles from './components/ThemeParticles';

const Intro = ({ onComplete, isAuthenticated = false, isConnected = true }) => {
  const brandFade = useRef(new Animated.Value(0)).current;
  const brandSlide = useRef(new Animated.Value(20)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressAnimRef = useRef(null);
  const appFade = useRef(new Animated.Value(0)).current;
  const appSlide = useRef(new Animated.Value(30)).current;
  const containerFade = useRef(new Animated.Value(0)).current;
  const [showContent, setShowContent] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const { currentTheme, themes } = useTheme();
  const { getDisplaySeason, isLoading: seasonLoading } = useSeason();
  const theme = themes[currentTheme];
  const displaySeason = getDisplaySeason();

  const gradientColors = seasonLoading
    ? ['#0a0a0a', '#000000', '#0a0a0a']
    : (displaySeason ? displaySeason.gradient : theme?.gradient || ['#0a0a0a', '#000000', '#0a0a0a']);
  const particlesType = seasonLoading
    ? null
    : (displaySeason ? displaySeason.particles : theme?.particles);

  const preloadLocalAssets = async () => {
    await Asset.loadAsync([
      require('./assets/paredes/pared1.png'),
      require('./assets/paredes/vestuario1.png'),
      require('./assets/paredes/frasespared.png'),
      require('./assets/player/cabeza1.png'),
      require('./assets/player/manos1.png'),
      require('./assets/player/remera1.png'),
      require('./assets/player/inicial1.png'),
      require('./assets/player/mano1d.png'),
      require('./assets/player/mano1i.png'),
      require('./assets/menu/mensajes.png'),
      require('./assets/menu/pared1.png'),
      require('./assets/menu/pistas.png'),
      require('./assets/posters/poster1.png'),
      require('./assets/frases/frases1.png'),
    ]);
  };

  const preloadFirebaseData = async () => {
    try {
      const preloadPromises = [
        getDoc(doc(db, 'season', 'current')).catch(() => null),
        getDocs(query(collection(db, 'stickers'), limit(10))).catch(() => null),
        isAuthenticated && auth.currentUser ? 
          getDoc(doc(db, 'usuarios', auth.currentUser.uid)).catch(() => null) : 
          Promise.resolve(null)
      ].filter(Boolean);
      
      const results = await Promise.allSettled(preloadPromises);
      
      const imageUrls = [];
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value && result.value.docs) {
          result.value.docs.slice(0, 5).forEach(doc => {
            const data = doc.data();
            if (data.imageUrl) imageUrls.push(data.imageUrl);
          });
        }
      });
      
      if (imageUrls.length > 0) {
        const imagePreloadPromises = imageUrls.slice(0, 5).map(url => 
          Image.prefetch(url).catch(() => {})
        );
        await Promise.allSettled(imagePreloadPromises);
      }
      
    } catch (error) {
      
    }
  };

  const notifyPartnerUserEntered = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'usuarios', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return;
      
      const userData = userSnap.data();
      const userName = userData.datosCompletos?.nombre || userData.nombre || user.displayName || 'Tu pareja';
      
      PushyService.broadcastToAllExcept(
        db, 
        user.uid, 
        '💕 Tu amor está aquí', 
        `${userName} acaba de entrar a la app ❤️`
      ).catch(err => console.log('Notificación no enviada:', err.message));
    } catch (error) {
      
    }
  };

  useEffect(() => {
    const startSequence = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setShowContent(true);
      
      Animated.sequence([
        // Pantalla negra inicial 0.5s
        Animated.delay(500),
        
        // Fade in suave y trabajado
        Animated.timing(containerFade, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(containerFade, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        // Entrada de marca
        Animated.parallel([
          Animated.timing(brandFade, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(brandSlide, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        
        // Pausa
        Animated.delay(400),
      ]).start();
      
      // Verificar conexión con Firebase
      try {
        await getDocs(query(collection(db, 'usuarios'), limit(1)));
      } catch (error) {
        setLoadingStatus('Sin conexión a Internet');
        return;
      }
      
      setLoadingStatus('Cargando datos...');
      
      // Iniciar animación de la barra
      progressAnimRef.current = Animated.timing(progressWidth, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: false,
      }).start();
      
      const preloadPromise = Promise.all([preloadLocalAssets(), preloadFirebaseData()]);
      
      // Esperar mínimo 2s para ver la barra
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await preloadPromise;
      
      setLoadingStatus('Preparando interfaz...');

      // Completar la barra rápidamente si no está al 100%
      progressAnimRef.current?.stop();
      await new Promise(resolve => {
        Animated.timing(progressWidth, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start(resolve);
      });
      
      if (isAuthenticated) {
        await notifyPartnerUserEntered();
      }
      
      onComplete();
    };

    startSequence();
  }, [isAuthenticated]);

  return (
    <Animated.View style={[styles.container, { opacity: containerFade }]}>
      <StatusBar hidden={true} />
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {particlesType ? <ThemeParticles particleType={particlesType} /> : null}
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
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.appContainer,
                {
                  opacity: appFade,
                  transform: [{ translateY: appSlide }]
                }
              ]}
            >
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
        <Animated.View 
          style={[
            styles.progressBarDark,
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
  },
  content: {
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: {
    fontSize: 14,
    color: '#888',
    fontWeight: '300',
    letterSpacing: 4,
    marginBottom: 8,
  },
  brandSub: {
    fontSize: 10,
    color: '#555',
    fontWeight: '200',
    letterSpacing: 2,
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
