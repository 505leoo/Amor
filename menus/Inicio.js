import React, { useEffect, useRef, memo, useState, createContext, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { LibroJuegos } from '../components/botones';
import Guirladas from '../components/Guirladas';
import Player from '../Player';
import Pareja from '../components/Pareja';
import PanelPerfil from '../components/PanelPerfil';
import RecompensaOverlay from '../components/RecompensaOverlay';
import { useRecompensaDiaria } from '../hooks/useRecompensaDiaria';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';

const OverlayContext = createContext(false);
export const useOverlayActive = () => useContext(OverlayContext);

const REGALO_SEGUNDOS = 2 * 60;

// ─── Recompensas diarias ────────────────────────────────────────────────────
// Hook useRecompensaDiaria maneja:
// - Verificación de fecha al entrar
// - Incremento automático de día si pasó 24h
// - Sincronización con Firestore

// Componente para mostrar recompensa en cajas
const RecompensaCaja = memo(({ dia, esHoy, userData }) => {
  // Día 1: Mostrar Halcón si está desbloqueado, sino monedas
  if (dia === 1) {
    // Si userData aún no cargó, no renderizar nada
    if (userData === null) {
      return null;
    }
    
    // Si tiene animalito: "halcon" pero no tiene halconDesbloqueado, asumir que está desbloqueado
    const tieneHalcon = userData?.halconDesbloqueado || userData?.animalito === 'halcon';
    
    if (tieneHalcon) {
      return (
        <View style={[styles.animalitoMiniWrap]}>
          <Image
            source={require('../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png')}
            style={esHoy ? styles.animalitoMiniContainer : styles.animalitoMiniContainerSmall}
            contentFit="contain"
            cachePolicy="memory"
          />
        </View>
      );
    } else {
      // Si no tiene Halcón desbloqueado, mostrar monedas
      return <Text style={esHoy ? styles.cajaEmojiHoy : styles.cajaEmoji}>🪙</Text>;
    }
  }
  
  // Para otros días, mostrar emoji de moneda
  return <Text style={esHoy ? styles.cajaEmojiHoy : styles.cajaEmoji}>🪙</Text>;
});

// Componente para mostrar contador "24h 1m" para siguiente recompensa
// Cálculo estático del tiempo restante para evitar re-renders frecuentes
const getNextRecordTime = (ultimoReclamo) => {
  if (!ultimoReclamo) return 'Sin Reclamar';
  
  const fechaReclamo = ultimoReclamo.toDate ? ultimoReclamo.toDate() : new Date(ultimoReclamo);
  const siguienteReclamo = new Date(fechaReclamo);
  siguienteReclamo.setHours(siguienteReclamo.getHours() + 24);
  
  const diferenciaMs = siguienteReclamo.getTime() - new Date().getTime();
  if (diferenciaMs <= 0) return '00h 00m';
  
  const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
  const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas.toString().padStart(2, '0')}h ${minutos.toString().padStart(2, '0')}m`;
};

// Componente para mostrar contador "24h 1m" para siguiente recompensa
const ContadorReinicio = memo(({ overlayActive }) => {
  const { ultimoReclamo } = useRecompensaDiaria();
  const [tiempoRestante, setTiempoRestante] = useState('');

  useEffect(() => {
    if (overlayActive) return; // No actualizar durante overlay
    
    // Actualizar solo cada 60 segundos en lugar de cada segundo
    setTiempoRestante(getNextRecordTime(ultimoReclamo));
    const interval = setInterval(() => {
      setTiempoRestante(getNextRecordTime(ultimoReclamo));
    }, 60000);

    return () => clearInterval(interval);
  }, [ultimoReclamo, overlayActive]);

  return (
    <Text style={styles.contadorReinicio}>{tiempoRestante}</Text>
  );
});

const CajasRecompensa = memo(({ onOverlayChange, overlayActive }) => {
  const { diaActual, puedeReclamar, loading, reclamar, userData } = useRecompensaDiaria({ paused: overlayActive });
  const [showRecompensaOverlay, setShowRecompensaOverlay] = useState(false);
  const [reclamando, setReclamando] = useState(false);
  const [yaReclamadoHoy, setYaReclamadoHoy] = useState(false);
  
  useEffect(() => {
    onOverlayChange?.(showRecompensaOverlay);
  }, [showRecompensaOverlay]);
  
  if (loading) return null;

  const handleReclamar = async () => {
    if (reclamando || yaReclamadoHoy) return;
    
    setReclamando(true);
    setYaReclamadoHoy(true);
    try {
      await reclamar();
      setShowRecompensaOverlay(true);
    } catch (error) {
      console.error('Error al reclamar:', error);
      setYaReclamadoHoy(false);
    } finally {
      setReclamando(false);
    }
  };

  let dias = [];
  if (diaActual === 1) {
    dias = [1, 2, 3, 4, 5];
  } else if (diaActual === 2) {
    dias = [1, 2, 3, 4, 5];
  } else {
    dias = [diaActual - 2, diaActual - 1, diaActual, diaActual + 1, diaActual + 2];
  }

  return (
    <View style={styles.cajasWrap}>
      {dias.map((dia, index) => {
        let esHoy = false;
        if (diaActual === 1) {
          esHoy = index === 0;
        } else if (diaActual === 2) {
          esHoy = index === 1;
        } else {
          esHoy = index === 2;
        }
        
        const estado = (esHoy ? (puedeReclamar ? 'hoy' : 'reclamado') : 
                       (dia < diaActual ? 'pasado' : 'futuro'));

        return (
          <TouchableOpacity
            key={dia}
            activeOpacity={esHoy && puedeReclamar && !yaReclamadoHoy ? 0.7 : 1}
            onPress={esHoy && puedeReclamar && !yaReclamadoHoy ? handleReclamar : undefined}
            style={[
              styles.caja,
              estado === 'pasado'   && styles.cajaPasado,
              estado === 'hoy'      && styles.cajaHoy,
              estado === 'reclamado'&& styles.cajaReclamado,
            ]}
          >
            {esHoy ? (
              <>
                <Text style={styles.cajaDiaHoy}>Hoy</Text>
                <RecompensaCaja dia={diaActual} esHoy={true} userData={userData} />
                <Text style={styles.cajaCantidadHoy}>{diaActual === 1 ? 'x1' : '250'}</Text>
                {puedeReclamar && !showRecompensaOverlay && (
                  <View style={styles.cajaLottieWrap}>
                    <LottieView
                      source={require('../assets/Lottie/reward.json')}
                      autoPlay
                      loop
                      style={styles.cajaLottie}
                      pointerEvents="none"
                    />
                  </View>
                )}
                {!puedeReclamar && (
                  <View style={styles.badgeReclamado}>
                    <Text style={styles.badgeTilde}>✓</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.cajaDia}>Día {dia}</Text>
                <RecompensaCaja dia={dia} esHoy={false} userData={userData} />
                <Text style={styles.cajaCantidad}>{dia === 1 ? 'x1' : '250'}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
      <ContadorReinicio overlayActive={overlayActive} />
      <RecompensaOverlay
        visible={showRecompensaOverlay}
        onClose={() => setShowRecompensaOverlay(false)}
      >
        <View style={overlayStyles.overlayContent}>
          {diaActual === 1 ? (
            <>
              <View style={overlayStyles.animalitoGrandeWrap}>
                <Image
                  source={require('../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png')}
                  style={overlayStyles.animalitoGrandeContainer}
                  contentFit="contain"
                  cachePolicy="memory"
                />
              </View>
              <Text style={overlayStyles.overlayTexto}>¡Nueva mascota desbloqueada!</Text>
              <Text style={overlayStyles.overlayNombre}>Halcón</Text>
            </>
          ) : (
            <>
              <Text style={overlayStyles.overlayEmoji}>🪙</Text>
              <Text style={overlayStyles.overlayCantidad}>+250</Text>
              <Text style={overlayStyles.overlayTexto}>¡Recompensa diaria!</Text>
            </>
          )}
        </View>
      </RecompensaOverlay>
    </View>
  );
});

const s = StyleSheet.create({
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  overlayEmoji: {
    fontSize: 60,
    marginBottom: 1,
  },
  overlayCantidad: {
    fontSize: 42,
    color: '#FFD23E',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 6,
  },
  overlayTexto: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    letterSpacing: 1,
  },
});

// Cálculo de tiempo restante fuera del componente para evitar re-renders
const getRegaloTime = () => {
  const now = new Date();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);
  
  const msRestantes = mañana.getTime() - now.getTime();
  const segundos = Math.max(0, Math.floor(msRestantes / 1000));
  return segundos;
};

const RegaloDaily = memo(({ overlayActive }) => {
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (overlayActive) return; // No actualizar durante overlay
    
    // Actualizar cada 60 segundos para minimizar re-renders
    const id = setInterval(() => {
      // Trigger re-render
    }, 60000);
    return () => clearInterval(id);
  }, [overlayActive]);

  const segundos = getRegaloTime();
  const listo = segundos <= 0;
  const timerText = `${Math.floor(segundos / 60)}m ${segundos % 60}s`;

  return (
    <TouchableOpacity
      onPress={() => listo && setShowReward(true)}
      activeOpacity={listo ? 0.75 : 1}
      style={rd.wrap}
    >
      <Image
        source={require('../assets/inicio/regalodiario.png')}
        style={rd.img}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <Text style={listo ? rd.timerListo : rd.timer}>
        {listo ? '♥ abrir' : timerText}
      </Text>
    </TouchableOpacity>
  );
}, (prev, next) => {
  return prev.overlayActive === next.overlayActive;
});

const rd = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -2 }],
    alignItems: 'center',
    zIndex: 150,
    elevation: 150,
  },
  img: {
    top: -160,
    left: -128,
    width: 330,
    height: 300,
  },
  timer: {
    fontSize: 8, color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8, marginTop: 3, fontStyle: 'italic',
  },
  timerListo: {
    fontSize: 9, color: '#f2b8cb',
    letterSpacing: 1, marginTop: 3, fontWeight: '700',
  },
});

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IMG_RATIO = 1616 / 973;
const IMG_H = SCREEN_W / IMG_RATIO;
const IMG_TOP = (SCREEN_H - IMG_H) / 2;

const MoneyMenu = memo(() => {
  const [money, setMoney] = useState(0);
  const [diamonds, setDiamonds] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    const userRef = doc(db, 'usuarios', uid);
    return onSnapshot(userRef, snapshot => {
      const data = snapshot.data() || {};
      const value = data.dinero;
      setMoney(typeof value === 'number' ? value : 0);
      if (typeof data.diamante === 'number') setDiamonds(data.diamante);
      else {
        setDiamonds(0);
        setDoc(userRef, { diamante: 0 }, { merge: true }).catch(() => {});
      }
    }, () => setMoney(0));
  }, []);

  return (
    <View style={styles.resourcesRow}>
      <View style={styles.moneyMenu}>
        <Text style={styles.moneyCoin}>🪙</Text>
        <Text style={styles.moneyValue}>{money.toLocaleString('es-AR')}</Text>
        <TouchableOpacity style={styles.moneyAdd} activeOpacity={0.7}><Text style={styles.moneyAddText}>+</Text></TouchableOpacity>
      </View>
      <View style={styles.diamondMenu}>
        <MaterialIcons name="diamond" size={15} color="#76552f" style={styles.moneyCoin} />
        <Text style={styles.moneyValue}>{diamonds.toLocaleString('es-AR')}</Text>
        <TouchableOpacity style={styles.moneyAdd} activeOpacity={0.7}><Text style={styles.moneyAddText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
});

const QuickMenu = memo(({ navigation }) => {
  const items = [
    { icon: 'mail-outline', label: 'Buzón', action: () => navigation?.navigate('buzon') },
    { icon: 'notifications-none', label: 'Actualizaciones', action: () => global.showToast?.({ text1: 'Actualizaciones próximamente', type: 'info' }) },
    { icon: 'card-giftcard', label: 'Recompensas', action: () => global.showToast?.({ text1: 'Recompensas', type: 'info' }) },
    { icon: 'settings', label: 'Configuración', action: () => global.showToast?.({ text1: 'Configuración próximamente', type: 'info' }) },
  ];
  return <View style={styles.quickMenu}>{items.map((item, index) => <React.Fragment key={item.label}><TouchableOpacity style={styles.quickItem} onPress={item.action} activeOpacity={0.7} accessibilityLabel={item.label}><MaterialIcons name={item.icon} size={17} color="#76552f" /></TouchableOpacity>{index < items.length - 1 && <Text style={styles.quickDivider}>|</Text>}</React.Fragment>)}</View>;
});

const Inicio = memo(({ navigation, onReady, style }) => {
  const [nivelJuego, setNivelJuego] = useState(1);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    return onSnapshot(doc(db, 'usuarios', uid), snap => {
      const nivel = snap.data()?.juegos?.conexiones?.nivel;
      if (Number.isFinite(nivel)) setNivelJuego(nivel);
    });
  }, []);
  const [overlayActive, setOverlayActive] = useState(false);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <OverlayContext.Provider value={overlayActive}>
      <View style={[styles.container, style]}>
        <Image
          source={require('../assets/inicio/inicio.png')}
          style={{
            position: 'absolute',
            width: SCREEN_W,
            height: IMG_H,
            top: IMG_TOP,
          }}
          contentFit="fill"
          cachePolicy="memory-disk"
        />
        <Guirladas isPaused={overlayActive} />
        <StatusBar hidden={true} />
        <MoneyMenu />
        <QuickMenu navigation={navigation} />
        <Player containerStyle={styles.player} disabled={overlayActive} />
        <TouchableOpacity style={styles.changeButton} onPress={() => navigation?.navigate('animalitos')} activeOpacity={0.78}>
          <MaterialIcons name="swap-horiz" size={20} color="#c58b2d" />
          <Text style={styles.changeButtonText}>Cambiar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skinButton} onPress={() => navigation?.navigate('animalitos', { mode: 'skins' })} activeOpacity={0.78}>
          <MaterialIcons name="checkroom" size={21} color="#c58b2d" />
          <Text style={styles.skinButtonText}>Skin</Text>
        </TouchableOpacity>
        <Pareja navigation={navigation} isPaused={overlayActive} />
        <PanelPerfil navigation={navigation} />
        <View style={styles.canjearWrap}>
          <TouchableOpacity style={styles.canjearBtn} activeOpacity={0.75} onPress={() => navigation?.navigate('canjear')}>
            <View style={styles.canjearIcon}><MaterialIcons name="confirmation-number" size={20} color="#f8edf4" /></View>
            <View style={styles.canjearInfo}><Text style={styles.canjearText}>CANJEAR</Text><Text style={styles.canjearSubtext}>Código y QR</Text></View>
            <MaterialIcons name="chevron-right" size={22} color="#76552f" />
          </TouchableOpacity>
        </View>
        <View style={styles.temporadasQuickWrap}>
          <TouchableOpacity style={styles.temporadasQuickBtn} activeOpacity={0.75} onPress={() => navigation?.navigate('temporadas')}>
            <View style={styles.temporadasQuickIcon}><MaterialIcons name="event" size={20} color="#fff8dc" /></View>
            <View style={styles.canjearInfo}><Text style={styles.temporadasQuickTitle}>TEMPORADAS</Text><Text style={styles.temporadasQuickSub}>Eventos y recompensas</Text></View>
            <MaterialIcons name="chevron-right" size={21} color="#76552f" />
          </TouchableOpacity>
        </View>
        <View style={styles.comercianteQuickWrap}>
          <TouchableOpacity style={styles.comercianteQuickBtn} activeOpacity={0.75} onPress={() => navigation?.navigate('comerciante')}>
            <MaterialIcons name="storefront" size={19} color="#a56b16" />
            <View style={styles.comercianteInfo}><Text style={styles.comercianteTitle}>COMERCIANTE</Text><Text style={styles.comercianteSub}>Intercambia objetos</Text></View>
            <MaterialIcons name="chevron-right" size={21} color="#a56b16" />
          </TouchableOpacity>
        </View>
        <RegaloDaily overlayActive={overlayActive} />

        <CajasRecompensa onOverlayChange={setOverlayActive} overlayActive={overlayActive} />
        <TouchableOpacity style={styles.jugarBtn} activeOpacity={0.82} onPress={() => {
          const isAdmin = auth.currentUser?.email?.toLowerCase() === 'admin@gmail.com';
          navigation?.navigate(isAdmin ? 'juegos' : 'conexiones');
        }}>
          <Image source={require('../assets/inicio/jugar.png')} style={styles.jugarImagen} contentFit="contain" cachePolicy="memory-disk" transition={0} />
          <View style={styles.jugarContenido}>
            <MaterialIcons name="extension" size={21} color="#fff1b8" />
            <View>
              <Text style={styles.jugarTexto}>JUGAR</Text>
              <Text style={styles.jugarDescripcion}>Eres nivel {nivelJuego}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </OverlayContext.Provider>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  moneyMenu: { position: 'absolute', top: 7, left: '50%', transform: [{ translateX: -116 }], width: 110, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 15, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 8, elevation: 12, zIndex: 220 },
  resourcesRow: { position: 'absolute', top: 0, left: 0, right: 0, height: 38, zIndex: 220, elevation: 12 },
  diamondMenu: { position: 'absolute', top: 7, left: '50%', transform: [{ translateX: 6 }], width: 110, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 15, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 8, elevation: 12, zIndex: 220 },
  moneyCoin: { fontSize: 13, marginRight: 2 },
  moneyValue: { minWidth: 46, color: '#63482d', fontFamily: 'Delius', fontSize: 12, fontWeight: '900', textAlign: 'center', letterSpacing: 0.2 },
  moneyAdd: { width: 17, height: 20, marginLeft: 0, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -1 }] },
  moneyAddText: { color: '#76552f', fontSize: 17, lineHeight: 19, fontWeight: '800' },
  quickMenu: { position: 'absolute', top: 7, right: 45, height: 32, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 7, elevation: 12, zIndex: 220 },
  quickItem: { width: 27, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  quickDivider: { color: '#b88a48', fontSize: 17, lineHeight: 20, fontWeight: '400', opacity: 0.8 },
  player: {
    position: 'absolute',
    bottom: 76,
    left: '39.55%',
    width: 90,
    height: 90,
  },
  jugarBtn: { position: 'absolute', right: 18, bottom: -5, width: 158, height: 94, alignItems: 'center', justifyContent: 'center', zIndex: 30, elevation: 12 },
  jugarImagen: { position: 'absolute', width: '104%', height: '104%' },
  jugarContenido: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, transform: [{ translateY: -8 }] },
  jugarTexto: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(54,35,22,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  jugarDescripcion: { color: 'rgba(255,248,220,0.82)', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '700', marginTop: -1 },
  skinButton: { position: 'absolute', left: '61%', bottom: 78, width: 36, height: 41, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 500, zIndex: 500 },
  skinButtonText: { color: '#76552f', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', marginTop: 1 },
  changeButton: { position: 'absolute', left: '35%', bottom: 78, width: 36, height: 41, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 500, zIndex: 500 },
  changeButtonText: { color: '#76552f', fontFamily: 'Delius', fontSize: 6, fontWeight: '900', marginTop: 1 },
  canjearWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -350 }, { translateY: -70 }],
    zIndex: 10,
  },
  canjearBtn: {
    width: 150, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5,
    borderRadius: 8, backgroundColor: '#e4d5df', borderWidth: 1, borderColor: '#b995af',
    shadowColor: '#513c55', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 7, elevation: 9,
  },
  canjearText: {
    fontSize: 8, fontWeight: '900', color: '#593b57', letterSpacing: 0.2, fontFamily: 'Delius',
  },
  canjearIcon: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#80557f', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3e8ed' },
  canjearInfo: { flex: 1, marginLeft: 6 },
  canjearSubtext: { color: '#704b6b', fontFamily: 'Delius', fontSize: 6, fontWeight: '700', marginTop: 0 },
  temporadasQuickWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -350 }, { translateY: -17 }], zIndex: 10 },
  comercianteQuickWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -350 }, { translateY: 34 }], zIndex: 10 },
  temporadasQuickBtn: { width: 150, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 8, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 7, elevation: 9 },
  temporadasQuickIcon: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#b07a43', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff0c5' },
  temporadasQuickTitle: { color: '#65492f', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.15 },
  temporadasQuickSub: { color: '#80613d', fontFamily: 'Delius', fontSize: 6, fontWeight: '700', marginTop: 0 },
  comercianteQuickBtn: { width: 150, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, borderRadius: 8, backgroundColor: '#f3e4c2', borderWidth: 1, borderColor: '#d7b46a', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 7, elevation: 9 },
  comercianteInfo: { marginLeft: 7 },
  comercianteTitle: { color: '#a56b16', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' },
  comercianteSub: { color: '#88642b', fontFamily: 'Delius', fontSize: 6, fontWeight: '700' },

  vestuarioBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  cajasWrap: {
    position: 'absolute',
    bottom: '52.5%',
    left: 10,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    zIndex: 150,
    elevation: 150,
  },
  caja: {
    width: 44,
    height: 65,
    borderWidth: 1.2,
    borderColor: 'rgba(87, 84, 84, 0.2)',
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  cajaPasado: {
  },
  cajaHoy: {
    borderColor: 'rgba(87, 84, 84, 0.11)',
    borderWidth: 1.8,
    backgroundColor: 'rgba(255, 210, 62, 0.72)',
    width: 60,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cajaReclamado: {
    borderColor: 'rgba(87, 84, 84, 0.11)',
    borderWidth: 1.8,
    backgroundColor: 'rgba(255, 210, 62, 0.72)',
    width: 60,
    height: 80,
  },
  cajaDia: {
    fontSize: 7,
    color: 'rgba(87, 84, 84,0.7)',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -1,
  },
  cajaDiaHoy: { //Caja día "Hoy"
    color: '#585358',
    fontWeight: '700',
    fontSize: 9,
    marginTop: -20,
  },
  cajaEmoji: {
    fontSize: 18,
    lineHeight: 25,
    marginTop: 2,
  },
  cajaEmojiHoy: { //Caja Emoji "Hoy"
    fontSize: 20.5,
    lineHeight: 25,
    top: 2,
    zIndex: 20,
  },
  cajaCantidad: { //cantidad cuando no es "hoy" sino "día"
    fontSize: 9,
    color: 'rgba(87,84,84,0.8)',
    fontWeight: '600',
    marginTop: 1,
  },
  emojiLottieWrap: {
    position: 'absolute',
    width: 80,
    height: 80,
    top: -5,
    zIndex: 5,
  },
  cajaLottie: {
    width: '100%',
    height: '100%',
  },
  cajaLottieWrap: {
    position: 'absolute',
    width: 80,
    height: 80,
    top: -5,
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseAnimation: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 210, 62, 0.4)',
    borderWidth: 2,
    borderColor: 'rgba(255, 210, 62, 0.8)',
  },
  cajaCantidadHoy: {
    fontSize: 9,
    color: 'rgba(87,84,84,0.8)',
    fontWeight: '600',
    position: 'absolute',
    bottom: 9,
  },
  badgeReclamado: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
  },
  badgeTilde: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: -0.5,
  },
  contadorReinicio: {
    position: 'absolute',
    bottom: -18,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: 'rgba(87, 84, 84, 0.6)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  animalitoMiniWrap: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
  },
  animalitoMiniContainer: {
    width: 48,
    height: 48,
    position: 'relative',
    zIndex: 25,
    top: 5,
  },
  animalitoMiniContainerSmall: {//Animal cuando no es "Hoy", sino reward de un "Día"
    width: 36,
    height: 36,
    position: 'relative',
    marginLeft: 0,
    marginTop: 0,
    zIndex: 25,
  },
  animalitoMiniImage: {
    width: '100%',
    height: '100%',
  },
  animalitoMiniEmoji: {
    fontSize: 22,
  },
});

const overlayStyles = StyleSheet.create({
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  overlayEmoji: { //emoji de overlay al reclamar
    fontSize: 72,
    marginBottom: 8,
    marginTop: 5,
    top: 15
  },
  overlayCantidad: {
    fontSize: 48,
    color: '#FFD23E',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 6,
  },
  overlayTexto: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    letterSpacing: 1,
  },
  animalitoGrandeWrap: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  animalitoGrandeContainer: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  animalitoGrandeImage: {
    width: '100%',
    height: '100%',
  },
  overlayNombre: {
    fontSize: 22,
    color: '#FFD23E',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: 4,
    letterSpacing: 1,
  },
});

export default Inicio;
