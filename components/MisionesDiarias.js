import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import { useMisiones } from '../MisionesContext';
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

function ChicleMision({ titulo, monedas, chicles, globos, size = 180 }) {
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
      const mon = mision._monedas ?? 10;
      await updateDoc(userRef, { dinero: increment(mon) }).catch(() => {});
      setReward({ titulo: mision.titulo, monedas: mon });
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
export default function MisionesDiarias({ icono, misionesEvento, eventoKey, instanceKey, recompensaOverride }) {
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

  const iconoBoton = icono ?? <Text style={{ fontSize: 18 }}>🎈</Text>;

  // ── Calcular etiqueta de recompensa para mostrar en cada misión ───────────
  const getRecompensaLabel = (m) => {
    const tipo = recompensaOverride ?? (esEvento
      ? (m._globos ? 'globo' : m._chicles ? 'chicle' : 'monedas')
      : (m.recompensa ?? 'monedas'));
    if (tipo === 'globo') {
      const n = esEvento
        ? (m._globos > 0 ? m._globos : 1)
        : (m._chicles > 0 ? m._chicles : 1);
      return `+${n} 🎈`;
    }
    if (tipo === 'chicle') {
      const n = m._chicles > 0 ? m._chicles : 1;
      return `+${n} 🍬`;
    }
    const n = m._monedas ?? 10;
    return `+${n} 🪙`;
  };

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(v => !v)} activeOpacity={0.82} style={s.boton}>
        {iconoBoton}
        <Text style={s.botonTexto}>Misiones</Text>
        {pendientesReclamar > 0 && (
          <View style={s.badge}><Text style={s.badgeText}>{pendientesReclamar}</Text></View>
        )}
      </TouchableOpacity>

      <Modal visible={mounted} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)}>
          <Animated.View style={[s.backdrop, { opacity: backdropAnim, ...StyleSheet.absoluteFillObject }]} />
        </TouchableOpacity>
        <Animated.View style={[s.panel, { transform: [{ translateX: slideAnim }] }]} onStartShouldSetResponder={() => true}>

          <View style={s.panelHeader}>
            <View style={s.panelHeaderRow}>
              <Text style={s.panelTitulo}>Misiones del día</Text>
              <View style={s.panelHeaderAcciones}>
                {resetDev && (
                  <TouchableOpacity onPress={resetDev} style={s.resetBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.resetBtnText}>🔄</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            {(misiones ?? []).map((m) => {
              // Calcular progreso visual correctamente
              let actual;
              if (!esEvento && m.campo === 'login_conteo') {
                actual = Math.min(loginData?.conteo ?? 0, m.meta);
              } else if (!esEvento && m._subCampos) {
                actual = Math.min(m._subCampos.filter(c => progreso[c]).length, m.meta);
              } else {
                actual = Math.min(progreso[m.campo] ?? 0, m.meta);
              }
              const estado = getEstado(m);
              return (
                <View key={m.id} style={s.item}>
                  <Text style={s.itemIcono}>{m.icono}</Text>
                  <View style={s.itemInfo}>
                    <Text style={s.itemTitulo}>{m.titulo}</Text>
                    <Text style={s.itemDesc}>{m.desc}</Text>
                    <Text style={s.itemProgreso}>{actual}/{m.meta}</Text>
                  </View>
                  <View style={s.itemDerecha}>
                    <Text style={[
                      s.itemRecompensa,
                      estado === 'reclamado' && s.itemRecompensaReclamada,
                    ]}>
                      {getRecompensaLabel(m)}
                    </Text>
                    <TouchableOpacity
                      style={[s.itemBtn, estado === 'reclamar' && s.itemBtnReclamar, estado === 'reclamado' && s.itemBtnReclamado]}
                      onPress={() => estado === 'reclamar' && reclamar(m)}
                      activeOpacity={estado === 'reclamar' ? 0.75 : 1}
                      disabled={estado !== 'reclamar'}
                    >
                      <Text style={[s.itemBtnText, estado === 'reclamar' && s.itemBtnTextReclamar]}>
                        {estado === 'pendiente' ? 'Pendiente' : estado === 'reclamar' ? 'Reclamar' : '✓'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* reset movido al header */}
        </Animated.View>
      </Modal>

      <RecompensaOverlay visible={!!reward} onClose={() => setReward(null)}>
        <ChicleMision
          titulo={reward?.titulo}
          chicles={reward?.chicles}
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
  badge: {
    backgroundColor: '#f5c842', borderRadius: 4,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { fontSize: 8, color: '#3a2000', fontWeight: '900' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,0,10,0.88)' },
  panel: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: '36%',
    backgroundColor: BG, borderLeftWidth: 1, borderLeftColor: 'rgba(255,143,168,0.35)',
    paddingTop: 8, paddingBottom: 12,
    shadowColor: '#c06080', shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 12,
  },
  panelHeader:    { paddingHorizontal: 14, marginBottom: 6 },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelHeaderAcciones: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitulo:    { fontFamily: 'Omori', fontSize: 13, color: ROSE, letterSpacing: 0.4 },
  panelX:         { fontSize: 14, color: 'rgba(180,80,100,0.55)', fontWeight: '700' },
  resetBtn:       { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  resetBtnText:   { fontSize: 13 },
  panelSubRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  panelSub:       { fontFamily: 'Delius', fontSize: 8, color: DIM },
  panelReset:     { fontFamily: 'Omori', fontSize: 7, color: 'rgba(180,80,100,0.45)', letterSpacing: 0.2 },
  barBg:   { height: 2, backgroundColor: 'rgba(255,143,168,0.18)', marginHorizontal: 14, borderRadius: 2, marginBottom: 6 },
  barFill: { height: '100%', backgroundColor: PINK, borderRadius: 2 },
  lista: { flex: 1, paddingHorizontal: 8, gap: 4, justifyContent: 'center' },
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
