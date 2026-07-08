import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar as RNStatusBar, Image } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, collection, getDocs, query, limit, updateDoc, setDoc } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import * as NavigationBar from 'expo-navigation-bar';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import NotificationSystem from './utils/NotificationSystem';
import PushyService from './utils/PushyService';
import { asegurarDniUsuario } from './utils/dniUsuario';
import { ThemeProvider } from './ThemeContext';
import { SeasonProvider } from './SeasonContext';
import { DebugProvider } from './DebugContext';
import { NewIndicatorProvider } from './NewIndicatorContext';
import { TrofeosProvider } from './TrofeosContext';
import { MusicProvider } from './MusicContext';
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

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [cartaMessage, setCartaMessage] = useState('');
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isFirestoreReady, setIsFirestoreReady] = useState(false);
  const [inicioReady, setInicioReady] = useState(false);
  const userRef = useRef(null);

  // Precargar imágenes de stickers
  useEffect(() => {
    const preloadImages = async () => {
      try {
        const stickersSnapshot = await getDocs(collection(db, 'stickers'));
        const imageUrls = stickersSnapshot.docs.map(doc => doc.data().imageUrl).filter(Boolean);
        
        await Promise.all(
          imageUrls.map(url => 
            ExpoImage.prefetch(url, {
              cachePolicy: 'memory-disk',
              priority: 'high'
            })
          )
        );
        
      } catch (error) {
        console.error('Error precargando imágenes:', error);
      }
    };

    if (isFirestoreReady) {
      preloadImages();
    }
  }, [isFirestoreReady]);

  // Función para cambiar pantallas
  const navigateToScreen = (screenName, params) => {
    if (params?.message !== undefined) setCartaMessage(params.message);
    if (params?.selectedSticker !== undefined) setSelectedSticker(params.selectedSticker);
    setCurrentScreen(screenName);
  };

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        userRef.current = currentUser;
        
        Promise.all([
          NotificationSystem.registerForPushNotifications(),
          NotificationSystem.notifyUserOnline(),
          NotificationSystem.notifyPartnerUserEntered(currentUser.uid, currentUser.displayName)
        ]).catch(err => console.error('Error en notificaciones:', err));
        
        NotificationSystem.setupNotificationListeners();
        
        PushyService.isRegistered().then(isRegistered => {
          if (!isRegistered) {
            PushyService.register().then(pushyToken => {
              
              const userRef = doc(db, 'usuarios', currentUser.uid);
              updateDoc(userRef, { pushyToken }).catch(err => console.error('Error guardando token:', err));
            }).catch(err => console.error('Error registrando Pushy:', err));
          }
        }).catch(err => console.error('Error verificando Pushy:', err));
        
        getDoc(doc(db, 'usuarios', currentUser.uid)).then(userSnap => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            const updates = {};
            if (typeof data.dinero === 'undefined') updates.dinero = 0;
            if (typeof data.nivel === 'undefined') updates.nivel = 1;
            if (typeof data.exp === 'undefined') updates.exp = 0;
            if (typeof data.racha === 'undefined') updates.racha = 1;
            if (typeof data.ultimaActividad === 'undefined') updates.ultimaActividad = new Date().toISOString();
            if (typeof data.fechaUltimaRacha === 'undefined') updates.fechaUltimaRacha = new Date().toISOString();
            if (Object.keys(updates).length > 0) {
              updateDoc(doc(db, 'usuarios', currentUser.uid), updates).catch(err => console.error('Error actualizando usuario:', err));
            }
            asegurarDniUsuario(db, currentUser.uid).catch(err => console.error('Error asignando DNI:', err));
          } else {
            setDoc(doc(db, 'usuarios', currentUser.uid), { 
              dinero: 0, 
              nivel: 1,
              exp: 0,
              racha: 1,
              ultimaActividad: new Date().toISOString(),
              fechaUltimaRacha: new Date().toISOString()
            }).then(() => {
              asegurarDniUsuario(db, currentUser.uid).catch(err => console.error('Error asignando DNI:', err));
            }).catch(err => console.error('Error creando usuario:', err));
          }
        }).catch(e => {
          console.error('Error verificando/creando campos de usuario:', e);
        });
      } else {
        setUser(null);
        userRef.current = null;
      }
      setAuthChecked(true);
      setLoading(false);
    });

    ImagePicker.getMediaLibraryPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        ImagePicker.requestMediaLibraryPermissionsAsync();
      }
    });

    ImagePicker.UIImagePickerControllerDidFinishPickingMediaWithInfo = ({
      mediaTypes: 'Images',
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: false,
      presentationStyle: 'fullScreen',
      base64: false
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 2000;
    let timeoutId;

    const checkFirestoreConnection = async () => {
      if (!isConnected) {
        setIsFirestoreReady(false);
        return;
      }

      try {
        await getDocs(query(collection(db, 'usuarios'), limit(1)));
        setIsFirestoreReady(true);
      } catch (error) {
        console.error('Firestore connection attempt failed:', error.message);
        setIsFirestoreReady(false);
        
        if (retryCount < maxRetries) {
          retryCount++;
          timeoutId = setTimeout(checkFirestoreConnection, retryDelay);
        }
      }
    };

    checkFirestoreConnection();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isConnected]);

  if (loading || !authChecked) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ThemeProvider>
        <SeasonProvider>
          <DebugProvider>
            <NewIndicatorProvider>
              <TrofeosProvider>
                <MusicProvider>
                  <RNStatusBar backgroundColor="#FF6B6B" barStyle="light-content" />
                  
                  {currentScreen === 'intro' && userRef.current && (
                    <View style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0 }}>
                      <Inicio navigation={{ navigate: navigateToScreen }} onReady={() => setInicioReady(true)} />
                    </View>
                  )}
                  
                  {currentScreen === 'intro' && (
                    <Intro 
                      onComplete={() => {
                        setCurrentScreen(userRef.current ? 'main' : 'login');
                      }} 
                      isAuthenticated={!!userRef.current}
                      isConnected={isConnected}
                      inicioReady={inicioReady}
                    />
                  )}
                  
                  {currentScreen === 'login' && (
                    <Login navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'register' && (
                    <Register navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'main' && (
                    <Inicio navigation={{ navigate: navigateToScreen }} onReady={() => setInicioReady(true)} cartaMessage={cartaMessage} selectedSticker={selectedSticker} />
                  )}
                  {currentScreen === 'menu' && (
                    <Menu navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'pistas' && (
                    <Pistas navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'ecos' && (
                    <Ecos navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'buzon' && (
                    <Buzon navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'tienda' && (
                    <Tienda navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'trofeos' && (
                    <Trofeos navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'coleccion' && (
                    <Coleccion navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'stickers' && (
                    <Stickers navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'Temas' && (
                    <Temas navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'seasonInfo' && (
                    <SeasonInfo navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'perfil' && (
                    <Perfil navigation={{ navigate: navigateToScreen }} />
                  )}
                  {currentScreen === 'carta' && (
                    <CartaExpandida navigation={{ navigate: navigateToScreen }} message={cartaMessage} selectedSticker={selectedSticker} />
                  )}
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

