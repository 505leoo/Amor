import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import { useMisiones } from '../MisionesContext';
import RecompensaOverlay from './RecompensaOverlay';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const GOLD  = '#f5c842';
const GOLD2 = '#c8860a';
const GOLD3 = '#ffe97a';
const PINK  = '#ff8fa8';
const ROSE  = '#e8607a';
const DIM   = 'rgba(90,40,55,0.55)';
const BG    = '#fdf0f4';
const BG2   = '#fff7f9';

function ChicleMision({ titulo, monedas, chicles, size = 180 }) {
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
        {chicles ? (
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

export default function MisionesDiarias() {
  const {
    misiones, progreso, loginData, reclamados,
    completadas, pendientesReclamar,
    reward, setReward, reclamar, getEstado, resetDev,
  } = useMisiones();

  const [open, setOpen]     = useState(false);
  const [mounted, setMounted] = useState(false);
  const slideAnim    = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

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

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(v => !v)} activeOpacity={0.82} style={s.boton}>
        <Svg width={22} height={22}>
          <Defs>
            <LinearGradient id="cpGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor="#c4a0f5" />
              <Stop offset="50%"  stopColor="#ff8fa8" />
              <Stop offset="100%" stopColor="#f5c842" />
            </LinearGradient>
          </Defs>
          <Circle cx={11} cy={11} r={9} fill="rgba(255,255,255,0.18)" />
          <Circle cx={11} cy={11} r={7} fill="url(#cpGrad)" />
          <Circle cx={11} cy={11} r={7} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.2} />
          <Ellipse cx={8.5} cy={8} rx={2.5} ry={1.5} fill="rgba(255,255,255,0.3)" />
        </Svg>
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
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.panelX}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.panelSub}>{completadas}/5 completadas</Text>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${(completadas / 5) * 100}%` }]} />
          </View>

          <View style={s.lista}>
            {misiones.map((m) => {
              const actual = m.campo === 'login_conteo'
                ? Math.min(loginData?.conteo ?? 0, m.meta)
                : Math.min(progreso[m.campo] ?? 0, m.meta);
              const estado = getEstado(m);
              return (
                <View key={m.id} style={s.item}>
                  <Text style={s.itemIcono}>{m.icono}</Text>
                  <View style={s.itemInfo}>
                    <Text style={s.itemTitulo}>{m.titulo}</Text>
                    <Text style={s.itemDesc}>{m.desc}</Text>
                    <Text style={s.itemProgreso}>{actual}/{m.meta}</Text>
                  </View>
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
              );
            })}
          </View>

          {/* Botón reset DEV */}
          <TouchableOpacity
            onPress={resetDev}
            style={{ marginHorizontal: 8, marginTop: 8, padding: 6, backgroundColor: '#c8860a', borderRadius: 6, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'Omori', fontSize: 8, color: '#fff' }}>🔄 Reset misiones (DEV)</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      <RecompensaOverlay visible={!!reward} onClose={() => setReward(null)}>
        <ChicleMision
          titulo={reward?.titulo}
          chicles={reward?.chicles}
          monedas={reward?.monedas ?? null}
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
  panelTitulo:    { fontFamily: 'Omori', fontSize: 13, color: ROSE, letterSpacing: 0.4 },
  panelX:         { fontSize: 14, color: 'rgba(180,80,100,0.55)', fontWeight: '700' },
  panelSub:       { fontFamily: 'Delius', fontSize: 8, color: DIM, marginTop: 2 },
  barBg:   { height: 3, backgroundColor: 'rgba(255,143,168,0.18)', marginHorizontal: 14, borderRadius: 2, marginBottom: 10 },
  barFill: { height: '100%', backgroundColor: PINK, borderRadius: 2 },
  lista: { flex: 1, paddingHorizontal: 8, justifyContent: 'space-evenly' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: BG2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,143,168,0.22)',
    paddingVertical: 7, paddingHorizontal: 8,
    shadowColor: '#f0a0b8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
  itemIcono:    { fontSize: 18, width: 24, textAlign: 'center' },
  itemInfo:     { flex: 1, gap: 1 },
  itemTitulo:   { fontFamily: 'Omori', fontSize: 9, color: ROSE },
  itemDesc:     { fontFamily: 'Delius', fontSize: 7, color: DIM, lineHeight: 11 },
  itemProgreso: { fontFamily: 'Delius', fontSize: 8, color: PINK, marginTop: 1 },
  itemBtn: {
    borderRadius: 7, borderWidth: 1, borderColor: 'rgba(200,140,160,0.3)',
    paddingVertical: 4, paddingHorizontal: 6, backgroundColor: 'rgba(255,220,230,0.4)',
  },
  itemBtnReclamar:  { borderColor: ROSE, backgroundColor: 'rgba(255,143,168,0.25)' },
  itemBtnReclamado: { borderColor: 'rgba(107,203,119,0.5)', backgroundColor: 'rgba(107,203,119,0.12)' },
  itemBtnText:         { fontFamily: 'Delius', fontSize: 7, color: 'rgba(160,80,100,0.7)' },
  itemBtnTextReclamar: { color: ROSE, fontWeight: '700' },
});
