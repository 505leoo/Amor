import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { OBJETIVO_IDS, OBJETIVOS_RACHA, objetivoEstaCompletado, useRacha } from '../RachaContext';

const OBJETIVO_PRESENTACION = {
  inicio: { icon: 'home', estilo: 'gameIcon' },
  alimentar: { icon: 'restaurant', estilo: 'petIcon' },
  nivel: { icon: 'sports-esports', estilo: 'gameIcon' },
  comerciante: { icon: 'storefront', estilo: 'storeIcon' },
};

// La meta y los textos viven en RachaContext; aquí solo definimos cómo se
// representa cada objetivo para evitar que la pantalla quede desactualizada.
const OBJETIVOS_DIARIOS = OBJETIVO_IDS.map(id => ({
  ...OBJETIVOS_RACHA[id],
  ...OBJETIVO_PRESENTACION[id],
}));

const construirObjetivosDiarios = day => OBJETIVOS_DIARIOS.map(objetivo => {
  const registro = day?.objetivos?.[objetivo.id] || {};
  const progreso = Math.min(objetivo.meta, Math.max(0, Number(registro.cantidad) || (registro.completado ? objetivo.meta : 0)));
  return { ...objetivo, progreso, completado: objetivoEstaCompletado(objetivo.id, registro) };
});

const RACHA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const RACHA_CAMBIO_HORA = 20;

const segundosHastaNuevosObjetivos = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RACHA_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date()).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  const localNow = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  const nextBoundary = Number(parts.hour) >= RACHA_CAMBIO_HORA
    ? Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, RACHA_CAMBIO_HORA)
    : Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), RACHA_CAMBIO_HORA);
  return Math.max(0, Math.floor((nextBoundary - localNow) / 1000));
};

const formatearTiempoRestante = segundos => {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return `${horas}h ${String(minutos).padStart(2, '0')}m`;
};

const RachaCountdown = () => {
  const [remaining, setRemaining] = useState(segundosHastaNuevosObjetivos);
  useEffect(() => {
    const update = () => setRemaining(segundosHastaNuevosObjetivos());
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);
  return <View style={modalStyles.timerChip}>
    <MaterialIcons name="schedule" size={14} color="#a7655d" />
    <View style={modalStyles.timerCopy}>
      <Text style={modalStyles.timerLabel}>NUEVOS OBJETIVOS</Text>
      <Text style={modalStyles.timerValue}>{formatearTiempoRestante(remaining)}</Text>
    </View>
  </View>;
};

export const RachaProgressToast = ({ visible, toast, onHide }) => {
  const entrance = useRef(new Animated.Value(0)).current;
  const onHideRef = useRef(onHide);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  useEffect(() => {
    if (!visible) return undefined;
    entrance.setValue(0);
    const animation = Animated.spring(entrance, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true });
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
  }, [entrance, visible]);

  if (!visible) return null;
  const meta = Math.max(1, Number(toast?.goal) || 1);
  const avance = Math.min(meta, Math.max(0, Number(toast?.progress) || 0));
  const todosCompletos = Boolean(toast?.dayCompleted);
  const textoCambio = todosCompletos
    ? `¡Listos los ${toast?.completedObjectives || 4} objetivos!`
    : toast?.completed
      ? `${toast?.objectiveTitle || 'Objetivo'} cumplido`
      : `${toast?.objectiveTitle || 'Objetivo'} · ${avance}/${meta}`;
  const subtitulo = todosCompletos
    ? 'OBJETIVOS DE HOY'
    : toast?.completed
      ? 'GUARDADO POR HOY'
      : `Un pasito más · faltan ${Math.max(0, meta - avance)}`;
  return <Animated.View pointerEvents="none" style={[toastStyles.wrap, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
    <LinearGradient colors={['#785b60', '#a07470']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={toastStyles.card}>
      <View style={toastStyles.topRow}><View style={toastStyles.spark}><Text style={toastStyles.sparkText}>{todosCompletos ? '★' : '✦'}</Text></View><View style={toastStyles.copy}><Text style={toastStyles.kicker}>{subtitulo}</Text><Text style={toastStyles.title}>{textoCambio}</Text></View></View>
    </LinearGradient>
  </Animated.View>;
};

export const RachaGlobalToast = () => {
  const { toast, ocultarToast } = useRacha();
  return <RachaProgressToast
    visible={Boolean(toast)}
    toast={toast}
    onHide={ocultarToast}
  />;
};

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
  const completedObjectives = Math.max(0, Number(ritual.completedObjectives ?? ritual.objetivosCompletados) || (ritual.dayCompleted ? OBJETIVO_IDS.length : 0));
  const totalObjectives = Math.max(1, Number(ritual.totalObjectives ?? ritual.totalObjetivos) || OBJETIVO_IDS.length);
  const ritualTitle = ritual.dayCompleted ? '¡Excelente!' : outcome === 'subio' ? 'Tu racha subió' : outcome === 'bajo' ? 'Tu racha bajó' : 'Tu racha se mantuvo';
  const ritualCopy = ritual.dayCompleted
    ? `Completaste los ${completedObjectives}/${totalObjectives} objetivos del día y tu racha subió a ${ritual.streakDays} días. Volvé mañana para mantenerla viva.`
    : outcome === 'subio'
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
          {ritual.dayCompleted && <Text style={ritualStyles.objectives}>{completedObjectives}/{totalObjectives} OBJETIVOS DEL DÍA</Text>}
          <Text style={ritualStyles.copy}>{ritualCopy}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  </Modal>;
};

export const RachaVisualModal = ({ visible, onClose }) => {
  const { day, streakDays } = useRacha();
  const today = useMemo(() => {
    const date = day?.fecha ? new Date(`${day.fecha}T12:00:00`) : new Date();
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date).toUpperCase();
  }, [day?.fecha]);
  const objetivosDiarios = useMemo(() => construirObjetivosDiarios(day), [day]);
  const completedObjectives = objetivosDiarios.filter(objetivo => objetivo.completado).length;
  const mensajeDia = completedObjectives >= objetivosDiarios.length
    ? '¡Todo listo por hoy! Mañana aparecen nuevos objetivos.'
    : completedObjectives >= 2
      ? 'Vas muy bien. Cada objetivo cumplido cuenta para cerrar tu día.'
      : 'Pequeños pasos para cuidar tu día, sin presión.';
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={modalStyles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <LinearGradient colors={['#fffaf0', '#f4e1d8', '#ead4ca']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={modalStyles.card}>
        <View style={modalStyles.glowOne} /><View style={modalStyles.glowTwo} />
        <View style={modalStyles.header}><View><Text style={modalStyles.eyebrow}>OBJETIVOS DE HOY</Text><Text style={modalStyles.day}>{today}</Text></View><Pressable onPress={onClose} hitSlop={10} style={modalStyles.close}><MaterialIcons name="close" size={18} color="#76552f" /></Pressable></View>
        <View style={modalStyles.statsRow}>
          <View style={modalStyles.streakChip}><View style={modalStyles.streakIcon}><MaterialIcons name="local-fire-department" size={15} color="#fffaf0" /></View><View style={modalStyles.streakCopy}><Text style={modalStyles.streakLabel}>RACHA ACTUAL</Text><Text style={modalStyles.streakValue}>{streakDays} {streakDays === 1 ? 'día' : 'días'}</Text></View></View>
          <RachaCountdown />
        </View>
        <View style={modalStyles.dailySummary}><View style={[modalStyles.dailySummaryIcon, completedObjectives >= objetivosDiarios.length && modalStyles.dailySummaryIconDone]}><MaterialIcons name={completedObjectives >= objetivosDiarios.length ? 'check' : 'auto-awesome'} size={17} color="#fffaf0" /></View><View style={modalStyles.dailySummaryCopy}><Text style={modalStyles.dailySummaryTitle}>{completedObjectives}/{objetivosDiarios.length} completados</Text><Text style={modalStyles.dailySummaryText}>{mensajeDia}</Text></View></View>
        <View style={modalStyles.dailyList}>
          {objetivosDiarios.map(objetivo => (
            <View key={objetivo.id} style={[modalStyles.mission, objetivo.completado && modalStyles.missionDone]}>
              <View style={[modalStyles.missionIcon, modalStyles[objetivo.estilo]]}><MaterialIcons name={objetivo.completado ? 'check' : objetivo.icon} size={13} color="#fffaf0" /></View>
              <View style={modalStyles.missionCopy}><Text style={modalStyles.missionName} numberOfLines={1}>{objetivo.titulo}</Text><Text style={modalStyles.missionDetail} numberOfLines={1}>{objetivo.detalle}</Text></View>
              <Text style={[modalStyles.objectiveProgress, objetivo.completado && modalStyles.objectiveProgressDone]}>{objetivo.progreso}/{objetivo.meta}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  </Modal>;
};

const toastStyles = StyleSheet.create({
  wrap: { position: 'absolute', top: 44, alignSelf: 'center', width: 242, zIndex: 3000, elevation: 3000 },
  card: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,250,238,0.7)', shadowColor: '#30383a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center' }, spark: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#e3b675' }, sparkText: { color: '#754d4e', fontSize: 14, fontWeight: '900' }, copy: { flex: 1, marginLeft: 6 }, kicker: { color: '#f5e9dc', fontSize: 6, fontWeight: '900', letterSpacing: 0.65 }, title: { marginTop: 1, color: '#fffaf0', fontFamily: 'Delius', fontSize: 7.8, fontWeight: '900' },
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
  objectives: { marginTop: 6, color: '#f3cf88', fontFamily: 'Delius', fontSize: 6.8, fontWeight: '900', letterSpacing: 1.1 },
  copy: { maxWidth: 260, marginTop: 6, color: 'rgba(245,239,224,0.78)', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9.5, textAlign: 'center' },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(29,16,18,0.9)' },
  card: { width: '100%', maxWidth: 610, overflow: 'hidden', borderRadius: 20, borderWidth: 1.4, borderColor: '#d3b989', padding: 12, shadowColor: '#17120d', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.55, shadowRadius: 22, elevation: 20 }, glowOne: { position: 'absolute', top: -85, right: -40, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(134,176,202,0.20)' }, glowTwo: { position: 'absolute', bottom: -110, left: -55, width: 205, height: 205, borderRadius: 103, backgroundColor: 'rgba(228,175,108,0.19)' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, eyebrow: { color: '#6c5038', fontFamily: 'Delius', fontSize: 7.2, fontWeight: '900', letterSpacing: 1.15 }, day: { marginTop: 2, color: '#8a7865', fontFamily: 'Delius', fontSize: 6.2 }, close: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: 'rgba(111,142,157,0.15)', borderWidth: 1, borderColor: 'rgba(94,124,140,0.36)' }, dailySummary: { flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,252,244,0.62)', borderWidth: 1, borderColor: 'rgba(173,143,100,0.34)' }, dailySummaryIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#b87967' }, dailySummaryIconDone: { backgroundColor: '#7da06c' }, dailySummaryCopy: { flex: 1, marginLeft: 8 }, dailySummaryTitle: { color: '#594937', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900' }, dailySummaryText: { marginTop: 2, color: '#8a7764', fontFamily: 'Delius', fontSize: 5.8, lineHeight: 8 }, dailyList: { marginTop: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 8, gap: 6 }, streakChip: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 6, borderRadius: 11, backgroundColor: 'rgba(186,135,88,0.14)', borderWidth: 1, borderColor: 'rgba(186,135,88,0.3)' }, streakIcon: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#ba8758' }, streakCopy: { marginLeft: 6 }, streakLabel: { color: '#9a6d43', fontFamily: 'Delius', fontSize: 5.2, fontWeight: '900', letterSpacing: 0.5 }, streakValue: { marginTop: 1, color: '#684b38', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900' }, timerChip: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 6, borderRadius: 11, backgroundColor: 'rgba(169,102,91,0.11)', borderWidth: 1, borderColor: 'rgba(157,92,82,0.24)' }, timerCopy: { marginLeft: 6 }, timerLabel: { color: '#986660', fontFamily: 'Delius', fontSize: 5.2, fontWeight: '900', letterSpacing: 0.5 }, timerValue: { marginTop: 1, color: '#684b38', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900' },
  contentRow: { flexDirection: 'row', gap: 10, marginTop: 5 }, summaryColumn: { flex: 1.04 }, missionsColumn: { flex: 0.96 }, hero: { flexDirection: 'row', alignItems: 'center', marginTop: 2 }, flame: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#e8bc70', borderWidth: 3, borderColor: '#fff8dd', shadowColor: '#b7803d', shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 }, flameText: { fontSize: 23 }, heroNumber: { marginLeft: 8, color: '#4e3d30', fontFamily: 'Delius', fontSize: 21, fontWeight: '900' }, heroCaption: { width: 175, marginLeft: 8, color: '#7b6958', fontFamily: 'Delius', fontSize: 5.9, lineHeight: 8 },
  progressCard: { marginTop: 6, padding: 7, borderRadius: 10, backgroundColor: 'rgba(255,252,244,0.62)', borderWidth: 1, borderColor: 'rgba(173,143,100,0.38)' }, progressHeader: { flexDirection: 'row', justifyContent: 'space-between' }, progressTitle: { color: '#745d46', fontFamily: 'Delius', fontSize: 5.9, fontWeight: '900', letterSpacing: 0.7 }, progressTitleExcellent: { color: '#63855d' }, progressScore: { color: '#a2634e', fontFamily: 'Delius', fontSize: 6.7, fontWeight: '900' },
  missionsTitle: { color: '#745d46', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.85 }, conductaIntro: { marginTop: 2, color: '#9a806e', fontFamily: 'Delius', fontSize: 5.7, lineHeight: 8 }, conductaEvent: { flexDirection: 'row', alignItems: 'center', minHeight: 35, marginTop: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10, borderWidth: 1 }, conductaEventPositive: { backgroundColor: 'rgba(220,238,209,0.56)', borderColor: 'rgba(109,152,89,0.32)' }, conductaEventNegative: { backgroundColor: 'rgba(187,101,99,0.10)', borderColor: 'rgba(166,87,88,0.30)' }, conductaEventNeutral: { backgroundColor: 'rgba(255,252,244,0.54)', borderColor: 'rgba(173,143,100,0.28)' }, conductaEventIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, conductaIconPositive: { backgroundColor: '#8aa579' }, conductaIconNegative: { backgroundColor: '#b46b67' }, conductaEventCopy: { flex: 1, marginLeft: 6 }, conductaEventText: { color: '#594937', fontFamily: 'Delius', fontSize: 6.1, lineHeight: 8, fontWeight: '800' }, conductaEventTime: { marginTop: 1, color: '#a58b79', fontFamily: 'Delius', fontSize: 4.7, fontWeight: '700' }, conductaEventDelta: { marginLeft: 4, color: '#678b5e', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' }, conductaEventDeltaNegative: { color: '#a45659' }, mission: { flexDirection: 'row', alignItems: 'center', minHeight: 41, marginTop: 5, paddingHorizontal: 8, borderRadius: 10, backgroundColor: 'rgba(255,252,244,0.58)', borderWidth: 1, borderColor: 'rgba(173,143,100,0.34)' }, missionDone: { backgroundColor: 'rgba(220,238,209,0.72)', borderColor: 'rgba(109,152,89,0.58)' }, missionIcon: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, gameIcon: { backgroundColor: '#769ab0' }, petIcon: { backgroundColor: '#ba8758' }, storeIcon: { backgroundColor: '#8eaa78' }, missionCopy: { flex: 1, marginLeft: 7 }, missionName: { color: '#594937', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' }, missionDetail: { marginTop: 1, color: '#8a7764', fontFamily: 'Delius', fontSize: 5.8 }, objectiveProgress: { minWidth: 28, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 7, color: '#9b6a2d', backgroundColor: 'rgba(230,190,126,0.22)', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', textAlign: 'center' }, objectiveProgressDone: { color: '#648b67', backgroundColor: 'rgba(130,174,111,0.18)' },
  infoStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(169,102,91,0.11)', borderWidth: 1, borderColor: 'rgba(157,92,82,0.25)' }, infoStripExcellent: { backgroundColor: 'rgba(112,157,91,0.14)', borderColor: 'rgba(88,133,76,0.32)' }, infoIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#a66c68' }, infoIconExcellent: { backgroundColor: '#7da06c' }, infoText: { flex: 1, marginLeft: 6, color: '#6e5b47', fontFamily: 'Delius', fontSize: 5.8, lineHeight: 7.8 },
});
