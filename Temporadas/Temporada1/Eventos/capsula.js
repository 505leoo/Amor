import React, { useState, useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, StatusBar, TouchableOpacity, Text, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Ellipse, G, Rect, Line, Text as SvgText } from 'react-native-svg';

const GOLD  = '#f5c842';
const GOLD2 = '#c8860a';
const GOLD3 = '#ffe97a';

function ChicleDorado({ titulo, texto, monedas, exp, size = 220 }) {
  const R  = size / 2 - 20;
  const cx = size / 2;
  const textShadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="rGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor={GOLD3} />
            <Stop offset="50%"  stopColor={GOLD} />
            <Stop offset="100%" stopColor={GOLD2} />
          </LinearGradient>
          <LinearGradient id="rGlow" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0%"   stopColor="#fff8c0" stopOpacity="0.6" />
            <Stop offset="100%" stopColor={GOLD3}   stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Circle cx={cx} cy={cx} r={R + 18} fill="rgba(245,200,66,0.08)" />
        <Circle cx={cx} cy={cx} r={R + 11} fill="rgba(245,200,66,0.15)" />
        <Circle cx={cx} cy={cx} r={R + 5}  fill="rgba(245,200,66,0.26)" />
        <Circle cx={cx} cy={cx} r={R} fill="url(#rGrad)" />
        <Circle cx={cx} cy={cx} r={R} fill="url(#rGlow)" />
        <Circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
        <Circle cx={cx} cy={cx} r={R + 4} fill="none" stroke={GOLD} strokeWidth={1.2} opacity={0.45} strokeDasharray="5 3" />
        <Ellipse cx={cx - R * 0.26} cy={cx - R * 0.26} rx={R * 0.4}  ry={R * 0.22} fill="rgba(255,255,255,0.42)" />
        <Ellipse cx={cx - R * 0.08} cy={cx - R * 0.5}  rx={R * 0.14} ry={R * 0.08} fill="rgba(255,255,255,0.28)" />
      </Svg>
      {monedas != null ? (
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 36, lineHeight: 40 }}>🪙</Text>
          <Text style={[{ fontFamily: 'Omori', fontSize: 22, color: '#c8860a', letterSpacing: 1 }, textShadow]}>{monedas}</Text>
        </View>
      ) : exp != null ? (
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 36, lineHeight: 40 }}>⏏️</Text>
          <Text style={[{ fontFamily: 'Omori', fontSize: 22, color: '#c8860a', letterSpacing: 1 }, textShadow]}>{exp} exp</Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 3 }}>
          {titulo ? <Text style={[{ fontFamily: 'Omori', fontSize: 13, color: '#c8860a', letterSpacing: 0.5 }, textShadow]}>{titulo}</Text> : null}
          {texto  ? <Text style={[{ fontFamily: 'Delius', fontSize: 10, color: '#c8860a' }, textShadow]}>{texto}</Text> : null}
        </View>
      )}
    </View>
  );
}
import TabButtons from '../../../components/TabButtons';
import MisionesDiarias from '../../../components/MisionesDiarias';
import RecompensaOverlay from '../../../components/RecompensaOverlay';
import { db, auth } from '../../../firebaseConfig';
import { doc, updateDoc, increment, setDoc, onSnapshot } from 'firebase/firestore';

// ── Icono chicle SVG reutilizable ─────────────────────────────────────────────
const ChicleSvgIcono = (
  <Svg width={16} height={16}>
    <Defs>
      <LinearGradient id="chicleTabGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%"  stopColor="#c4a0f5" />
        <Stop offset="100%" stopColor="#ff8fa8" />
      </LinearGradient>
    </Defs>
    <Circle cx={8} cy={8} r={7} fill="rgba(255,255,255,0.12)" />
    <Circle cx={8} cy={8} r={5.5} fill="url(#chicleTabGrad)" />
    <Circle cx={8} cy={8} r={5.5} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={0.8} />
    <Ellipse cx={5.8} cy={5.8} rx={1.8} ry={1} fill="rgba(255,255,255,0.32)" />
  </Svg>
);

// ── Dimensiones ───────────────────────────────────────────────────────────────
const CW = 190;
const CH = 330;

// Puntos zigzag — margen generoso en todos los bordes
const P = [
  { x: CW * 0.50, y: CH * 0.91 }, // INICIO
  { x: CW * 0.76, y: CH * 0.76 }, // CP 1
  { x: CW * 0.24, y: CH * 0.62 }, // CP 2
  { x: CW * 0.76, y: CH * 0.47 }, // CP 3
  { x: CW * 0.24, y: CH * 0.33 }, // CP 4
  { x: CW * 0.76, y: CH * 0.18 }, // CP 5
  { x: CW * 0.50, y: CH * 0.10 }, // MEGA CP
];

// Zigzag con líneas rectas — pasos coinciden exactamente
const ROAD = P.reduce((d, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${d} L ${p.x} ${p.y}`, '');

const DOTS = P.slice(0, -1).flatMap((a, i) => {
  const b = P[i + 1];
  return [0.28, 0.5, 0.72].map(t => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }));
});

// ── Colores ───────────────────────────────────────────────────────────────────
const PINK  = '#ff8fa8';
const ROSE  = '#e8607a';
const CREAM = '#fdf0e0';
const PURP  = '#c4a0f5';

// ── Estrellita ────────────────────────────────────────────────────────────────
const Star = ({ x, y, r = 2.5, op = 0.5 }) => (
  <G opacity={op}>
    <Line x1={x} y1={y - r} x2={x} y2={y + r} stroke={GOLD} strokeWidth={1} strokeLinecap="round" />
    <Line x1={x - r} y1={y} x2={x + r} y2={y} stroke={GOLD} strokeWidth={1} strokeLinecap="round" />
    <Line x1={x - r * .7} y1={y - r * .7} x2={x + r * .7} y2={y + r * .7} stroke={GOLD} strokeWidth={.7} strokeLinecap="round" />
    <Line x1={x + r * .7} y1={y - r * .7} x2={x - r * .7} y2={y + r * .7} stroke={GOLD} strokeWidth={.7} strokeLinecap="round" />
  </G>
);

// Cada segmento tiene 4 posiciones: 3 pasos + 1 checkpoint
// posición global = seg * 4 + (0,1,2 = pasos, 3 = checkpoint)
const totalPasos = 6 * 4; // 24
const posCheckpoint = (seg) => seg * 4 + 4; // 4,8,12,16,20,24

// ── Indicador posición actual ─────────────────────────────────────────────────
const Indicador = ({ x, y, atCP }) => (
  <G>
    {atCP && <Circle cx={x} cy={y} r={14} fill="rgba(245,200,66,0.12)" />}
    {atCP && <Circle cx={x} cy={y} r={10} fill="rgba(245,200,66,0.22)" />}
    <Circle cx={x} cy={y} r={7}  fill={atCP ? 'rgba(245,200,66,0.35)' : 'rgba(255,255,255,0.12)'} />
    <Circle cx={x} cy={y} r={4.5} fill={atCP ? GOLD : CREAM} opacity={0.95} />
    <Circle cx={x} cy={y} r={4.5} fill="none" stroke={atCP ? GOLD2 : GOLD} strokeWidth={atCP ? 1.8 : 1} opacity={0.9} />
    {atCP && <Circle cx={x} cy={y} r={7} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.6} strokeDasharray="3 2" />}
    <Ellipse cx={x - 1.2} cy={y - 1.5} rx={1.5} ry={0.9} fill="rgba(255,255,255,0.5)" />
  </G>
);

// ── Checkpoint ───────────────────────────────────────────────────────────────
const CP = ({ x, y, reached, reclamado }) => {
  const solid = reclamado ? GOLD  : reached ? PINK : 'rgba(255,255,255,0.18)';
  const halo  = reclamado ? 'rgba(245,200,66,0.28)' : reached ? 'rgba(255,143,168,0.28)' : 'rgba(255,255,255,0.08)';
  const ring  = reclamado ? 'rgba(255,255,255,0.5)'  : 'rgba(255,255,255,0.38)';
  return (
    <G>
      <Circle cx={x} cy={y} r={11} fill={halo} />
      <Circle cx={x} cy={y} r={9}  fill={solid} />
      <Circle cx={x} cy={y} r={9}  fill="none" stroke={ring} strokeWidth={1.2} />
      <Ellipse cx={x - 2.5} cy={y - 3} rx={3} ry={1.8} fill="rgba(255,255,255,0.3)" />
      {reached && !reclamado && (
        <Circle cx={x} cy={y} r={12} fill="none" stroke={GOLD} strokeWidth={1.2} opacity={0.7} strokeDasharray="3 2" />
      )}
    </G>
  );
};

// ── Mega Checkpoint ─────────────────────────────────────────────────────
const MegaCP = ({ x, y, reached, reclamado }) => {
  const solid = reclamado ? GOLD : reached ? PINK : 'rgba(255,255,255,0.18)';
  const halo1 = reclamado ? 'rgba(245,200,66,0.15)' : reached ? 'rgba(255,143,168,0.15)' : 'rgba(255,255,255,0.05)';
  const halo2 = reclamado ? 'rgba(245,200,66,0.28)' : reached ? 'rgba(255,143,168,0.28)' : 'rgba(255,255,255,0.08)';
  const ring  = reclamado ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.38)';
  return (
    <G>
      <Circle cx={x} cy={y} r={20} fill={halo1} />
      <Circle cx={x} cy={y} r={16} fill={halo2} />
      <Circle cx={x} cy={y} r={13} fill={solid} />
      <Circle cx={x} cy={y} r={13} fill="none" stroke={ring} strokeWidth={1.5} />
      <Circle cx={x} cy={y} r={17} fill="none" stroke={solid} strokeWidth={.8} opacity={.45} strokeDasharray="3 3" />
      <Ellipse cx={x - 3.5} cy={y - 4} rx={4.5} ry={2.5} fill="rgba(255,255,255,0.3)" />
      {reached && !reclamado && (
        <Circle cx={x} cy={y} r={22} fill="none" stroke={GOLD} strokeWidth={1.2} opacity={0.7} strokeDasharray="4 3" />
      )}
    </G>
  );
};

// posActual: mapea pasos (0-24) → coordenada {x,y}
const getPosActual = (pasos) => {
  if (pasos === 0) return P[0];
  for (let seg = 0; seg < 6; seg++) {
    if (pasos === posCheckpoint(seg)) return P[seg + 1];
  }
  const seg = Math.floor((pasos - 1) / 4);
  const sub = (pasos - 1) % 4; // 0,1,2 = dots del segmento
  return DOTS[seg * 3 + sub];
};

// ── Camino SVG ────────────────────────────────────────────────────────────────
const CaminoSvg = ({ pasos, reclamados }) => {
  const posActual = getPosActual(pasos);
  const enCP = (() => {
    for (let seg = 0; seg < 6; seg++) {
      if (pasos === posCheckpoint(seg) && !reclamados.includes(seg + 1)) return true;
    }
    return false;
  })();
  return (
  <Svg width={CW} height={CH}>
    <Defs>
      <LinearGradient id="road" x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0%"   stopColor={PURP} stopOpacity=".9" />
        <Stop offset="45%"  stopColor={PINK} stopOpacity=".9" />
        <Stop offset="100%" stopColor={GOLD} stopOpacity=".95" />
      </LinearGradient>
    </Defs>

    {/* Estrellas decorativas de fondo */}
    {[[15,50],[168,75],[10,155],[172,185],[28,255],[158,275],[88,25],[105,305],[45,120],[148,130]].map(([x, y], i) => (
      <Star key={i} x={x} y={y} r={1.8} op={.28} />
    ))}

    {/* Camino — sombra */}
    <Path d={ROAD} stroke="rgba(0,0,0,0.32)" strokeWidth={10} fill="none"
      strokeLinecap="round" strokeLinejoin="round" translateX={1.5} translateY={2} />
    {/* Camino — base oscura */}
    <Path d={ROAD} stroke="rgba(50,15,8,0.5)" strokeWidth={10} fill="none"
      strokeLinecap="round" strokeLinejoin="round" />
    {/* Camino — color gradiente */}
    <Path d={ROAD} stroke="url(#road)" strokeWidth={7} fill="none"
      strokeLinecap="round" strokeLinejoin="round" />
    {/* Camino — brillo */}
    <Path d={ROAD} stroke="rgba(255,255,255,0.18)" strokeWidth={2.5} fill="none"
      strokeLinecap="round" strokeLinejoin="round" />

    {/* Pasos intermedios */}
    {DOTS.map((p, i) => {
      const posGlobal = Math.floor(i / 3) * 4 + (i % 3) + 1; // 1,2,3, 5,6,7, 9,10,11...
      return (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={4.5}
            fill={pasos >= posGlobal ? PINK : 'rgba(255,255,255,0.1)'} opacity={.9} />
          <Circle cx={p.x} cy={p.y} r={2.8}
            fill={pasos >= posGlobal ? ROSE : 'rgba(255,255,255,0.18)'} />
          {pasos >= posGlobal &&
            <Circle cx={p.x} cy={p.y} r={6.5} fill="none" stroke={PINK} strokeWidth={.8} opacity={.35} />}
        </G>
      );
    })}

    {/* Punto de inicio */}
    <G>
      <Ellipse cx={P[0].x} cy={P[0].y + 2} rx={9} ry={3} fill="rgba(0,0,0,0.2)" />
      <Circle cx={P[0].x} cy={P[0].y} r={8} fill="rgba(196,160,245,0.28)" />
      <Circle cx={P[0].x} cy={P[0].y} r={6} fill={PURP} />
      <Circle cx={P[0].x} cy={P[0].y} r={6} fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth={1.2} />
      <Ellipse cx={P[0].x - 1.5} cy={P[0].y - 2} rx={2} ry={1.2} fill="rgba(255,255,255,0.28)" />
      <Rect x={P[0].x - 12} y={P[0].y + 9} width={24} height={9} rx={4} fill="rgba(196,160,245,0.4)" />
      <SvgText x={P[0].x} y={P[0].y + 15.5} fontSize={5} fontFamily="Omori" fill={CREAM} textAnchor="middle">INICIO</SvgText>
    </G>

    {/* Checkpoints 1–5 */}
    {P.slice(1, 6).map((pt, i) => (
      <CP key={i} x={pt.x} y={pt.y}
        reached={pasos >= posCheckpoint(i)}
        reclamado={reclamados.includes(i + 1)} />
    ))}

    {/* Mega CP */}
    <MegaCP x={P[6].x} y={P[6].y}
      reached={pasos >= posCheckpoint(5)}
      reclamado={reclamados.includes(6)} />

    {/* Indicador posición actual */}
    <Indicador x={posActual.x} y={posActual.y} atCP={enCP} />
  </Svg>
  );
};

// ── Botón VAMOS ───────────────────────────────────────────────────────────────
function BtnVamos({ onPress, disabled, sinChicles }) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const handlePress = () => {
    if (sinChicles) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue:  8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  0, duration: 50, useNativeDriver: true }),
      ]).start();
      return;
    }
    onPress();
  };
  return (
  <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
  <TouchableOpacity onPress={handlePress} disabled={disabled && !sinChicles} activeOpacity={0.82} style={[sv.boton, disabled && sv.botonOff]}>
    <Svg width={20} height={20}>
      <Defs>
        <LinearGradient id="chicleGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%"  stopColor="#c4a0f5" />
          <Stop offset="100%" stopColor="#ff8fa8" />
        </LinearGradient>
      </Defs>
      <Circle cx={10} cy={10} r={8} fill="rgba(255,255,255,0.15)" />
      <Circle cx={10} cy={10} r={6} fill="url(#chicleGrad)" />
      <Circle cx={10} cy={10} r={6} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
      <Ellipse cx={7.5} cy={7.5} rx={2} ry={1.2} fill="rgba(255,255,255,0.3)" />
    </Svg>
    <Text style={sv.num}>1</Text>
    <Text style={sv.texto}>VAMOS</Text>
  </TouchableOpacity>
  </Animated.View>
  );
}

// ── Modal Checkpoint ──────────────────────────────────────────────────────────
const CP_LABELS = ['', '', '', '', '', '', '¡META!'];
const CP_REWARDS = ['', '🪙 250 monedas', '⏏️ 25 exp', '🌸 Sorpresa', '💕 Momento especial', '✨ Recuerdo', '🏆 Premio mayor'];

function ModalCP({ cp, reclamado, reached, onClose }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 10 }).start();
  }, []);
  const handleClose = () => {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(onClose);
  };
  const scale  = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const isMega = cp === 6;
  const R      = isMega ? 118 : 98;
  const SIZE   = (R + 22) * 2;
  const cx     = SIZE / 2;
  const fill   = reclamado ? GOLD : PINK;
  const halo1  = reclamado ? 'rgba(245,200,66,0.13)' : 'rgba(255,143,168,0.13)';
  const halo2  = reclamado ? 'rgba(245,200,66,0.22)' : 'rgba(255,143,168,0.22)';
  const ring   = reclamado ? 'rgba(255,255,255,0.5)'  : 'rgba(255,255,255,0.42)';

  const labelColor  = reclamado ? GOLD2 : reached ? ROSE  : PINK;
  const rewardColor = reclamado ? GOLD  : reached ? '#fdf0e0' : PINK;
  const statusText  = CP_REWARDS[cp];
  const statusLabel = reclamado ? '¡Ya reclamado!' : reached ? '¡Toca para reclamar!' : '¡Sigue avanzando!';

  return (
    <Modal transparent animationType="none" onRequestClose={handleClose}>
      <TouchableOpacity style={sm.backdrop} activeOpacity={1} onPress={handleClose}>
        <Animated.View style={{ opacity: anim, transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}
          onStartShouldSetResponder={() => true}
          onTouchEnd={e => e.stopPropagation()}>
          <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="chicleModalGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%"   stopColor={reclamado ? '#ffe97a' : '#ffb8cc'} />
                  <Stop offset="100%" stopColor={reclamado ? GOLD2     : ROSE} />
                </LinearGradient>
              </Defs>
              <Circle cx={cx} cy={cx} r={R + 18} fill={halo1} />
              <Circle cx={cx} cy={cx} r={R + 10} fill={halo2} />
              <Circle cx={cx} cy={cx} r={R} fill="url(#chicleModalGrad)" />
              <Circle cx={cx} cy={cx} r={R} fill="none" stroke={ring} strokeWidth={2} />
              <Circle cx={cx} cy={cx} r={R + 5} fill="none" stroke={fill} strokeWidth={1} opacity={0.4} strokeDasharray="5 4" />
              <Ellipse cx={cx - R * 0.27} cy={cx - R * 0.27} rx={R * 0.38} ry={R * 0.21} fill="rgba(255,255,255,0.35)" />
              <Ellipse cx={cx - R * 0.1}  cy={cx - R * 0.48} rx={R * 0.13} ry={R * 0.07} fill="rgba(255,255,255,0.22)" />
            </Svg>
            <View style={{ alignItems: 'center', gap: 5 }}>
              <Text style={{ fontFamily: 'Omori', fontSize: 11, color: labelColor, letterSpacing: 1, opacity: 0.85, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
                {statusLabel}
              </Text>
              <Text style={{ fontFamily: 'Omori', fontSize: isMega ? 15 : 13, color: rewardColor, letterSpacing: 0.5, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
                {statusText}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={sm.xBtn} onPress={handleClose}
            hitSlop={{ top:12, bottom:12, left:12, right:12 }}>
            <Text style={sm.xText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Modal Recompensa Final ────────────────────────────────────────────────────
function ModalRecompensaFinal({ onClose }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 12 }).start();
  }, []);
  const handleClose = () => {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(onClose);
  };
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const R    = 130;
  const SIZE = (R + 22) * 2;
  const cx   = SIZE / 2;
  return (
    <Modal transparent animationType="none" onRequestClose={handleClose}>
      <TouchableOpacity style={sm.backdrop} activeOpacity={1} onPress={handleClose}>
        <Animated.View style={{ opacity: anim, transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}
          onStartShouldSetResponder={() => true}
          onTouchEnd={e => e.stopPropagation()}>
          <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="chicleFinGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%"   stopColor="#ffe97a" />
                  <Stop offset="100%" stopColor={GOLD2} />
                </LinearGradient>
              </Defs>
              <Circle cx={cx} cy={cx} r={R + 18} fill="rgba(245,200,66,0.10)" />
              <Circle cx={cx} cy={cx} r={R + 10} fill="rgba(245,200,66,0.18)" />
              <Circle cx={cx} cy={cx} r={R} fill="url(#chicleFinGrad)" />
              <Circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
              <Circle cx={cx} cy={cx} r={R + 5} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.4} strokeDasharray="5 4" />
              <Ellipse cx={cx - R * 0.27} cy={cx - R * 0.27} rx={R * 0.38} ry={R * 0.21} fill="rgba(255,255,255,0.32)" />
              <Ellipse cx={cx - R * 0.1}  cy={cx - R * 0.48} rx={R * 0.13} ry={R * 0.07} fill="rgba(255,255,255,0.20)" />
            </Svg>
            {/* Polaroid */}
            <View style={smf.polaroid}>
              <ExpoImage
                source={require('../../../assets/temporadas/libro/Temporada1/Historia/historia1.png')}
                style={smf.polaroidImg}
                contentFit="cover"
                cachePolicy="memory"
              />
              <Text style={smf.polaroidTexto}>El día que todo comenzó...</Text>
            </View>
          </View>
          <Text style={{ fontFamily: 'Omori', fontSize: 12, color: GOLD3, marginTop: 8, letterSpacing: 0.5,
            textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
            ¡Imagen desbloqueada! 🎉
          </Text>
          <TouchableOpacity style={sm.xBtn} onPress={handleClose}
            hitSlop={{ top:12, bottom:12, left:12, right:12 }}>
            <Text style={sm.xText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Misiones diarias del evento Cápsula ──────────────────────────────────────
// Usa el contexto global — las misiones son externas al juego (login, mensajes,
// minutos jugados, etc.) y la recompensa son chicles para poder seguir jugando.
// No se pasa misionesEvento ni eventoKey — MisionesDiarias usa useMisiones() global.

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function Capsula({ navigation }) {
  const [pasos,      setPasos]      = useState(0);
  const [reclamados, setReclamados] = useState([]);
  const [reward,     setReward]     = useState(null);
  const [chicles,    setChicles]    = useState(0);
  const [dinero,     setDinero]     = useState(0);
  const [recompensaReclamada, setRecompensaReclamada] = useState(false);
  const [modalRecompensaFinal, setModalRecompensaFinal] = useState(false);

  const [cpModal, setCpModal] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const hoy = (() => { const h = new Date(); return `${h.getFullYear()}-${h.getMonth()+1}-${h.getDate()}`; })();

    const ref = doc(db, 'usuarios', uid);
    const unsub = onSnapshot(ref, snap => {
      const data = snap.data() || {};
      if (data.chicles == null) {
        setDoc(ref, { chicles: 1 }, { merge: true });
        setChicles(1);
      } else {
        setChicles(data.chicles);
      }
      setDinero(data.dinero ?? 0);
      setRecompensaReclamada(!!data.recompensaCapsula1);
    });
    return () => { unsub(); };
  }, []);

  const cpPendiente = (() => {
    for (let i = 1; i <= 6; i++) {
      if (pasos >= posCheckpoint(i - 1) && !reclamados.includes(i)) return i;
    }
    return null;
  })();

  const handleVamos = () => {
    if (cpPendiente !== null || pasos >= totalPasos || chicles <= 0) return;
    const uid = auth.currentUser?.uid;
    if (uid) {
      updateDoc(doc(db, 'usuarios', uid), { chicles: increment(-1) }).catch(() => {});
      // Progreso misión: pasos
      const diaKey = (() => { const h = new Date(); return `${h.getFullYear()}-${h.getMonth()+1}-${h.getDate()}`; })();
      setDoc(doc(db, 'misiones_diarias', diaKey), {
        [`${uid}_capsula`]: { progreso: { capsula_pasos_hoy: increment(1) } }
      }, { merge: true }).catch(() => {});
    }
    setChicles(v => v - 1);
    setPasos(v => v + 1);
  };

  const handleCheckpoint = async (idx) => {
    const reached  = pasos >= posCheckpoint(idx - 1);
    const yaReclam = reclamados.includes(idx);
    if (reached && !yaReclam) {
      setReclamados(v => [...v, idx]);
      const uid = auth.currentUser?.uid;
      if (idx === 1 && uid) await updateDoc(doc(db, 'usuarios', uid), { dinero: increment(250) }).catch(() => {});
      if (idx === 2 && uid) await updateDoc(doc(db, 'usuarios', uid), { exp: increment(25) }).catch(() => {});
      // Progreso misión: checkpoints
      if (uid) {
        const diaKey = (() => { const h = new Date(); return `${h.getFullYear()}-${h.getMonth()+1}-${h.getDate()}`; })();
        setDoc(doc(db, 'misiones_diarias', diaKey), {
          [`${uid}_capsula`]: { progreso: { capsula_checkpoints_hoy: increment(1) } }
        }, { merge: true }).catch(() => {});
      }
      setReward({ titulo: idx === 6 ? '¡META! 🏆' : null, monedas: idx === 1 ? 250 : null, exp: idx === 2 ? 25 : null, texto: (idx === 1 || idx === 2) ? null : '¡Recompensa desbloqueada! 🎁' });
    } else {
      setCpModal({ idx, reclamado: yaReclam, reached });
    }
  };

  const megaReclamado = reclamados.includes(6);

  const handleRecompensaFinal = async () => {
    if (!megaReclamado || recompensaReclamada) return;
    const uid = auth.currentUser?.uid;
    if (uid) await setDoc(doc(db, 'usuarios', uid), { recompensaCapsula1: true }, { merge: true }).catch(() => {});
    setRecompensaReclamada(true);
    setModalRecompensaFinal(true);
  };

  const bloqueado = cpPendiente !== null || pasos >= totalPasos;

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <ExpoImage
        source={require('../../../assets/temporadas/libro/Temporada1/fondo1.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover" cachePolicy="memory"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)' }]} />
      <TabButtons onExit={() => navigation?.navigate?.('temporada1')} customAddButton={<View />} chicles={chicles} userMoney={dinero} chicleIcono={ChicleSvgIcono} />

      <View style={s.caminoWrap}>
        <CaminoSvg pasos={pasos} reclamados={reclamados} />
        {/* TouchableOpacity nativos encima de cada checkpoint */}
        {P.slice(1, 7).map((pt, i) => {
          const idx    = i + 1;
          const hitR   = idx === 6 ? 28 : 22;
          const scaleX = CW; const scaleY = CH;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => handleCheckpoint(idx)}
              activeOpacity={0.7}
              style={[
                s.cpHit,
                {
                  width:  hitR * 2,
                  height: hitR * 2,
                  borderRadius: hitR,
                  left: pt.x - hitR,
                  top:  pt.y - hitR,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={s.vamosWrap}>
        <BtnVamos onPress={handleVamos} disabled={bloqueado} sinChicles={chicles <= 0} />
      </View>

      <View style={s.misionesWrap}>
        <MisionesDiarias icono={ChicleSvgIcono} />
      </View>

      <View style={s.recompensaFinalWrap}>
        <ExpoImage
          source={require('../../../assets/temporadas/libro/Temporada1/Historia/historia1.png')}
          style={s.recompensaFinalImg}
          contentFit="cover"
          cachePolicy="memory"
        />
        <View style={[
          s.recompensaFinalOverlay,
          { opacity: recompensaReclamada ? 0.35 : megaReclamado ? 0.55 : 0.82 },
        ]} />
        <View style={s.recompensaFinalContent}>
          <Text style={s.recompensaFinalEmoji}>
            {recompensaReclamada ? '🔓' : '🔒'}
          </Text>
          <Text style={s.recompensaFinalTexto}>
            {recompensaReclamada ? '¡Ya es tuya!' : megaReclamado ? '¡Toca para reclamar!' : 'Llega a la meta'}
          </Text>
        </View>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleRecompensaFinal}
          activeOpacity={megaReclamado && !recompensaReclamada ? 0.75 : 1}
        />
      </View>

      {cpModal && (
        <ModalCP
          cp={cpModal.idx}
          reclamado={cpModal.reclamado}
          reached={cpModal.reached}
          onClose={() => setCpModal(null)}
        />
      )}

      <RecompensaOverlay visible={!!reward} onClose={() => setReward(null)}>
        <ChicleDorado titulo={reward?.titulo} texto={reward?.texto} monedas={reward?.monedas} exp={reward?.exp} />
      </RecompensaOverlay>

      {modalRecompensaFinal && (
        <ModalRecompensaFinal onClose={() => setModalRecompensaFinal(false)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  caminoWrap:   { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  cpHit:        { position: 'absolute' },
  vamosWrap:    { position: 'absolute', right: 125, bottom: 40 },
  misionesWrap: { position: 'absolute', bottom: 32, left: 120 },
  recompensaFinalWrap: {
    position: 'absolute', bottom: 118, left: 120,
    width: 120, height: 120,
    borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 8,
    overflow: 'hidden',
  },
  recompensaFinalImg:     { position: 'absolute', top: 0, left: 0, width: 120, height: 120 },
  recompensaFinalOverlay: { position: 'absolute', top: 0, left: 0, width: 120, height: 120, backgroundColor: '#000' },
  recompensaFinalContent: { position: 'absolute', top: 0, left: 0, width: 120, height: 120, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10, gap: 3 },
  recompensaFinalEmoji:   { fontSize: 26 },
  recompensaFinalTexto:   { fontFamily: 'Omori', fontSize: 9, color: '#fff', textAlign: 'center', letterSpacing: 0.3, paddingHorizontal: 8, lineHeight: 14 },
});

const sm = StyleSheet.create({
  backdrop:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(6,0,10,0.93)' },
  xBtn:      { position: 'absolute', top: 8, right: 8 },
  xText:     { fontSize: 15, color: 'rgba(255,200,220,0.75)', fontWeight: '700' },
});

const smf = StyleSheet.create({
  polaroid: {
    width: 110, height: 130,
    backgroundColor: '#fff',
    padding: 6,
    paddingBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 10,
    transform: [{ rotate: '-3deg' }],
  },
  polaroidImg:   { width: '100%', flex: 1 },
  polaroidTexto: { position: 'absolute', bottom: 5, left: 0, right: 0, textAlign: 'center', fontFamily: 'Delius', fontSize: 8, color: '#555' },
});

const sv = StyleSheet.create({
  boton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3a1a2e',
    borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 12,
    borderLeftWidth: 3, borderLeftColor: '#c4a0f5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 4, elevation: 5,
  },
  botonOff: { opacity: 0.45 },
  num:   { fontFamily: 'Omori', fontSize: 9, color: '#c4a0f5', marginLeft: -2 },
  texto: { fontFamily: 'Omori', fontSize: 10, color: '#fdf0e0', letterSpacing: 1 },
});
