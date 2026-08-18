import React, { useRef, useState, useCallback, memo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Modal, Animated,
} from 'react-native';
import Svg, { Rect, Ellipse, Circle, Path, Defs, LinearGradient, Stop, ClipPath, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameEngine } from 'react-native-game-engine';
import RoomBackground from '../../components/RoomBackground';
import TabButtons from '../../components/TabButtons';

const { width: W, height: H } = Dimensions.get('window');

const BASE_W      = 118;
const TORTA_H     = 56;
const GRAVITY     = 0.55;
const STACK_Y     = H * 0.80;
const VIEW_TOP    = H * 0.20;
const SCROLL_STEP = (TORTA_H + 1) * 0.72;
const MAX_LIVES   = 3;
const MILESTONE   = 10;
const FORGIVE_PCT = 0.50;
const FAIL_PCT    = 0.10;

const getSpeed = (score) => 1.8 + Math.min(score * 0.06, 2.2);

const makeStack = (w = BASE_W) => ({
  id: 'base', x: (W - w) / 2, y: STACK_Y - TORTA_H,
  w, h: TORTA_H, tipo: 0,
});

const makeTortaActual = (stackTop, stackCount) => ({
  id: `t${stackCount}`, x: 10, y: stackTop.y - TORTA_H - 1,
  w: stackTop.w, h: TORTA_H, dir: 1, dropped: false,
  tipo: stackCount % 6,
});

// ─── Paleta pastel: cada color tiene frosting claro + cuerpo de bizcocho ──────
const CAKE_COLORS = [
  {                                       // fresa / rosa
    f0: '#fff5f8', f1: '#ffd6e8', f2: '#ffaac8', f3: '#e8608a',
    b0: '#fce0ea', b1: '#f5b8cc', b2: '#d4607a',
    cream: '#fffafc', shadow: '#b04060',
    sp: ['#ff6fa0', '#ffaac8', '#ffdce8', '#ffffff'],
  },
  {                                       // lavanda
    f0: '#f8f5ff', f1: '#e0d0ff', f2: '#c0a0f5', f3: '#8055cc',
    b0: '#ecdeff', b1: '#cbb0f0', b2: '#8055a8',
    cream: '#fdfaff', shadow: '#6040a0',
    sp: ['#b090ff', '#d0b8ff', '#eeddff', '#ffffff'],
  },
  {                                       // menta
    f0: '#f0fff8', f1: '#c0f0d8', f2: '#88d8b0', f3: '#3a9068',
    b0: '#d8f8ec', b1: '#a8e8c8', b2: '#3a9068',
    cream: '#f8fffc', shadow: '#206048',
    sp: ['#44bb88', '#88ddaa', '#c0f0d8', '#ffffff'],
  },
  {                                       // limon
    f0: '#fffff0', f1: '#fff0a8', f2: '#f0d050', f3: '#b08810',
    b0: '#fdf5c0', b1: '#f8e068', b2: '#c09010',
    cream: '#fffff8', shadow: '#807010',
    sp: ['#f5c800', '#f8e040', '#fdf0a0', '#ffffff'],
  },
  {                                       // durazno
    f0: '#fff8f5', f1: '#ffd8b8', f2: '#f0a870', f3: '#b86030',
    b0: '#fce8d0', b1: '#f5b880', b2: '#c06830',
    cream: '#fffaf8', shadow: '#804030',
    sp: ['#ff8844', '#ffaa70', '#ffd0b0', '#ffffff'],
  },
  {                                       // arandano / azul
    f0: '#f0f5ff', f1: '#c8d8ff', f2: '#88a8f5', f3: '#2858b8',
    b0: '#d8e8ff', b1: '#a0c0f8', b2: '#2858b8',
    cream: '#f8faff', shadow: '#183878',
    sp: ['#4488ff', '#6699ff', '#aaccff', '#ffffff'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  CAPA DE TORTA
//
//  Vista frontal de una capa de pastel:
//   - Bizcocho visible en el cuerpo (con textura de miga)
//   - Franja de crema entre bizcocho y cobertura
//   - Cobertura (frosting) clara en la parte superior
//   - Elipse de perspectiva en la tapa para dar profundidad 3D
//   - Perlas decorativas en el borde de la cobertura
//   - Sprinkles de color sobre la cobertura
//   - Multiples capas de sombra y brillo para volumen
// ─────────────────────────────────────────────────────────────────────────────
const Pancake = memo(({ x, y, w, h, tipo, opacity = 1 }) => {
  const c  = CAKE_COLORS[tipo % CAKE_COLORS.length];
  const g  = `ck${tipo}`;

  // Proporciones de la capa
  const rc     = 6;           // radio esquinas
  const frostH = h * 0.46;    // altura cobertura (parte superior clara)
  const creamH = h * 0.10;    // franja de crema visible
  const bodyY  = frostH + creamH; // donde empieza el bizcocho puro

  // Perspectiva: elipse en la parte superior de la cobertura
  const ellRy = h * 0.11;
  const ellCy = frostH * 0.16;

  // Perlas en el borde cobertura/crema
  const pearlY = frostH + creamH * 0.5;
  const pearlR = Math.min(w * 0.040, 5.8);
  const nP     = Math.max(3, Math.floor(w / (pearlR * 2.6)));
  const pearls = Array.from({ length: nP }, (_, i) => (w / (nP + 1)) * (i + 1));

  // Sprinkles sobre la cobertura
  const sprinks = [
    { px: w*0.12, py: frostH*0.36, r: w*0.034, ci: 0 },
    { px: w*0.28, py: frostH*0.20, r: w*0.025, ci: 1 },
    { px: w*0.44, py: frostH*0.42, r: w*0.030, ci: 2 },
    { px: w*0.60, py: frostH*0.18, r: w*0.023, ci: 3 },
    { px: w*0.76, py: frostH*0.36, r: w*0.028, ci: 0 },
    { px: w*0.88, py: frostH*0.22, r: w*0.021, ci: 1 },
    { px: w*0.20, py: frostH*0.62, r: w*0.019, ci: 2 },
    { px: w*0.52, py: frostH*0.65, r: w*0.023, ci: 3 },
    { px: w*0.82, py: frostH*0.60, r: w*0.019, ci: 0 },
  ];

  // Lineas de miga del bizcocho
  const migas = [
    bodyY + (h - bodyY) * 0.20,
    bodyY + (h - bodyY) * 0.48,
    bodyY + (h - bodyY) * 0.74,
  ];

  return (
    <Svg
      width={w}
      height={h}
      style={{ position: 'absolute', left: x, top: y, opacity }}
    >
      <Defs>
        {/* Bizcocho: bizcocho aireado, claro arriba oscuro abajo */}
        <LinearGradient id={`${g}biz`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"    stopColor={c.b0}     stopOpacity="1" />
          <Stop offset="0.45" stopColor={c.b1}     stopOpacity="1" />
          <Stop offset="1"    stopColor={c.b2}     stopOpacity="1" />
        </LinearGradient>

        {/* Cobertura: blanca arriba, tono del color abajo */}
        <LinearGradient id={`${g}fros`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"    stopColor={c.f0}  stopOpacity="1" />
          <Stop offset="0.45" stopColor={c.f1}  stopOpacity="1" />
          <Stop offset="0.80" stopColor={c.f2}  stopOpacity="1" />
          <Stop offset="1"    stopColor={c.f3}  stopOpacity="1" />
        </LinearGradient>

        {/* Franja de crema */}
        <LinearGradient id={`${g}crm`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.cream}  stopOpacity="1" />
          <Stop offset="1" stopColor={c.f2}     stopOpacity="1" />
        </LinearGradient>

        {/* Brillo especular de la cobertura */}
        <LinearGradient id={`${g}sh`} x1="0.10" y1="0" x2="0.90" y2="1">
          <Stop offset="0"    stopColor="#ffffff" stopOpacity="0.62" />
          <Stop offset="0.38" stopColor="#ffffff" stopOpacity="0.18" />
          <Stop offset="1"    stopColor="#ffffff" stopOpacity="0.00" />
        </LinearGradient>

        {/* Sombra lateral izquierda */}
        <LinearGradient id={`${g}sl`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"    stopColor={c.shadow} stopOpacity="0.32" />
          <Stop offset="0.22" stopColor={c.shadow} stopOpacity="0.00" />
        </LinearGradient>

        {/* Sombra lateral derecha */}
        <LinearGradient id={`${g}sr`} x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0"    stopColor={c.shadow} stopOpacity="0.32" />
          <Stop offset="0.22" stopColor={c.shadow} stopOpacity="0.00" />
        </LinearGradient>

        {/* Elipse superior (perspectiva 3D tapa) */}
        <LinearGradient id={`${g}el`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.f0}  stopOpacity="1" />
          <Stop offset="1" stopColor={c.f1}  stopOpacity="1" />
        </LinearGradient>

        {/* Sombra interna inferior del bizcocho */}
        <LinearGradient id={`${g}bi`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={c.b2}     stopOpacity="0.00" />
          <Stop offset="1"   stopColor={c.shadow} stopOpacity="0.40" />
        </LinearGradient>

        {/* Clip del rect entero */}
        <ClipPath id={`${g}clip`}>
          <Rect x={0} y={0} width={w} height={h} rx={rc} ry={rc} />
        </ClipPath>
      </Defs>

      {/* === SOMBRA PROYECTADA DEBAJO === */}
      <Rect x={5} y={h + 2} width={w - 10} height={7}
        rx={4} ry={4} fill={c.shadow} fillOpacity={0.20} />
      <Rect x={9} y={h + 6} width={w - 18} height={5}
        rx={3} ry={3} fill={c.shadow} fillOpacity={0.10} />

      <G clipPath={`url(#${g}clip)`}>

        {/* === BIZCOCHO (cuerpo) === */}
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${g}biz)`} />

        {/* Sombras laterales del bizcocho para volumen */}
        <Rect x={0} y={bodyY} width={w * 0.18} height={h - bodyY}
          fill={`url(#${g}sl)`} />
        <Rect x={w * 0.82} y={bodyY} width={w * 0.18} height={h - bodyY}
          fill={`url(#${g}sr)`} />

        {/* Sombra interna inferior del bizcocho */}
        <Rect x={0} y={bodyY} width={w} height={h - bodyY}
          fill={`url(#${g}bi)`} />

        {/* Textura de miga: pares de linea clara + oscura */}
        {migas.map((my, i) => (
          <React.Fragment key={i}>
            {/* Luz encima de la linea */}
            <Rect x={w*0.05} y={my - 1.0} width={w*0.90} height={1.2}
              fill="#ffffff" fillOpacity={0.30} />
            {/* Sombra debajo de la linea */}
            <Rect x={w*0.05} y={my + 0.2} width={w*0.90} height={1.4}
              fill={c.b2} fillOpacity={0.28} />
          </React.Fragment>
        ))}

        {/* === FRANJA DE CREMA === */}
        <Rect x={0} y={frostH} width={w} height={creamH}
          fill={`url(#${g}crm)`} />

        {/* Brillo en la crema */}
        <Rect x={w*0.04} y={frostH + creamH*0.12} width={w*0.92} height={creamH*0.40}
          fill="#ffffff" fillOpacity={0.45} />

        {/* Sombra superior de la crema */}
        <Rect x={0} y={frostH} width={w} height={creamH * 0.28}
          fill={c.shadow} fillOpacity={0.10} />

        {/* Sombra inferior de la crema (donde toca el bizcocho) */}
        <Rect x={0} y={frostH + creamH * 0.70} width={w} height={creamH * 0.30}
          fill={c.b2} fillOpacity={0.20} />

        {/* === COBERTURA (frosting) === */}
        <Rect x={0} y={0} width={w} height={frostH}
          fill={`url(#${g}fros)`} />

        {/* Brillo especular de la cobertura */}
        <Rect x={0} y={0} width={w} height={frostH * 0.52}
          fill={`url(#${g}sh)`} />

        {/* Sombras laterales de la cobertura */}
        <Rect x={0} y={0} width={w * 0.10} height={frostH}
          fill={`url(#${g}sl)`} />
        <Rect x={w * 0.90} y={0} width={w * 0.10} height={frostH}
          fill={`url(#${g}sr)`} />

        {/* Borde inferior de la cobertura: linea de luz arriba + sombra abajo */}
        <Rect x={0} y={frostH - 5} width={w} height={2}
          fill="#ffffff" fillOpacity={0.50} />
        <Rect x={0} y={frostH - 3} width={w} height={4}
          fill={c.f3} fillOpacity={0.65} />

        {/* === ELIPSE DE PERSPECTIVA (tapa 3D) === */}
        {/* Elipse principal */}
        <Ellipse cx={w/2} cy={ellCy} rx={w*0.46} ry={ellRy}
          fill={`url(#${g}el)`} fillOpacity={0.60} />
        {/* Borde de la elipse */}
        <Ellipse cx={w/2} cy={ellCy} rx={w*0.46} ry={ellRy}
          fill="none" stroke={c.f2} strokeWidth={1} strokeOpacity={0.40} />
        {/* Brillo en la elipse */}
        <Ellipse cx={w*0.40} cy={ellCy*0.68} rx={w*0.20} ry={ellRy*0.42}
          fill="#ffffff" fillOpacity={0.42} />

        {/* === SPRINKLES === */}
        {sprinks.map((s, i) => (
          <React.Fragment key={i}>
            {/* Sombra del sprinkle */}
            <Circle cx={s.px + 1.2} cy={s.py + 1.2} r={s.r * 1.05}
              fill={c.shadow} fillOpacity={0.20} />
            {/* Cuerpo del sprinkle */}
            <Circle cx={s.px} cy={s.py} r={s.r}
              fill={c.sp[s.ci]} fillOpacity={0.94} />
            {/* Brillo del sprinkle */}
            <Circle cx={s.px - s.r*0.30} cy={s.py - s.r*0.30} r={s.r*0.38}
              fill="#ffffff" fillOpacity={0.72} />
          </React.Fragment>
        ))}

        {/* === BRILLO ESPECULAR PUNTUAL === */}
        {/* Aureola exterior */}
        <Ellipse cx={w*0.22} cy={frostH*0.28} rx={w*0.13} ry={frostH*0.11}
          fill="#ffffff" fillOpacity={0.42} />
        {/* Nucleo del brillo */}
        <Ellipse cx={w*0.20} cy={frostH*0.25} rx={w*0.055} ry={frostH*0.044}
          fill="#ffffff" fillOpacity={0.78} />
        {/* Punto caliente */}
        <Ellipse cx={w*0.19} cy={frostH*0.23} rx={w*0.022} ry={frostH*0.018}
          fill="#ffffff" fillOpacity={0.95} />

        {/* === PERLAS DECORATIVAS === */}
        {pearls.map((px, i) => (
          <React.Fragment key={i}>
            {/* Sombra de la perla */}
            <Circle cx={px + 1.5} cy={pearlY + 1.5} r={pearlR * 1.12}
              fill={c.shadow} fillOpacity={0.22} />
            {/* Cuerpo de la perla: color de la cobertura */}
            <Circle cx={px} cy={pearlY} r={pearlR}
              fill={c.f1} fillOpacity={1} />
            {/* Tinte blanco sobre la perla */}
            <Circle cx={px} cy={pearlY} r={pearlR}
              fill="#ffffff" fillOpacity={0.50} />
            {/* Tinte del color de la cobertura en la perla */}
            <Circle cx={px} cy={pearlY} r={pearlR}
              fill={c.f2} fillOpacity={0.25} />
            {/* Brillo superior de la perla */}
            <Circle cx={px - pearlR*0.33} cy={pearlY - pearlR*0.33} r={pearlR*0.40}
              fill="#ffffff" fillOpacity={0.92} />
            {/* Reflejo inferior sutil */}
            <Circle cx={px + pearlR*0.22} cy={pearlY + pearlR*0.30} r={pearlR*0.22}
              fill="#ffffff" fillOpacity={0.38} />
          </React.Fragment>
        ))}

        {/* Sombra interna inferior del cuerpo entero */}
        <Rect x={0} y={h - 7} width={w} height={7}
          fill={c.b2} fillOpacity={0.38} />

      </G>

      {/* === CONTORNO EXTERIOR === */}
      <Rect x={0.6} y={0.6} width={w - 1.2} height={h - 1.2}
        rx={rc} ry={rc} fill="none"
        stroke={c.b2} strokeWidth={1.6} strokeOpacity={0.55} />
    </Svg>
  );
});

const TortaRenderer = ({ x, y, w, h, tipo }) => <Pancake x={x} y={y} w={w} h={h} tipo={tipo} />;
const ChunkRenderer = ({ x, y, w, h, tipo }) => <Pancake x={x} y={y} w={w} h={h} tipo={tipo} opacity={0.30} />;

const StackView = memo(({ stack, offset }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {stack.map((p, i) => (
      <Pancake key={p.id ?? i} x={p.x} y={p.y + offset} w={p.w} h={p.h} tipo={p.tipo} />
    ))}
  </View>
));

const FloatingText = memo(({ label, color, x, y, size = 18, onDone }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }).start(onDone);
  }, []);
  const translateY = anim.interpolate({ inputRange: [0,1], outputRange: [0, -80] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1, 0] });
  const scale      = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.2, 1] });
  return (
    <Animated.Text style={[styles.floatingText, { color, left: x, top: y, fontSize: size, opacity, transform: [{ translateY }, { scale }] }]}>
      {label}
    </Animated.Text>
  );
});

const Hearts = memo(({ lives }) => (
  <View style={styles.heartsRow}>
    {Array.from({ length: MAX_LIVES }).map((_, i) => (
      <Text key={i} style={[styles.heart, i >= lives && styles.heartEmpty]}>
        {i < lives ? '❤️' : '🖤'}
      </Text>
    ))}
  </View>
));

const MilestoneBar = memo(({ score }) => {
  const progress = (score % MILESTONE) / MILESTONE;
  const next     = Math.ceil((score + 1) / MILESTONE) * MILESTONE;
  return (
    <View style={styles.milestoneWrap}>
      <Text style={styles.milestoneLabel}>Meta: {next} 🎯</Text>
      <View style={styles.milestoneBg}>
        <View style={[styles.milestoneFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
});

const MilestonePop = memo(({ score, onDone }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  const scale   = anim.interpolate({ inputRange: [0,1], outputRange: [0.5, 1] });
  const opacity = anim;
  return (
    <Animated.View style={[styles.milestonePop, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.milestonePopEmoji}>🎉</Text>
      <Text style={styles.milestonePopTitle}>¡{score} tortitas!</Text>
      <Text style={styles.milestonePopSub}>+❤️ y tortita nueva</Text>
    </Animated.View>
  );
});

const TortitasGame = memo(({ navigation }) => {
  const engineRef      = useRef(null);
  const tortaRef       = useRef(null);
  const stackRef       = useRef([makeStack()]);
  const countRef       = useRef(1);
  const chunkIdRef     = useRef(0);
  const chunksQueueRef = useRef({});
  const scoreRef       = useRef(0);
  const floaterIdRef   = useRef(0);

  const [score, setScore]             = useState(0);
  const [lives, setLives]             = useState(MAX_LIVES);
  const [status, setStatus]           = useState('idle');
  const [renderKey, setRenderKey]     = useState(0);
  const [stackOffset, setStackOffset] = useState(0);
  const [floaters, setFloaters]       = useState([]);
  const [milestone, setMilestone]     = useState(null);
  const [record, setRecord]           = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('tortitas_record').then(v => { if (v) setRecord(parseInt(v)); }).catch(() => {});
  }, []);

  const moverTorta = useCallback((entities) => {
    const t = entities.tortaActual;
    if (t && !t.dropped) {
      const spd = getSpeed(scoreRef.current);
      t.x += t.dir * spd;
      if (t.x + t.w >= W - 10) t.dir = -1;
      if (t.x <= 10)            t.dir =  1;
      tortaRef.current = t;
    }
    Object.keys(entities).forEach(key => {
      if (!key.startsWith('chunk_')) return;
      const c = entities[key];
      c.vy = (c.vy ?? 0) + GRAVITY;
      c.y  += c.vy;
      if (c.y > H + 100) delete entities[key];
    });
    return entities;
  }, []);

  const buildEngineEntities = useCallback((offset = 0) => {
    const stack  = stackRef.current;
    const top    = stack[stack.length - 1];
    const ta     = makeTortaActual(top, countRef.current);
    const chunks = chunksQueueRef.current ?? {};
    chunksQueueRef.current = {};
    return {
      tortaActual: { ...ta, y: ta.y + offset, renderer: TortaRenderer },
      ...chunks,
    };
  }, []);

  const addFloater = useCallback((label, color, x, y, size) => {
    const id = floaterIdRef.current++;
    setFloaters(prev => [...prev, { id, label, color, x, y, size }]);
  }, []);

  const removeFloater = useCallback((id) => {
    setFloaters(prev => prev.filter(f => f.id !== id));
  }, []);

  const startGame = useCallback(() => {
    stackRef.current       = [makeStack()];
    countRef.current       = 1;
    chunkIdRef.current     = 0;
    chunksQueueRef.current = {};
    scoreRef.current       = 0;
    setScore(0);
    setLives(MAX_LIVES);
    setFloaters([]);
    setMilestone(null);
    setStackOffset(0);
    setStatus('playing');
    setRenderKey(k => k + 1);
  }, []);

  const drop = useCallback(() => {
    if (status !== 'playing') return;
    const ta = tortaRef.current;
    if (!ta || ta.dropped) return;

    const stack    = stackRef.current;
    const topTorta = stack[stack.length - 1];

    const leftOverlap  = Math.max(ta.x, topTorta.x);
    const rightOverlap = Math.min(ta.x + ta.w, topTorta.x + topTorta.w);
    const rawOverlap   = rightOverlap - leftOverlap;
    const pct          = rawOverlap / topTorta.w;

    const fx = W / 2 - 40;
    const fy = (ta.y + stackOffset) - 24;

    if (rawOverlap <= 0 || pct < FAIL_PCT) {
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) {
          addFloater('¡Uy! 😢', '#ff6666', fx, fy, 22);
          setTimeout(() => {
            setStatus('over');
            engineRef.current?.stop?.();
          }, 600);
        } else {
          addFloater('¡Casi! 💪', '#ffaa44', fx, fy, 20);
          setRenderKey(k => k + 1);
        }
        return next;
      });
      return;
    }

    const usedOverlap = pct >= FORGIVE_PCT ? topTorta.w : rawOverlap;
    const usedX       = pct >= FORGIVE_PCT ? topTorta.x : leftOverlap;

    if (pct >= FORGIVE_PCT && pct < 0.95) {
      addFloater('👍 ¡Bien!', '#88eebb', fx, fy, 18);
    } else if (pct >= 0.95) {
      addFloater('✨ ¡Perfecto!', '#f5e642', fx - 10, fy, 20);
    }

    const newTorta = {
      id: ta.id, x: usedX,
      y: topTorta.y - TORTA_H - 1,
      w: usedOverlap, h: TORTA_H, tipo: ta.tipo,
    };

    const chunks = {};
    if (pct < FORGIVE_PCT) {
      if (ta.x < leftOverlap) {
        chunks[`chunk_${chunkIdRef.current++}`] = {
          x: ta.x, y: ta.y, w: leftOverlap - ta.x,
          h: TORTA_H, tipo: ta.tipo, vy: -0.8, renderer: ChunkRenderer,
        };
      }
      if (ta.x + ta.w > rightOverlap) {
        chunks[`chunk_${chunkIdRef.current++}`] = {
          x: rightOverlap, y: ta.y, w: (ta.x + ta.w) - rightOverlap,
          h: TORTA_H, tipo: ta.tipo, vy: -0.8, renderer: ChunkRenderer,
        };
      }
    }

    stackRef.current = [...stack, newTorta];
    countRef.current += 1;
    const newScore = stack.length;
    scoreRef.current = newScore;
    setScore(newScore);

    if (newScore % MILESTONE === 0 && newScore > 0) {
      setMilestone(newScore);
      setLives(prev => Math.min(prev + 1, MAX_LIVES));
      const top = stackRef.current[stackRef.current.length - 1];
      stackRef.current[stackRef.current.length - 1] = { ...top, w: BASE_W, x: (W - BASE_W) / 2 };
    }

    setStackOffset(prev => {
      const next   = prev + SCROLL_STEP;
      const newTop = newTorta.y + next;
      return next + (newTop < VIEW_TOP ? VIEW_TOP - newTop : 0);
    });

    chunksQueueRef.current = chunks;
    setRenderKey(k => k + 1);
  }, [status, stackOffset, addFloater]);

  useEffect(() => {
    if (status === 'over' && score > record) {
      setRecord(score);
      AsyncStorage.setItem('tortitas_record', String(score)).catch(() => {});
    }
  }, [status]);

  const stars = score >= 15 ? 3 : score >= 8 ? 2 : score >= 3 ? 1 : 0;
  const isNewRecord = score > 0 && score >= record && status === 'over';

  const renderOverlay = () => {
    if (status === 'idle') return (
      <Modal transparent animationType="fade" visible statusBarTranslucent>
        <View style={styles.overlay}>
          <Text style={styles.overlayEmoji}>🎂</Text>
          <Text style={styles.overlayTitle}>Torre de Torta</Text>
          <Text style={styles.overlaySub}>¡Apila todas las capas!</Text>
          {record > 0 && <Text style={styles.overlayRecord}>🏆 Récord: {record}</Text>}
          <TouchableOpacity style={styles.btn} onPress={startGame}>
            <Text style={styles.btnText}>¡Jugar!</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );

    if (status === 'over') return (
      <Modal transparent animationType="fade" visible statusBarTranslucent>
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            {score >= 15 ? '¡Increíble!' : score >= 8 ? '¡Muy bien!' : score >= 3 ? '¡Bien hecho!' : '¡Sigue intentando!'}
          </Text>
          <Text style={styles.overlayScore}>{score}</Text>
          <Text style={styles.overlaySub}>
            {score === 1 ? 'capa apilada' : 'capas apiladas'}
          </Text>
          <View style={styles.starsRow}>
            {[1,2,3].map(i => (
              <Text key={i} style={[styles.star, i > stars && styles.starEmpty]}>
                {i <= stars ? '⭐' : '☆'}
              </Text>
            ))}
          </View>
          {isNewRecord && (
            <View style={styles.recordBadge}>
              <Text style={styles.recordText}>¡Nuevo récord!</Text>
            </View>
          )}
          {!isNewRecord && record > 0 && (
            <Text style={styles.overlayRecord}>Tu mejor: {record}</Text>
          )}
          <TouchableOpacity style={styles.btn} onPress={startGame}>
            <Text style={styles.btnText}>¡Otra vez!</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
    return null;
  };

  return (
    <View style={styles.container}>
      <RoomBackground />
      <TabButtons onExit={() => navigation?.navigate('juegos')} />

      {status === 'playing' && (
        <>
          <Text style={styles.score}>{score}</Text>
          <Hearts lives={lives} />
          <MilestoneBar score={score} />
        </>
      )}

      {status === 'playing' && (
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={drop}>
          <StackView stack={stackRef.current} offset={stackOffset} />
          <GameEngine
            key={renderKey}
            ref={engineRef}
            style={styles.engine}
            systems={[moverTorta]}
            entities={buildEngineEntities(stackOffset)}
            running={true}
          />
        </TouchableOpacity>
      )}

      {milestone !== null && (
        <MilestonePop score={milestone} onDone={() => setMilestone(null)} />
      )}

      {floaters.map(f => (
        <FloatingText
          key={f.id} label={f.label} color={f.color}
          x={f.x} y={f.y} size={f.size}
          onDone={() => removeFloater(f.id)}
        />
      ))}

      {renderOverlay()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  engine:    { flex: 1, backgroundColor: 'transparent' },

  score: {
    position: 'absolute', top: 80, alignSelf: 'center',
    fontSize: 52, fontWeight: '900',
    color: 'rgba(255,255,255,0.15)', letterSpacing: -2, zIndex: 10,
  },

  heartsRow: {
    position: 'absolute', top: 92, right: 18,
    flexDirection: 'row', gap: 4, zIndex: 15,
  },
  heart:      { fontSize: 22 },
  heartEmpty: { opacity: 0.35 },

  milestoneWrap: {
    position: 'absolute', bottom: H * 0.15, left: 24, right: 24,
    zIndex: 12, pointerEvents: 'none',
  },
  milestoneLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 10,
    fontFamily: 'Delius', letterSpacing: 1, marginBottom: 3,
  },
  milestoneBg: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 2, overflow: 'hidden',
  },
  milestoneFill: {
    height: '100%', backgroundColor: '#f5c842', borderRadius: 2,
  },

  milestonePop: {
    position: 'absolute', alignSelf: 'center', top: H * 0.35,
    backgroundColor: 'rgba(30,20,10,0.92)',
    borderRadius: 20, paddingHorizontal: 36, paddingVertical: 22,
    alignItems: 'center', gap: 6, zIndex: 50,
    borderWidth: 2, borderColor: '#f5c842',
  },
  milestonePopEmoji: { fontSize: 48, lineHeight: 54 },
  milestonePopTitle: {
    fontSize: 26, fontWeight: '900', color: '#f5e642', fontFamily: 'Delius',
  },
  milestonePopSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.70)', fontFamily: 'Delius',
  },

  floatingText: {
    position: 'absolute', fontWeight: '900',
    fontFamily: 'Delius', zIndex: 30,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
  },

  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: 'rgba(0,0,0,0.65)',
  },
  overlayEmoji: { fontSize: 64, lineHeight: 72 },
  overlayTitle: {
    fontSize: 32, fontWeight: '800', color: '#fff',
    letterSpacing: 1, fontFamily: 'Delius', textAlign: 'center',
  },
  overlayScore: { fontSize: 54, fontWeight: '900', color: '#e6b87a', lineHeight: 58 },
  overlaySub:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Delius', letterSpacing: 1 },
  overlayRecord: { fontSize: 13, color: '#f5c842', fontFamily: 'Delius' },

  starsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  star:      { fontSize: 32 },
  starEmpty: { opacity: 0.30 },

  recordBadge: {
    backgroundColor: '#f5c842', borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  recordText: { fontSize: 14, fontWeight: '800', color: '#3a2000', fontFamily: 'Delius' },

  btn: {
    marginTop: 6, paddingHorizontal: 44, paddingVertical: 15,
    backgroundColor: '#c8860a', borderRadius: 10,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 1, fontFamily: 'Delius' },
});

export default TortitasGame;
