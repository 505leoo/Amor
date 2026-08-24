import React, { useEffect, useRef, memo, useState, createContext, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Dimensions, Modal, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { LibroJuegos } from '../components/botones';
import Guirladas from '../components/Guirladas';
import Player from '../Player';
import Pareja from '../components/Pareja';
import PanelPerfil from '../components/PanelPerfil';
import RecompensaOverlay from '../components/RecompensaOverlay';
import { getRecompensaDiariaDelDia, useRecompensaDiaria } from '../hooks/useRecompensaDiaria';
import { auth, db } from '../firebaseConfig';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserDocument } from '../hooks/useUserDocument';
import { BuzonModal } from './Buzon';
import { AvisosModal, hayAvisosPendientes } from './Avisos';
import { RecompensasModal } from './Recompensas';
import { ConfiguracionModal } from './Configuracion';
import Eventos from './Eventos';
import { actualizarPasoTutorial } from '../components/Tutorial';
import MisionesDiarias from '../components/MisionesDiarias';
import { InventarioModal } from './Inventario';
import { useMisiones } from '../MisionesContext';
import * as Haptics from 'expo-haptics';

const OverlayContext = createContext(false);
export const useOverlayActive = () => useContext(OverlayContext);

const SiguientePaso = memo(({ icono, titulo, detalle, insignia, onPress }) => {
  const pulso = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulso, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulso, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulso]);
  const activar = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };
  return (
    <TouchableOpacity style={styles.siguientePaso} onPress={activar} activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={`${titulo}. ${detalle}`}>
      <View style={[styles.siguienteLuz, styles.siguienteLuzUno]} /><View style={[styles.siguienteLuz, styles.siguienteLuzDos]} />
      <Animated.View style={[styles.siguientePasoIcono, { transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}><MaterialIcons name={icono} size={15} color="#fff8dc" /></Animated.View>
      <View style={styles.siguientePasoInfo}>
        <Text style={styles.siguientePasoEtiqueta}>SIGUIENTE JUGADA</Text>
        <Text style={styles.siguientePasoTitulo} numberOfLines={1}>{titulo}</Text>
        <Text style={styles.siguientePasoDetalle} numberOfLines={1}>{detalle}</Text>
      </View>
      <Animated.View style={[styles.siguientePasoInsignia, { opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) }]}><Text style={styles.siguientePasoInsigniaTexto}>{insignia}</Text></Animated.View>
    </TouchableOpacity>
  );
});

const REGALO_SEGUNDOS = 2 * 60;
// ─── Recompensas diarias ────────────────────────────────────────────────────
// Hook useRecompensaDiaria maneja:
// - Verificación de fecha al entrar
// - Incremento automático de día si pasó 24h
// - Sincronización con Firestore

// Componente para mostrar recompensa en cajas
const RecompensaCaja = memo(({ dia, esHoy, userData }) => {
  if (userData === null) return null;
  const recompensa = getRecompensaDiariaDelDia(dia, userData);
  if (recompensa.tipo === 'halcon') {
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
  }
  if (recompensa.tipo === 'cartasAnimalitos') {
    return <View style={[styles.cartaRegalo, esHoy && styles.cartaRegaloHoy]}><Text style={[styles.cartaRegaloMarca, esHoy && styles.cartaRegaloMarcaHoy]}>✦</Text></View>;
  }
  if (recompensa.tipo === 'diamantes') {
    return <MaterialIcons name="diamond" size={esHoy ? 23 : 20} color="#32b9d5" style={esHoy ? styles.cajaDiamanteHoy : styles.cajaDiamante} />;
  }
  return <Text style={esHoy ? styles.cajaEmojiHoy : styles.cajaEmoji}>{recompensa.emoji}</Text>;
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
  const recompensaDeHoy = getRecompensaDiariaDelDia(diaActual, userData);

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
                <Text style={styles.cajaCantidadHoy}>{recompensaDeHoy.etiqueta}</Text>
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
                <Text style={styles.cajaCantidad}>{getRecompensaDiariaDelDia(dia, userData).etiqueta}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
      <ContadorReinicio overlayActive={overlayActive} />
      <RecompensaOverlay
        visible={showRecompensaOverlay}
        onClose={() => {
          setShowRecompensaOverlay(false);
          actualizarPasoTutorial(auth.currentUser?.uid, 1).catch(() => {});
        }}
      >
        <View style={overlayStyles.overlayContent}>
          {recompensaDeHoy.tipo === 'halcon' ? (
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
              {recompensaDeHoy.tipo === 'cartasAnimalitos'
                ? <View style={overlayStyles.cartaRegaloGrande}><Text style={overlayStyles.cartaRegaloMarcaGrande}>✦</Text></View>
                : recompensaDeHoy.tipo === 'diamantes'
                  ? <MaterialIcons name="diamond" size={72} color="#39c7e6" style={overlayStyles.overlayDiamante} />
                : <Text style={overlayStyles.overlayEmoji}>{recompensaDeHoy.emoji}</Text>}
              <Text style={overlayStyles.overlayCantidad}>{recompensaDeHoy.etiqueta}</Text>
              <Text style={overlayStyles.overlayTexto}>¡Recompensa diaria!</Text>
            </>
          )}
        </View>
      </RecompensaOverlay>
    </View>
  );
});

const TutorialInicio = ({ navigation }) => {
  const { data } = useUserDocument(value => ({ tutorialPaso: value?.tutorialPaso }));
  const [misionesAbiertas, setMisionesAbiertas] = useState(false);
  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const paso = Number(data?.tutorialPaso || 0);
  return <View style={styles.container}>
    <Image source={require('../assets/inicio/inicio.png')} style={{ position: 'absolute', width: SCREEN_W, height: IMG_H, top: IMG_TOP }} contentFit="fill" />
    <RegaloDaily overlayActive={false} />
    <CajasRecompensa onOverlayChange={() => {}} overlayActive={false} />
    {paso >= 1 && <TouchableOpacity style={[styles.changeButton, styles.tutorialChangeButton, paso >= 2 && paso !== 5 && styles.tutorialDisabledButton]} onPress={() => (paso === 1 || paso === 5) && navigation?.navigate('animalitos')} disabled={paso >= 2 && paso !== 5} activeOpacity={0.78}>
      <MaterialIcons name="swap-horiz" size={20} color={paso >= 2 && paso !== 5 ? '#aaa49a' : '#c58b2d'} />
      <Text style={[styles.changeButtonText, paso >= 2 && paso !== 5 && styles.tutorialDisabledText]}>Cambiar</Text>
    </TouchableOpacity>}
    {paso >= 2 && <>
      <TouchableOpacity style={[styles.accesoInicioBtn, styles.tutorialMissionButton, paso >= 3 && styles.tutorialDisabledButton]} onPress={() => paso === 2 && setMisionesAbiertas(true)} disabled={paso >= 3} activeOpacity={0.75}>
        <MaterialIcons name="assignment" size={22} color={paso >= 3 ? '#aaa49a' : '#c46d83'} />
        <Text style={[styles.accesoInicioText, paso >= 3 && styles.tutorialDisabledText]}>Misiones</Text>
      </TouchableOpacity>
      <MisionesDiarias externo abierto={misionesAbiertas} onCerrar={() => setMisionesAbiertas(false)} />
    </>}
    {paso >= 3 && <View style={styles.tutorialMerchantWrap}>
      <TouchableOpacity style={[styles.comercianteQuickBtn, paso >= 4 && styles.tutorialDisabledButton]} onPress={() => paso === 3 && navigation?.navigate('comerciante')} disabled={paso >= 4} activeOpacity={0.78}>
        <View style={[styles.comercianteQuickIcon, paso >= 4 && styles.tutorialDisabledIcon]}><MaterialIcons name="storefront" size={19} color={paso >= 4 ? '#aaa49a' : '#f4fff0'} /></View>
        <View style={styles.comercianteInfo}><Text style={[styles.comercianteTitle, paso >= 4 && styles.tutorialDisabledText]}>COMERCIANTE</Text><Text style={[styles.comercianteSub, paso >= 4 && styles.tutorialDisabledText]}>Intercambia objetos</Text></View>
        <MaterialIcons name="chevron-right" size={21} color={paso >= 4 ? '#aaa49a' : '#466a50'} />
      </TouchableOpacity>
    </View>}
    {paso >= 4 && <>
      <TouchableOpacity style={[styles.accesoInicioBtn, styles.tutorialInventoryButton, paso !== 4 && styles.tutorialDisabledButton]} onPress={() => paso === 4 && setInventarioAbierto(true)} disabled={paso !== 4} activeOpacity={0.75}>
        <MaterialIcons name="inventory-2" size={22} color={paso !== 4 ? '#aaa49a' : '#b87945'} />
        <Text style={[styles.accesoInicioText, paso !== 4 && styles.tutorialDisabledText]}>Inventario</Text>
      </TouchableOpacity>
      <InventarioModal visible={inventarioAbierto} onClose={() => { setInventarioAbierto(false); actualizarPasoTutorial(auth.currentUser?.uid, 5).catch(() => {}); }} />
    </>}
  </View>;
};

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
const REGALO_DIARIO_IMAGE = require('../assets/inicio/regalodiario.png');

const getRegaloTime = (nowMs = Date.now()) => {
  const now = new Date(nowMs);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);
  
  const msRestantes = mañana.getTime() - now.getTime();
  const segundos = Math.max(0, Math.floor(msRestantes / 1000));
  return segundos;
};

const RegaloDaily = memo(({ overlayActive }) => {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (overlayActive) return; // No actualizar durante overlay
    const id = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(id);
  }, [overlayActive]);

  const segundos = getRegaloTime(ahora);
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const timerText = horas > 0 ? `${horas}h ${minutos}m` : `${minutos} min`;

  return (
    <View
      style={rd.wrap}
      pointerEvents="none"
    >
      <Image
        source={REGALO_DIARIO_IMAGE}
        style={rd.img}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
      />
      <View style={rd.info}>
        <Text style={rd.title}>REGALO DIARIO</Text>
        <Text style={rd.timer}>Disponible en {timerText}</Text>
      </View>
    </View>
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
  info: { alignItems: 'center', marginTop: 1 },
  title: { color: '#f2b8cb', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  timer: {
    fontSize: 7, color: 'rgba(255,255,255,0.62)',
    letterSpacing: 0.4, marginTop: 1, fontStyle: 'italic',
  },
});

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IMG_RATIO = 1616 / 973;
const IMG_H = SCREEN_W / IMG_RATIO;
const IMG_TOP = (SCREEN_H - IMG_H) / 2;

const MoneyMenu = memo(() => {
  const { data: userData, loaded, uid } = useUserDocument(
    data => ({ dinero: data?.dinero, diamantes: data?.diamantes, diamanteLegacy: data?.diamante }),
    undefined,
    (a, b) => a?.dinero === b?.dinero && a?.diamantes === b?.diamantes && a?.diamanteLegacy === b?.diamanteLegacy,
  );
  const money = typeof userData?.dinero === 'number' ? userData.dinero : 0;
  const diamonds = typeof userData?.diamantes === 'number' ? userData.diamantes : (typeof userData?.diamanteLegacy === 'number' ? userData.diamanteLegacy : 0);

  useEffect(() => {
    if (loaded && uid && typeof userData?.diamantes !== 'number') {
      setDoc(doc(db, 'usuarios', uid), { diamantes: diamonds }, { merge: true }).catch(() => {});
    }
  }, [loaded, uid, userData?.diamantes, diamonds]);

  return (
    <View style={styles.resourcesRow}>
      <View style={styles.moneyMenu} accessibilityLabel={`${money} monedas`}>
        <Text style={styles.moneyCoin}>🪙</Text>
        <Text style={styles.moneyValue}>{loaded ? money.toLocaleString('es-AR') : ''}</Text>
      </View>
      <View style={styles.resourceDivider} />
      <View style={styles.diamondMenu} accessibilityLabel={`${diamonds} diamantes`}>
        <MaterialIcons name="diamond" size={11} color="#32b9d5" style={styles.moneyCoin} />
        <Text style={styles.moneyValue}>{loaded ? diamonds.toLocaleString('es-AR') : ''}</Text>
      </View>
    </View>
  );
});

const QuickMenu = memo(() => {
  const [seccionActiva, setSeccionActiva] = useState(null);
  const [buzonAbierto, setBuzonAbierto] = useState(false);
  const [avisosAbiertos, setAvisosAbiertos] = useState(false);
  const [recompensasAbiertas, setRecompensasAbiertas] = useState(false);
  const [configuracionAbierta, setConfiguracionAbierta] = useState(false);
  const [buzonNuevo, setBuzonNuevo] = useState(false);
  const [recompensasNuevas, setRecompensasNuevas] = useState(false);
  const [avisosNuevos, setAvisosNuevos] = useState(false);
  const ultimoBuzonRef = useRef(0);
  const ultimaInvitacionRef = useRef(0);
  const ultimoRegaloRef = useRef(0);
  const vistoBuzonRef = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    const buzonKey = `indicador_buzon_${uid}`;
    const avisosKey = `indicador_avisos_${uid}`;
    let activo = true;
    const actualizarBuzon = () => {
      if (!activo || vistoBuzonRef.current === null) return;
      const ultimo = Math.max(ultimoBuzonRef.current, ultimaInvitacionRef.current);
      setBuzonNuevo(ultimo > vistoBuzonRef.current);
    };
    AsyncStorage.getItem(buzonKey).then(valor => {
      if (!activo) return;
      vistoBuzonRef.current = Number(valor) || Date.now();
      actualizarBuzon();
    });
    AsyncStorage.getItem(avisosKey).then(valor => {
      if (activo) setAvisosNuevos(hayAvisosPendientes(valor));
    });
    AsyncStorage.getItem(`indicador_recompensas_${uid}`).then(valor => {
      if (activo) {
        const visto = Number(valor) || Date.now();
        global.ultimoRecompensaVisto = { ...(global.ultimoRecompensaVisto || {}), [uid]: visto };
        setRecompensasNuevas(ultimoRegaloRef.current > visto);
      }
    });
    const obtenerMillis = valor => valor?.toMillis?.() || (valor?.seconds ? valor.seconds * 1000 : 0);
    const unsubBuzon = onSnapshot(query(collection(db, 'buzon'), where('para', '==', uid)), snap => {
      ultimoBuzonRef.current = snap.docs.reduce((ultimo, item) => Math.max(ultimo, obtenerMillis(item.data().creadoEn)), 0);
      actualizarBuzon();
    }, () => {});
    const unsubInvitaciones = onSnapshot(query(collection(db, 'invitaciones_pareja'), where('para', '==', uid), where('estado', '==', 'pendiente')), snap => {
      ultimaInvitacionRef.current = snap.docs.reduce((ultimo, item) => Math.max(ultimo, obtenerMillis(item.data().timestamp)), 0);
      actualizarBuzon();
    }, () => {});
    const unsubRegalos = onSnapshot(query(collection(db, 'regalos_pareja'), where('para', '==', uid), where('reclamado', '==', false)), snap => {
      ultimoRegaloRef.current = snap.docs.reduce((ultimo, item) => Math.max(ultimo, obtenerMillis(item.data().creadoEn)), 0);
      setRecompensasNuevas(snap.docs.length > 0);
    }, () => {});
    return () => {
      activo = false;
      unsubBuzon();
      unsubInvitaciones();
      unsubRegalos();
    };
  }, []);

  const abrirBuzon = async () => {    const uid = auth.currentUser?.uid;
    if (uid) await AsyncStorage.setItem(`indicador_buzon_${uid}`, String(Date.now()));
    vistoBuzonRef.current = Date.now();
    setBuzonNuevo(false);
    setBuzonAbierto(true);
  };

  const abrirAvisos = () => setAvisosAbiertos(true);
  const abrirRecompensas = async () => {
    const uid = auth.currentUser?.uid;
    const visto = Date.now();
    if (uid) {
      await AsyncStorage.setItem(`indicador_recompensas_${uid}`, String(visto));
      global.ultimoRecompensaVisto = { ...(global.ultimoRecompensaVisto || {}), [uid]: visto };
    }
    setRecompensasAbiertas(true);
  };
  const items = [
    {
      id: 'buzon', icon: 'mail-outline', label: 'Buzón', titulo: 'BUZÓN', texto: 'Aquí aparecerán tus regalos, invitaciones y mensajes especiales.',
      avisos: [
        { icon: 'favorite-border', titulo: 'Invitaciones', texto: 'Las invitaciones de pareja llegarán aquí.' },
        { icon: 'card-giftcard', titulo: 'Regalos', texto: 'Recibe monedas y sorpresas de tus amigos.' },
        { icon: 'group-add', titulo: 'Amistades', texto: 'Revisa las nuevas solicitudes que recibas.' },
        { icon: 'campaign', titulo: 'Novedades de Menta', texto: 'Avisos importantes del juego y sus temporadas.' },
        { icon: 'auto-awesome', titulo: 'Mensajes especiales', texto: 'Tus recompensas y anuncios más bonitos estarán aquí.' },
      ],
    },
    { id: 'actualizaciones', icon: 'notifications-none', label: 'Actualizaciones', titulo: 'NOVEDADES', texto: 'Te avisaremos aquí cuando haya una nueva temporada, evento o mejora.', detalle: 'Todo está al día.' },
    { id: 'recompensas', icon: 'card-giftcard', label: 'Recompensas', titulo: 'RECOMPENSAS', texto: 'Tus premios diarios y regalos especiales estarán siempre reunidos aquí.', detalle: 'Vuelve mañana por tu próximo regalo.' },
    { id: 'configuracion', icon: 'settings', label: 'Configuración', titulo: 'CONFIGURACIÓN', texto: 'Ajusta sonidos, animaciones, notificaciones y más preferencias.', detalle: 'Personaliza tu experiencia en Amor.' },
  ];
  const seccion = items.find(item => item.id === seccionActiva);

  return <>
    <View style={styles.quickMenu}>
      <View pointerEvents="none" style={styles.quickMenuAla} />
      <View pointerEvents="none" style={styles.quickMenuPunta} />
      <View pointerEvents="none" style={styles.quickMenuBrillo} />
      {items.map((item, index) => <React.Fragment key={item.id}>
        <TouchableOpacity style={styles.quickItem} onPress={() => item.id === 'buzon' ? abrirBuzon() : item.id === 'actualizaciones' ? abrirAvisos() : item.id === 'recompensas' ? abrirRecompensas() : item.id === 'configuracion' ? setConfiguracionAbierta(true) : setSeccionActiva(item.id)} activeOpacity={0.7} accessibilityLabel={item.label}>
          <MaterialIcons name={item.icon} size={17} color="#76552f" />
          {item.id === 'buzon' && buzonNuevo && <View style={styles.unreadDot} />}
          {item.id === 'actualizaciones' && avisosNuevos && <View style={styles.unreadDot} />}
          {item.id === 'recompensas' && recompensasNuevas && <View style={styles.unreadDot} />}
        </TouchableOpacity>
        {index < items.length - 1 && <View style={styles.quickDivider} />}
      </React.Fragment>)}
    </View>
    <Modal visible={!!seccion} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSeccionActiva(null)}>
      <View style={styles.quickModalOverlay}>
        <View pointerEvents="none" style={styles.quickModalBackdrop} />
        <TouchableOpacity style={styles.quickModalDismiss} activeOpacity={1} onPress={() => setSeccionActiva(null)} />
        {seccion && <View style={styles.quickModalPosition}><View style={styles.quickModalCard}>
          <View style={styles.quickModalHeader}>
            <View style={styles.quickModalIcon}><MaterialIcons name={seccion.icon} size={24} color="#fff8dc" /></View>
            <View style={styles.quickModalHeaderText}><Text style={styles.quickModalTitle}>{seccion.titulo}</Text><Text style={styles.quickModalSub}>RINCÓN DE MENTA</Text></View>
            <TouchableOpacity style={styles.quickModalClose} onPress={() => setSeccionActiva(null)} hitSlop={8}><MaterialIcons name="close" size={18} color="#76552f" /></TouchableOpacity>
          </View>
          <View style={styles.quickModalBody}>
            <Text style={styles.quickModalText}>{seccion.texto}</Text>
            {seccion.avisos ? <ScrollView style={styles.quickInboxList} contentContainerStyle={styles.quickInboxContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {seccion.avisos.map((aviso, index) => <View key={aviso.titulo} style={styles.quickInboxItem}>
                <View style={styles.quickInboxIcon}><MaterialIcons name={aviso.icon} size={16} color="#a87840" /></View>
                <View style={styles.quickInboxInfo}><Text style={styles.quickInboxTitle}>{aviso.titulo}</Text><Text style={styles.quickInboxText}>{aviso.texto}</Text></View>
                <Text style={styles.quickInboxNumber}>{index + 1}</Text>
              </View>)}
            </ScrollView> : <View style={styles.quickModalDetail}><MaterialIcons name="auto-awesome" size={15} color="#c08c3d" /><Text style={styles.quickModalDetailText}>{seccion.detalle}</Text></View>}
          </View>
        </View></View>}
      </View>
    </Modal>
    <BuzonModal visible={buzonAbierto} onClose={() => setBuzonAbierto(false)} />
    <AvisosModal visible={avisosAbiertos} onClose={(quedanPendientes) => { setAvisosAbiertos(false); setAvisosNuevos(Boolean(quedanPendientes)); }} />
    <RecompensasModal visible={recompensasAbiertas} onClose={() => setRecompensasAbiertas(false)} />
    <ConfiguracionModal visible={configuracionAbierta} onClose={() => setConfiguracionAbierta(false)} />
  </>;
});

const Inicio = memo(({ navigation, onReady, style, openReporteSemanal = false, tutorialActivo = false }) => {
  const [nivelJuego, setNivelJuego] = useState(1);
  const [partidasCompletadas, setPartidasCompletadas] = useState(0);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid, 'juegos', 'conexiones'), snap => {
      const datosJuego = snap.data() || {};
      setNivelJuego(Number.isFinite(datosJuego.nivel) ? datosJuego.nivel : 1);
      setPartidasCompletadas(Math.max(0, Number(datosJuego.partidasCompletadas) || 0));
    }, () => {
      setNivelJuego(1);
      setPartidasCompletadas(0);
    });
  }, []);
  const [overlayActive, setOverlayActive] = useState(false);
  const [comercianteNuevo, setComercianteNuevo] = useState(false);
  const [misionesAbiertas, setMisionesAbiertas] = useState(false);
  const [misionesNuevas, setMisionesNuevas] = useState(false);
  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const [reporteSemanalAbierto, setReporteSemanalAbierto] = useState(Boolean(openReporteSemanal));
  const puedeAbrirColeccion = auth.currentUser?.email?.toLowerCase() === 'admin@gmail.com';
  const { pendientesReclamar } = useMisiones();
  const { data: estadoInicio } = useUserDocument(
    data => ({ animalito: data?.animalito || null, halconDesbloqueado: Boolean(data?.halconDesbloqueado), pareja: data?.pareja || null }),
    undefined,
    (a, b) => a?.animalito === b?.animalito && a?.halconDesbloqueado === b?.halconDesbloqueado && a?.pareja === b?.pareja,
  );

  useEffect(() => {
    if (pendientesReclamar > 0) setMisionesNuevas(true);
    else setMisionesNuevas(false);
  }, [pendientesReclamar]);

  useEffect(() => {
    const ahora = new Date();
    const diaKey = `${ahora.getFullYear()}-${ahora.getMonth() + 1}-${ahora.getDate()}`;
    const vistoKey = `misiones_dia_visto_${auth.currentUser?.uid}`;
    AsyncStorage.getItem(vistoKey).then(visto => {
      if (visto !== diaKey) setMisionesNuevas(true);
      AsyncStorage.setItem(vistoKey, diaKey).catch(() => {});
    }).catch(() => setMisionesNuevas(true));
  }, []);

  // Indicador del comerciante: dot si la rotación actual no fue visitada
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    const ahoraMs = Date.now();
    const ahora = new Date(ahoraMs);
    const inicio = new Date(ahora);
    inicio.setMinutes(0, 0, 0);
    inicio.setHours(ahora.getHours() < 12 ? 0 : 12);
    const rotacionKey = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}-${inicio.getHours()}`;
    AsyncStorage.getItem(`indicador_comerciante_${uid}`).then(valor => {
      setComercianteNuevo(valor !== rotacionKey);
    }).catch(() => {});
    return undefined;
  }, []);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    if (openReporteSemanal) {
      setReporteSemanalAbierto(true);
      setOverlayActive(true);
    }
  }, [openReporteSemanal]);

  const cerrarReporteSemanal = () => {
    setReporteSemanalAbierto(false);
    setOverlayActive(false);
  };

  const abrirComerciante = () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      const ahora = new Date();
      const inicio = new Date(ahora);
      inicio.setMinutes(0, 0, 0);
      inicio.setHours(ahora.getHours() < 12 ? 0 : 12);
      const rotacionKey = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}-${inicio.getHours()}`;
      AsyncStorage.setItem(`indicador_comerciante_${uid}`, rotacionKey).catch(() => {});
    }
    setComercianteNuevo(false);
    navigation?.navigate('comerciante');
  };

  if (tutorialActivo) return <TutorialInicio navigation={navigation} />;

  const mensajesJuego = [
    { titulo: 'Continúa jugando', detalle: `Conexiones · Nivel ${nivelJuego}` },
    { titulo: 'Supera tu mejor marca', detalle: `El nivel ${nivelJuego} todavía puede brillar más.` },
    { titulo: 'Consigue más estrellas', detalle: 'Una partida perfecta mejora tus premios.' },
    { titulo: 'Avanza un nivel más', detalle: `Tu próximo desafío es el nivel ${nivelJuego}.` },
  ];
  const faltanParaBonus = 5 - (partidasCompletadas % 5);
  const mensajeJuego = faltanParaBonus === 1
    ? { titulo: 'Una partida para premio extra', detalle: 'La quinta victoria entrega una sorpresa.' }
    : mensajesJuego[partidasCompletadas % mensajesJuego.length];

  const siguientePaso = !estadoInicio?.animalito
    ? {
        icono: 'pets', titulo: 'Elige un Animalito', detalle: 'Tu compañero te está esperando.', insignia: 'ELEGIR',
        accion: () => navigation?.navigate('animalitos'),
      }
    : misionesNuevas || pendientesReclamar > 0
      ? {
          icono: pendientesReclamar > 0 ? 'redeem' : 'assignment',
          titulo: pendientesReclamar > 0 ? `${pendientesReclamar} recompensa${pendientesReclamar === 1 ? '' : 's'} lista${pendientesReclamar === 1 ? '' : 's'}` : 'Revisa tus misiones',
          detalle: pendientesReclamar > 0 ? 'Tu premio ya está preparado.' : 'Completa objetivos y gana premios.',
          insignia: pendientesReclamar > 0 ? 'RECLAMAR' : 'VER',
          accion: () => setMisionesAbiertas(true),
        }
      : comercianteNuevo
        ? {
            icono: 'storefront', titulo: 'El Comerciante renovó', detalle: 'Hay nuevos objetos esperando.', insignia: 'NUEVO',
            accion: abrirComerciante,
          }
        : {
            icono: 'extension', titulo: mensajeJuego.titulo, detalle: mensajeJuego.detalle, insignia: faltanParaBonus === 1 ? '1 MÁS' : '+5 EXP',
            accion: () => navigation?.navigate('conexiones'),
          };

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
        <QuickMenu />
        <SiguientePaso icono={siguientePaso.icono} titulo={siguientePaso.titulo} detalle={siguientePaso.detalle} insignia={siguientePaso.insignia} onPress={siguientePaso.accion} />
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
          <TouchableOpacity style={styles.canjearBtn} hitSlop={6} activeOpacity={0.75} onPress={() => navigation?.navigate('canjear')}>
            <View style={styles.canjearIcon}><MaterialIcons name="confirmation-number" size={20} color="#f8edf4" /></View>
            <View style={styles.canjearInfo}><Text style={styles.canjearText}>CANJEAR</Text><Text style={styles.canjearSubtext}>Código y QR</Text></View>
            <MaterialIcons name="chevron-right" size={22} color="#76552f" />
          </TouchableOpacity>
        </View>
        <View style={styles.accesosInicioWrap}>
          <TouchableOpacity style={[styles.accesoInicioBtn, styles.accesoInicioFirst]} onPress={() => { setInventarioAbierto(true); actualizarPasoTutorial(auth.currentUser?.uid, 5).catch(() => {}); }} activeOpacity={0.75}>
            <MaterialIcons name="inventory-2" size={19} color="#b87945" />
            <Text style={styles.accesoInicioText}>Inventario</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.accesoInicioBtn} onPress={() => setMisionesAbiertas(true)} activeOpacity={0.75}>
            <MaterialIcons name="assignment" size={19} color="#c46d83" />
            <Text style={styles.accesoInicioText}>Misiones</Text>
            {misionesNuevas && <View style={styles.accesoInicioDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.accesoInicioBtn, styles.accesoInicioLast, !puedeAbrirColeccion && styles.accesoInicioDisabled]} onPress={() => puedeAbrirColeccion && navigation?.navigate('coleccion')} disabled={!puedeAbrirColeccion} activeOpacity={0.75}>
            <MaterialIcons name="collections-bookmark" size={19} color={puedeAbrirColeccion ? '#6d91a8' : '#aaa49a'} />
            <Text style={[styles.accesoInicioText, !puedeAbrirColeccion && styles.accesoInicioTextDisabled]}>Colección</Text>
          </TouchableOpacity>
        </View>
        <MisionesDiarias externo abierto={misionesAbiertas} onCerrar={() => setMisionesAbiertas(false)} />
        <InventarioModal visible={inventarioAbierto} onClose={() => setInventarioAbierto(false)} />
        <Eventos navigation={navigation} soloEvento />
        <View style={styles.temporadasQuickWrap}>
          <TouchableOpacity style={[styles.temporadasQuickBtn, !puedeAbrirColeccion && styles.temporadasQuickDisabled]} hitSlop={6} activeOpacity={0.75} onPress={() => puedeAbrirColeccion && navigation?.navigate('temporadas')} disabled={!puedeAbrirColeccion}>
            <View style={[styles.temporadasQuickIcon, !puedeAbrirColeccion && styles.temporadasQuickIconDisabled]}><MaterialIcons name="event" size={20} color={puedeAbrirColeccion ? '#fff8dc' : '#aaa49a'} /></View>
            <View style={styles.canjearInfo}><Text style={[styles.temporadasQuickTitle, !puedeAbrirColeccion && styles.temporadasQuickTextDisabled]}>Temporadas</Text><Text style={[styles.temporadasQuickSub, !puedeAbrirColeccion && styles.temporadasQuickTextDisabled]}>Eventos y recompensas</Text></View>
            <MaterialIcons name="chevron-right" size={21} color={puedeAbrirColeccion ? '#76552f' : '#aaa49a'} />
          </TouchableOpacity>
        </View>
        <View style={styles.comercianteQuickWrap}>
          <TouchableOpacity style={styles.comercianteQuickBtn} activeOpacity={0.75} onPress={abrirComerciante}>
            <View style={styles.comercianteQuickIcon}><MaterialIcons name="storefront" size={19} color="#f4fff0" /></View>
            <View style={styles.comercianteInfo}><Text style={styles.comercianteTitle}>COMERCIANTE</Text><Text style={styles.comercianteSub}>Intercambia objetos</Text></View>
            <MaterialIcons name="chevron-right" size={21} color="#466a50" />
            {comercianteNuevo && <View style={styles.unreadDotVerde} />}
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
              {nivelJuego != null && <Text style={styles.jugarDescripcion}>Eres nivel {nivelJuego}</Text>}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </OverlayContext.Provider>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  moneyMenu: { flex: 1, height: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  resourcesRow: { position: 'absolute', top: -1, left: '50%', width: 150, height: 24, transform: [{ translateX: -75 }], flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#f1e1bd', borderWidth: 1, borderTopWidth: 0, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, zIndex: 220, elevation: 12 },
  diamondMenu: { flex: 1, height: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  resourceDivider: { width: 1, height: 14, backgroundColor: 'rgba(164,116,53,0.35)' },
  moneyCoin: { fontSize: 10, marginRight: 3 },
  moneyValue: { minWidth: 31, color: '#63482d', fontFamily: 'Delius', fontSize: 9, fontWeight: '900', textAlign: 'center', letterSpacing: 0.1 },
  quickMenu: { position: 'absolute', top: 0, right: 0, height: 37, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 8, paddingTop: 3, borderBottomLeftRadius: 15, backgroundColor: '#f1e1bd', borderWidth: 1.5, borderTopWidth: 0, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.34, shadowRadius: 6, elevation: 12, zIndex: 220 },
  quickMenuAla: { position: 'absolute', left: -8, bottom: 4, width: 18, height: 18, borderRadius: 3, backgroundColor: '#f1e1bd', borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#d0ad70', transform: [{ rotate: '45deg' }], zIndex: -1 },
  quickMenuPunta: { position: 'absolute', right: 32, bottom: -5, width: 11, height: 11, borderRadius: 2, backgroundColor: '#e9b85f', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#9b6a35', transform: [{ rotate: '45deg' }], zIndex: -1 },
  quickMenuBrillo: { position: 'absolute', top: 1, left: 5, right: 8, height: 1, backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 1 },
  siguientePaso: { position: 'absolute', top: '18%', right: 14, width: 210, height: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#fff4d6', borderWidth: 1.5, borderColor: '#c89a55', shadowColor: '#4b2f18', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 18, zIndex: 215 },
  siguientePasoIcono: { width: 25, height: 25, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9b6a35', borderWidth: 1, borderColor: '#e9b85f' },
  siguientePasoInfo: { flex: 1, marginLeft: 6 },
  siguientePasoEtiqueta: { color: '#b07a43', fontFamily: 'Delius', fontSize: 4.2, lineHeight: 5, fontWeight: '900', letterSpacing: 0.7 },
  siguientePasoTitulo: { color: '#704b2d', fontFamily: 'Delius', fontSize: 7.2, lineHeight: 9, fontWeight: '900' },
  siguientePasoDetalle: { color: '#9a7244', fontFamily: 'Delius', fontSize: 5, lineHeight: 6, fontWeight: '700' },
  siguientePasoInsignia: { minWidth: 42, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 7, backgroundColor: '#6f9e55', borderWidth: 1, borderColor: '#437b39' },
  siguientePasoInsigniaTexto: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 5.2, fontWeight: '900', letterSpacing: 0.35 },
  siguienteLuz: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#f6d477', borderWidth: 0.5, borderColor: '#9b6a35' },
  siguienteLuzUno: { left: -2, top: 6 },
  siguienteLuzDos: { right: -2, bottom: 6 },
  accesosInicioWrap: { position: 'absolute', left: '50%', bottom: 6, transform: [{ translateX: -72 }], flexDirection: 'row', alignItems: 'center', zIndex: 220, elevation: 12 },
  accesoInicioBtn: { width: 50, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 12 },
  accesoInicioFirst: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  accesoInicioLast: { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  accesoInicioDisabled: { backgroundColor: '#e3ded3', borderColor: '#c9c2b5', opacity: 0.8 },
  accesoInicioTextDisabled: { color: '#999287' },
  tutorialChangeButton: { left: '35%', bottom: 78 },
  tutorialMissionButton: { position: 'absolute', left: '50%', bottom: 6, transform: [{ translateX: -30 }], width: 60, height: 48, borderRadius: 8 },
  tutorialMerchantWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -350 }, { translateY: 4 }], zIndex: 200, elevation: 200 },
  tutorialInventoryButton: { position: 'absolute', left: '50%', bottom: 6, transform: [{ translateX: -92 }], width: 60, height: 48, borderRadius: 8 },
  tutorialDisabledIcon: { backgroundColor: '#c8c1b5', borderColor: '#b2aa9d' },
  tutorialDisabledButton: { backgroundColor: '#e3ded3', borderColor: '#c9c2b5', opacity: 0.8 },
  tutorialDisabledText: { color: '#999287' },
  accesoInicioDot: { position: 'absolute', top: 3, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#d94b4b', borderWidth: 1, borderColor: '#f1e1bd' },
  temporadasQuickDisabled: { backgroundColor: '#e3ded3', borderColor: '#c9c2b5', opacity: 0.8 },
  temporadasQuickIconDisabled: { backgroundColor: '#c8c1b5', borderColor: '#b2aa9d' },
  temporadasQuickTextDisabled: { color: '#999287' },
  accesoInicioText: { color: '#76552f', fontFamily: 'Delius', fontSize: 6.2, fontWeight: '900', marginTop: 1 },
  quickItem: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  unreadDot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 4, backgroundColor: '#d94b4b', borderWidth: 1, borderColor: '#f1e1bd' },
  unreadDotVerde: { position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: '#4c9e61', borderWidth: 1, borderColor: '#dce9dc' },
  quickDivider: { width: 1, height: 17, backgroundColor: 'rgba(164,116,53,0.34)' },
  quickModalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  quickModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 12, 8, 0.80)' },
  quickModalDismiss: { ...StyleSheet.absoluteFillObject },
  quickModalPosition: { width: '100%', alignItems: 'center', transform: [{ translateY: -10 }] },
  quickModalCard: { width: '100%', maxWidth: 365, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff5dd', borderWidth: 3, borderColor: '#d4b06c', shadowColor: '#2e1c10', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.38, shadowRadius: 13, elevation: 22 },
  quickModalHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, backgroundColor: '#f0dcae', borderBottomWidth: 1, borderBottomColor: '#d3af6b' },
  quickModalIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#a87840', borderWidth: 1, borderColor: '#fff3ca' },
  quickModalHeaderText: { flex: 1, marginLeft: 10 },
  quickModalTitle: { color: '#704b2d', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  quickModalSub: { color: '#9c7644', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800', letterSpacing: 0.6, marginTop: 1 },
  quickModalClose: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 249, 231, 0.7)', borderWidth: 1, borderColor: '#d7b977' },
  quickModalBody: { paddingHorizontal: 19, paddingTop: 14, paddingBottom: 16 },
  quickModalText: { color: '#795a38', fontFamily: 'Delius', fontSize: 10, lineHeight: 15, fontWeight: '700', textAlign: 'center' },
  quickModalDetail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#f7e9c8', borderWidth: 1, borderColor: '#e3c991' },
  quickModalDetailText: { color: '#946a36', fontFamily: 'Delius', fontSize: 8, fontWeight: '800', textAlign: 'center' },
  quickInboxList: { maxHeight: 122, marginTop: 10 },
  quickInboxContent: { gap: 5, paddingBottom: 1 },
  quickInboxItem: { minHeight: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9, backgroundColor: '#f7e9c8', borderWidth: 1, borderColor: '#e3c991' },
  quickInboxIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5dd', borderWidth: 1, borderColor: '#d8b670' },
  quickInboxInfo: { flex: 1, marginLeft: 8 },
  quickInboxTitle: { color: '#7a5530', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  quickInboxText: { color: '#9a7244', fontFamily: 'Delius', fontSize: 6.2, lineHeight: 8, fontWeight: '700', marginTop: 1 },
  quickInboxNumber: { color: '#c19a59', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', marginLeft: 5 },
  quickModalButton: { alignSelf: 'center', minWidth: 118, marginBottom: 18, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 11, backgroundColor: '#a87840', borderWidth: 1, borderColor: '#7c522a', shadowColor: '#5e3d20', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 4, elevation: 5 },
  quickModalButtonText: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
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
    transform: [{ translateX: -350 }, { translateY: -98 }],
    zIndex: 200,
    elevation: 200,
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
  temporadasQuickWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -350 }, { translateY: -47 }], zIndex: 200, elevation: 200 },
  comercianteQuickWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -350 }, { translateY: 4 }], zIndex: 200, elevation: 200 },
  temporadasQuickBtn: { width: 150, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 8, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 7, elevation: 9 },
  temporadasQuickIcon: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#b07a43', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff0c5' },
  temporadasQuickTitle: { color: '#65492f', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.15 },
  temporadasQuickSub: { color: '#80613d', fontFamily: 'Delius', fontSize: 6, fontWeight: '700', marginTop: 0 },
  comercianteQuickBtn: { width: 150, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 8, backgroundColor: '#dce9dc', borderWidth: 1, borderColor: '#a8c4a9', shadowColor: '#405744', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 7, elevation: 9 },
  comercianteQuickIcon: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#6f9876', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eff9e9' },
  comercianteInfo: { flex: 1, marginLeft: 6 },
  comercianteTitle: { color: '#3f6348', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' },
  comercianteSub: { color: '#56745c', fontFamily: 'Delius', fontSize: 6, fontWeight: '700' },

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
  cartaRegalo: { width: 17, height: 22, marginTop: 3, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9c17a', borderWidth: 1.4, borderColor: '#92743c', shadowColor: '#5e4925', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.25, shadowRadius: 1 },
  cartaRegaloHoy: { width: 20, height: 26, marginTop: 3, zIndex: 20 },
  cartaRegaloMarca: { color: '#fff8dc', fontSize: 12, lineHeight: 15, fontWeight: '900' },
  cartaRegaloMarcaHoy: { fontSize: 14, lineHeight: 17 },
  cajaDiamante: { marginTop: 5 },
  cajaDiamanteHoy: { marginTop: 5, zIndex: 20 },
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
  overlayDiamante: { marginTop: 17, marginBottom: 10, textShadowColor: 'rgba(18, 101, 122, 0.55)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 5 },
  cartaRegaloGrande: { width: 52, height: 68, marginTop: 17, marginBottom: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9c17a', borderWidth: 3, borderColor: '#92743c', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 7 },
  cartaRegaloMarcaGrande: { color: '#fff8dc', fontSize: 34, lineHeight: 39, fontWeight: '900' },
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
