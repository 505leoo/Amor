import React, { useCallback, useEffect, useMemo, useRef, memo, useState, createContext, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Easing, Modal, PanResponder, ScrollView, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { LibroJuegos } from '../components/botones';
import Player from '../Player';
import Pareja from '../components/Pareja';
import PanelPerfil from '../components/PanelPerfil';
import Descargas from '../Descargas';
import RecompensaOverlay from '../components/RecompensaOverlay';
import RuletaDiariaModal from '../components/RuletaDiariaModal';
import PreguntonasModal from '../components/PreguntonasModal';
import { getRecompensaDiariaDelDia, useRecompensaDiaria } from '../hooks/useRecompensaDiaria';
import { auth, db } from '../firebaseConfig';
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserDocument } from '../hooks/useUserDocument';
import { BuzonModal } from './Buzon';
import { AvisosModal, hayAvisosPendientes } from './Avisos';
import { RecompensasModal } from './Recompensas';
import { ConfiguracionModal } from './Configuracion';
import Eventos from './Eventos';
import { InventarioModal } from './Inventario';
import RoomBackground from '../components/RoomBackground';
import { RachaVisualModal } from '../components/RachaVisual';
import { useRacha } from '../RachaContext';
import { cacheDocument, getCachedDocument, getProjectedDocument, isOfflineModeEnabled, subscribeCachedDocument, syncSetDoc, syncUpdateDoc } from '../utils/offlineSync';
import { ALIMENTOS, calcularSaciedad, estadoSaciedad } from '../data/alimentos';
import { ANIMALITOS } from '../data/animalitos';
import * as Haptics from 'expo-haptics';

const OverlayContext = createContext(false);
export const useOverlayActive = () => useContext(OverlayContext);
const NOOP = () => {};
// Las animaciones ambientales se desactivan en Inicio para reservar el hilo
// de JS/GPU a gestos, alimentación y navegación. Las animaciones de acción
// (alimentar, arrastrar y feedback) siguen activas.
const ANIMACIONES_AMBIENTALES = false;
const HALCON_IMAGE = require('../assets/Animalitos/Halcon/halcon1.webp');

const fechaDeActividad = valor => {
  if (!valor) return null;
  if (typeof valor?.toDate === 'function') return valor.toDate();
  const fecha = new Date(valor?.seconds ? valor.seconds * 1000 : valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};
const horaDeActividad = valor => {
  const fecha = fechaDeActividad(valor);
  if (!fecha) return 'hora no disponible';
  return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};
const nombreComponente = valor => ({
  main: 'Inicio', inicio: 'Inicio', conexiones: 'Hilito', dulces: 'Memoria de Sabores',
  juegos: 'Juegos', comerciante: 'Comerciante', perfil: 'Perfil', pareja: 'Pareja',
  animalitos: 'Animalitos', temporadas: 'Temporadas', buzon: 'Buzón',
}[String(valor || '').toLowerCase()] || 'Amor');
const REWARD_ANIMATION = require('../assets/Lottie/reward.json');
const JUGAR_IMAGE = require('../assets/inicio/jugar.webp');
const BOLSA_DORMIR_IMAGE = require('../assets/Animalitos/bolsa-dormir.webp');
const DURACION_DORMIR_MS = 8 * 60 * 60 * 1000;
const DURACION_VIGILIA_MS = 16 * 60 * 60 * 1000;
const VINCULO_POR_NIVEL = 100;
const VINCULO_POR_COMIDA = 2;
const PUNTOS_SUEÑO_MAX = 7;
const MINUTO_SUEÑO_MS = 60 * 1000;
const HORA_SUEÑO_MS = 60 * 60 * 1000;
const vinculoSeguro = valor => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
};
const vinculoDesdeAnimal = (animal = {}, nivelFallback = 1) => {
  if (animal?.vinculo !== undefined && animal?.vinculo !== null) return vinculoSeguro(animal.vinculo);
  const nivelLegado = Math.max(1, Number(animal?.nivel) || Number(nivelFallback) || 1);
  return vinculoSeguro((nivelLegado - 1) * VINCULO_POR_NIVEL);
};
const puntosPorSueño = (desde, hasta, ahora = Date.now()) => {
  const inicio = Number(desde) || 0;
  const final = Number(hasta) || 0;
  if (!inicio || !final) return 0;
  const transcurrido = Math.max(0, Math.min(DURACION_DORMIR_MS, ahora - inicio));
  if (transcurrido < MINUTO_SUEÑO_MS) return 0;
  return Math.min(PUNTOS_SUEÑO_MAX, Math.floor(transcurrido / HORA_SUEÑO_MS));
};
const descansoSeguro = valor => Math.max(0, Math.min(100, Number(valor) || 0));
const descansoDuranteVigilia = (base, actualizadoEnMs, ahora = Date.now()) => Math.max(0, descansoSeguro(base) - (Math.max(0, ahora - (Number(actualizadoEnMs) || ahora)) / DURACION_VIGILIA_MS) * 100);
const descansoDuranteSueño = (base, desde, ahora = Date.now()) => Math.min(100, descansoSeguro(base) + (Math.max(0, ahora - (Number(desde) || ahora)) / DURACION_DORMIR_MS) * 100);
const formatoDormir = (hasta, ahora = Date.now()) => {
  // Dejamos fuera el minuto que está transcurriendo: recién dormido se ve
  // 7h 59m y al cambiar de hora no aparece el poco natural 5h 0m.
  const minutos = Math.max(0, Math.ceil((Number(hasta) - ahora) / 60000) - 1);
  return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
};
const selectEstadoInicio = data => {
  const animalito = data?.animalito || null;
  const estadoAnimalito = animalito ? data?.animalitos?.[animalito] || {} : {};
  return {
    animalito,
    apodo: String(estadoAnimalito.apodo || '').trim(),
    nivelAnimalito: Math.max(1, Number(estadoAnimalito.nivel) || 1),
    vinculoAnimalito: vinculoDesdeAnimal(estadoAnimalito),
    halconDesbloqueado: Boolean(data?.halconDesbloqueado),
    pareja: data?.pareja || null,
    diamantes: Number(data?.diamantes ?? data?.diamante) || 0,
    animalitoDurmiendoHastaMs: Number(data?.animalitoDurmiendoHastaMs) || 0,
    animalitoDurmiendoDesdeMs: Number(data?.animalitoDurmiendoDesdeMs) || 0,
    animalitoDescansoPorcentaje: data?.animalitoDescansoPorcentaje == null ? null : descansoSeguro(data.animalitoDescansoPorcentaje),
    animalitoDescansoActualizadoEnMs: Number(data?.animalitoDescansoActualizadoEnMs) || 0,
  };
};
const equalEstadoInicio = (a, b) => a?.animalito === b?.animalito
  && a?.apodo === b?.apodo
  && a?.nivelAnimalito === b?.nivelAnimalito
  && a?.vinculoAnimalito === b?.vinculoAnimalito
  && a?.halconDesbloqueado === b?.halconDesbloqueado
  && a?.pareja === b?.pareja
  && a?.diamantes === b?.diamantes
  && a?.animalitoDurmiendoHastaMs === b?.animalitoDurmiendoHastaMs
  && a?.animalitoDurmiendoDesdeMs === b?.animalitoDurmiendoDesdeMs
  && a?.animalitoDescansoPorcentaje === b?.animalitoDescansoPorcentaje
  && a?.animalitoDescansoActualizadoEnMs === b?.animalitoDescansoActualizadoEnMs;

const SiguientePaso = memo(({ icono, titulo, detalle, insignia, onPress }) => {
  const activar = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };
  return (
    <TouchableOpacity style={styles.siguientePaso} onPress={activar} activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={`${titulo}. ${detalle}`}>
      <View style={[styles.siguienteLuz, styles.siguienteLuzUno]} /><View style={[styles.siguienteLuz, styles.siguienteLuzDos]} />
      <View style={styles.siguientePasoIcono}><MaterialIcons name={icono} size={15} color="#fff8dc" /></View>
      <View style={styles.siguientePasoInfo}>
        <Text style={styles.siguientePasoEtiqueta}>SIGUIENTE JUGADA</Text>
        <Text style={styles.siguientePasoTitulo} numberOfLines={1}>{titulo}</Text>
        <Text style={styles.siguientePasoDetalle} numberOfLines={1}>{detalle}</Text>
      </View>
      <View style={styles.siguientePasoInsignia}><Text style={styles.siguientePasoInsigniaTexto}>{insignia}</Text></View>
    </TouchableOpacity>
  );
});

const IconoRuleta = () => <Svg width="30" height="30" viewBox="0 0 40 40"><Circle cx="20" cy="20" r="17" fill="#9c6ac1" stroke="#633d82" strokeWidth="2" /><Path d="M20 20 L20 4 A16 16 0 0 1 34 12 Z" fill="#ffd879" /><Path d="M20 20 L34 12 A16 16 0 0 1 34 28 Z" fill="#ee8aaa" /><Path d="M20 20 L34 28 A16 16 0 0 1 20 36 Z" fill="#7cbae3" /><Path d="M20 20 L20 36 A16 16 0 0 1 6 28 Z" fill="#8dcf9a" /><Path d="M20 20 L6 28 A16 16 0 0 1 6 12 Z" fill="#f3ad70" /><Path d="M20 20 L6 12 A16 16 0 0 1 20 4 Z" fill="#ee8aaa" /><Circle cx="20" cy="20" r="4" fill="#fff4d6" stroke="#633d82" strokeWidth="1.5" /></Svg>;
const IconoPreguntonas = () => <Svg width="34" height="34" viewBox="0 0 40 40"><Circle cx="20" cy="20" r="18" fill="#f3cfdf" stroke="#9b5874" strokeWidth="2" /><Path d="M7 12c0-3 2.5-5 5.5-5H21c3 0 5.5 2 5.5 5v6c0 3-2.5 5-5.5 5h-5l-4.5 4v-4c-2.6-.4-4.5-2.3-4.5-5z" fill="#fff6e8" stroke="#9b5874" strokeWidth="1.5" /><Path d="M20 20c0-3 2.5-5 5.5-5H29c2.2 0 4 1.8 4 4v5c0 2.2-1.8 4-4 4h-1v4l-4-4h-1.5c-1.4 0-2.5-1.1-2.5-2.5z" fill="#9c82c5" stroke="#654b87" strokeWidth="1.5" /><Path d="M13.5 12.5c.4-1.4 3.5-1.5 4.1.2.8 2.3-2.1 2.5-2.1 4" fill="none" stroke="#c66487" strokeWidth="2" strokeLinecap="round" /><Circle cx="15.5" cy="19.5" r="1" fill="#c66487" /><Path d="M24 21c1.4-1.9 3.7-1.6 4.5 0 1.1 2.1-1.3 3.7-2.3 4.4-1-.7-3.3-2.3-2.2-4.4z" fill="#ffe7a8" /></Svg>;
const IconoRegalo = () => <Svg width="31" height="31" viewBox="0 0 40 40"><Rect x="7" y="16" width="26" height="18" rx="3" fill="#ef8ba6" stroke="#a94667" strokeWidth="2" /><Rect x="5" y="12" width="30" height="8" rx="3" fill="#f6a7ba" stroke="#a94667" strokeWidth="2" /><Path d="M18 12 C10 11 10 4 15 5 C19 6 20 12 20 12 M22 12 C30 11 30 4 25 5 C21 6 20 12 20 12" fill="#ffd58b" stroke="#a94667" strokeWidth="1.7" /><Path d="M18 13 H22 V34 H18Z" fill="#ffd58b" /><Circle cx="13" cy="24" r="1.5" fill="#fff0f4" opacity="0.9" /></Svg>;
const IconoLotes = () => <Svg width="35" height="35" viewBox="0 0 40 40">
  <Circle cx="20" cy="20" r="18" fill="#f7cb68" stroke="#9c5b20" strokeWidth="2" />
  <Path d="M9 15 20 10l11 5-11 5z" fill="#ffeaa0" stroke="#9c5b20" strokeWidth="1.6" strokeLinejoin="round" />
  <Path d="M9 15v12l11 5V20z M31 15v12l-11 5V20z" fill="#e59b39" stroke="#9c5b20" strokeWidth="1.6" strokeLinejoin="round" />
  <Path d="M20 10v10 M20 20v12" stroke="#fff3bd" strokeWidth="2" />
  <Path d="M16 12l4 2 4-2" fill="none" stroke="#fff8d2" strokeWidth="1.3" strokeLinecap="round" />
  <Path d="M6 8l1 2.5L9.5 12 7 13l-1 2.5L5 13l-2.5-1L5 10.5z M33 6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#fff3a1" />
</Svg>;

const AccesosRegalos = memo(({ onRuleta, onRegaloDiario, onLotes, onPreguntonas, regaloDisponible, loteDisponible }) => (
  <View style={styles.accesosRegalos}>
    <TouchableOpacity style={styles.accesoRegalo} onPress={onRuleta} activeOpacity={0.78} accessibilityLabel="Abrir ruleta diaria">
      <IconoRuleta />
    </TouchableOpacity>
    <TouchableOpacity style={[styles.accesoRegalo, styles.accesoRegaloDiario]} onPress={onRegaloDiario} activeOpacity={0.78} accessibilityLabel="Abrir regalo diario">
      <IconoRegalo />
      {regaloDisponible && <View style={styles.accesoRegaloDot} />}
    </TouchableOpacity>
    <TouchableOpacity style={[styles.accesoRegalo, styles.accesoRegaloLotes]} onPress={onLotes} activeOpacity={0.78} accessibilityLabel="Abrir lotes">
      <IconoLotes />
      {loteDisponible && <View style={[styles.accesoRegaloDot, styles.accesoLoteDot]} />}
    </TouchableOpacity>
    <TouchableOpacity style={[styles.accesoRegalo, styles.accesoRegaloPreguntonas]} onPress={onPreguntonas} activeOpacity={0.78} accessibilityLabel="Abrir Preguntonas">
      <IconoPreguntonas />
    </TouchableOpacity>
  </View>
));

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
          source={HALCON_IMAGE}
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
  if (recompensa.tipo === 'ticketRuleta') {
    return <MaterialIcons name="confirmation-number" size={esHoy ? 23 : 20} color="#b8792d" style={esHoy ? styles.cajaDiamanteHoy : styles.cajaDiamante} />;
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

const CajasRecompensa = memo(({ onOverlayChange, overlayActive, compactModal = false }) => {
  const { diaActual, puedeReclamar, loading, reclamar, userData } = useRecompensaDiaria({ paused: overlayActive });
  const [showRecompensaOverlay, setShowRecompensaOverlay] = useState(false);
  const [reclamando, setReclamando] = useState(false);
  const [yaReclamadoHoy, setYaReclamadoHoy] = useState(false);
  
  useEffect(() => {
    onOverlayChange?.(showRecompensaOverlay);
  }, [onOverlayChange, showRecompensaOverlay]);
  
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
    <View style={[styles.cajasWrap, compactModal && styles.cajasWrapModal]}>
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
                      source={REWARD_ANIMATION}
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
        onClose={() => setShowRecompensaOverlay(false)}
      >
        <View style={overlayStyles.overlayContent}>
          {recompensaDeHoy.tipo === 'halcon' ? (
            <>
              <View style={overlayStyles.animalitoGrandeWrap}>
                <Image
                  source={HALCON_IMAGE}
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
                  : recompensaDeHoy.tipo === 'ticketRuleta'
                    ? <MaterialIcons name="confirmation-number" size={66} color="#bd7b2c" style={overlayStyles.overlayDiamante} />
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
const REGALO_DIARIO_IMAGE = require('../assets/inicio/regalodiario.webp');

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

const MoneyMenu = memo(() => {
  const { data: userData, loaded, uid } = useUserDocument(
    data => ({ dinero: data?.dinero, diamantes: data?.diamantes, diamanteLegacy: data?.diamante }),
    undefined,
    (a, b) => a?.dinero === b?.dinero && a?.diamantes === b?.diamantes && a?.diamanteLegacy === b?.diamanteLegacy,
  );
  const moneyParsed = Number(userData?.dinero);
  const diamondsRaw = userData?.diamantes ?? userData?.diamanteLegacy;
  const diamondsParsed = Number(diamondsRaw);
  const money = Number.isFinite(moneyParsed) ? moneyParsed : 0;
  const diamonds = Number.isFinite(diamondsParsed) ? diamondsParsed : 0;

  useEffect(() => {
    if (loaded && uid && typeof userData?.diamantes !== 'number') {
      syncSetDoc(doc(db, 'usuarios', uid), { diamantes: diamonds }, { merge: true }).catch(() => {});
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

const QUICK_MENU_ITEMS = [
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
      const siguiente = ultimo > vistoBuzonRef.current;
      setBuzonNuevo(actual => actual === siguiente ? actual : siguiente);
    };
    AsyncStorage.getItem(buzonKey).then(valor => {
      if (!activo) return;
      vistoBuzonRef.current = Number(valor) || Date.now();
      actualizarBuzon();
    });
    AsyncStorage.getItem(avisosKey).then(valor => {
      if (activo) {
        const siguiente = hayAvisosPendientes(valor);
        setAvisosNuevos(actual => actual === siguiente ? actual : siguiente);
      }
    });
    AsyncStorage.getItem(`indicador_recompensas_${uid}`).then(valor => {
      if (activo) {
        const visto = Number(valor) || Date.now();
        global.ultimoRecompensaVisto = { ...(global.ultimoRecompensaVisto || {}), [uid]: visto };
        const siguiente = ultimoRegaloRef.current > visto;
        setRecompensasNuevas(actual => actual === siguiente ? actual : siguiente);
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
      const siguiente = snap.docs.length > 0;
      setRecompensasNuevas(actual => actual === siguiente ? actual : siguiente);
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
    setRecompensasNuevas(false);
    setRecompensasAbiertas(true);
  };
  const seccion = QUICK_MENU_ITEMS.find(item => item.id === seccionActiva);

  return <>
    <View style={styles.quickMenu}>
      <View pointerEvents="none" style={styles.quickMenuAla} />
      <View pointerEvents="none" style={styles.quickMenuPunta} />
      <View pointerEvents="none" style={styles.quickMenuBrillo} />
      {QUICK_MENU_ITEMS.map((item, index) => <React.Fragment key={item.id}>
        <TouchableOpacity style={styles.quickItem} onPress={() => item.id === 'buzon' ? abrirBuzon() : item.id === 'actualizaciones' ? abrirAvisos() : item.id === 'recompensas' ? abrirRecompensas() : item.id === 'configuracion' ? setConfiguracionAbierta(true) : setSeccionActiva(item.id)} activeOpacity={0.7} accessibilityLabel={item.label}>
          <MaterialIcons name={item.icon} size={17} color="#76552f" />
          {item.id === 'buzon' && buzonNuevo && <View style={styles.unreadDot} />}
          {item.id === 'actualizaciones' && avisosNuevos && <View style={styles.unreadDot} />}
          {item.id === 'recompensas' && recompensasNuevas && <View style={styles.unreadDot} />}
        </TouchableOpacity>
        {index < QUICK_MENU_ITEMS.length - 1 && <View style={styles.quickDivider} />}
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
    {buzonAbierto && <BuzonModal visible onClose={() => setBuzonAbierto(false)} />}
    {avisosAbiertos && <AvisosModal visible onClose={(quedanPendientes) => { setAvisosAbiertos(false); setAvisosNuevos(Boolean(quedanPendientes)); }} />}
    {recompensasAbiertas && <RecompensasModal visible onClose={() => setRecompensasAbiertas(false)} />}
    {configuracionAbierta && <ConfiguracionModal visible onClose={() => setConfiguracionAbierta(false)} />}
  </>;
});

const AlimentoArrastrable = memo(({ alimento, cantidad, disabled, onDrop, onDragMove, draggingRef, onDragState, renderContent, style, onPress, dragPreview = false }) => {
  const posicion = useRef(new Animated.ValueXY()).current;
  const [arrastrando, setArrastrando] = useState(false);
  const [soltando, setSoltando] = useState(false);
  const [alimentoEnArrastre, setAlimentoEnArrastre] = useState(null);
  const escalaArrastre = useRef(new Animated.Value(1)).current;
  const activo = useRef(!disabled && cantidad > 0);
  const alimentoRef = useRef(alimento);
  const alimentoEnArrastreRef = useRef(null);
  const cantidadRef = useRef(cantidad);
  const onDropRef = useRef(onDrop);
  activo.current = !disabled && cantidad > 0;
  alimentoRef.current = alimento;
  cantidadRef.current = cantidad;
  onDropRef.current = onDrop;
  const panResponder = useRef(PanResponder.create({
    // El toque simple queda disponible para cambiar de alimento; el gesto se
    // captura recién cuando el usuario empieza a mover el botón.
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, gesture) => activo.current && (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2),
    onMoveShouldSetPanResponder: (_, gesture) => activo.current && (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2),
    onPanResponderGrant: () => {
      const alimentoActual = alimentoRef.current;
      alimentoEnArrastreRef.current = alimentoActual;
      setAlimentoEnArrastre(alimentoActual);
      console.log('[Alimentar] drag-start', alimentoActual.id, 'cantidad:', cantidadRef.current);
      if (draggingRef) draggingRef.current = true;
      onDragState?.(true);
      posicion.stopAnimation();
      // El botón mantiene su sitio; solo la previsualización se desplaza.
      // Limpiamos también el offset para que cada gesto empiece en cero.
      posicion.setOffset({ x: 0, y: 0 });
      posicion.setValue({ x: 0, y: 0 });
      escalaArrastre.stopAnimation();
      escalaArrastre.setValue(1);
      setSoltando(false);
      Haptics.selectionAsync().catch(() => {});
      setArrastrando(true);
    },
    onPanResponderMove: (_, gesture) => {
      posicion.setValue({ x: gesture.dx, y: gesture.dy });
      onDragMove?.(gesture.moveX, gesture.moveY);
    },
    onPanResponderRelease: (_, gesture) => {
      const alimentoActual = alimentoEnArrastreRef.current || alimentoRef.current;
      console.log('[Alimentar] drag-release', alimentoActual.id, { x: gesture.moveX, y: gesture.moveY });
      posicion.flattenOffset();
      onDropRef.current?.(alimentoActual, gesture.moveX, gesture.moveY);
      setArrastrando(false);
      if (draggingRef) draggingRef.current = false;
      setSoltando(true);
      Animated.parallel([
        Animated.timing(posicion, { toValue: { x: 0, y: 0 }, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(escalaArrastre, { toValue: 0.52, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]).start(() => {
        setSoltando(false);
        alimentoEnArrastreRef.current = null;
        setAlimentoEnArrastre(null);
        onDragState?.(false);
        // Reiniciar cuando la copia ya no está renderizada evita el destello
        // en el que el alimento vuelve a crecer en una posición desplazada.
        requestAnimationFrame(() => {
          posicion.setValue({ x: 0, y: 0 });
          escalaArrastre.setValue(1);
        });
      });
    },
    onPanResponderTerminate: () => {
      posicion.flattenOffset();
      setArrastrando(false);
      if (draggingRef) draggingRef.current = false;
      setSoltando(true);
      Animated.parallel([
        Animated.timing(posicion, { toValue: { x: 0, y: 0 }, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(escalaArrastre, { toValue: 0.52, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]).start(() => {
        setSoltando(false);
        alimentoEnArrastreRef.current = null;
        setAlimentoEnArrastre(null);
        onDragState?.(false);
        requestAnimationFrame(() => {
          posicion.setValue({ x: 0, y: 0 });
          escalaArrastre.setValue(1);
        });
      });
    },
  })).current;

  return <Animated.View {...panResponder.panHandlers} style={[renderContent ? style : styles.foodItem, !renderContent && cantidad <= 0 && styles.foodItemEmpty, !dragPreview && { transform: posicion.getTranslateTransform() }]}>
    {renderContent ? <TouchableOpacity style={[StyleSheet.absoluteFill, styles.foodSelectTouch]} onPress={onPress} activeOpacity={0.78}>{renderContent({ ocultarIcono: arrastrando || soltando })}</TouchableOpacity> : <><Text style={styles.foodEmoji}>{alimento.emoji}</Text><View style={styles.foodCount}><Text style={styles.foodCountText}>{cantidad}</Text></View></>}
    {dragPreview && (arrastrando || soltando) && <Animated.View pointerEvents="none" style={[styles.foodDragPreview, { transform: [{ translateX: posicion.x }, { translateY: posicion.y }, { scale: escalaArrastre }] }]}><Text style={styles.foodDragPreviewEmoji}>{(alimentoEnArrastre || alimento).emoji}</Text></Animated.View>}
  </Animated.View>;
});

const CuidadoAnimal = memo(({ parejaUid, targetRef, disabled, onFed, onBond, onDescansoChange, vinculo = 0, descanso = 100, dropRef, hoverRef, onZoneChange, draggingRef, durmiendo = false }) => {
  const uid = auth.currentUser?.uid;
  const participantes = useMemo(() => uid ? [uid, parejaUid].filter(Boolean).sort() : [], [parejaUid, uid]);
  const cuidadoId = participantes.join('_');
  const cuidadoRef = useMemo(() => cuidadoId ? doc(db, 'cuidado_parejas', cuidadoId) : null, [cuidadoId]);
  const { data: inventario } = useUserDocument(data => data?.alimentos || {});
  const [cuidado, setCuidado] = useState(null);
  const [ahora, setAhora] = useState(Date.now());
  const [alimentando, setAlimentando] = useState(false);
  const [avisoAlimentacion, setAvisoAlimentacionLocal] = useState(null);
  const avisoTimerRef = useRef(null);
  const alimentandoRef = useRef(false);
  const zonaActivaRef = useRef(false);
  const hoverTimerRef = useRef(null);
  const zonaRectRef = useRef(null);
  useEffect(() => {
    if (!cuidadoRef) return undefined;
    const aplicarCuidado = datos => {
      if (datos) setCuidado(datos);
    };
    getCachedDocument(uid, cuidadoRef.path).then(aplicarCuidado).catch(() => {});
    const quitarCache = subscribeCachedDocument(uid, cuidadoRef.path, aplicarCuidado);
    const quitarServidor = onSnapshot(cuidadoRef, snap => {
      if (snap.exists()) {
        const datosServidor = snap.data() || {};
        getProjectedDocument(uid, cuidadoRef.path, datosServidor).then(datos => {
          cacheDocument(uid, cuidadoRef.path, datos).catch(() => {});
          aplicarCuidado(datos);
        }).catch(() => aplicarCuidado(datosServidor));
        // Los documentos antiguos no tenían propietario explícito. Se
        // completa una sola vez para que el aviso de hambre llegue a una
        // única persona y no a los dos miembros de la pareja.
        if (!datosServidor.animalitoUid && uid) syncSetDoc(cuidadoRef, { animalitoUid: uid }, { merge: true }).catch(() => {});
      } else syncSetDoc(cuidadoRef, { participantes, animalitoUid: uid, saciedad: 100, actualizadaEnMs: Date.now(), creadaEn: serverTimestamp(), actualizadaEn: serverTimestamp() }, { merge: true }).catch(() => {});
    }, () => {});
    return () => { quitarServidor(); quitarCache(); };
  }, [cuidadoRef, participantes]);

  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', estadoApp => {
      if (estadoApp === 'active') setAhora(Date.now());
    });
    return () => suscripcion.remove();
  }, []);

  const saciedad = calcularSaciedad(cuidado, ahora);
  const estado = estadoSaciedad(saciedad);
  const vinculoTotal = vinculoSeguro(vinculo);
  const nivelVinculo = Math.floor(vinculoTotal / VINCULO_POR_NIVEL) + 1;
  const porcentajeVinculo = vinculoTotal % VINCULO_POR_NIVEL;
  const descansoVisible = descansoSeguro(descanso);
  const alimentar = useCallback(async alimento => {
    if (!uid || !cuidadoRef || alimentandoRef.current || disabled) return;
    const alimentoSeguro = ALIMENTOS.find(item => item.id === alimento?.id) || alimento;
    if (!alimentoSeguro?.id) {
      console.warn('[Alimentar] alimento inválido recibido', alimento);
      return;
    }
    alimentandoRef.current = true;
    setAlimentando(true);
    try {
      const usuarioRef = doc(db, 'usuarios', uid);
      let resultado;
      if (isOfflineModeEnabled()) {
        const datosCuidado = cuidado || {};
        const alimentos = { ...(inventario || {}) };
        const disponibles = Math.max(0, Number(alimentos[alimentoSeguro.id]) || 0);
        console.log('[Alimentar] inventario verificado', { id: alimentoSeguro.id, valor: alimentos[alimentoSeguro.id], disponibles });
        if (disponibles < 1) throw new Error('sin_alimento');
        const actual = calcularSaciedad(datosCuidado);
        if (actual >= 99.5) throw new Error('lleno');
        const nueva = Math.min(100, actual + alimentoSeguro.saciedad);
        alimentos[alimentoSeguro.id] = disponibles - 1;
        const cuidadoActualizado = {
          participantes,
          saciedad: nueva,
          actualizadaEnMs: Date.now(),
          actualizadaEn: serverTimestamp(),
          ultimaAlimentacionPor: uid,
          ultimoAlimento: alimentoSeguro.id,
          ultimaAlimentacionEn: serverTimestamp(),
        };
        resultado = { recuperado: Math.round(nueva - actual), nuevaSaciedad: Math.round(nueva) };
        // Una transacción web no puede ejecutarse sin red. Guardamos ambos
        // cambios en la cola, actualizamos el caché inmediatamente y dejamos
        // que se reproduzcan en orden al volver Internet.
        await syncUpdateDoc(usuarioRef, { alimentos }, { merge: true });
        await syncSetDoc(cuidadoRef, cuidadoActualizado, { merge: true });
        setCuidado(previous => ({ ...(previous || {}), ...cuidadoActualizado }));
      } else {
        resultado = await runTransaction(db, async transaction => {
          const usuarioSnap = await transaction.get(usuarioRef);
          const cuidadoSnap = await transaction.get(cuidadoRef);
          const usuario = usuarioSnap.data() || {};
          const alimentosServidor = { ...(usuario.alimentos || {}) };
          const disponiblesServidor = Math.max(0, Number(alimentosServidor[alimentoSeguro.id]) || 0);
          if (disponiblesServidor < 1) throw new Error('sin_alimento');
          const datosServidor = cuidadoSnap.exists() ? (cuidadoSnap.data() || {}) : {};
          const actualServidor = calcularSaciedad(datosServidor);
          if (actualServidor >= 99.5) throw new Error('lleno');
          const nuevaServidor = Math.min(100, actualServidor + alimentoSeguro.saciedad);
          alimentosServidor[alimentoSeguro.id] = disponiblesServidor - 1;
          transaction.set(usuarioRef, { alimentos: alimentosServidor }, { merge: true });
          transaction.set(cuidadoRef, {
            participantes,
            saciedad: nuevaServidor,
            actualizadaEnMs: Date.now(),
            actualizadaEn: serverTimestamp(),
            ultimaAlimentacionPor: uid,
            ultimoAlimento: alimentoSeguro.id,
            ultimaAlimentacionEn: serverTimestamp(),
          }, { merge: true });
          return { recuperado: Math.round(nuevaServidor - actualServidor), nuevaSaciedad: Math.round(nuevaServidor) };
        });
        setCuidado(previous => ({ ...(previous || {}), saciedad: resultado.nuevaSaciedad, actualizadaEnMs: Date.now() }));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onFed?.(alimentoSeguro, resultado);
      onBond?.(VINCULO_POR_COMIDA);
      onDescansoChange?.(1);
    } catch (error) {
      if (error.message === 'lleno') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 150);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 300);
        setAvisoAlimentacionLocal('🍽️  Animalito lleno');
        clearTimeout(avisoTimerRef.current);
        avisoTimerRef.current = setTimeout(() => setAvisoAlimentacionLocal(null), 2200);
      } else if (error.message === 'sin_alimento') {
        setAvisoAlimentacionLocal('🛒  Comprá comida en el Comerciante');
        clearTimeout(avisoTimerRef.current);
        avisoTimerRef.current = setTimeout(() => setAvisoAlimentacionLocal(null), 2600);
      }
      global.showToast?.({ type: 'info', text1: error.message === 'lleno' ? 'Tu Animalito ya está lleno' : 'Ya no te queda ese alimento' });
    } finally {
      alimentandoRef.current = false;
      setAlimentando(false);
    }
  }, [cuidado, cuidadoRef, disabled, inventario, onBond, onDescansoChange, onFed, participantes, uid]);

  const soltar = useCallback((alimento, pageX, pageY) => {
    // El botón representa la acción de alimentar y es el único origen de
    // arrastre; no dependemos de medir un nodo animado para confirmar el drop.
    if (!zonaActivaRef.current) {
      console.log('[Alimentar] drop-rejected: fuera de la zona', alimento.id, { x: pageX, y: pageY });
      global.showToast?.({ type: 'info', text1: 'Soltá la comida sobre tu Animalito' });
      return;
    }
    const alimentoSeguro = ALIMENTOS.find(item => item.id === alimento?.id) || alimento;
    console.log('[Alimentar] drop-accepted', alimentoSeguro?.id, { x: pageX, y: pageY });
    alimentar(alimentoSeguro);
    zonaActivaRef.current = false;
    zonaRectRef.current = null;
    clearTimeout(hoverTimerRef.current);
    onZoneChange?.(false);
  }, [alimentar, targetRef]);

  const comprobarHover = useCallback((pageX, pageY) => {
    if (disabled || !draggingRef?.current) return;
    const evaluar = (x, y, width, height) => {
      // Histeresis mínima: evita que el estado parpadee por redondeos de
      // coordenadas mientras el dedo permanece cerca del borde.
      const margen = zonaActivaRef.current ? 5 : 0;
      const apto = pageX >= x - margen && pageX <= x + width + margen && pageY >= y - margen && pageY <= y + height + margen;
      if (apto !== zonaActivaRef.current) {
        zonaActivaRef.current = apto;
        onZoneChange?.(apto);
        console.log('[Alimentar] zona', apto ? 'APTA' : 'fuera', { pageX, pageY, x, y, width, height });
        if (apto) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    };
    if (zonaRectRef.current) {
      evaluar(...zonaRectRef.current);
      return;
    }
    targetRef.current?.measureInWindow?.((x, y, width, height) => {
      zonaRectRef.current = [x, y, width, height];
      evaluar(x, y, width, height);
    });
  }, [draggingRef, onZoneChange, targetRef]);

  useEffect(() => {
    if (dropRef) dropRef.current = soltar;
    return () => { if (dropRef) dropRef.current = null; };
  }, [dropRef, soltar]);
  useEffect(() => {
    if (hoverRef) hoverRef.current = comprobarHover;
    return () => { if (hoverRef) hoverRef.current = null; };
  }, [hoverRef, comprobarHover]);

  const IconoHambre = () => (
    <View style={styles.satietyIconWrap}>
      <MaterialIcons name="restaurant" size={12} color="#fff1c8" />
    </View>
  );

  return <>
    <View style={styles.satietyPanel} pointerEvents={durmiendo ? 'none' : 'auto'}>
      <View style={styles.satietyTrack}>
        <View style={[styles.satietyFill, { height: `${saciedad}%`, backgroundColor: estado.color }]} />
        <Text style={styles.satietyPercentage} pointerEvents="none" numberOfLines={1}>{Math.round(saciedad)}%</Text>
      </View>
      <View style={styles.satietyIconWrap}><IconoHambre /></View>
    </View>
    <View style={styles.bondPanel} pointerEvents="none">
      <View style={styles.bondTrack} accessibilityRole="progressbar" accessibilityLabel="Avance del Vínculo" accessibilityValue={{ min: 0, max: VINCULO_POR_NIVEL, now: Math.round(porcentajeVinculo) }}>
        <View style={[styles.bondFill, { height: `${porcentajeVinculo}%` }]} />
        <Text style={styles.bondPercentage} numberOfLines={1}>{Math.round(porcentajeVinculo)}%</Text>
      </View>
      <View style={styles.bondIconWrap}>
        <MaterialIcons name="star" size={14} color="#e2b34d" />
        <Text style={styles.bondIconNumber}>{nivelVinculo}</Text>
      </View>
    </View>
    <View style={styles.sleepPanel} pointerEvents="none">
      <View style={styles.sleepTrack} accessibilityRole="progressbar" accessibilityLabel="Descanso del Animalito" accessibilityValue={{ min: 0, max: 100, now: Math.round(descansoVisible) }}>
        <View style={[styles.sleepFill, { height: `${descansoVisible}%` }]} />
        <Text style={styles.sleepPercentage} numberOfLines={1}>{Math.round(descansoVisible)}%</Text>
      </View>
      <View style={styles.sleepIconWrap}><MaterialIcons name="bedtime" size={12} color="#eff0ff" /></View>
    </View>
    {avisoAlimentacion && <View style={styles.feedNotice} pointerEvents="none"><Text style={styles.feedNoticeText}>{avisoAlimentacion}</Text></View>}
  </>;
});

const Inicio = memo(({ navigation, onReady, style, openReporteSemanal = false }) => {
  const [nivelJuego, setNivelJuego] = useState(1);
  const [nivelMemoriaSabores, setNivelMemoriaSabores] = useState(1);
  const [partidasCompletadas, setPartidasCompletadas] = useState(0);
  const petTargetRef = useRef(null);
  const petIdleScale = useRef(new Animated.Value(1)).current;
  const petIdleY = useRef(new Animated.Value(0)).current;
  const petIdleX = useRef(new Animated.Value(0)).current;
  const petIdleSquash = useRef(new Animated.Value(0)).current;
  const petIdleRotate = useRef(new Animated.Value(0)).current;
  const petBreathScale = useRef(new Animated.Value(1)).current;
  const petFeedScale = useRef(new Animated.Value(1)).current;
  const petFeedY = useRef(new Animated.Value(0)).current;
  const petSleepTransition = useRef(new Animated.Value(0)).current;
  const petIdentityOpacity = useRef(new Animated.Value(0)).current;
  const foodFeedbackTimer = useRef(null);
  const [foodFeedback, setFoodFeedback] = useState(null);
  const [selectedFoodIndex, setSelectedFoodIndex] = useState(-1);
  const feedDropRef = useRef(null);
  const feedHoverRef = useRef(null);
  const draggingRef = useRef(false);
  const petDropZoneRef = useRef(null);
  const [zonaAlimentar, setZonaAlimentar] = useState(false);
  const [arrastreActivo, setArrastreActivo] = useState(false);
  const [avisoSeleccion, setAvisoSeleccion] = useState(null);
  const [rachaAbierta, setRachaAbierta] = useState(false);
  const [alimentarVisible, setAlimentarVisible] = useState(false);
  const alimentarTimerRef = useRef(null);
  const [durmiendoHasta, setDurmiendoHasta] = useState(0);
  const [durmiendoDesde, setDurmiendoDesde] = useState(0);
  const [descansoVisible, setDescansoVisible] = useState(100);
  const descansoBaseRef = useRef({ valor: 100, actualizadoEnMs: 0 });
  const [relojDormir, setRelojDormir] = useState(Date.now());
  const sueñoShortcutAnim = useRef(new Animated.Value(1)).current;
  const petQuickAccessAnim = useRef(new Animated.Value(0)).current;
  const sleepCounterAnim = useRef(new Animated.Value(0)).current;
  const [mostrarContadorSueño, setMostrarContadorSueño] = useState(false);
  const [contadorSueñoTexto, setContadorSueñoTexto] = useState('');
  const { registrarObjetivo } = useRacha();
  const avisoSeleccionTimer = useRef(null);
  const vinculoActualizacionRef = useRef(Promise.resolve());
  const sueñoFinalizandoRef = useRef(false);
  const { data: userAlimentos } = useUserDocument(data => data?.alimentos || {});

  useEffect(() => {
    if (!ANIMACIONES_AMBIENTALES) return undefined;
    if (arrastreActivo) {
      petBreathScale.stopAnimation();
      petBreathScale.setValue(1);
      return undefined;
    }
    let cancelada = false;
    const respirar = () => {
      if (cancelada) return;
      Animated.sequence([
        Animated.timing(petBreathScale, { toValue: 1.018, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(petBreathScale, { toValue: 0.992, duration: 1050, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(260),
      ]).start(({ finished }) => { if (finished && !cancelada) respirar(); });
    };
    respirar();
    return () => {
      cancelada = true;
      petBreathScale.stopAnimation();
      petBreathScale.setValue(1);
    };
  }, [arrastreActivo, petBreathScale]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid, 'juegos', 'conexiones'), snap => {
      const datosJuego = snap.data() || {};
      const siguienteNivel = Number.isFinite(datosJuego.nivel) ? datosJuego.nivel : 1;
      const siguientesPartidas = Math.max(0, Number(datosJuego.partidasCompletadas) || 0);
      setNivelJuego(actual => actual === siguienteNivel ? actual : siguienteNivel);
      setPartidasCompletadas(actual => actual === siguientesPartidas ? actual : siguientesPartidas);
    }, error => console.warn('[Inicio] No se pudo actualizar el progreso de Conexiones', error?.message || error));
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid, 'juegos', 'memoriaSabores'), snap => {
      const nivel = Number(snap.data()?.nivel) || 1;
      const siguienteNivel = Math.max(1, Math.min(200, nivel));
      setNivelMemoriaSabores(actual => actual === siguienteNivel ? actual : siguienteNivel);
    }, error => console.warn('[Inicio] No se pudo actualizar el progreso de Memoria de Sabores', error?.message || error));
  }, []);

  useEffect(() => {
    if (!ANIMACIONES_AMBIENTALES) return undefined;
    if (arrastreActivo) {
      petIdleScale.stopAnimation();
      petIdleY.stopAnimation();
      petIdleX.stopAnimation();
      petIdleSquash.stopAnimation();
      petIdleRotate.stopAnimation();
      petIdleScale.setValue(1);
      petIdleY.setValue(0);
      petIdleX.setValue(0);
      petIdleSquash.setValue(0);
      petIdleRotate.setValue(0);
      return undefined;
    }
    let ciclo = 0;
    let cancelada = false;
    const reproducirMovimiento = () => {
      if (cancelada) return;
      const lado = [1, -1, -1, 1][ciclo % 4];
      const salto = ciclo % 3 === 2;
      const deslizamientoIzquierda = lado === -1 && ciclo % 4 === 2;
      ciclo += 1;
      const animation = Animated.sequence([
      Animated.delay(salto ? 1500 : deslizamientoIzquierda ? 1750 : 2200),
      Animated.parallel([
        Animated.timing(petIdleScale, { toValue: salto ? 1.09 : deslizamientoIzquierda ? 1.025 : 1.045, duration: salto ? 520 : deslizamientoIzquierda ? 260 : 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(petIdleY, { toValue: salto ? -18 : deslizamientoIzquierda ? -1 : -3, duration: salto ? 520 : deslizamientoIzquierda ? 260 : 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(petIdleX, { toValue: salto ? 4 : deslizamientoIzquierda ? -11 : lado * 2.5, duration: salto ? 520 : deslizamientoIzquierda ? 260 : 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(petIdleSquash, { toValue: salto ? -1 : deslizamientoIzquierda ? 1 : lado, duration: salto ? 520 : deslizamientoIzquierda ? 260 : 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(petIdleRotate, { toValue: salto ? 1.5 : deslizamientoIzquierda ? -3.2 : lado, duration: salto ? 520 : deslizamientoIzquierda ? 260 : 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(petIdleScale, { toValue: salto ? 0.96 : deslizamientoIzquierda ? 1.055 : 0.99, duration: salto ? 300 : deslizamientoIzquierda ? 180 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(petIdleY, { toValue: salto ? 3 : deslizamientoIzquierda ? 2 : 1, duration: salto ? 300 : deslizamientoIzquierda ? 180 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(petIdleX, { toValue: deslizamientoIzquierda ? -4 : lado * -2, duration: salto ? 300 : deslizamientoIzquierda ? 180 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(petIdleSquash, { toValue: salto ? 1 : deslizamientoIzquierda ? -1 : lado * -0.7, duration: salto ? 300 : deslizamientoIzquierda ? 180 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(petIdleRotate, { toValue: salto ? lado * -1 : deslizamientoIzquierda ? 1.3 : lado * -0.8, duration: salto ? 300 : deslizamientoIzquierda ? 180 : 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(petIdleScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.spring(petIdleY, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true }),
        Animated.spring(petIdleX, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true }),
        Animated.spring(petIdleSquash, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true }),
        Animated.spring(petIdleRotate, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true }),
      ]),
    ]);
      animation.start(({ finished }) => { if (finished && !cancelada) reproducirMovimiento(); });
    };
    reproducirMovimiento();
    return () => { cancelada = true; };
  }, [arrastreActivo, petIdleRotate, petIdleScale, petIdleSquash, petIdleX, petIdleY]);

  const reaccionarAlComer = useCallback((alimento, recuperado) => {
    const recuperadoValor = typeof recuperado === 'object' ? Number(recuperado?.recuperado) || 0 : Number(recuperado) || 0;
    const nuevaSaciedad = typeof recuperado === 'object' ? Number(recuperado?.nuevaSaciedad) || 0 : 100;
    petFeedScale.stopAnimation();
    petFeedY.stopAnimation();
    petFeedScale.setValue(1);
    petFeedY.setValue(0);
    setFoodFeedback({ emoji: alimento.emoji, recuperado: recuperadoValor, key: Date.now() });
    Animated.sequence([
      Animated.parallel([
        Animated.timing(petFeedY, { toValue: 2, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(petFeedScale, { toValue: 0.96, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(petFeedY, { toValue: -20, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(petFeedScale, { toValue: 1.1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(petFeedY, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(petFeedScale, { toValue: 0.985, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(petFeedScale, { toValue: 1, friction: 5, tension: 95, useNativeDriver: true }),
        Animated.spring(petFeedY, { toValue: 0, friction: 7, tension: 75, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        petFeedY.setValue(0);
        petFeedScale.setValue(1);
      }
    });
    if (foodFeedbackTimer.current) clearTimeout(foodFeedbackTimer.current);
    foodFeedbackTimer.current = setTimeout(() => setFoodFeedback(null), 1300);
    registrarObjetivo('alimentar').catch(() => {});
  }, [petFeedScale, petFeedY, registrarObjetivo]);

  useEffect(() => () => {
    if (foodFeedbackTimer.current) clearTimeout(foodFeedbackTimer.current);
  }, []);
  const [overlayActive, setOverlayActive] = useState(false);
  const { puedeReclamar: regaloDisponible } = useRecompensaDiaria({ paused: overlayActive });
  const [comercianteNuevo, setComercianteNuevo] = useState(false);
  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const [descargasAbierta, setDescargasAbierta] = useState(false);
  const [regalosAbiertos, setRegalosAbiertos] = useState(false);
  const [ruletaAbierta, setRuletaAbierta] = useState(false);
  const [preguntonasAbiertas, setPreguntonasAbiertas] = useState(false);
  const [reporteSemanalAbierto, setReporteSemanalAbierto] = useState(Boolean(openReporteSemanal));
  const puedeAbrirColeccion = auth.currentUser?.email?.toLowerCase() === 'admin@gmail.com';
  const { data: estadoInicio } = useUserDocument(
    selectEstadoInicio,
    undefined,
    equalEstadoInicio,
  );
  const durmiendoActivo = durmiendoHasta > relojDormir;

  // El descanso se guarda como un valor más una fecha de referencia. Así no
  // dependemos de que la app permanezca abierta para que la barra avance o
  // baje: al volver a renderizarla calculamos el valor real con Date.now().
  useEffect(() => {
    const ahora = Date.now();
    const valorGuardado = estadoInicio?.animalitoDescansoPorcentaje;
    const valor = valorGuardado == null ? 100 : descansoSeguro(valorGuardado);
    const actualizadoEnMs = Number(estadoInicio?.animalitoDescansoActualizadoEnMs) || ahora;
    descansoBaseRef.current = { valor, actualizadoEnMs };
    setDescansoVisible(anterior => Math.abs(anterior - valor) < 0.01 ? anterior : valor);
  }, [estadoInicio?.animalito, estadoInicio?.animalitoDescansoPorcentaje, estadoInicio?.animalitoDescansoActualizadoEnMs]);

  useEffect(() => {
    if (durmiendoActivo) return undefined;
    const timer = setInterval(() => setRelojDormir(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [durmiendoActivo]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', estadoApp => {
      if (estadoApp === 'active') setRelojDormir(Date.now());
    });
    return () => suscripcion.remove();
  }, []);

  useEffect(() => {
    const ahora = relojDormir || Date.now();
    const base = descansoBaseRef.current;
    const siguiente = durmiendoActivo
      ? descansoDuranteSueño(base.valor, durmiendoDesde, ahora)
      : descansoDuranteVigilia(base.valor, base.actualizadoEnMs, ahora);
    setDescansoVisible(anterior => Math.abs(anterior - siguiente) < 0.01 ? anterior : siguiente);
  }, [durmiendoActivo, durmiendoDesde, relojDormir, estadoInicio?.animalitoDescansoPorcentaje, estadoInicio?.animalitoDescansoActualizadoEnMs]);

  useEffect(() => {
    sueñoShortcutAnim.stopAnimation();
    sueñoShortcutAnim.setValue(0.72);
    Animated.spring(sueñoShortcutAnim, {
      toValue: 1,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [durmiendoActivo, sueñoShortcutAnim]);

  useEffect(() => {
    // Mantiene ambos estados montados y los cruza suavemente. Así, al cargar
    // una sesión que ya estaba durmiendo no aparece primero el Animalito para
    // cambiar de golpe a la bolsa.
    petSleepTransition.stopAnimation();
    Animated.timing(petSleepTransition, {
      toValue: durmiendoActivo ? 1 : 0,
      duration: 680,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => petSleepTransition.stopAnimation();
  }, [durmiendoActivo, petSleepTransition]);

  useEffect(() => {
    petQuickAccessAnim.stopAnimation();
    if (!alimentarVisible) {
      petQuickAccessAnim.setValue(0);
      return undefined;
    }
    petQuickAccessAnim.setValue(0.82);
    const animation = Animated.spring(petQuickAccessAnim, {
      toValue: 1,
      tension: 145,
      friction: 9,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [alimentarVisible, petQuickAccessAnim]);

  useEffect(() => {
    sleepCounterAnim.stopAnimation();
    if (durmiendoActivo) {
      setMostrarContadorSueño(true);
      sleepCounterAnim.setValue(0);
      const animation = Animated.timing(sleepCounterAnim, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      animation.start();
      return () => animation.stop();
    }
    const animation = Animated.timing(sleepCounterAnim, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) setMostrarContadorSueño(false); });
    return () => animation.stop();
  }, [durmiendoActivo, sleepCounterAnim]);

  useEffect(() => {
    if (durmiendoActivo) setContadorSueñoTexto(formatoDormir(durmiendoHasta, relojDormir));
  }, [durmiendoActivo, durmiendoHasta, relojDormir]);

  const [animalitoDetalle, setAnimalitoDetalle] = useState({ id: null, apodo: '', iconoApodo: null, nivel: 1, vinculo: 0, listo: false });

  const actualizarVinculo = useCallback((cantidad, opciones = {}) => {
    const registrar = async () => {
      const uid = auth.currentUser?.uid;
      const animalId = estadoInicio?.animalito;
      if (!uid || !animalId || !cantidad) return;
      const idSueño = Number(opciones?.idSueño) || 0;
      const path = ['usuarios', uid, 'animalitos', animalId];
      const animalRef = doc(db, ...path);
      try {
        let siguienteVinculo = 0;
        if (isOfflineModeEnabled()) {
          const cache = await getCachedDocument(uid, path).catch(() => null);
          const base = cache || {};
          const proyectado = await getProjectedDocument(uid, path, base).catch(() => base);
          const vinculoActual = vinculoDesdeAnimal(proyectado, estadoInicio?.nivelAnimalito);
          const sueñoYaProcesado = idSueño > 0 && Number(proyectado?.ultimoSueñoProcesadoDesdeMs) === idSueño;
          siguienteVinculo = vinculoActual;
          if (!sueñoYaProcesado) {
            siguienteVinculo += Number(cantidad);
            const update = { vinculo: siguienteVinculo };
            if (idSueño > 0) update.ultimoSueñoProcesadoDesdeMs = idSueño;
            await syncSetDoc(animalRef, update, { merge: true });
          }
        } else {
          await runTransaction(db, async transaction => {
            const snapshot = await transaction.get(animalRef);
            const datos = snapshot.exists() ? snapshot.data() || {} : {};
            const vinculoActual = vinculoDesdeAnimal(datos, estadoInicio?.nivelAnimalito);
            if (idSueño > 0 && Number(datos?.ultimoSueñoProcesadoDesdeMs) === idSueño) {
              siguienteVinculo = vinculoActual;
              return;
            }
            siguienteVinculo = vinculoActual + Number(cantidad);
            const update = { vinculo: siguienteVinculo };
            if (idSueño > 0) update.ultimoSueñoProcesadoDesdeMs = idSueño;
            transaction.set(animalRef, update, { merge: true });
          });
        }
        setAnimalitoDetalle(actual => actual.id === animalId ? { ...actual, vinculo: siguienteVinculo, listo: true } : actual);
      } catch (error) {
        console.warn('[Vinculo] No se pudo registrar el avance', error?.message || error);
      }
    };
    vinculoActualizacionRef.current = vinculoActualizacionRef.current.then(registrar, registrar);
    return vinculoActualizacionRef.current;
  }, [estadoInicio?.animalito, estadoInicio?.nivelAnimalito]);

  const finalizarSueño = useCallback(({ desde = 0, hasta = 0, ahora = Date.now() } = {}) => {
    if (sueñoFinalizandoRef.current) return;
    const inicioSeguro = Number(desde) || 0;
    const finalSeguro = Number(hasta) || 0;
    if (!finalSeguro) return;
    sueñoFinalizandoRef.current = true;
    const puntos = puntosPorSueño(inicioSeguro, finalSeguro, ahora);
    const descansoFinal = inicioSeguro
      ? descansoDuranteSueño(descansoBaseRef.current.valor, inicioSeguro, ahora)
      : descansoDuranteVigilia(descansoBaseRef.current.valor, descansoBaseRef.current.actualizadoEnMs, ahora);
    descansoBaseRef.current = { valor: descansoFinal, actualizadoEnMs: ahora };
    setDescansoVisible(descansoFinal);
    setDurmiendoHasta(0);
    setDurmiendoDesde(0);
    setRelojDormir(ahora);
    setAlimentarVisible(false);
    const uid = auth.currentUser?.uid;
    const limpiarSueño = () => uid
      ? syncSetDoc(doc(db, 'usuarios', uid), { animalitoDurmiendoHastaMs: 0, animalitoDurmiendoDesdeMs: 0, animalitoDescansoPorcentaje: descansoFinal, animalitoDescansoActualizadoEnMs: ahora }, { merge: true })
      : Promise.resolve();
    const recompensa = puntos > 0 && inicioSeguro
      ? actualizarVinculo(puntos, { idSueño: inicioSeguro })
      : Promise.resolve();
    Promise.resolve(recompensa)
      .then(limpiarSueño)
      .catch(error => console.warn('[Dormir] No se pudo cerrar el descanso', error?.message || error))
      .finally(() => { sueñoFinalizandoRef.current = false; });
  }, [actualizarVinculo]);

  const actualizarDescansoPorComida = useCallback((cantidad = 1) => {
    const incremento = Number(cantidad) || 0;
    if (incremento <= 0) return Promise.resolve();
    const ahora = Date.now();
    const base = descansoBaseRef.current;
    const antesDeComer = descansoDuranteVigilia(base.valor, base.actualizadoEnMs, ahora);
    const siguiente = descansoSeguro(antesDeComer + incremento);
    descansoBaseRef.current = { valor: siguiente, actualizadoEnMs: ahora };
    setDescansoVisible(siguiente);
    const uid = auth.currentUser?.uid;
    if (!uid) return Promise.resolve();
    return syncSetDoc(doc(db, 'usuarios', uid), {
      animalitoDescansoPorcentaje: siguiente,
      animalitoDescansoActualizadoEnMs: ahora,
    }, { merge: true }).catch(error => {
      console.warn('[Descanso] No se pudo guardar el avance', error?.message || error);
    });
  }, []);

  useEffect(() => {
    const hastaGuardado = Number(estadoInicio?.animalitoDurmiendoHastaMs) || 0;
    const ahora = Date.now();
    if (!hastaGuardado) {
      setDurmiendoHasta(0);
      setDurmiendoDesde(0);
      setRelojDormir(ahora);
      return;
    }
    const desdeGuardado = Number(estadoInicio?.animalitoDurmiendoDesdeMs) || 0;
    const desde = desdeGuardado > 0 && desdeGuardado < hastaGuardado
      ? desdeGuardado
      : hastaGuardado - DURACION_DORMIR_MS;
    if (hastaGuardado > ahora) {
      setDurmiendoDesde(desde);
      setDurmiendoHasta(hastaGuardado);
      setRelojDormir(ahora);
    } else {
      finalizarSueño({ desde, hasta: hastaGuardado, ahora });
    }
  }, [estadoInicio?.animalito, estadoInicio?.animalitoDurmiendoDesdeMs, estadoInicio?.animalitoDurmiendoHastaMs, finalizarSueño]);

  useEffect(() => {
    if (!durmiendoHasta) return undefined;
    const timer = setInterval(() => {
      const ahora = Date.now();
      setRelojDormir(ahora);
      if (durmiendoHasta <= ahora) finalizarSueño({ desde: durmiendoDesde, hasta: durmiendoHasta, ahora });
    }, 30000);
    return () => clearInterval(timer);
  }, [durmiendoDesde, durmiendoHasta, finalizarSueño]);

  useEffect(() => {
    if (durmiendoHasta && durmiendoHasta <= relojDormir) {
      finalizarSueño({ desde: durmiendoDesde, hasta: durmiendoHasta, ahora: relojDormir });
    }
  }, [durmiendoDesde, durmiendoHasta, finalizarSueño, relojDormir]);

  const dormirAnimalito = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || durmiendoActivo) return;
    const desde = Date.now();
    const hasta = desde + DURACION_DORMIR_MS;
    const descansoAlDormir = descansoDuranteVigilia(
      descansoBaseRef.current.valor,
      descansoBaseRef.current.actualizadoEnMs,
      desde,
    );
    descansoBaseRef.current = { valor: descansoAlDormir, actualizadoEnMs: desde };
    setDescansoVisible(descansoAlDormir);
    setDurmiendoDesde(desde);
    setDurmiendoHasta(hasta);
    setRelojDormir(desde);
    setAlimentarVisible(false);
    syncSetDoc(doc(db, 'usuarios', uid), {
      animalitoDurmiendoDesdeMs: desde,
      animalitoDurmiendoHastaMs: hasta,
      animalitoDescansoPorcentaje: descansoAlDormir,
      animalitoDescansoActualizadoEnMs: desde,
    }, { merge: true }).catch(error => console.warn('[Dormir] No se pudo guardar el descanso', error?.message || error));
  }, [durmiendoActivo]);
  const despertarAnimalito = useCallback(() => {
    if (!durmiendoHasta) return;
    finalizarSueño({ desde: durmiendoDesde, hasta: durmiendoHasta, ahora: Date.now() });
  }, [durmiendoDesde, durmiendoHasta, finalizarSueño]);
  const alternarSueño = durmiendoActivo ? despertarAnimalito : dormirAnimalito;

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    const animalId = estadoInicio?.animalito;
    if (!uid || !animalId) {
      setAnimalitoDetalle({ id: null, apodo: '', iconoApodo: null, nivel: 1, vinculo: 0, listo: false });
      return undefined;
    }
    const path = ['usuarios', uid, 'animalitos', animalId];
    let activo = true;
    let ultimoCache = '';
    const mostrarRespaldo = setTimeout(() => {
      if (!activo) return;
      setAnimalitoDetalle(actual => actual.id === animalId && !actual.listo ? { ...actual, listo: true } : actual);
    }, 450);
    const aplicar = async (incoming = {}, guardarCache = false) => {
      const cached = await getCachedDocument(uid, path).catch(() => null);
      const base = isOfflineModeEnabled() && cached ? { ...cached, ...incoming } : { ...(cached || {}), ...incoming };
      const proyectado = await getProjectedDocument(uid, path, base).catch(() => base);
      if (!activo) return;
      const siguiente = {
        id: animalId,
        apodo: String(proyectado?.apodo || '').trim(),
        iconoApodo: String(proyectado?.iconoApodo || '').trim() || null,
        nivel: Math.max(1, Number(proyectado?.nivel) || estadoInicio?.nivelAnimalito || 1),
        vinculo: vinculoDesdeAnimal(proyectado, estadoInicio?.nivelAnimalito),
        listo: true,
      };
      clearTimeout(mostrarRespaldo);
      setAnimalitoDetalle(actual => actual.id === siguiente.id && actual.apodo === siguiente.apodo && actual.iconoApodo === siguiente.iconoApodo && actual.nivel === siguiente.nivel && actual.vinculo === siguiente.vinculo && actual.listo === siguiente.listo ? actual : siguiente);
      if (guardarCache) {
        const firma = JSON.stringify(proyectado || {});
        if (firma !== ultimoCache) {
          ultimoCache = firma;
          cacheDocument(uid, path, proyectado || {}).catch(() => {});
        }
      }
    };
    setAnimalitoDetalle({ id: animalId, apodo: '', iconoApodo: null, nivel: estadoInicio.nivelAnimalito || 1, vinculo: estadoInicio.vinculoAnimalito || 0, listo: false });
    getCachedDocument(uid, path).then(cached => { if (cached) aplicar(cached, false); }).catch(() => {});
    const quitarCache = subscribeCachedDocument(uid, path, data => { if (data) aplicar(data, false); });
    const unsub = onSnapshot(doc(db, ...path), snapshot => aplicar(snapshot.data() || {}, true), () => {});
    return () => { activo = false; clearTimeout(mostrarRespaldo); unsub(); quitarCache(); };
  }, [estadoInicio?.animalito]);

  useEffect(() => {
    petIdentityOpacity.stopAnimation();
    petIdentityOpacity.setValue(0);
    if (!animalitoDetalle.listo) return undefined;
    const animation = Animated.timing(petIdentityOpacity, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [animalitoDetalle.apodo, animalitoDetalle.iconoApodo, animalitoDetalle.id, animalitoDetalle.listo, petIdentityOpacity]);

  useEffect(() => {
    if (overlayActive || !estadoInicio?.animalito) setSelectedFoodIndex(-1);
    if (overlayActive || !estadoInicio?.animalito) setAlimentarVisible(false);
  }, [estadoInicio?.animalito, overlayActive]);

  useEffect(() => {
    clearTimeout(alimentarTimerRef.current);
    if (!alimentarVisible) return undefined;
    alimentarTimerRef.current = setTimeout(() => setAlimentarVisible(false), 7000);
    return () => clearTimeout(alimentarTimerRef.current);
  }, [alimentarVisible]);

  useEffect(() => {
    if (selectedFoodIndex < 0 || arrastreActivo) return undefined;
    const timer = setTimeout(() => setSelectedFoodIndex(-1), 6000);
    return () => clearTimeout(timer);
  }, [arrastreActivo, selectedFoodIndex]);

  const seleccionarAlimento = useCallback(() => {
    const disponibles = ALIMENTOS.filter(alimento => Number(userAlimentos?.[alimento.id]) > 0);
    if (!disponibles.length) {
      setAvisoSeleccion('🛒  Comprá comida en el Comerciante');
      clearTimeout(avisoSeleccionTimer.current);
      avisoSeleccionTimer.current = setTimeout(() => setAvisoSeleccion(null), 2600);
      return;
    }
    setSelectedFoodIndex(actual => {
      const indiceActual = ALIMENTOS.findIndex(alimento => alimento.id === ALIMENTOS[actual]?.id);
      for (let paso = 1; paso <= ALIMENTOS.length; paso += 1) {
        const candidato = ALIMENTOS[(indiceActual + paso) % ALIMENTOS.length];
        if (Number(userAlimentos?.[candidato.id]) > 0) return ALIMENTOS.indexOf(candidato);
      }
      return ALIMENTOS.indexOf(disponibles[0]);
    });
  }, [userAlimentos]);
  const { data: parejaInicio } = useUserDocument(
    data => data ? { nombre: data.nombre || data.datosCompletos?.nombre || 'Tu pareja', exp: Number(data.exp) || 0, ultimaActividad: data.ultimaActividad, componenteActual: data.componenteActual } : null,
    estadoInicio?.pareja || '',
  );
  const [actividadPareja, setActividadPareja] = useState(null);
  const [relojActividad, setRelojActividad] = useState(Date.now());

  useEffect(() => {
    if (!estadoInicio?.pareja || !actividadPareja) return undefined;
    const interval = setInterval(() => setRelojActividad(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [actividadPareja, estadoInicio?.pareja]);

  useEffect(() => {
    const uidPareja = estadoInicio?.pareja;
    if (!uidPareja) {
      setActividadPareja(actual => actual === null ? actual : null);
      return undefined;
    }
    const actividadRef = query(
      collection(db, 'usuarios', uidPareja, 'actividad'),
      orderBy('creadoEn', 'desc'),
      limit(1),
    );
    return onSnapshot(actividadRef, snap => {
      const siguiente = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
      setActividadPareja(actual => {
        if (!actual && !siguiente) return actual;
        if (actual?.id === siguiente?.id && actual?.tipo === siguiente?.tipo && actual?.nivel === siguiente?.nivel && actual?.cantidad === siguiente?.cantidad && actual?.creadoEn === siguiente?.creadoEn) return actual;
        return siguiente;
      });
    }, () => setActividadPareja(actual => actual === null ? actual : null));
  }, [estadoInicio?.pareja]);

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
      const siguiente = valor !== rotacionKey;
      setComercianteNuevo(actual => actual === siguiente ? actual : siguiente);
    }).catch(() => {});
    return undefined;
  }, []);

  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current?.(); }, []);

  useEffect(() => {
    if (openReporteSemanal) {
      setReporteSemanalAbierto(true);
      setOverlayActive(true);
    }
  }, [openReporteSemanal]);

  const cerrarReporteSemanal = useCallback(() => {
    setReporteSemanalAbierto(false);
    setOverlayActive(false);
  }, []);

  const abrirComerciante = useCallback(() => {
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
  }, [navigation]);

  const faltanParaBonus = 5 - (partidasCompletadas % 5);
  const siguientePaso = useMemo(() => {
    const mensajesJuego = [
      { titulo: 'Continúa jugando', detalle: `Conexiones · Nivel ${nivelJuego}` },
      { titulo: 'Supera tu mejor marca', detalle: `El nivel ${nivelJuego} todavía puede brillar más.` },
      { titulo: 'Consigue más estrellas', detalle: 'Una partida perfecta mejora tus premios.' },
      { titulo: 'Avanza un nivel más', detalle: `Tu próximo desafío es el nivel ${nivelJuego}.` },
    ];
    const mensajeJuego = faltanParaBonus === 1
      ? { titulo: 'Una partida para premio extra', detalle: 'La quinta victoria entrega una sorpresa.' }
      : mensajesJuego[partidasCompletadas % mensajesJuego.length];
    if (!estadoInicio?.animalito) return {
        icono: 'pets', titulo: 'Elige un Animalito', detalle: 'Tu compañero te está esperando.', insignia: 'ELEGIR',
        accion: () => navigation?.navigate('animalitos'),
      };
    if (parejaInicio && actividadPareja) {
      const nombrePareja = parejaInicio.nombre || 'Tu pareja';
      const actividad = actividadPareja;
      const timestamp = horaDeActividad(actividad.creadoEn);
      const componenteActual = nombreComponente(parejaInicio.componenteActual);
      const mensajesActividad = {
        nivel: { icono: 'trending-up', titulo: `${nombrePareja} subió al nivel ${actividad.nivel}`, detalle: `${timestamp} · ${componenteActual}`, insignia: 'NIVEL' },
        compra: { icono: 'shopping-bag', titulo: `${nombrePareja} gastó ${actividad.cantidad} monedas`, detalle: `${timestamp} · ${componenteActual}`, insignia: 'COMPRA' },
        epico: { icono: 'auto-awesome', titulo: `${nombrePareja} consiguió algo épico`, detalle: `${timestamp} · ${componenteActual}`, insignia: 'ÉPICO' },
        monedas: { icono: 'monetization-on', titulo: `${nombrePareja} obtuvo ${actividad.cantidad} monedas`, detalle: `${timestamp} · ${componenteActual}`, insignia: 'MONEDAS' },
      };
      const mensajeActividad = mensajesActividad[actividad.tipo];
      if (mensajeActividad) return { ...mensajeActividad, accion: () => navigation?.navigate('perfil', { uid: estadoInicio?.pareja }) };
    }
    if (parejaInicio) {
      const nivelPareja = 1 + Math.floor(parejaInicio.exp / 100);
      return {
        icono: 'favorite', titulo: `${parejaInicio.nombre} está en nivel ${nivelPareja}`,
        detalle: 'Mirá cómo sigue creciendo su historia.', insignia: 'PAREJA',
        accion: () => navigation?.navigate('perfil', { uid: estadoInicio?.pareja }),
      };
    }
    if (comercianteNuevo) return {
            icono: 'storefront', titulo: 'El Comerciante renovó', detalle: 'Hay nuevos objetos esperando.', insignia: 'NUEVO',
            accion: abrirComerciante,
          };
    return {
            icono: 'extension', titulo: mensajeJuego.titulo, detalle: mensajeJuego.detalle, insignia: faltanParaBonus === 1 ? '1 MÁS' : '+5 EXP',
            accion: () => navigation?.navigate('conexiones'),
          };
  }, [abrirComerciante, actividadPareja, comercianteNuevo, estadoInicio?.animalito, estadoInicio?.pareja, faltanParaBonus, navigation, nivelJuego, parejaInicio, partidasCompletadas, relojActividad]);

  const animalitoBase = ANIMALITOS.find(animal => animal.id === animalitoDetalle.id);
  const apodoVisible = animalitoDetalle.apodo || animalitoBase?.nombre || 'Tu compañero';

  return (
    <OverlayContext.Provider value={overlayActive}>
      <View
        style={[styles.container, style]}
        onTouchEnd={() => {
          if (alimentarVisible) setAlimentarVisible(false);
        }}
      >
        <RoomBackground heartDensity="none" />
        <StatusBar hidden={true} />
        <Text style={styles.pruebaHola}>Hola</Text>
        <MoneyMenu />
        <QuickMenu />
        <SiguientePaso icono={siguientePaso.icono} titulo={siguientePaso.titulo} detalle={siguientePaso.detalle} insignia={siguientePaso.insignia} onPress={siguientePaso.accion} />
        <AccesosRegalos onRuleta={() => { setRuletaAbierta(true); setOverlayActive(true); }} regaloDisponible={regaloDisponible} loteDisponible={estadoInicio?.diamantes >= 50} onRegaloDiario={() => { setRegalosAbiertos(true); setOverlayActive(true); }} onLotes={() => navigation?.navigate('lotes', { animalId: 'ardilla' })} onPreguntonas={() => { setPreguntonasAbiertas(true); setOverlayActive(true); }} />
        <View style={styles.playerShadow}>
          <Svg width="100%" height="100%" viewBox="0 0 100 30">
            <Defs>
              <RadialGradient id="playerShadowGradient" cx="50%" cy="42%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#4f303c" stopOpacity="0.45" />
                <Stop offset="0.48" stopColor="#704655" stopOpacity="0.28" />
                <Stop offset="1" stopColor="#8e6370" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="playerContactGradient" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#3d252e" stopOpacity="0.52" />
                <Stop offset="1" stopColor="#60404b" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="16" rx="50" ry="13" fill="url(#playerShadowGradient)" />
            <Ellipse cx="50" cy="14" rx="30" ry="7" fill="url(#playerContactGradient)" />
            <Path d="M17 17C31 23 69 23 83 17C72 26 28 26 17 17Z" fill="#65404d" opacity="0.12" />
            <Path d="M27 10C39 6 62 6 74 10" fill="none" stroke="#fff0f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
          </Svg>
        </View>
        <Animated.View ref={petTargetRef} collapsable={false} style={[styles.player, { transform: [{ translateX: petIdleX }, { translateY: petIdleY }, { translateY: petFeedY }, { rotate: petIdleRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] }) }, { scaleX: petIdleSquash.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.015, 1, 0.985] }) }, { scaleY: petIdleSquash.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.985, 1, 1.015] }) }, { scale: petIdleScale }, { scale: petBreathScale }, { scale: petFeedScale }] }]}>
          <View style={styles.petTouch} pointerEvents="none">
            <Animated.View style={[styles.playerFill, { opacity: petSleepTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
              <Player containerStyle={styles.playerFill} imageStyle={styles.playerImage} disabled={overlayActive || durmiendoActivo} />
            </Animated.View>
            <Animated.View style={[styles.playerFill, { opacity: petSleepTransition }]} pointerEvents="none">
              <Player containerStyle={styles.playerFill} imageStyle={[styles.playerImage, styles.sleepingBagImage]} staticSource={BOLSA_DORMIR_IMAGE} />
            </Animated.View>
            <View ref={petDropZoneRef} collapsable={false} pointerEvents="none" style={[styles.petDropZone, { backgroundColor: zonaAlimentar ? 'rgba(40,190,75,0.42)' : 'rgba(220,45,45,0.34)' }]} />
          </View>
        </Animated.View>
        {estadoInicio?.animalito && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir acciones del Animalito" activeOpacity={1} onTouchEnd={event => event.stopPropagation()} onPress={() => setAlimentarVisible(actual => !actual)} style={styles.petTouchHitbox} />}
        {estadoInicio?.animalito && animalitoDetalle.listo && <Animated.View style={[styles.petIdentity, { opacity: petIdentityOpacity, transform: [{ translateY: petIdentityOpacity.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }]} pointerEvents="none">
          {mostrarContadorSueño && <Animated.View style={[styles.petSleepCountdownWrap, { opacity: sleepCounterAnim, transform: [{ translateY: sleepCounterAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }, { scale: sleepCounterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}> 
            <Text style={styles.petSleepCountdown}>{contadorSueñoTexto}</Text>
          </Animated.View>}
          <View style={styles.petIdentityNameRow}>
            {animalitoDetalle.iconoApodo && <MaterialIcons name={animalitoDetalle.iconoApodo} size={13} color="#b94f6d" />}
            <Text style={styles.petIdentityName} numberOfLines={1}>{apodoVisible}</Text>
          </View>
        </Animated.View>}
        {estadoInicio?.animalito && <CuidadoAnimal parejaUid={estadoInicio?.pareja} targetRef={petDropZoneRef} vinculo={animalitoDetalle.vinculo} descanso={descansoVisible} disabled={overlayActive || durmiendoActivo} durmiendo={durmiendoActivo} onFed={reaccionarAlComer} onBond={actualizarVinculo} onDescansoChange={actualizarDescansoPorComida} dropRef={feedDropRef} hoverRef={feedHoverRef} onZoneChange={setZonaAlimentar} draggingRef={draggingRef} />}
        {estadoInicio?.animalito && alimentarVisible && <Animated.View onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()} style={[styles.petQuickAccess, arrastreActivo && styles.petQuickAccessDragging, { opacity: petQuickAccessAnim, transform: [{ translateY: petQuickAccessAnim.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }, { scale: petQuickAccessAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
          <AlimentoArrastrable
            alimento={selectedFoodIndex >= 0 ? ALIMENTOS[selectedFoodIndex] : ALIMENTOS[0]}
            cantidad={selectedFoodIndex >= 0 ? Math.max(0, Number(userAlimentos?.[ALIMENTOS[selectedFoodIndex]?.id]) || 0) : 0}
            disabled={durmiendoActivo || overlayActive || selectedFoodIndex < 0}
            onDrop={(alimento, x, y) => feedDropRef.current?.(alimento, x, y)}
            onDragMove={(x, y) => feedHoverRef.current?.(x, y)}
            draggingRef={draggingRef}
            onDragState={setArrastreActivo}
            renderContent={({ ocultarIcono } = {}) => <>
              <Text style={[styles.petQuickFoodEmoji, ocultarIcono && styles.foodOriginalIconHidden]}>{selectedFoodIndex >= 0 ? ALIMENTOS[selectedFoodIndex]?.emoji : '🍽️'}</Text>
              <Text style={[styles.petQuickAccessText, ocultarIcono && styles.foodOriginalIconHidden]}>Alimentar</Text>
              {selectedFoodIndex >= 0 && <Text style={styles.petQuickAccessCount}>{Math.max(0, Number(userAlimentos?.[ALIMENTOS[selectedFoodIndex]?.id]) || 0)}</Text>}
            </>}
            style={styles.petQuickAccessButton}
            dragPreview
            onPress={seleccionarAlimento}
          />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={durmiendoActivo ? 'Despertar Animalito' : 'Dormir Animalito'} style={styles.petQuickSleep} activeOpacity={0.78} onPress={alternarSueño}>
            <Animated.View style={[styles.petSleepShortcutContent, { opacity: sueñoShortcutAnim, transform: [{ scale: sueñoShortcutAnim }] }]}>
              <MaterialIcons name={durmiendoActivo ? 'wb-sunny' : 'bedtime'} size={14} color="#ad5b78" />
              <Text style={styles.petQuickSleepText}>{durmiendoActivo ? 'Despertar' : 'Dormir'}</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>}
        {foodFeedback && <Animated.View key={foodFeedback.key} style={styles.foodFeedback}><Text style={styles.foodFeedbackEmoji}>{foodFeedback.emoji}</Text><Text style={styles.foodFeedbackText}>+{foodFeedback.recuperado}</Text></Animated.View>}
        {avisoSeleccion && <View style={[styles.feedNotice, styles.feedNoticeSelection]} pointerEvents="none"><Text style={styles.feedNoticeText}>{avisoSeleccion}</Text></View>}
        <Pareja navigation={navigation} isPaused={overlayActive} />
        <PanelPerfil navigation={navigation} />
        <TouchableOpacity style={styles.descargasAccess} onPress={() => { setDescargasAbierta(true); setOverlayActive(true); }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Preparar descargas">
          <MaterialIcons name="cloud-download" size={17} color="#fff8dc" />
        </TouchableOpacity>
        <View style={styles.canjearWrap}>
          <TouchableOpacity style={styles.canjearBtn} hitSlop={6} activeOpacity={0.75} onPress={() => navigation?.navigate('animalitos')}>
            <View style={styles.canjearIcon}><MaterialIcons name="pets" size={20} color="#f8edf4" /></View>
          </TouchableOpacity>
        </View>
        <View style={[styles.accesosInicioWrap, arrastreActivo && styles.accesosInicioWrapDragging]}>
          <TouchableOpacity style={[styles.accesoInicioBtn, styles.accesoInicioFirst]} onPress={() => setInventarioAbierto(true)} activeOpacity={0.75}>
            <MaterialIcons name="inventory-2" size={19} color="#b87945" />
            <Text style={styles.accesoInicioText}>Inventario</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.accesoInicioBtn} onPress={() => { setRachaAbierta(true); setOverlayActive(true); }} activeOpacity={0.75}>
            <MaterialIcons name="local-fire-department" size={19} color="#c46d83" />
            <Text style={styles.accesoInicioText}>Racha</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.accesoInicioBtn, styles.accesoInicioLast, styles.accesoInicioDisabled]} activeOpacity={0.8} onPress={() => global.showToast?.({ type: 'info', text1: 'Próximamente' })}>
            <MaterialIcons name="hourglass-empty" size={18} color="#999287" />
            <Text style={[styles.accesoInicioText, styles.accesoInicioTextDisabled]}>Próximamente</Text>
          </TouchableOpacity>
        </View>
        {inventarioAbierto && <InventarioModal visible onClose={() => setInventarioAbierto(false)} />}
        <Descargas visible={descargasAbierta} onClose={() => { setDescargasAbierta(false); setOverlayActive(false); }} />
        <RachaVisualModal visible={rachaAbierta} onClose={() => { setRachaAbierta(false); setOverlayActive(false); }} />
        <Eventos navigation={navigation} />
        <View style={styles.temporadasQuickWrap}>
          <TouchableOpacity style={[styles.temporadasQuickBtn, !puedeAbrirColeccion && styles.temporadasQuickDisabled]} hitSlop={6} activeOpacity={0.75} onPress={() => puedeAbrirColeccion && navigation?.navigate('temporadas')} disabled={!puedeAbrirColeccion}>
            <View style={[styles.temporadasQuickIcon, !puedeAbrirColeccion && styles.temporadasQuickIconDisabled]}><MaterialIcons name="event" size={20} color={puedeAbrirColeccion ? '#fff8dc' : '#aaa49a'} /></View>
          </TouchableOpacity>
        </View>
        <View style={styles.comercianteQuickWrap}>
          <TouchableOpacity style={styles.comercianteQuickBtn} activeOpacity={0.75} onPress={abrirComerciante}>
            <View style={styles.comercianteQuickIcon}><MaterialIcons name="storefront" size={19} color="#f4fff0" /></View>
            {comercianteNuevo && <View style={styles.unreadDotVerde} />}
          </TouchableOpacity>
        </View>
        <Modal visible={regalosAbiertos} transparent animationType="fade" onRequestClose={() => { setRegalosAbiertos(false); setOverlayActive(false); }}>
          <View style={styles.regaloDiarioModalFondo}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setRegalosAbiertos(false); setOverlayActive(false); }} />
            <View style={styles.regaloDiarioModalCard}>
              <View style={styles.regaloDiarioModalHeader}>
                <View style={styles.regaloDiarioModalIcon}><MaterialIcons name="card-giftcard" size={20} color="#fff8dc" /></View>
                <View style={styles.regaloDiarioModalInfo}><Text style={styles.regaloDiarioModalTitle}>REGALO DIARIO</Text><Text style={styles.regaloDiarioModalSub}>UNA SORPRESA PARA CADA DÍA</Text></View>
                <TouchableOpacity style={styles.regaloDiarioModalClose} onPress={() => { setRegalosAbiertos(false); setOverlayActive(false); }}><MaterialIcons name="close" size={18} color="#76552f" /></TouchableOpacity>
              </View>
              <CajasRecompensa onOverlayChange={NOOP} overlayActive={false} compactModal />
            </View>
          </View>
        </Modal>
        <RuletaDiariaModal visible={ruletaAbierta} onClose={() => { setRuletaAbierta(false); setOverlayActive(false); }} />
        <PreguntonasModal visible={preguntonasAbiertas} parejaUid={estadoInicio?.pareja} nombrePareja={parejaInicio?.nombre || 'Tu pareja'} onClose={() => { setPreguntonasAbiertas(false); setOverlayActive(false); }} />
        <TouchableOpacity style={styles.jugarBtn} activeOpacity={0.82} onPress={() => {
          navigation?.navigate('dulces');
        }}>
          <Image source={JUGAR_IMAGE} style={styles.jugarImagen} contentFit="contain" cachePolicy="memory-disk" transition={0} />
          <View style={styles.jugarContenido}>
            <MaterialIcons name="psychology" size={21} color="#fff1b8" />
            <View>
              <Text style={styles.jugarTexto}>JUGAR</Text>
              {nivelMemoriaSabores != null && <Text style={styles.jugarDescripcion}>Eres nivel {nivelMemoriaSabores}</Text>}
            </View>
          </View>
        </TouchableOpacity>
        {alimentarVisible && <TouchableOpacity style={styles.petQuickDismiss} activeOpacity={1} onPress={() => setAlimentarVisible(false)} />}
      </View>
    </OverlayContext.Provider>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  descargasAccess: { position: 'absolute', top: 8, left: 238, width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(111,152,118,0.82)', borderWidth: 1, borderColor: 'rgba(239,249,233,0.72)', shadowColor: '#405744', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 3, elevation: 220, zIndex: 220 },
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
  siguientePaso: { position: 'absolute', top: '42%', right: 14, width: 210, height: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#fff4d6', borderWidth: 1.5, borderColor: '#c89a55', shadowColor: '#4b2f18', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 18, zIndex: 215 },
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
  accesosRegalos: { position: 'absolute', right: 14, top: '20%', flexDirection: 'row', gap: 5, zIndex: 215, elevation: 18 },
  accesoRegalo: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#fff4d6', borderWidth: 1.5, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 8 },
  accesoRegaloProximo: { backgroundColor: '#f3ecfa', borderColor: '#b59bc9' },
  accesoRegaloAjolote: { backgroundColor: '#ffe8f2', borderColor: '#d77da8' },
  accesoRegaloErizo: { backgroundColor: '#eee5f8', borderColor: '#76559a' },
  accesoRegaloDiario: { borderColor: '#df90a7', backgroundColor: '#fff0f3' },
  accesoRegaloLotes: { borderColor: '#d19a35', backgroundColor: '#fff1bf' },
  accesoRegaloPreguntonas: { borderColor: '#bd7f9b', backgroundColor: '#f8e5ee' },
  iconoLotesWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  iconoAjoloteWrap: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center' },
  iconoAjoloteImagen: { position: 'absolute', width: 25, height: 25, borderRadius: 8 },
  iconoErizoWrap: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center' },
  iconoErizoAura: { position: 'absolute', width: 34, height: 34, borderRadius: 11, backgroundColor: '#3b254c', borderWidth: 1.5, borderColor: '#b88ad2' },
  iconoErizoImagen: { width: 27, height: 27, borderRadius: 9, borderWidth: 1, borderColor: '#e4c578' },
  accesoRegaloDot: { position: 'absolute', top: 5, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#e2577a', borderWidth: 1, borderColor: '#fff7df' },
  accesoLoteDot: { backgroundColor: '#e6a52d', borderColor: '#fff4bf' },
  accesoAjoloteDot: { backgroundColor: '#d64f91', borderColor: '#ffe9f5' },
  accesoErizoDot: { backgroundColor: '#f0bd4f', borderColor: '#3b254c' },
  regaloDiarioModalFondo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(25,15,10,0.72)' },
  regaloDiarioModalCard: { width: 420, height: 225, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff5dd', borderWidth: 3, borderColor: '#d4b06c', shadowColor: '#1c1008', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.42, shadowRadius: 14, elevation: 25 },
  regaloDiarioModalHeader: { height: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#f0dcae', borderBottomWidth: 1, borderBottomColor: '#d3af6b' },
  regaloDiarioModalIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c76882', borderWidth: 1, borderColor: '#fff1dc' },
  regaloDiarioModalInfo: { flex: 1, marginLeft: 9 },
  regaloDiarioModalTitle: { color: '#704b2d', fontFamily: 'Delius', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  regaloDiarioModalSub: { color: '#9c7644', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '800', letterSpacing: 0.55, marginTop: 1 },
  regaloDiarioModalClose: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(255,249,231,0.72)', borderWidth: 1, borderColor: '#d7b977' },
  accesosInicioWrap: { position: 'absolute', right: 198, bottom: 6, flexDirection: 'row', alignItems: 'center', zIndex: 220, elevation: 12 },
  accesosInicioWrapDragging: { zIndex: 1100, elevation: 1100 },
  accesoInicioBtn: { width: 50, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 12 },
  accesoInicioFirst: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  accesoInicioLast: { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  accesoInicioDisabled: { backgroundColor: '#e3ded3', borderColor: '#c9c2b5', opacity: 0.8 },
  accesoInicioTextDisabled: { color: '#999287' },
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
    bottom: 115,
    left: '50%',
    marginLeft: -93,
    width: 90,
    height: 90,
    zIndex: 420,
    elevation: 420,
  },
  petTouch: { position: 'absolute', width: 112, height: 112, top: -10, left: -11, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  petTouchHitbox: { position: 'absolute', left: '50%', bottom: 67, width: 90, height: 90, marginLeft: -48, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', borderRadius: 45, zIndex: 1250, elevation: 1250 },
  petQuickDismiss: { ...StyleSheet.absoluteFillObject, zIndex: 1200, elevation: 1200 },
  petQuickAccess: { position: 'absolute', left: '50%', bottom: 98, marginLeft: 48, alignItems: 'center', paddingHorizontal: 1, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(255,247,225,0.90)', borderWidth: 1, borderColor: 'rgba(208,173,112,0.82)', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 4, elevation: 1300, zIndex: 1300 },
  petQuickAccessDragging: { zIndex: 1400, elevation: 1400 },
  petQuickAccessTitle: { marginBottom: 0, color: '#a87840', fontFamily: 'Delius', fontSize: 4.2, fontWeight: '900', letterSpacing: 0.45 },
  petQuickAccessButton: { width: 43, height: 26, flexDirection: 'row', gap: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 20 },
  petQuickAccessText: { marginTop: 0, color: '#76552f', fontFamily: 'Delius', fontSize: 4.6, fontWeight: '900' },
  petQuickFoodEmoji: { fontSize: 14, lineHeight: 15, textAlign: 'center' },
  petQuickAccessCount: { position: 'absolute', right: -2, top: -4, minWidth: 10, height: 10, paddingHorizontal: 2, borderRadius: 5, backgroundColor: '#bd6f83', borderWidth: 1, borderColor: '#fff1e2', color: '#fff', fontFamily: 'Delius', fontSize: 4.6, fontWeight: '900', textAlign: 'center' },
  petQuickSleep: { width: 43, height: 26, alignItems: 'center', justifyContent: 'center', marginTop: 2, borderRadius: 8, backgroundColor: '#f5dce4', borderWidth: 1, borderColor: '#dca8b8', shadowColor: '#b96b84', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 3, elevation: 4 },
  petSleepShortcutContent: { flexDirection: 'row', gap: 1, alignItems: 'center', justifyContent: 'center' },
  petQuickSleepText: { color: '#ad5b78', fontFamily: 'Delius', fontSize: 4.6, fontWeight: '900' },
  playerFill: { ...StyleSheet.absoluteFillObject },
  playerImage: { width: 112, height: 112, top: -10, left: -11 },
  sleepingBagImage: { top: -12 },
  petIdentity: { position: 'absolute', left: '50%', bottom: 172, width: 150, marginLeft: -78, alignItems: 'center', justifyContent: 'center', zIndex: 425, elevation: 425 },
  petIdentityNameRow: { maxWidth: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  petSleepCountdownWrap: { alignItems: 'center', justifyContent: 'center' },
  petSleepCountdown: { marginBottom: 1, color: '#7c6d80', fontFamily: 'Delius', fontSize: 7.2, lineHeight: 9, fontWeight: '900', letterSpacing: 0.25, textShadowColor: 'rgba(255,248,233,0.94)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  petIdentityName: { maxWidth: 122, color: '#60373f', fontFamily: 'Delius', fontSize: 12.5, lineHeight: 15, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(255,248,233,0.98)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  petDropZone: { position: 'absolute', width: 76, height: 80, top: 69, left: 63, borderRadius: 999, opacity: 0, zIndex: 999, elevation: 999 },
  playerShadow: { position: 'absolute', left: '50%', bottom: 70, marginLeft: -54, width: 108, height: 32, zIndex: 0, shadowColor: '#5b3845', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 2 },
  satietyPanel: { position: 'absolute', left: '50%', bottom: 79, marginLeft: -69, zIndex: 415, width: 16, height: 70, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 1 },
  satietyIconWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(112,73,55,0.72)', borderWidth: 1, borderColor: 'rgba(255,224,157,0.7)', borderRadius: 3 },
  satietyTrack: { flex: 1, width: 10, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(86,57,54,0.48)', borderWidth: 1, borderColor: 'rgba(255,241,210,0.82)', justifyContent: 'flex-end', shadowColor: '#6c4935', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  satietyFill: { width: '100%', borderRadius: 2, borderTopWidth: 1, borderTopColor: 'rgba(255,246,190,0.65)', shadowColor: '#fff2c4', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 2, elevation: 2 },
  satietyPercentage: { position: 'absolute', top: '50%', left: '50%', zIndex: 2, width: 30, height: 9, marginLeft: -15, marginTop: -4.5, color: 'rgba(255,255,255,0.76)', fontSize: 6.2, lineHeight: 7, fontWeight: '800', letterSpacing: 0.1, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, textShadowColor: 'rgba(54,35,38,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1.5, transform: [{ rotate: '-90deg' }] },
  bondPanel: { position: 'absolute', left: '50%', bottom: 79, marginLeft: -88, zIndex: 414, width: 16, height: 70, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 1 },
  bondIconWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  bondIconNumber: { position: 'absolute', top: 5, left: 0, width: 16, color: '#fff9e8', fontFamily: 'Delius', fontSize: 6.3, lineHeight: 7, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(111,75,25,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  bondTrack: { flex: 1, width: 10, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(88,67,39,0.42)', borderWidth: 1, borderColor: 'rgba(255,241,188,0.88)', justifyContent: 'flex-end', shadowColor: '#9b7128', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  bondFill: { width: '100%', borderRadius: 2, backgroundColor: '#e2b34d', borderTopWidth: 1, borderTopColor: 'rgba(255,249,200,0.88)', shadowColor: '#ffe88d', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.62, shadowRadius: 2, elevation: 2 },
  bondPercentage: { position: 'absolute', top: '50%', left: '50%', zIndex: 2, width: 30, height: 9, marginLeft: -15, marginTop: -4.5, color: 'rgba(255,255,255,0.78)', fontSize: 6.2, lineHeight: 7, fontWeight: '800', letterSpacing: 0.1, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, textShadowColor: 'rgba(76,55,26,0.72)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1.5, transform: [{ rotate: '-90deg' }] },
  sleepPanel: { position: 'absolute', left: '50%', bottom: 79, marginLeft: -107, zIndex: 413, width: 16, height: 70, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 1 },
  sleepIconWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(73,78,126,0.78)', borderWidth: 1, borderColor: 'rgba(226,228,255,0.86)', borderRadius: 4 },
  sleepTrack: { flex: 1, width: 10, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(53,56,91,0.46)', borderWidth: 1, borderColor: 'rgba(226,228,255,0.84)', justifyContent: 'flex-end', shadowColor: '#545a9a', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  sleepFill: { width: '100%', borderRadius: 2, backgroundColor: '#7883d0', borderTopWidth: 1, borderTopColor: 'rgba(242,244,255,0.86)', shadowColor: '#cfd4ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.58, shadowRadius: 2, elevation: 2 },
  sleepPercentage: { position: 'absolute', top: '50%', left: '50%', zIndex: 2, width: 30, height: 9, marginLeft: -15, marginTop: -4.5, color: 'rgba(255,255,255,0.8)', fontSize: 6.2, lineHeight: 7, fontWeight: '800', letterSpacing: 0.1, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, textShadowColor: 'rgba(35,38,73,0.72)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1.5, transform: [{ rotate: '-90deg' }] },
  foodTray: { position: 'absolute', left: '50%', bottom: 96, marginLeft: -120, zIndex: 710, elevation: 710, width: 190, height: 36, paddingHorizontal: 8, borderRadius: 18, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,250,240,0.98)', borderWidth: 1, borderColor: '#dfc49a', shadowColor: '#674a35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 6 },
  foodTrayBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e3d1', borderWidth: 1, borderColor: '#e0b97a', marginRight: 4 },
  foodTrayBadgeEmoji: { fontSize: 18 },
  foodTrayItems: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  foodTrayTitle: { color: '#8a5d3e', fontFamily: 'Delius', fontSize: 4.9, fontWeight: '900', letterSpacing: 0.25 },
  foodTrayHint: { color: '#ad8468', fontFamily: 'Delius', fontSize: 3.9, lineHeight: 5, fontWeight: '700' },
  foodItem: { width: 28, height: 28, position: 'relative', borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6ead0', borderWidth: 1, borderColor: '#d1ab69', shadowColor: '#7a5634', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 10, zIndex: 720 },
  foodItemEmpty: { opacity: 0.38, backgroundColor: '#e2d8cb', borderColor: '#b9a998' },
  foodEmoji: { fontSize: 16.5, lineHeight: 20 },
  foodCount: { position: 'absolute', right: -3, bottom: -3, minWidth: 13, height: 13, paddingHorizontal: 3, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#bd6f83', borderWidth: 1, borderColor: '#fff1e2' },
  foodCountText: { color: '#fff', fontFamily: 'Delius', fontSize: 5.4, fontWeight: '900' },
  foodFeedback: { position: 'absolute', left: '50%', bottom: 184, marginLeft: -22, zIndex: 900, flexDirection: 'row', gap: 3, alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,249,234,0.96)', borderWidth: 1, borderColor: '#d4a75d', elevation: 12 },
  foodFeedbackEmoji: { fontSize: 13 },
  foodFeedbackText: { color: '#739b53', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
  feedNotice: { position: 'absolute', left: '50%', bottom: 205, transform: [{ translateX: -55 }], width: 110, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center', borderRadius: 999, backgroundColor: 'rgba(255,238,214,0.97)', borderWidth: 1.2, borderColor: '#c47758', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 20, zIndex: 950 },
  feedNoticeText: { color: '#8b4e3c', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  feedNoticeSelection: { width: 160, transform: [{ translateX: -80 }] },
  jugarBtn: { position: 'absolute', right: 18, bottom: -5, width: 158, height: 94, alignItems: 'center', justifyContent: 'center', zIndex: 30, elevation: 12 },
  jugarImagen: { position: 'absolute', width: '104%', height: '104%' },
  jugarContenido: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, transform: [{ translateY: -8 }] },
  jugarTexto: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(54,35,22,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  jugarDescripcion: { color: 'rgba(255,248,220,0.82)', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '700', marginTop: -1 },
  skinButton: { position: 'absolute', left: 315, bottom: 6, width: 36, height: 41, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 500, zIndex: 500 },
  skinButtonText: { color: '#76552f', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', marginTop: 1 },
  foodSelectButton: { position: 'absolute', left: 357, bottom: 6, width: 36, height: 41, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 500, zIndex: 500, flexDirection: 'column' },
  foodAccessButton: { position: 'relative', left: undefined, bottom: undefined, zIndex: 20, elevation: 20 },
  foodSelectTouch: { alignItems: 'center', justifyContent: 'center' },
  foodOriginalIconHidden: { opacity: 0 },
  foodSelectEmoji: { fontSize: 15, lineHeight: 17, textAlign: 'center' },
  foodSelectLabel: { fontSize: 5.5, color: '#76552f', fontFamily: 'Delius', fontWeight: '900', marginTop: 1, textAlign: 'center' },
  foodSelectCount: { fontSize: 9, color: '#7a5840', fontWeight: '900', marginTop: 2 },
  foodDragPreview: { position: 'absolute', left: -3, top: -7.3, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', zIndex: 900, elevation: 900 },
  foodDragPreviewEmoji: { fontSize: 29, lineHeight: 34, textShadowColor: 'rgba(70,45,25,0.28)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  changeButton: { position: 'absolute', left: 273, bottom: 6, width: 36, height: 41, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 500, zIndex: 500 },
  changeButtonText: { color: '#76552f', fontFamily: 'Delius', fontSize: 6, fontWeight: '900', marginTop: 1 },
  canjearWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -350 }, { translateY: 4 }],
    zIndex: 200,
    elevation: 200,
  },
  canjearBtn: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
    borderRadius: 8, backgroundColor: '#e4d5df', borderWidth: 1, borderColor: '#b995af',
    shadowColor: '#513c55', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 7, elevation: 9,
  },
  canjearText: {
    fontSize: 8, fontWeight: '900', color: '#593b57', letterSpacing: 0.2, fontFamily: 'Delius',
  },
  canjearIcon: { width: 25, height: 25, borderRadius: 7, backgroundColor: '#80557f', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3e8ed' },
  canjearInfo: { flex: 1, marginLeft: 6 },
  canjearSubtext: { color: '#704b6b', fontFamily: 'Delius', fontSize: 6, fontWeight: '700', marginTop: 0 },
  temporadasQuickWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -350 }, { translateY: -98 }], zIndex: 200, elevation: 200 },
  comercianteQuickWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -350 }, { translateY: -47 }], zIndex: 200, elevation: 200 },
  temporadasQuickBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderRadius: 8, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 7 },
  temporadasQuickIcon: { width: 25, height: 25, borderRadius: 7, backgroundColor: '#b07a43', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff0c5' },
  temporadasQuickTitle: { color: '#65492f', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.15 },
  temporadasQuickSub: { color: '#80613d', fontFamily: 'Delius', fontSize: 6, fontWeight: '700', marginTop: 0 },
  comercianteQuickBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderRadius: 8, backgroundColor: '#dce9dc', borderWidth: 1, borderColor: '#a8c4a9', shadowColor: '#405744', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 7 },
  comercianteQuickIcon: { width: 25, height: 25, borderRadius: 7, backgroundColor: '#6f9876', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eff9e9' },
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
  cajasWrapModal: { left: 0, right: 0, bottom: 27, zIndex: 2, elevation: 2, gap: 12 },
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
  pruebaHola: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 20,
    textAlign: 'center',
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '900',
    color: '#ffffff',
  },
});

export default Inicio;
