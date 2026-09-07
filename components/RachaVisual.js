import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import Svg, { Path } from 'react-native-svg';
import { META_RACHA_DIARIA, META_RACHA_TOTAL, OBJETIVOS_RACHA, PUNTOS_POR_DIA_RACHA, useRacha } from '../RachaContext';

const META_DIARIA = META_RACHA_DIARIA;
const META_TOTAL = META_RACHA_TOTAL;
const RACHA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const RACHA_OFFSET_HORAS = 4;
const puntosConductaSeguro = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const puntosAcumulados = value => Math.max(0, Number(value) || 0);

const conductaIcon = evento => {
  if (evento?.tipo === 'negativa' || Number(evento?.delta) < 0) return 'warning';
  if (evento?.id?.startsWith('hambre-')) return 'warning';
  if (evento?.id?.includes('alimentar')) return 'restaurant';
  if (evento?.id?.includes('nivel')) return 'sports-esports';
  if (evento?.id?.includes('comerciante')) return 'storefront';
  return 'auto-awesome';
};

const horaConducta = evento => {
  const raw = evento?.creadoEnMs || evento?.creadoEn;
  const millis = typeof raw?.toMillis === 'function' ? raw.toMillis() : Number(raw);
  if (!Number.isFinite(millis) || millis <= 0) return null;
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(millis));
};

const construirConducta = day => {
  const eventos = Array.isArray(day?.eventos) ? day.eventos : [];
  if (eventos.length) return eventos.slice(-5).reverse();
  const objetivos = day?.objetivos || {};
  const niveles = Math.max(0, Number(objetivos.nivel?.cantidad) || 0);
  const comidas = Math.max(0, Number(objetivos.alimentar?.cantidad) || (objetivos.alimentar?.completado ? 2 : 0));
  const compras = Math.max(0, Number(objetivos.comerciante?.cantidad) || (objetivos.comerciante?.completado ? 1 : 0));
  const fallback = [
    objetivos.inicio?.completado && { id: 'inicio-fallback', delta: OBJETIVOS_RACHA.inicio.puntos, texto: '+2 puntos por volver a Amor hoy', tipo: 'positiva' },
    comidas >= 2 && { id: 'alimentar-hito-fallback', delta: 1, texto: '+1 punto por alimentar al Animalito 2 veces', tipo: 'positiva' },
    comidas > 0 && comidas < 2 && { id: 'alimentar-fallback', delta: 0, texto: `Alimentaste al Animalito (${comidas}/2); la bitácora observa tu cuidado`, tipo: 'neutral' },
    niveles >= 12 && { id: 'nivel-12-fallback', delta: 2, texto: '+2 puntos por completar 12 niveles', tipo: 'positiva' },
    niveles >= 7 && { id: 'nivel-7-fallback', delta: 1, texto: '+1 punto por completar 7 niveles', tipo: 'positiva' },
    niveles > 0 && { id: 'nivel-fallback', delta: 0, texto: `Completaste ${niveles} nivel${niveles === 1 ? '' : 'es'}; la bitácora está observando tu constancia`, tipo: 'neutral' },
    compras >= 3 && { id: 'comerciante-3-fallback', delta: 2, texto: '+2 puntos por comprar 3 veces en Comerciante', tipo: 'positiva' },
    compras >= 2 && { id: 'comerciante-2-fallback', delta: 1, texto: '+1 punto por comprar 2 veces en Comerciante', tipo: 'positiva' },
    compras >= 1 && { id: 'comerciante-1-fallback', delta: 1, texto: '+1 punto por comprar en Comerciante', tipo: 'positiva' },
  ].filter(Boolean);
  return fallback.length ? fallback : [{ id: 'sin-conducta', delta: 0, texto: 'Todavía no hay registros de conducta.', tipo: 'neutral' }];
};

const segundosHastaFinDelDia = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RACHA_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(now).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  const cierreHora = 24 - RACHA_OFFSET_HORAS;
  const localNow = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  const nextBoundary = Number(parts.hour) >= cierreHora
    ? Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, cierreHora)
    : Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), cierreHora);
  return Math.max(0, Math.floor((nextBoundary - localNow) / 1000));
};

export const RachaCountdown = ({ compact = false, emphasis = false }) => {
  const [remaining, setRemaining] = useState(segundosHastaFinDelDia);
  useEffect(() => {
    const update = () => setRemaining(segundosHastaFinDelDia());
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);
  const hours = Math.floor(remaining / 3600);
  const label = hours < 1 ? 'Falta menos de 1 hora' : hours === 1 ? 'Falta 1 hora y algo' : `Faltan ${hours} horas y algo`;
  return <View style={[countdownStyles.wrap, emphasis && countdownStyles.wrapEmphasis, compact && countdownStyles.wrapCompact]}>
    <MaterialIcons name="schedule" size={compact ? 10 : 12} color={compact ? '#f5d6bd' : '#a7655d'} />
    <Text style={[countdownStyles.text, emphasis && countdownStyles.textEmphasis, compact && countdownStyles.textCompact]}>{label} para que termine el día</Text>
  </View>;
};

// La barra muestra las tres zonas de conducta y sus dos límites visuales.
// El color avanza progresivamente de riesgo a avance y se comparte entre
// Inicio, Perfil y las vistas de pareja.
export const RachaSegmentedBar = ({ points = 0, dailyPoints, compact = false, showLabels = true }) => {
  const safeDailyPoints = puntosConductaSeguro(dailyPoints ?? points);
  // El día arranca en el centro de MITAD (0 puntos). Hasta 10 puntos el
  // indicador avanza de forma legible; después usa rendimiento decreciente
  // para que AVANZA sea posible, pero difícil de llenar por completo.
  const markerProgress = safeDailyPoints < 0
    ? 0.3 + (0.2 * Math.exp(safeDailyPoints / 10))
    : safeDailyPoints <= META_DIARIA
      ? 0.5 + ((safeDailyPoints / META_DIARIA) * 0.17)
      : 0.67 + (0.33 * (1 - Math.exp(-(safeDailyPoints - META_DIARIA) / 18)));
  const markerColor = safeDailyPoints >= META_DIARIA ? '#648b67' : safeDailyPoints < 0 ? '#a6535d' : '#a7655d';
  const markerPosition = useRef(new Animated.Value(markerProgress)).current;

  useEffect(() => {
    const animation = Animated.timing(markerPosition, {
      toValue: markerProgress,
      duration: 360,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [markerPosition, markerProgress]);

  return <View style={[segmentedStyles.wrap, compact && segmentedStyles.wrapCompact]}>
    <Animated.View pointerEvents="none" style={[segmentedStyles.marker, compact && segmentedStyles.markerCompact, { left: markerPosition.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
      <Svg width={12} height={8} viewBox="0 0 12 8">
        <Path d="M0 0H12L6 8Z" fill={markerColor} />
      </Svg>
    </Animated.View>
    <View style={[segmentedStyles.track, compact && segmentedStyles.trackCompact]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#a6535d', '#b8786f', '#c5a278', '#789973']}
        locations={[0, 0.3, 0.67, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[segmentedStyles.separator, { left: '30%' }]} />
      <View pointerEvents="none" style={[segmentedStyles.separator, { left: '67%' }]} />
    </View>
    {showLabels && <View style={segmentedStyles.segmentLabels}><Text style={segmentedStyles.segmentRiskLabel}>RIESGO</Text><Text style={segmentedStyles.segmentNeutralLabel}>MITAD</Text><Text style={segmentedStyles.segmentSafeLabel}>AVANZA</Text></View>}
  </View>;
};

export const RachaProgressToast = ({ visible, fromPoints = 0, toPoints = 3, onHide }) => {
  const entrance = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const onHideRef = useRef(onHide);
  const safeFromPoints = puntosAcumulados(fromPoints);
  const safeToPoints = puntosAcumulados(toPoints);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  useEffect(() => {
    if (!visible) return undefined;
    entrance.setValue(0);
    progress.setValue(Math.min(1, safeFromPoints / META_TOTAL));
    const animation = Animated.parallel([
      Animated.spring(entrance, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(progress, { toValue: Math.min(1, safeToPoints / META_TOTAL), duration: 980, useNativeDriver: false }),
    ]);
    animation.start();
    const timer = setTimeout(() => {
      Animated.timing(entrance, { toValue: 0, duration: 240, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onHideRef.current?.();
      });
    }, 3400);
    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [entrance, progress, safeFromPoints, safeToPoints, visible]);

  if (!visible) return null;
  const delta = safeToPoints - safeFromPoints;
  const textoCambio = delta < 0 ? `Se descontaron ${Math.abs(delta)} puntos` : `¡Sumaste! +${delta} puntos`;
  return <Animated.View pointerEvents="none" style={[toastStyles.wrap, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
    <LinearGradient colors={['#785b60', '#a07470']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={toastStyles.card}>
      <View style={toastStyles.topRow}><View style={toastStyles.spark}><Text style={toastStyles.sparkText}>{delta < 0 ? '↓' : '✦'}</Text></View><View style={toastStyles.copy}><Text style={toastStyles.kicker}>RACHA ACUMULADA</Text><Text style={toastStyles.title}>{textoCambio}</Text></View><Text style={toastStyles.score}>{safeToPoints} pts</Text></View>
      <View style={toastStyles.track}><Animated.View style={[toastStyles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}><LinearGradient colors={['#f4cf88', '#d98d73']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /></Animated.View></View>
    </LinearGradient>
  </Animated.View>;
};

export const RachaGlobalToast = () => {
  const { toast, ocultarToast } = useRacha();
  return <RachaProgressToast
    visible={Boolean(toast)}
    fromPoints={toast?.fromPoints || 0}
    toPoints={toast?.toPoints || 0}
    onHide={ocultarToast}
  />;
};

const countdownStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginTop: 6, alignSelf: 'flex-start' },
  wrapEmphasis: { alignSelf: 'stretch', marginTop: 6, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(169,102,91,0.10)', borderWidth: 1, borderColor: 'rgba(157,92,82,0.23)' },
  wrapCompact: { marginTop: 2 },
  text: { marginLeft: 4, color: '#9b6b5e', fontFamily: 'Delius', fontSize: 6.2, fontWeight: '800' },
  textEmphasis: { color: '#80544f', fontSize: 7, fontWeight: '900' },
  textCompact: { color: 'rgba(255,235,219,0.76)', fontSize: 5.2 },
});

const segmentedStyles = StyleSheet.create({
  wrap: { position: 'relative', width: '100%', paddingTop: 17, paddingBottom: 4 },
  wrapCompact: { paddingTop: 12, paddingBottom: 2 },
  track: { position: 'relative', width: '100%', height: 9, overflow: 'hidden', borderRadius: 6, backgroundColor: 'rgba(97,65,59,0.14)', borderWidth: 1, borderColor: 'rgba(113,73,64,0.28)' },
  trackCompact: { height: 7, borderRadius: 5 },
  marker: { position: 'absolute', top: 8, width: 12, height: 8, marginLeft: -6, alignItems: 'center', justifyContent: 'flex-end', zIndex: 4 },
  markerCompact: { top: 4, transform: [{ scale: 0.86 }] },
  separator: { position: 'absolute', top: -1, bottom: -1, width: 2, marginLeft: -1, backgroundColor: 'rgba(255,248,231,0.88)', shadowColor: '#71454a', shadowOpacity: 0.55, shadowRadius: 2, elevation: 2 },
  segmentLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  segmentRiskLabel: { color: '#a45659', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
  segmentNeutralLabel: { color: '#9a7a54', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
  segmentSafeLabel: { color: '#628b63', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
});

export const RachaCompletionRitual = () => {
  const { ritual, cerrarRitual } = useRacha();
  const entrance = useRef(new Animated.Value(0)).current;
  const fireReveal = useRef(new Animated.Value(0.15)).current;
  const numberReveal = useRef(new Animated.Value(0)).current;
  const detailsReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ritual) return undefined;
    entrance.setValue(0);
    fireReveal.setValue(0.15);
    numberReveal.setValue(0);
    detailsReveal.setValue(0);
    const reveal = Animated.spring(entrance, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true });
    reveal.start();
    const fire = Animated.timing(fireReveal, { toValue: 1, duration: 1200, useNativeDriver: true });
    const number = Animated.sequence([
      Animated.delay(1120),
      Animated.spring(numberReveal, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]);
    const details = Animated.sequence([
      Animated.delay(1720),
      Animated.timing(detailsReveal, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]);
    const sequence = Animated.parallel([fire, number, details]);
    sequence.start();
    return () => { reveal.stop(); sequence.stop(); };
  }, [detailsReveal, entrance, fireReveal, numberReveal, ritual]);

  if (!ritual) return null;
  const fecha = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(`${ritual.dayKey}T12:00:00`)).toUpperCase();
  const outcome = ritual.outcome || (Number(ritual.streakDays) > Number(ritual.previousStreakDays) ? 'subio' : Number(ritual.streakDays) < Number(ritual.previousStreakDays) ? 'bajo' : 'igual');
  const ritualTitle = outcome === 'subio' ? 'Tu racha subió' : outcome === 'bajo' ? 'Tu racha bajó' : 'Tu racha se mantuvo';
  const ritualCopy = outcome === 'subio'
    ? 'Cuidaste tu día y encendiste una nueva llama. Volvé mañana para mantenerla viva.'
    : outcome === 'bajo'
      ? 'La llama perdió un poco de fuerza, pero no se apagó. Mañana podés recuperarla.'
      : 'La llama se mantuvo estable. Una nueva conducta puede hacerla crecer mañana.';
  return <Modal transparent visible animationType="fade" onRequestClose={cerrarRitual}>
    <View style={ritualStyles.backdrop}>
      <LinearGradient pointerEvents="none" colors={['rgba(22,9,12,0.995)', 'rgba(47,25,27,0.97)', 'rgba(19,8,11,0.995)']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={cerrarRitual} />
      <Animated.View style={[ritualStyles.scene, { opacity: entrance, transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] }) }, { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <Animated.View style={{ opacity: detailsReveal }}>
          <Text style={ritualStyles.kicker}>RITUAL DE LA LLAMA</Text>
          <Text style={ritualStyles.date}>{fecha}</Text>
        </Animated.View>
        <View style={ritualStyles.fireWrap}>
          <Animated.Text style={[ritualStyles.streakNumber, { opacity: numberReveal, transform: [{ scale: numberReveal.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }]}>{ritual.streakDays}</Animated.Text>
          <Animated.View style={{ opacity: fireReveal }}><LottieView source={require('../assets/Lottie/Fire.lottie')} autoPlay loop style={ritualStyles.fire} /></Animated.View>
        </View>
        <Animated.View style={{ alignItems: 'center', opacity: detailsReveal }}>
          <Text style={ritualStyles.title}>{ritualTitle}</Text>
          <Text style={ritualStyles.copy}>{ritualCopy}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  </Modal>;
};

export const RachaVisualModal = ({ visible, onClose }) => {
  const { day, streakDays, racha } = useRacha();
  const today = useMemo(() => {
    const date = day?.fecha ? new Date(`${day.fecha}T12:00:00`) : new Date();
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date).toUpperCase();
  }, [day?.fecha]);
  const dailyPoints = puntosConductaSeguro(day?.puntosDia ?? day?.puntos);
  const totalPoints = puntosAcumulados(Math.max(Number(day?.puntosTotales) || 0, Number(racha?.puntosTotales) || 0, streakDays * PUNTOS_POR_DIA_RACHA));
  const conducta = useMemo(() => construirConducta(day), [day]);
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={modalStyles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <LinearGradient colors={['#fffaf0', '#f4e1d8', '#ead4ca']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={modalStyles.card}>
        <View style={modalStyles.glowOne} /><View style={modalStyles.glowTwo} />
        <View style={modalStyles.header}><View><Text style={modalStyles.eyebrow}>RACHA ACUMULADA</Text><Text style={modalStyles.day}>{today}</Text></View><Pressable onPress={onClose} hitSlop={10} style={modalStyles.close}><MaterialIcons name="close" size={18} color="#76552f" /></Pressable></View>
        <View style={modalStyles.countdownHolder}><RachaCountdown emphasis /></View>
        <View style={modalStyles.contentRow}>
          <View style={modalStyles.summaryColumn}>
            <View style={modalStyles.hero}><View style={modalStyles.flame}><Text style={modalStyles.flameText}>🔥</Text></View><View><Text style={modalStyles.heroNumber}>{streakDays} {streakDays === 1 ? 'día' : 'días'}</Text><Text style={modalStyles.heroCaption}>{totalPoints} puntos acumulados</Text></View></View>
            <View style={modalStyles.progressCard}><View style={modalStyles.progressHeader}><Text style={modalStyles.progressTitle}>AVANCE ACUMULADO</Text><Text style={modalStyles.progressScore}>{totalPoints} pts</Text></View><RachaSegmentedBar points={totalPoints} dailyPoints={dailyPoints} /></View>
          </View>
          <View style={modalStyles.missionsColumn}>
            <Text style={modalStyles.missionsTitle}>CONDUCTA DE HOY</Text>
            <Text style={modalStyles.conductaIntro}>Cada decisión deja una huella en tu racha.</Text>
            {conducta.map(evento => {
              const delta = Number(evento.delta) || 0;
              const negativa = evento.tipo === 'negativa' || delta < 0;
              const hora = horaConducta(evento);
              return <View key={evento.id} style={[modalStyles.conductaEvent, negativa ? modalStyles.conductaEventNegative : evento.tipo === 'neutral' ? modalStyles.conductaEventNeutral : modalStyles.conductaEventPositive]}>
                <View style={[modalStyles.conductaEventIcon, negativa ? modalStyles.conductaIconNegative : modalStyles.conductaIconPositive]}><MaterialIcons name={conductaIcon(evento)} size={13} color="#fffaf0" /></View>
                <View style={modalStyles.conductaEventCopy}><Text style={modalStyles.conductaEventText} numberOfLines={2}>{evento.texto}</Text>{hora && <Text style={modalStyles.conductaEventTime}>{hora}</Text>}</View>
                {delta !== 0 && <Text style={[modalStyles.conductaEventDelta, negativa && modalStyles.conductaEventDeltaNegative]}>{delta > 0 ? `+${delta}` : delta}</Text>}
              </View>;
            })}
          </View>
        </View>
        <View style={modalStyles.infoStrip}><View style={modalStyles.infoIcon}><MaterialIcons name="auto-awesome" size={13} color="#fffaf0" /></View><Text style={modalStyles.infoText}>El puntaje de conducta se arrastra al día siguiente. Después de Avanza, cada punto cuesta más y los descuidos pesan más.</Text></View>
      </LinearGradient>
    </View>
  </Modal>;
};

const toastStyles = StyleSheet.create({
  wrap: { position: 'absolute', top: 44, alignSelf: 'center', width: 242, zIndex: 3000, elevation: 3000 },
  card: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,250,238,0.7)', shadowColor: '#30383a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center' }, spark: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#e3b675' }, sparkText: { color: '#754d4e', fontSize: 14, fontWeight: '900' }, copy: { flex: 1, marginLeft: 6 }, kicker: { color: '#f5e9dc', fontSize: 6, fontWeight: '900', letterSpacing: 0.65 }, title: { marginTop: 1, color: '#fffaf0', fontFamily: 'Delius', fontSize: 7.8, fontWeight: '900' }, score: { color: '#ffe4b2', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900' },
  track: { height: 5, marginTop: 7, overflow: 'hidden', borderRadius: 5, backgroundColor: 'rgba(60,35,38,0.48)' }, fill: { height: '100%', borderRadius: 5, backgroundColor: '#e3af6b' },
});

const ritualStyles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scene: { width: '100%', maxWidth: 350, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  kicker: { color: '#e8c983', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 1.7 },
  date: { marginTop: 5, color: 'rgba(248,241,222,0.72)', fontFamily: 'Delius', fontSize: 6.3, letterSpacing: 0.4 },
  fireWrap: { width: 198, height: 198, marginTop: 48, alignItems: 'center', justifyContent: 'center' },
  streakNumber: { position: 'absolute', top: 134, zIndex: 2, width: '100%', color: '#fff3cd', fontFamily: 'Delius', fontSize: 30, fontWeight: '900', lineHeight: 32, textAlign: 'center', textShadowColor: 'rgba(62,36,19,0.74)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  fire: { width: 194, height: 194 },
  title: { marginTop: -3, color: '#fff8e8', fontFamily: 'Delius', fontSize: 15, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  copy: { maxWidth: 260, marginTop: 6, color: 'rgba(245,239,224,0.78)', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9.5, textAlign: 'center' },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(29,16,18,0.9)' },
  card: { width: '100%', maxWidth: 650, overflow: 'hidden', borderRadius: 22, borderWidth: 1.4, borderColor: '#d3b989', padding: 16, shadowColor: '#17120d', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.55, shadowRadius: 22, elevation: 20 }, glowOne: { position: 'absolute', top: -85, right: -40, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(134,176,202,0.20)' }, glowTwo: { position: 'absolute', bottom: -110, left: -55, width: 205, height: 205, borderRadius: 103, backgroundColor: 'rgba(228,175,108,0.19)' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, eyebrow: { color: '#6c5038', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 1.15 }, day: { marginTop: 3, color: '#8a7865', fontFamily: 'Delius', fontSize: 7 }, close: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(111,142,157,0.15)', borderWidth: 1, borderColor: 'rgba(94,124,140,0.36)' }, countdownHolder: { marginTop: 7 },
  contentRow: { flexDirection: 'row', gap: 14, marginTop: 9 }, summaryColumn: { flex: 1.04 }, missionsColumn: { flex: 0.96 }, hero: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }, flame: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#e8bc70', borderWidth: 3, borderColor: '#fff8dd', shadowColor: '#b7803d', shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 }, flameText: { fontSize: 28 }, heroNumber: { marginLeft: 10, color: '#4e3d30', fontFamily: 'Delius', fontSize: 25, fontWeight: '900' }, heroCaption: { width: 195, marginLeft: 10, color: '#7b6958', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9 },
  progressCard: { marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,252,244,0.62)', borderWidth: 1, borderColor: 'rgba(173,143,100,0.38)' }, progressHeader: { flexDirection: 'row', justifyContent: 'space-between' }, progressTitle: { color: '#745d46', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 }, progressScore: { color: '#a2634e', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' },
  missionsTitle: { color: '#745d46', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.85 }, conductaIntro: { marginTop: 2, color: '#9a806e', fontFamily: 'Delius', fontSize: 5.7, lineHeight: 8 }, conductaEvent: { flexDirection: 'row', alignItems: 'center', minHeight: 35, marginTop: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10, borderWidth: 1 }, conductaEventPositive: { backgroundColor: 'rgba(220,238,209,0.56)', borderColor: 'rgba(109,152,89,0.32)' }, conductaEventNegative: { backgroundColor: 'rgba(187,101,99,0.10)', borderColor: 'rgba(166,87,88,0.30)' }, conductaEventNeutral: { backgroundColor: 'rgba(255,252,244,0.54)', borderColor: 'rgba(173,143,100,0.28)' }, conductaEventIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, conductaIconPositive: { backgroundColor: '#8aa579' }, conductaIconNegative: { backgroundColor: '#b46b67' }, conductaEventCopy: { flex: 1, marginLeft: 6 }, conductaEventText: { color: '#594937', fontFamily: 'Delius', fontSize: 6.1, lineHeight: 8, fontWeight: '800' }, conductaEventTime: { marginTop: 1, color: '#a58b79', fontFamily: 'Delius', fontSize: 4.7, fontWeight: '700' }, conductaEventDelta: { marginLeft: 4, color: '#678b5e', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' }, conductaEventDeltaNegative: { color: '#a45659' }, mission: { flexDirection: 'row', alignItems: 'center', minHeight: 41, marginTop: 5, paddingHorizontal: 8, borderRadius: 10, backgroundColor: 'rgba(255,252,244,0.58)', borderWidth: 1, borderColor: 'rgba(173,143,100,0.34)' }, missionDone: { backgroundColor: 'rgba(220,238,209,0.72)', borderColor: 'rgba(109,152,89,0.58)' }, missionIcon: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, gameIcon: { backgroundColor: '#769ab0' }, petIcon: { backgroundColor: '#ba8758' }, storeIcon: { backgroundColor: '#8eaa78' }, missionCopy: { flex: 1, marginLeft: 7 }, missionName: { color: '#594937', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' }, missionDetail: { marginTop: 1, color: '#8a7764', fontFamily: 'Delius', fontSize: 5.8 }, points: { color: '#9b6a2d', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' },
  infoStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(169,102,91,0.11)', borderWidth: 1, borderColor: 'rgba(157,92,82,0.25)' }, infoIcon: { width: 23, height: 23, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#a66c68' }, infoText: { flex: 1, marginLeft: 7, color: '#6e5b47', fontFamily: 'Delius', fontSize: 6.2, lineHeight: 8.5 },
});
