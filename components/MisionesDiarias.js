import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import { useMisiones } from '../MisionesContext';
import { actualizarPasoTutorial } from './Tutorial';
import RecompensaOverlay from './RecompensaOverlay';
import { doc, updateDoc, increment, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const GOLD  = '#f5c842';
const GOLD2 = '#c8860a';
const GOLD3 = '#ffe97a';
const PINK  = '#ff8fa8';
const ROSE  = '#e8607a';
const DIM   = 'rgba(90,40,55,0.55)';
const BG    = '#fdf0f4';
const BG2   = '#fff7f9';

function ChicleMision({ titulo, monedas, chicles, globos, exp, cartas, size = 180 }) {
  const R  = size / 2 - 20;
  const cx = size / 2;
  const ts = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="mGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor={GOLD3} />
            <Stop offset="50%"  stopColor={GOLD} />
            <Stop offset="100%" stopColor={GOLD2} />
          </LinearGradient>
          <LinearGradient id="mGlow" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0%"   stopColor="#fff8c0" stopOpacity="0.6" />
            <Stop offset="100%" stopColor={GOLD3}   stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Circle cx={cx} cy={cx} r={R + 18} fill="rgba(245,200,66,0.08)" />
        <Circle cx={cx} cy={cx} r={R + 11} fill="rgba(245,200,66,0.15)" />
        <Circle cx={cx} cy={cx} r={R + 5}  fill="rgba(245,200,66,0.26)" />
        <Circle cx={cx} cy={cx} r={R} fill="url(#mGrad)" />
        <Circle cx={cx} cy={cx} r={R} fill="url(#mGlow)" />
        <Circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
        <Circle cx={cx} cy={cx} r={R + 4} fill="none" stroke={GOLD} strokeWidth={1.2} opacity={0.45} strokeDasharray="5 3" />
        <Ellipse cx={cx - R * 0.26} cy={cx - R * 0.26} rx={R * 0.4}  ry={R * 0.22} fill="rgba(255,255,255,0.42)" />
        <Ellipse cx={cx - R * 0.08} cy={cx - R * 0.5}  rx={R * 0.14} ry={R * 0.08} fill="rgba(255,255,255,0.28)" />
      </Svg>
      <View style={{ alignItems: 'center', gap: 3 }}>
        {titulo ? <Text style={[{ fontFamily: 'Omori', fontSize: 13, color: GOLD2, letterSpacing: 0.5 }, ts]}>{titulo}</Text> : null}
        {globos != null ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 28, lineHeight: 32 }}>🎈</Text>
            <Text style={[{ fontFamily: 'Omori', fontSize: 18, color: GOLD2 }, ts]}>+{globos}</Text>
          </View>
        ) : chicles != null ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 28, lineHeight: 32 }}>🍬</Text>
            <Text style={[{ fontFamily: 'Omori', fontSize: 18, color: GOLD2 }, ts]}>+{chicles}</Text>
          </View>
        ) : exp != null ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 28, lineHeight: 32 }}>⚡</Text>
            <Text style={[{ fontFamily: 'Omori', fontSize: 18, color: GOLD2 }, ts]}>+{exp} EXP</Text>
          </View>
        ) : cartas != null ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 28, lineHeight: 32 }}>🃏</Text>
            <Text style={[{ fontFamily: 'Omori', fontSize: 18, color: GOLD2 }, ts]}>+{cartas}</Text>
          </View>
        ) : monedas != null ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 28, lineHeight: 32 }}>🪙</Text>
            <Text style={[{ fontFamily: 'Omori', fontSize: 18, color: GOLD2 }, ts]}>+{monedas}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Hook genérico para misiones con namespace propio en Firestore ─────────────
// Usado tanto por eventos como por instancias globales con instanceKey.
// La clave en Firestore es: misiones_diarias/{diaKey}/{uid}_{nsKey}
function useMisionesNs(lista, nsKey) {
  const uid = auth.currentUser?.uid;
  const [progreso, setProgreso]     = useState({});
  const [reclamados, setReclamados] = useState([]);
  const [reward, setReward]         = useState(null);

  const getDiaKey = () => {
    const h = new Date();
    return `${h.getFullYear()}-${h.getMonth() + 1}-${h.getDate()}`;
  };

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'misiones_diarias', getDiaKey());
    const unsub = onSnapshot(ref, snap => {
      const data = snap.exists() ? (snap.data()[`${uid}_${nsKey}`] || {}) : {};
      setProgreso(data.progreso || {});
      setReclamados(data.reclamados || []);
    });
    return () => unsub();
  }, [uid, nsKey]);

  const getEstado = (mision) => {
    const actual = progreso[mision.campo] ?? 0;
    if (reclamados.includes(mision.id)) return 'reclamado';
    if (actual >= mision.meta)          return 'reclamar';
    return 'pendiente';
  };

  const reclamar = async (mision) => {
    if (!uid || reclamados.includes(mision.id)) return;
    const nuevos = [...reclamados, mision.id];
    setReclamados(nuevos);
    const diaKey = getDiaKey();
    const refDia = doc(db, 'misiones_diarias', diaKey);
    await setDoc(refDia, { [`${uid}_${nsKey}`]: { progreso, reclamados: nuevos } }, { merge: true }).catch(() => {});

    const userRef = doc(db, 'usuarios', uid);
    if (mision._globos) {
      await updateDoc(userRef, { globos: increment(mision._globos) }).catch(() => {});
      setReward({ titulo: mision.titulo, globos: mision._globos });
    } else if (mision._chicles) {
      await updateDoc(userRef, { chicles: increment(mision._chicles) }).catch(() => {});
      setReward({ titulo: mision.titulo, chicles: mision._chicles });
    } else {
      const mon = mision._monedas ?? 8;
      await updateDoc(userRef, { dinero: increment(mon) }).catch(() => {});
      setReward({
        titulo: mision.titulo,
        monedas: mon,
        ...(mision.id === 'login_f1' ? { tutorialPaso: 3 } : {}),
      });
    }
  };

  const completadas        = lista.filter(m => reclamados.includes(m.id)).length;
  const pendientesReclamar = lista.filter(m => getEstado(m) === 'reclamar').length;

  return { progreso, reclamados, reward, setReward, reclamar, getEstado, completadas, pendientesReclamar };
}

// Alias para compatibilidad con el nombre anterior (eventos)
const useMisionesEvento = useMisionesNs;

// ── Componente principal ──────────────────────────────────────────────────────
// Props:
//   icono              — nodo React para el botón (por defecto 🎈)
//   misionesEvento     — array de misiones custom del evento (opcional)
//   eventoKey          — string identificador del evento para Firestore (requerido si misionesEvento)
//   instanceKey        — string para aislar reclamados en modo global (ej: 'inicio', 'paleta')
//   recompensaOverride — 'globo' | 'chicle' | 'monedas' — fuerza un tipo de recompensa en modo global
export default function MisionesDiarias({ icono, misionesEvento, eventoKey, instanceKey, recompensaOverride, compacto = false, externo = false, abierto = false, onCerrar }) {
  // ── Modo contexto global (sin evento) ────────────────────────────────────
  const ctx = useMisiones();

  // ── Misiones del contexto global (para pasarlas al hook de namespace) ────
  const misionesGlobales = ctx.misiones ?? [];

  // ── Modo evento independiente ─────────────────────────────────────────────
  const eventoData = useMisionesEvento(
    misionesEvento ?? [],
    eventoKey ?? '__none__'
  );

  // ── Modo global con namespace propio (instanceKey) ────────────────────────
  const instanceData = useMisionesNs(
    misionesGlobales,
    instanceKey ?? '__global__'
  );

  const esEvento    = !!misionesEvento && !!eventoKey;
  const esInstance  = !esEvento && !!instanceKey;

  // Seleccionar fuente de datos según modo
  const misiones   = esEvento   ? misionesEvento              : misionesGlobales;
  const progreso   = esEvento   ? eventoData.progreso
                   : esInstance ? instanceData.progreso
                   :              ctx.progreso;
  const loginData  = (esEvento || esInstance) ? null          : ctx.loginData;
  const completadas        = esEvento   ? eventoData.completadas
                           : esInstance ? instanceData.completadas
                           :              ctx.completadas;
  const pendientesReclamar = esEvento   ? eventoData.pendientesReclamar
                           : esInstance ? instanceData.pendientesReclamar
                           :              ctx.pendientesReclamar;
  const reward     = esEvento   ? eventoData.reward    : esInstance ? instanceData.reward    : ctx.reward;
  const setReward  = esEvento   ? eventoData.setReward : esInstance ? instanceData.setReward : ctx.setReward;
  const reclamar   = esEvento   ? eventoData.reclamar
                   : esInstance ? instanceData.reclamar
                   :              (m) => ctx.reclamar(m, recompensaOverride ?? null);
  const getEstado  = esEvento   ? eventoData.getEstado : esInstance ? instanceData.getEstado : ctx.getEstado;
  const resetDev   = (esEvento || esInstance) ? null           : ctx.resetDev;

  const totalMisiones = misiones?.length ?? 5;

  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tiempoReset, setTiempoReset] = useState('');
  const [paginaMision, setPaginaMision] = useState(0);
  const slideAnim    = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ── Contador de reinicio — calcula tiempo hasta medianoche del servidor ───
  useEffect(() => {
    const calcular = () => {
      const ahora     = new Date();
      const manana    = new Date(ahora);
      manana.setDate(ahora.getDate() + 1);
      manana.setHours(0, 0, 0, 0);
      const diffMs    = manana - ahora;
      const diffH     = Math.floor(diffMs / 3600000);
      const diffM     = Math.floor((diffMs % 3600000) / 60000);
      const diffS     = Math.floor((diffMs % 60000) / 1000);
      if (diffH > 0) {
        setTiempoReset(`${diffH}h ${diffM}m`);
      } else if (diffM > 0) {
        setTiempoReset(`${diffM}m ${diffS}s`);
      } else {
        setTiempoReset(`${diffS}s`);
      }
    };
    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim,    { toValue: 0,   useNativeDriver: true, bounciness: 5 }),
        Animated.timing(backdropAnim, { toValue: 1,   useNativeDriver: true, duration: 220 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,    { toValue: 300, useNativeDriver: true, duration: 200 }),
        Animated.timing(backdropAnim, { toValue: 0,   useNativeDriver: true, duration: 200 }),
      ]).start(() => setMounted(false));
    }
  }, [open]);

  useEffect(() => {
    if (externo) setOpen(abierto);
  }, [abierto, externo]);

  useEffect(() => {
    if (open) setPaginaMision(0);
  }, [open]);

  const cerrar = () => {
    setOpen(false);
    onCerrar?.();
  };

  const iconoBoton = icono ?? <Text style={{ fontSize: 18 }}>🎈</Text>;
  const iconoMision = m => ({
    login_conteo: 'calendar-today', minutos_hoy: 'sports-esports', partidas_hoy: 'extension',
    misiones_hoy: 'task-alt', secciones_hoy: 'explore', pareja_entro_hoy: 'favorite',
    regalos_hoy: 'card-giftcard', compras_hoy: 'storefront',
  }[m.campo] || 'auto-awesome');
  const misionActual = misiones?.[paginaMision] || misiones?.[0];
  let progresoActual = 0;
  if (misionActual) {
    progresoActual = misionActual.campo === 'login_conteo'
      ? Math.min(loginData?.conteo ?? 0, misionActual.meta)
      : misionActual._subCampos
        ? Math.min(misionActual._subCampos.filter(c => progreso[c]).length, misionActual.meta)
        : misionActual._distintas
          ? Math.min(Object.keys(progreso[misionActual.campo] || {}).length, misionActual.meta)
          : Math.min(progreso[misionActual.campo] ?? 0, misionActual.meta);
  }
  const estadoActual = misionActual ? getEstado(misionActual) : 'pendiente';

  // ── Calcular etiqueta de recompensa para mostrar en cada misión ───────────
  const getRecompensaLabel = (m) => {
    const tipo = recompensaOverride ?? (esEvento
      ? (m._globos ? 'globo' : m._chicles ? 'chicle' : 'monedas')
      : (m.recompensa ?? 'monedas'));
    if (tipo === 'globo') {
      const n = esEvento
        ? (m._globos > 0 ? m._globos : 1)
        : (m._globos ?? m._chicles ?? 1);
      return `+${n} 🎈`;
    }
    if (tipo === 'chicle') {
      const n = m._chicles > 0 ? m._chicles : 1;
      return `+${n} 🍬`;
    }
    if (tipo === 'exp') return `+${m._exp ?? 5} EXP`;
    if (tipo === 'cartasAnimalitos') return `+${m._cartas ?? 1} cartas`;
    const n = m._monedas ?? 8;
    return `+${n} 🪙`;
  };

  return (
    <>
      {!externo && <TouchableOpacity onPress={() => setOpen(v => !v)} activeOpacity={0.82} style={[s.boton, compacto && s.botonCompacto]}>
          {iconoBoton}
          <Text style={[s.botonTexto, compacto && s.botonTextoCompacto]}>Misiones</Text>
          {pendientesReclamar > 0 && <View style={s.badge}><Text style={s.badgeText}>{pendientesReclamar}</Text></View>}
        </TouchableOpacity>}

      <Modal visible={mounted} transparent animationType="none" onRequestClose={cerrar}>
        <View style={s.modalRoot}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={cerrar}>
            <Animated.View style={[s.backdrop, { opacity: backdropAnim, ...StyleSheet.absoluteFillObject }]} />
          </TouchableOpacity>
          <Animated.View style={[s.panel, { transform: [{ translateX: slideAnim }] }]} onStartShouldSetResponder={() => true}>

          <View style={s.panelHeader}>
            <View style={s.panelHeaderRow}>
              <Text style={s.panelTitulo}>Misiones del día</Text>
              <View style={s.panelHeaderAcciones}>
              <TouchableOpacity onPress={cerrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={s.panelX}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.panelSubRow}>
              <Text style={s.panelSub}>{completadas}/{totalMisiones} completadas</Text>
              <Text style={s.panelReset}>↻ {tiempoReset}</Text>
            </View>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${(completadas / totalMisiones) * 100}%` }]} />
          </View>

          <View style={s.lista}>
            {(misiones ?? []).map(m => {
              const actual = m.campo === 'login_conteo'
                ? Math.min(loginData?.conteo ?? 0, m.meta)
                : m._subCampos
                  ? Math.min(m._subCampos.filter(c => progreso[c]).length, m.meta)
                  : m._distintas
                    ? Math.min(Object.keys(progreso[m.campo] || {}).length, m.meta)
                    : Math.min(progreso[m.campo] ?? 0, m.meta);
              const estado = getEstado(m);
              return <View key={m.id} style={s.misionRow}>
                <View style={s.misionRowIcon}><MaterialIcons name={iconoMision(m)} size={17} color="#c46d83" /></View>
                <View style={s.misionRowInfo}><Text style={s.misionRowTitle}>{m.titulo}</Text><Text style={s.misionRowDesc} numberOfLines={1}>{m.desc}</Text><View style={s.misionRowBar}><View style={[s.misionRowBarFill, { width: `${(actual / m.meta) * 100}%` }]} /></View></View>
                <View style={s.misionRowRight}><View style={s.misionRowStats}><Text style={s.misionRowReward}>{getRecompensaLabel(m)}</Text><Text style={s.misionRowProgress}>{actual}/{m.meta}</Text></View><TouchableOpacity style={[s.misionRowBtn, estado === 'reclamar' && s.misionRowBtnReady]} onPress={() => estado === 'reclamar' && reclamar(m)} disabled={estado !== 'reclamar'}><Text style={[s.misionRowBtnText, estado === 'reclamar' && s.misionRowBtnTextReady]}>{estado === 'reclamado' ? '✓ Reclamada' : estado === 'reclamar' ? 'Reclamar' : 'Pendiente'}</Text></TouchableOpacity></View>
              </View>;
            })}
          </View>

          {/* reset movido al header */}
          </Animated.View>
        </View>
      </Modal>

      <RecompensaOverlay
        visible={!!reward}
        onClose={() => {
          const pasoTutorial = reward?.tutorialPaso;
          setReward(null);
          if (pasoTutorial != null) actualizarPasoTutorial(auth.currentUser?.uid, pasoTutorial).catch(() => {});
        }}
      >
        <ChicleMision
          titulo={reward?.titulo}
          chicles={reward?.chicles}
          exp={reward?.exp}
          cartas={reward?.cartas}
          monedas={reward?.monedas ?? null}
          globos={reward?.globos ?? null}
        />
      </RecompensaOverlay>
    </>
  );
}

const s = StyleSheet.create({
  boton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#3a1a2e', borderRadius: 6,
    paddingVertical: 7, paddingHorizontal: 12,
    borderLeftWidth: 3, borderLeftColor: '#ff8fa8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 4, elevation: 5,
  },
  botonTexto: { fontFamily: 'Omori', fontSize: 10, color: '#fdf0e0', letterSpacing: 1 },
  botonTextoCompacto: { color: '#76552f', fontFamily: 'Delius', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.1 },
  botonCompacto: {
    width: 50, height: 38, flexDirection: 'column', justifyContent: 'center', gap: 0,
    paddingVertical: 3, paddingHorizontal: 2,
    backgroundColor: '#f1e1bd', borderRadius: 0,
    borderLeftWidth: 1, borderLeftColor: '#d0ad70',
    borderWidth: 1, borderColor: '#d0ad70',
    shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28, shadowRadius: 6, elevation: 12,
  },
  badge: {
    backgroundColor: '#f5c842', borderRadius: 4,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { fontSize: 8, color: '#3a2000', fontWeight: '900' },
  modalRoot: { flex: 1, backgroundColor: 'rgba(35,24,18,0.68)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  panel: {
    position: 'absolute', top: '50%', left: '50%', width: 330, height: 320,
    marginLeft: -165, marginTop: -160, backgroundColor: '#fff1e5', borderRadius: 18,
    borderWidth: 2, borderColor: '#d78da2', paddingTop: 8, paddingBottom: 8,
    shadowColor: '#73394f', shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 20,
  },
  panelHeader:    { paddingHorizontal: 14, marginBottom: 3 },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelHeaderAcciones: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitulo:    { fontFamily: 'Delius', fontSize: 15, color: '#a34f6b', fontWeight: '900', letterSpacing: 0.2 },
  panelX:         { fontSize: 14, color: 'rgba(180,80,100,0.55)', fontWeight: '700' },
  resetBtn:       { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  resetBtnText:   { fontSize: 13 },
  panelSubRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  panelSub:       { fontFamily: 'Delius', fontSize: 8, color: DIM },
  panelReset:     { fontFamily: 'Omori', fontSize: 7, color: 'rgba(180,80,100,0.45)', letterSpacing: 0.2 },
  barBg:   { height: 3, backgroundColor: 'rgba(255,143,168,0.2)', marginHorizontal: 14, borderRadius: 2, marginBottom: 3 },
  barFill: { height: '100%', backgroundColor: PINK, borderRadius: 2 },
  lista: { flex: 1, paddingHorizontal: 10, paddingVertical: 4, gap: 5, justifyContent: 'center' },
  misionRow: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 10, backgroundColor: '#fffaf0', borderWidth: 1, borderColor: '#edc3ce' },
  misionRowIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#f8dce5' },
  misionRowEmoji: { fontSize: 16 },
  misionRowInfo: { flex: 1 },
  misionRowTitle: { color: '#a34f6b', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
  misionRowDesc: { color: '#886473', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 8, fontWeight: '700' },
  misionRowBar: { height: 3, marginTop: 3, overflow: 'hidden', borderRadius: 3, backgroundColor: '#f1dfe4' },
  misionRowBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#d67892' },
  misionRowRight: { width: 51, alignItems: 'flex-end', gap: 2 },
  misionRowStats: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  misionRowProgress: { color: '#b45e78', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
  misionRowReward: { color: '#c18a43', fontFamily: 'Delius', fontSize: 6, fontWeight: '900' },
  misionRowBtn: { minWidth: 43, alignItems: 'center', paddingHorizontal: 3, paddingVertical: 3, borderRadius: 5, backgroundColor: '#f2e7e5', borderWidth: 1, borderColor: '#d9c6c8' },
  misionRowBtnReady: { backgroundColor: '#d67892', borderColor: '#ad536f' },
  misionRowBtnText: { color: '#987b83', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900' },
  misionRowBtnTextReady: { color: '#fffaf0' },
  misionCard: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14, backgroundColor: '#fffaf0', borderWidth: 1, borderColor: '#edc3ce' },
  misionIconWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f8dce5', borderWidth: 1, borderColor: '#e6a9ba' },
  misionIcon: { fontSize: 23 },
  misionTitulo: { marginTop: 5, color: '#a34f6b', fontFamily: 'Delius', fontSize: 14, fontWeight: '900' },
  misionDesc: { marginTop: 2, color: '#886473', fontFamily: 'Delius', fontSize: 8, lineHeight: 10, fontWeight: '700', textAlign: 'center' },
  misionProgressRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  misionProgress: { color: '#b45e78', fontFamily: 'Delius', fontSize: 13, fontWeight: '900' },
  misionReward: { color: '#c18a43', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  misionBar: { width: '100%', height: 4, marginTop: 3, overflow: 'hidden', borderRadius: 4, backgroundColor: '#f1dfe4' },
  misionBarFill: { height: '100%', borderRadius: 4, backgroundColor: '#d67892' },
  misionBtn: { width: '100%', alignItems: 'center', marginTop: 7, paddingVertical: 6, borderRadius: 9, backgroundColor: '#f2e7e5', borderWidth: 1, borderColor: '#d9c6c8' },
  misionBtnReady: { backgroundColor: '#d67892', borderColor: '#ad536f' },
  misionBtnDone: { backgroundColor: '#e2f0df', borderColor: '#a4c99c' },
  misionBtnText: { color: '#987b83', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  misionBtnTextReady: { color: '#fff9f2' },
  misionPager: { height: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  misionArrow: { color: '#a34f6b', fontSize: 25, lineHeight: 25 },
  misionArrowDisabled: { color: '#d9c9c5' },
  misionDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  misionDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#e0c5ca' },
  misionDotActive: { width: 14, backgroundColor: '#d67892' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BG2, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,143,168,0.22)',
    paddingVertical: 4, paddingHorizontal: 6,
    shadowColor: '#f0a0b8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 2, elevation: 1,
  },
  itemIcono:    { fontSize: 14, width: 18, textAlign: 'center' },
  itemInfo:     { flex: 1, gap: 0 },
  itemTitulo:   { fontFamily: 'Omori', fontSize: 8, color: ROSE },
  itemDesc:     { fontFamily: 'Delius', fontSize: 6.5, color: DIM, lineHeight: 9 },
  itemProgreso: { fontFamily: 'Delius', fontSize: 7, color: PINK },
  itemDerecha: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemRecompensa: {
    fontFamily: 'Omori',
    fontSize: 7,
    color: GOLD2,
    letterSpacing: 0.2,
  },
  itemRecompensaReclamada: {
    opacity: 0.4,
  },
  itemBtn: {
    borderRadius: 5, borderWidth: 1, borderColor: 'rgba(200,140,160,0.3)',
    paddingVertical: 2, paddingHorizontal: 5, backgroundColor: 'rgba(255,220,230,0.4)',
  },
  itemBtnReclamar:  { borderColor: ROSE, backgroundColor: 'rgba(255,143,168,0.25)' },
  itemBtnReclamado: { borderColor: 'rgba(107,203,119,0.5)', backgroundColor: 'rgba(107,203,119,0.12)' },
  itemBtnText:         { fontFamily: 'Delius', fontSize: 6.5, color: 'rgba(160,80,100,0.7)' },
  itemBtnTextReclamar: { color: ROSE, fontWeight: '700' },
});
