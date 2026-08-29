import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, StatusBar, Image,
  PanResponder, Animated, Easing,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import RoomBackground from '../../components/RoomBackground';
import TabButtons from '../../components/TabButtons';
import { useMisiones } from '../../MisionesContext';
import { actualizarPasoTutorial } from '../../components/Tutorial';
import { resolverAvatarUsuario } from '../../data/iconosLocales';

const { width: W, height: H } = Dimensions.get('window');
const STORAGE_PREFIX = 'conexiones_progreso_v1_';

const COLORS = {
  coral:  '#ff7396',
  blue:   '#62bfff',
  mint:   '#70e0bd',
  violet: '#b997ff',
  gold:   '#ffd36f',
};
const HILITO = {
  violet: '#8367f5',
  deep: '#33235c',
  lavender: '#ded5ff',
  mist: '#f5f1ff',
};
const PATH_COLORS = {
  coral:  '#f6b7c6',
  blue:   '#afdfff',
  mint:   '#b8ead9',
  violet: '#d3c4fb',
  gold:   '#ffe3a5',
};
// El juego es procedural: no hay un último nivel fijo.
const MAX_LEVELS = Infinity;
const EXP_POR_VICTORIA = 5;
const LEVEL_CACHE = new Map();
const LEVEL_GENERATION_VERSION = 'rutas-profundas-v3';
const CONNECTION_TIME_BONUS = 6;

const COLOR_CYCLE = ['coral', 'blue', 'mint', 'violet', 'gold'];
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

function levelConfig(levelId) {
  if (levelId === 1) return { size: 2, pairCount: 1 };
  if (levelId <= 7) return { size: 3, pairCount: 2 };
  if (levelId <= 17) return { size: 4, pairCount: 3 };
  if (levelId <= 28) return { size: 5, pairCount: 4 };
  return { size: 6, pairCount: 5 };
}

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSnake(size, seed) {
  const cells = [];
  const startFromRight = seed % 2 === 1;
  for (let row = 0; row < size; row += 1) {
    const cols = Array.from({ length: size }, (_, i) => i);
    if ((row + (startFromRight ? 1 : 0)) % 2 === 1) cols.reverse();
    cols.forEach(col => cells.push([row, col]));
  }
  return cells;
}

// Recorrido en espiral: tiene muchos giros y se construye en tiempo constante.
// Sirve como candidato difícil sin cargar el hilo con un DFS largo.
function buildSpiral(size, seed) {
  const cells = [];
  let top = 0; let bottom = size - 1; let left = 0; let right = size - 1;
  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col += 1) cells.push([top, col]);
    top += 1;
    for (let row = top; row <= bottom; row += 1) cells.push([row, right]);
    right -= 1;
    if (top <= bottom) {
      for (let col = right; col >= left; col -= 1) cells.push([bottom, col]);
      bottom -= 1;
    }
    if (left <= right) {
      for (let row = bottom; row >= top; row -= 1) cells.push([row, left]);
      left += 1;
    }
  }
  const variant = seed % 4;
  return cells.map(([row, col]) => {
    if (variant === 1) return [col, size - 1 - row];
    if (variant === 2) return [size - 1 - row, size - 1 - col];
    if (variant === 3) return [size - 1 - col, row];
    return [row, col];
  });
}

// Construye una solución que visita cada casilla exactamente una vez.
// El DFS aleatorio cambia la geometría en cada nivel, pero conserva la
// garantía de que los extremos siempre provienen de una solución válida.
function buildHamiltonian(size, seed) {
  if (seed % 3 === 0) return buildSpiral(size, seed);
  const rand = rng(seed);
  const total = size * size;
  // El generador corre en el hilo de JS. Un límite estricto mantiene la
  // pantalla táctil responsiva; si no encuentra candidato a tiempo usamos
  // el recorrido determinista de respaldo.
  const maxNodes = size <= 4 ? total * total * 55 : size === 5 ? 9000 : 6000;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const start = [Math.floor(rand() * size), Math.floor(rand() * size)];
  const path = [start];
  const used = new Set([keyOf(start)]);
  let nodes = 0;
  const search = () => {
    if (path.length === total) return true;
    if (nodes++ > maxNodes) return false;
    const current = path[path.length - 1];
    const options = directions
      .map(([dr, dc]) => [current[0] + dr, current[1] + dc])
      .filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size && !used.has(`${r}:${c}`));
    options.sort((a, b) => {
      const degree = cell => directions.filter(([dr, dc]) => {
        const r = cell[0] + dr; const c = cell[1] + dc;
        return r >= 0 && r < size && c >= 0 && c < size && !used.has(`${r}:${c}`);
      }).length;
      return degree(a) - degree(b) + (rand() - 0.5) * 0.8;
    });
    // Mezclamos también las opciones con la semilla: el desempate por grado
    // puro producía casi siempre el mismo zigzag fácil.
    options.sort(() => rand() - 0.5);
    for (const next of options) {
      path.push(next); used.add(keyOf(next));
      if (search()) return true;
      path.pop(); used.delete(keyOf(next));
    }
    return false;
  };
  return search() ? path : buildSnake(size, seed);
}

function routeDifficulty(pairs, size) {
  const turns = pairs.reduce((sum, pair) => pair.solution.slice(2).reduce((inner, cell, index) => {
    const a = pair.solution[index]; const b = pair.solution[index + 1];
    return inner + ((b[0] - a[0] !== cell[0] - b[0] || b[1] - a[1] !== cell[1] - b[1]) ? 1 : 0);
  }, sum), 0);
  const separation = pairs.reduce((sum, pair) => {
    const a = pair.solution[0]; const b = pair.solution[pair.solution.length - 1];
    return sum + Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }, 0);
  const detour = pairs.reduce((sum, pair) => {
    const a = pair.solution[0]; const b = pair.solution[pair.solution.length - 1];
    const direct = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    return sum + Math.max(0, pair.solution.length - 1 - direct);
  }, 0);
  const deepestDetour = Math.max(...pairs.map(pair => {
    const a = pair.solution[0]; const b = pair.solution[pair.solution.length - 1];
    const direct = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    return Math.max(0, pair.solution.length - 1 - direct);
  }));
  const endpoints = pairs.flatMap(pair => [pair.solution[0], pair.solution[pair.solution.length - 1]]);
  const pressure = endpoints.reduce((sum, point, index) => sum + endpoints.reduce((inner, other, otherIndex) => {
    if (index === otherIndex) return inner;
    const distance = Math.abs(point[0] - other[0]) + Math.abs(point[1] - other[1]);
    return inner + (distance === 1 ? 3 : distance === 2 ? 1 : 0);
  }, 0), 0);
  let interference = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    const a = pairs[i].solution;
    const a0 = a[0]; const a1 = a[a.length - 1];
    const aminR = Math.min(a0[0], a1[0]); const amaxR = Math.max(a0[0], a1[0]);
    const aminC = Math.min(a0[1], a1[1]); const amaxC = Math.max(a0[1], a1[1]);
    for (let j = i + 1; j < pairs.length; j += 1) {
      const b = pairs[j].solution;
      const b0 = b[0]; const b1 = b[b.length - 1];
      const overlap = aminR <= Math.max(b0[0], b1[0]) && amaxR >= Math.min(b0[0], b1[0])
        && aminC <= Math.max(b0[1], b1[1]) && amaxC >= Math.min(b0[1], b1[1]);
      if (overlap) interference += 5;
      const distance = Math.min(
        Math.abs(a0[0] - b0[0]) + Math.abs(a0[1] - b0[1]),
        Math.abs(a0[0] - b1[0]) + Math.abs(a0[1] - b1[1]),
        Math.abs(a1[0] - b0[0]) + Math.abs(a1[1] - b0[1]),
        Math.abs(a1[0] - b1[0]) + Math.abs(a1[1] - b1[1]),
      );
      if (distance <= 2) interference += 3;
    }
  }
  // La dificultad prioriza rodeos y giros; la cercanía entre extremos añade
  // presión local, pero no reemplaza una solución geométricamente válida.
  // Los giros y los rodeos pesan mucho más que la distancia total: una ruta
  // recta ya no puede ganar frente a una que obliga a reservar pasillos.
  return Math.round((turns * 7 + detour * 10 + deepestDetour * 15 + pressure * 3 + interference * 4 + separation * 0.5) / size);
}

function hasAdjacentSameColorEndpoints(pairs, size) {
  // En 2×2 no existe un recorrido que cubra toda la grilla con una sola
  // pareja y extremos separados. En el resto, evitamos que una pareja pueda
  // resolverse con un solo movimiento.
  if (size <= 2) return false;
  return pairs.some(pair => {
    const first = pair.solution[0];
    const last = pair.solution[pair.solution.length - 1];
    return Math.abs(first[0] - last[0]) + Math.abs(first[1] - last[1]) <= 1;
  });
}

function splitRoute(route, pairCount, rand) {
  const total = route.length;
  const minChunk = Math.max(4, Math.floor(total / (pairCount * 2.2)));
  const usable = total - minChunk * pairCount;
  // Concentrar parte del recorrido en un color crea rutas largas que no se
  // resuelven con un atajo, manteniendo al resto como pasillos a reservar.
  const extras = Array(pairCount).fill(0);
  const featuredPair = Math.floor(rand() * pairCount);
  for (let step = 0; step < usable; step += 1) {
    const pairIndex = rand() < 0.62 ? featuredPair : Math.floor(rand() * pairCount);
    extras[pairIndex] += 1;
  }
  const lengths = extras.map(extra => minChunk + extra);
  let index = 0;
  return lengths.map((length, pairIndex) => {
    const solution = route.slice(index, index + length);
    index += length;
    return { color: COLOR_CYCLE[pairIndex % COLOR_CYCLE.length], solution };
  });
}

function generateLevel(levelId, difficultyBias = 0) {
  const cacheKey = `${LEVEL_GENERATION_VERSION}:${levelId}:${difficultyBias}`;
  if (LEVEL_CACHE.has(cacheKey)) return LEVEL_CACHE.get(cacheKey);
  const { size, pairCount } = levelConfig(levelId);
  const candidates = [];
  // Los tableros chicos admiten más candidatos sin coste perceptible. Así,
  // desde 4×4 elegimos rutas realmente retorcidas en vez de un zigzag fácil.
  const attempts = levelId === 1 ? 0 : size <= 4 ? 24 : size === 5 ? 8 : 4;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const seed = levelId * 9176 + attempt * 7919;
    const candidate = buildHamiltonian(size, seed);
    // Un mismo recorrido puede producir tableros muy distintos según dónde
    // se corten los colores. Probamos varios cortes y nos quedamos con el que
    // tenga más giros, rodeos y extremos poco evidentes.
    for (let splitAttempt = 0; splitAttempt < 8; splitAttempt += 1) {
      const pairs = splitRoute(candidate, pairCount, rng(seed + 31 + splitAttempt * 101));
      if (hasAdjacentSameColorEndpoints(pairs, size)) continue;
      const score = routeDifficulty(pairs, size);
      candidates.push({ pairs, score });
    }
  }
  const fallbackRoute = buildSnake(size, levelId);
  let fallback = null;
  for (let splitAttempt = 0; splitAttempt < 24; splitAttempt += 1) {
    const trial = splitRoute(fallbackRoute, pairCount, rng(levelId + 77 + splitAttempt * 41));
    if (!hasAdjacentSameColorEndpoints(trial, size)) {
      fallback = trial;
      break;
    }
  }
  fallback ||= splitRoute(fallbackRoute, pairCount, rng(levelId + 77));
  // No usamos el máximo siempre: así el modo difícil puede escoger el mejor
  // candidato y el normal queda en un percentil alto pero alcanzable.
  candidates.sort((a, b) => a.score - b.score);
  const candidateIndex = difficultyBias < 0
    ? 0
    : difficultyBias > 0
      ? candidates.length - 1
      : Math.floor((candidates.length - 1) * 0.70);
  const selected = candidates[candidateIndex];
  const pairs = selected?.pairs || fallback;
  const difficultyScore = selected?.score || routeDifficulty(pairs, size);
  const difficulty = difficultyScore < 22 ? 'Pulso' : difficultyScore < 34 ? 'Tensión' : difficultyScore < 48 ? 'Nudo' : 'Caos';
  const result = {
    id: levelId,
    size,
    nombre: `${difficulty} ${levelId}`,
    difficultyScore,
    pairs,
  };
  LEVEL_CACHE.set(cacheKey, result);
  return result;
}

const keyOf = ([row, col]) => `${row}:${col}`;
const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const sameCell = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
const neighbours = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
const initialPaths = level => Object.fromEntries(level.pairs.map(pair => [pair.color, []]));
const roundDuration = level => Math.max(42, 76 - level.id * 2 - Math.floor((level.difficultyScore || 0) * 0.25));
const normalizeProgress = value => ({
  unlocked: Math.max(1, Math.min(MAX_LEVELS, Number(value?.unlocked) || 1)),
  completed: value?.completed && typeof value.completed === 'object' ? value.completed : {},
});
const progressStars = progress => Object.values(progress.completed || {}).reduce((sum, item) => sum + (item.stars || 0), 0);
const gameScore = progress => Object.values(progress.completed || {}).reduce(
  (sum, item) => sum + (item.stars || 0) * 100 - Math.min(item.bestMoves || 0, 99), 0,
);

function endpointsFor(level) {
  const endpoints = {};
  level.pairs.forEach(pair => {
    endpoints[keyOf(pair.solution[0])] = pair.color;
    endpoints[keyOf(pair.solution[pair.solution.length - 1])] = pair.color;
  });
  return endpoints;
}

function connectsPair(pair, path) {
  const first = pair.solution[0];
  const last = pair.solution[pair.solution.length - 1];
  return path.length > 1
    && ((sameCell(path[0], first) && sameCell(path[path.length - 1], last))
      || (sameCell(path[0], last) && sameCell(path[path.length - 1], first)));
}

function isSolved(level, paths) {
  const everyPairConnected = level.pairs.every(pair => {
    const path = paths[pair.color] || [];
    return connectsPair(pair, path);
  });
  // No alcanza con tocar los extremos: el tablero se termina cuando cada
  // casilla forma parte de una conexión.
  const illuminatedCells = new Set(Object.values(paths).flatMap(path => path.map(keyOf)));
  return everyPairConnected && illuminatedCells.size === level.size * level.size;
}

function getStars(timeLeft, duration, hintUsed, moves, level) {
  const lightRatio = duration ? timeLeft / duration : 0;
  // Para llenar la grilla, cada pareja necesita como mínimo una casilla menos
  // que su ruta: en total, celdas - parejas. Admitimos unos pocos giros de
  // exploración, pero una solución con muchos retrocesos no puede dar 3★.
  const optimalMoves = level.size * level.size - level.pairs.length;
  const threeStarLimit = optimalMoves + Math.max(2, Math.ceil(level.size / 2));
  const twoStarLimit = optimalMoves + Math.max(7, level.size * 2);
  if (!hintUsed && lightRatio >= 0.55 && moves <= threeStarLimit) return 3;
  if (lightRatio >= 0.24 && moves <= twoStarLimit) return 2;
  return 1;
}

const MiniAvatar = memo(({ profile, fallback }) => {
  const name = profile?.nombre || fallback;
  // Iconos.js guarda la elección como iconoUrl. La foto de perfil sólo es el
  // respaldo para cuentas que todavía no eligieron un icono.
  const avatarSource = resolverAvatarUsuario(profile);
  if (avatarSource) return <ExpoImage source={typeof avatarSource === 'string' ? { uri: avatarSource } : avatarSource} style={styles.miniAvatar} contentFit="cover" cachePolicy="memory-disk" />;
  return <View style={[styles.miniAvatar, styles.miniAvatarFallback]}><Text style={styles.miniAvatarText}>{(name || '?')[0].toUpperCase()}</Text></View>;
});

const PartnerScore = memo(({ me, partner }) => {
  const myLevel = me?.nivel || 1;
  const partnerLevel = partner?.nivel || 1;
  if (!partner) return (
    <View style={styles.partnerCard}><Text style={styles.partnerEmoji}>💜</Text><Text style={styles.partnerText}>Uní una pareja para compartir el reto.</Text></View>
  );
  return (
    <View style={styles.partnerCard}>
      <Text style={styles.partnerTitle}>PROGRESO EN PAREJA</Text>
      <MiniAvatar profile={me} fallback="Tú" />
      <View style={styles.partnerPlayer}><Text style={styles.partnerName}>Vos</Text><Text style={styles.partnerPoints}>Nivel {myLevel}</Text></View>
      <View style={styles.vsBadge}><Text style={styles.vsText}>♥</Text></View>
      <View style={styles.partnerPlayer}><Text style={styles.partnerName} numberOfLines={1}>{(partner.nombre || 'Pareja').trim().split(/\s+/)[0]}</Text><Text style={styles.partnerPoints}>Nivel {partnerLevel}</Text></View>
      <MiniAvatar profile={partner} fallback="P" />
      <View style={styles.partnerStatus}><Text style={styles.partnerSub}>Cada uno a su ritmo</Text></View>
    </View>
  );
});

const Board = memo(({ level, paths, onTouchStart, onTouchMove, hintCells, reveal }) => {
  const width = Math.min(W * 0.82, H * 0.43, 330);
  const endpoints = useMemo(() => endpointsFor(level), [level]);
  const cell = width / level.size;
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => onTouchStart(event.nativeEvent.locationX, event.nativeEvent.locationY, width),
    onPanResponderMove: event => onTouchMove(event.nativeEvent.locationX, event.nativeEvent.locationY, width),
    // El último desplazamiento puede llegar junto con el release (sin un
    // evento move previo). Lo procesamos antes de terminar el gesto para que
    // un extremo no quede sin conectar al levantar el dedo.
    onPanResponderRelease: event => {
      onTouchMove(event.nativeEvent.locationX, event.nativeEvent.locationY, width);
      onTouchMove(null, null, width);
    },
    onPanResponderTerminate: () => onTouchMove(null, null, width),
    onPanResponderTerminationRequest: () => false,
  }), [onTouchMove, onTouchStart, width]);

  return (
    <View
      style={[styles.boardShell, { width, height: width }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: level.size * level.size }, (_, index) => (
          <View
            key={index}
            style={[styles.cell, {
              position: 'absolute',
              left: (index % level.size) * cell,
              top: Math.floor(index / level.size) * cell,
              width: cell + 0.5,
              height: cell + 0.5,
            }]}
          />
        ))}
      </View>

      <Svg width={width} height={width} style={StyleSheet.absoluteFill} pointerEvents="none">
        {level.pairs.map((pair, index) => {
          const path = paths[pair.color] || [];
          if (path.length < 2) return null;
          const isComplete = connectsPair(pair, path);
          const points = path.map(([row, col]) => `${col * cell + cell / 2},${row * cell + cell / 2}`).join(' ');
          const opacity = reveal.interpolate({
            inputRange: [index * 0.13, index * 0.13 + 0.22, 1],
            outputRange: [0, isComplete ? 1 : 0.78, isComplete ? 1 : 0.78],
            extrapolate: 'clamp',
          });
          return (
            <AnimatedPolyline
              key={pair.color}
              points={points}
              fill="none"
              stroke={isComplete ? COLORS[pair.color] : PATH_COLORS[pair.color]}
              strokeWidth={cell * 0.50}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
            />
          );
        })}
        {hintCells.map((spot, index) => (
          <Circle
            key={`${keyOf(spot)}-${index}`}
            cx={spot[1] * cell + cell / 2}
            cy={spot[0] * cell + cell / 2}
            r={cell * (index ? 0.16 : 0.26)}
            fill={index ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.28)'}
          />
        ))}
      </Svg>

      {Object.entries(endpoints).map(([endpointKey, color]) => {
        const [row, col] = endpointKey.split(':').map(Number);
        const colorIndex = level.pairs.findIndex(pair => pair.color === color);
        const opacity = reveal.interpolate({
          inputRange: [colorIndex * 0.13, colorIndex * 0.13 + 0.20, 1],
          outputRange: [0, 1, 1],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={endpointKey}
            pointerEvents="none"
            style={[
              styles.endpoint,
              {
                width: cell * 0.56, height: cell * 0.56, borderRadius: cell,
                left: col * cell + cell * 0.22, top: row * cell + cell * 0.22,
                backgroundColor: COLORS[color],
                borderWidth: Math.max(2, cell * 0.055),
              },
              { opacity },
            ]}
          >
            <View style={styles.endpointShine} />
          </Animated.View>
        );
      })}
    </View>
  );
});

export default memo(function ConexionesGame({ navigation }) {
  const { registrarProgreso } = useMisiones();
  const uid = auth.currentUser?.uid;
  const [status, setStatus] = useState('lobby');
  const [hasActiveBoard, setHasActiveBoard] = useState(false);
  const [selectedId, setSelectedId] = useState(1);
  const [difficultyBias, setDifficultyBias] = useState(0);
  const [paths, setPaths] = useState(() => initialPaths(generateLevel(1)));
  const pathsRef = useRef(paths);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => roundDuration(generateLevel(1)));
  const [startedAt, setStartedAt] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintCells, setHintCells] = useState([]);
  const [progress, setProgress] = useState({ unlocked: 1, completed: {} });
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [reward, setReward] = useState(0);
  const [expReward, setExpReward] = useState(0);
  const [bonusReward, setBonusReward] = useState(null);
  const [rewardPending, setRewardPending] = useState(false);
  const [lastStars, setLastStars] = useState(0);
  const [revealedStars, setRevealedStars] = useState(0);
  const [myOnlineStats, setMyOnlineStats] = useState(null);
  const remoteLevelRef = useRef(1);
  const [partnerId, setPartnerId] = useState(null);
  const [partner, setPartner] = useState(null);
  const progressRef = useRef(progress);
  const dragRef = useRef(null);
  const completedRef = useRef(false);
  const hintTimer = useRef(null);
  const starTimer = useRef(null);
  const resetTapRef = useRef(null);
  const levelStartFrame = useRef(null);
  const roundEndsAtRef = useRef(null);
  const roundIdRef = useRef(0);
  const winTimer = useRef(null);
  const levelReveal = useRef(new Animated.Value(1)).current;

  const level = useMemo(() => generateLevel(selectedId, difficultyBias), [selectedId, difficultyBias]);
  const duration = useMemo(() => roundDuration(level), [level]);
  const latestUnlocked = Math.min(Math.max(progress.unlocked || 1, myOnlineStats?.nivel || 1), MAX_LEVELS);
  const lobbyGridSize = useMemo(() => generateLevel(latestUnlocked).size, [latestUnlocked]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const storageKey = `${STORAGE_PREFIX}${uid || 'guest'}`;
    let active = true;
    // No permitimos iniciar hasta conocer el estado persistido: de otro modo
    // una lectura tardía puede pisar una victoria recién obtenida.
    setProgressLoaded(false);
    setProgress({ unlocked: 1, completed: {} });
    AsyncStorage.getItem(storageKey)
      .then(value => (value ? normalizeProgress(JSON.parse(value)) : { unlocked: 1, completed: {} }))
      .catch(() => ({ unlocked: 1, completed: {} }))
      .then(saved => {
        if (!active) return;
        const nivelRemoto = Math.min(Math.max(Number(remoteLevelRef.current) || 1, 1), MAX_LEVELS);
        const merged = { ...saved, unlocked: Math.max(saved.unlocked || 1, nivelRemoto) };
        progressRef.current = merged;
        setProgress(merged);
        setProgressLoaded(true);
      });
    return () => { active = false; };
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    const unsubscribeUser = onSnapshot(doc(db, 'usuarios', uid), snapshot => {
      const data = snapshot.data() || {};
      setPartnerId(data.pareja || null);
    }, () => {});
    const unsubscribeGame = onSnapshot(doc(db, 'usuarios', uid, 'juegos', 'conexiones'), snapshot => {
      const gameData = snapshot.data() || {};
      const nivelRemoto = Math.min(Math.max(Number(gameData.nivel) || 1, 1), MAX_LEVELS);
      remoteLevelRef.current = Math.max(remoteLevelRef.current, nivelRemoto);
      setMyOnlineStats(previous => ({ ...(previous || {}), ...gameData, nivel: nivelRemoto }));
      setProgress(previous => {
        if (nivelRemoto <= (previous.unlocked || 1)) return previous;
        const merged = { ...previous, unlocked: nivelRemoto };
        progressRef.current = merged;
        AsyncStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    }, () => {});
    const unsubscribeProfile = onSnapshot(doc(db, 'usuarios', uid), snapshot => {
      const data = snapshot.data() || {};
      if (data.juegos?.conexiones) {
        setDoc(doc(db, 'usuarios', uid, 'juegos', 'conexiones'), data.juegos.conexiones, { merge: true }).catch(() => {});
      }
      setMyOnlineStats(previous => ({ ...(previous || {}), nombre: data.nombre, iconoLocalId: data.iconoLocalId, iconoUrl: data.iconoUrl, photoURL: data.photoURL }));
    }, () => {});
    return () => { unsubscribeUser(); unsubscribeGame(); unsubscribeProfile(); };
  }, [uid]);

  useEffect(() => {
    if (!partnerId) {
      setPartner(null);
      return undefined;
    }
    let profile = {};
    let game = {};
    const actualizar = () => setPartner({ ...profile, ...game, nivel: game.nivel || 1 });
    const unsubscribeProfile = onSnapshot(doc(db, 'usuarios', partnerId), other => {
      const otherData = other.data() || {};
      profile = { nombre: otherData.nombre, iconoLocalId: otherData.iconoLocalId, iconoUrl: otherData.iconoUrl, photoURL: otherData.photoURL };
      if (otherData.juegos?.conexiones && !Object.keys(game).length) game = otherData.juegos.conexiones;
      actualizar();
    }, () => setPartner(null));
    const unsubscribeGame = onSnapshot(doc(db, 'usuarios', partnerId, 'juegos', 'conexiones'), other => {
      game = other.data() || {};
      actualizar();
    }, () => setPartner(null));
    return () => { unsubscribeProfile(); unsubscribeGame(); };
  }, [partnerId]);

  useEffect(() => {
    if (status !== 'playing' || !startedAt) return undefined;
    const updateClock = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - startedAt) / 1000));
      setTimeLeft(Math.max(0, Math.ceil(((roundEndsAtRef.current || now) - now) / 1000)));
    };
    updateClock();
    const timer = setInterval(() => {
      updateClock();
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, status]);

  useEffect(() => {
    if (status === 'playing' && timeLeft === 0) {
      dragRef.current = null;
      setStatus('lost');
    }
  }, [status, timeLeft]);

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    if (starTimer.current) clearInterval(starTimer.current);
    if (levelStartFrame.current) cancelAnimationFrame(levelStartFrame.current);
    if (winTimer.current) clearTimeout(winTimer.current);
  }, []);

  useEffect(() => {
    if (status !== 'won') return undefined;
    setRevealedStars(0);
    let count = 0;
    starTimer.current = setInterval(() => {
      count += 1;
      setRevealedStars(Math.min(lastStars, count));
      if (count >= lastStars) clearInterval(starTimer.current);
    }, 360);
    return () => {
      if (starTimer.current) clearInterval(starTimer.current);
    };
  }, [lastStars, status]);

  const saveProgress = useCallback(async (nextProgress, completedLevel, stars) => {
    const storageKey = `${STORAGE_PREFIX}${uid || 'guest'}`;
    AsyncStorage.setItem(storageKey, JSON.stringify(nextProgress)).catch(() => {});
    if (!uid) return 0;

    const levelId = Math.trunc(Number(completedLevel.id));
    if (levelId < 1 || levelId > MAX_LEVELS) throw new Error('Nivel inválido');
    const userRef = doc(db, 'usuarios', uid);
    return runTransaction(db, async transaction => {
      const snapshot = await transaction.get(userRef);
      const gameSnapshot = await transaction.get(doc(db, 'usuarios', uid, 'juegos', 'conexiones'));
      const data = snapshot.data() || {};
      const remoteGame = gameSnapshot.exists() ? (gameSnapshot.data() || {}) : {};
      const claimedStars = { ...(remoteGame.recompensas || {}) };
      const previousClaim = Math.max(0, Math.min(3, Number(claimedStars[levelId]) || 0));
      const currentStars = Math.max(0, Math.min(3, stars));
      const grantedStars = Math.max(0, currentStars - previousClaim);
      // La cuantía se deriva del nivel validado, nunca de un valor mutable de
      // la UI que pudiera quedar desactualizado entre dos dispositivos.
      const earned = grantedStars * (4 + levelId);
      const partidasCompletadas = (Number(remoteGame.partidasCompletadas) || 0) + 1;
      const bonusTipo = partidasCompletadas % 5 === 0
        ? (Math.floor(partidasCompletadas / 5) % 2 === 0 ? 'globos' : 'chicles')
        : null;
      claimedStars[levelId] = Math.max(previousClaim, currentStars);
      const totalStars = Object.values(claimedStars).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const nextUnlocked = Math.max(Number(remoteGame.nivel) || 1, nextProgress.unlocked);
      const onlineStats = {
        ...remoteGame,
        nivel: nextUnlocked,
        estrellas: totalStars,
        puntos: Math.max(Number(remoteGame.puntos) || 0, gameScore(nextProgress)),
        ultimoNivel: levelId,
        ultimaConexion: serverTimestamp(),
        partidasCompletadas,
        recompensas: claimedStars,
      };
      transaction.set(doc(db, 'usuarios', uid, 'juegos', 'conexiones'), onlineStats, { merge: true });
      transaction.set(userRef, {
        exp: (Number(data.exp) || 0) + EXP_POR_VICTORIA,
        ...(earned > 0 ? { dinero: (Number(data.dinero) || 0) + earned } : {}),
        ...(bonusTipo === 'chicles' ? { chicles: (Number(data.chicles) || 0) + 1 } : {}),
        ...(bonusTipo === 'globos' ? { globos: (Number(data.globos) || 0) + 1 } : {}),
      }, { merge: true });
      return { earned, exp: EXP_POR_VICTORIA, bonus: bonusTipo ? { tipo: bonusTipo, cantidad: 1 } : null };
    });
  }, [uid]);

  const startLevel = useCallback((levelId = selectedId) => {
    if (levelId > latestUnlocked) return;
    // Pintamos la transición antes de generar el próximo recorrido. La
    // búsqueda puede tomar un instante en los tableros avanzados y no debe
    // dejar visible la grilla que ya se completó.
    if (levelStartFrame.current) cancelAnimationFrame(levelStartFrame.current);
       setStatus('loading');
    levelStartFrame.current = requestAnimationFrame(() => {
       const recent = Object.values(progressRef.current.completed || {})
        .filter(item => item && item.stars)
        .slice(-3);
      const lastStars = recent.length ? recent[recent.length - 1].stars : 0;
      const strongRun = recent.length >= 2 && recent.every(item => item.stars >= 2);
      const nextBias = strongRun ? 1 : lastStars === 1 ? -1 : 0;
      setDifficultyBias(nextBias);
       const nextLevel = generateLevel(levelId, nextBias);
       roundIdRef.current += 1;
      if (hintTimer.current) clearTimeout(hintTimer.current);
       setSelectedId(nextLevel.id);
      const nextPaths = initialPaths(nextLevel);
      pathsRef.current = nextPaths;
      setPaths(nextPaths);
      setMoves(0);
      setElapsed(0);
       setTimeLeft(roundDuration(nextLevel));
       setStartedAt(Date.now());
       roundEndsAtRef.current = Date.now() + roundDuration(nextLevel) * 1000;
      setHintUsed(false);
      setHintCells([]);
       setReward(0);
       setExpReward(0);
       setBonusReward(null);
       setRewardPending(false);
      setLastStars(0);
      completedRef.current = false;
      dragRef.current = null;
       setStatus('playing');
       setHasActiveBoard(true);
       levelReveal.setValue(0);
       requestAnimationFrame(() => {
         Animated.timing(levelReveal, {
           toValue: 1,
           duration: 620,
           easing: Easing.out(Easing.cubic),
           useNativeDriver: true,
         }).start();
       });
       levelStartFrame.current = null;
    });
  }, [latestUnlocked, selectedId]);

  const toCell = useCallback((x, y, boardWidth) => {
    // No convertimos un gesto fuera del tablero en una casilla del borde.
    // Hacerlo provocaba que el trazo siguiera avanzando aunque el dedo ya
    // estuviera fuera de la grilla.
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= boardWidth || y >= boardWidth) return null;
    const cellSize = boardWidth / level.size;
    const row = Math.floor(y / cellSize);
    const col = Math.floor(x / cellSize);
    return [row, col];
  }, [level.size]);

  const findPathEnd = useCallback((cell, currentPaths) => {
    return level.pairs.find(pair => {
      const path = currentPaths[pair.color] || [];
      return sameCell(path[0], cell) || sameCell(path[path.length - 1], cell);
    })?.color;
  }, [level.pairs]);

  const beginDrag = useCallback((x, y, boardWidth) => {
    if (status !== 'playing') return;
    const cell = toCell(x, y, boardWidth);
    if (!cell) return;
    const ends = endpointsFor(level);
    const endpointColor = ends[keyOf(cell)];
    if (endpointColor) {
      const pair = level.pairs.find(item => item.color === endpointColor);
      const completedPath = pathsRef.current[endpointColor] || [];
      // Una ruta terminada se conserva con su color intenso. Para editarla,
      // pedimos doble toque para que no se borre por accidente al inspeccionarla.
      if (connectsPair(pair, completedPath)) {
        const previousTap = resetTapRef.current;
        const isDoubleTap = previousTap?.color === endpointColor && Date.now() - previousTap.at < 320;
        if (!isDoubleTap) {
          resetTapRef.current = { color: endpointColor, at: Date.now() };
          return;
        }
        resetTapRef.current = null;
      } else {
        resetTapRef.current = null;
      }
      const nextPaths = { ...pathsRef.current, [endpointColor]: [cell] };
      pathsRef.current = nextPaths;
      setPaths(nextPaths);
      dragRef.current = { color: endpointColor, last: cell, x, y };
      return;
    }
    // Permite retomar desde cualquier celda ya trazada: al tocarla,
    // conservamos el tramo anterior y descartamos solo lo que está después.
    const existing = level.pairs.find(pair => (pathsRef.current[pair.color] || []).some(item => sameCell(item, cell)));
    if (existing) {
      const currentPath = pathsRef.current[existing.color] || [];
      const index = currentPath.findIndex(item => sameCell(item, cell));
      const nextPaths = { ...pathsRef.current, [existing.color]: currentPath.slice(0, index + 1) };
      pathsRef.current = nextPaths;
      setPaths(nextPaths);
      dragRef.current = { color: existing.color, last: cell, x, y };
      return;
    }
    const color = findPathEnd(cell, pathsRef.current);
    if (color) dragRef.current = { color, last: cell, x, y };
  }, [findPathEnd, level, status, toCell]);

  const extendPath = useCallback((target) => {
    const dragging = dragRef.current;
    if (!dragging) return;
    if (roundEndsAtRef.current && Date.now() >= roundEndsAtRef.current) {
      dragRef.current = null;
      setTimeLeft(0);
      return;
    }
    const current = pathsRef.current;
    const path = current[dragging.color] || [];
    const last = path[path.length - 1];
    if (!last || sameCell(last, target) || !neighbours(last, target)) return;

    const previous = path[path.length - 2];
    if (sameCell(previous, target)) {
      const nextPaths = { ...current, [dragging.color]: path.slice(0, -1) };
      pathsRef.current = nextPaths;
      dragRef.current = { ...dragging, last: target };
      setPaths(nextPaths);
      return;
    }

    const targetKey = keyOf(target);
    const endpoints = endpointsFor(level);
    if (endpoints[targetKey] && endpoints[targetKey] !== dragging.color) return;
    if (path.some(cell => sameCell(cell, target))) return;

    const occupiedByOther = level.pairs.some(pair => pair.color !== dragging.color
      && (current[pair.color] || []).some(cell => sameCell(cell, target)));
    if (occupiedByOther) return;

    const ownPair = level.pairs.find(pair => pair.color === dragging.color);
    const ownEndpoints = ownPair.solution;
    if (connectsPair(ownPair, path)) return;
    const isOwnStart = sameCell(target, ownEndpoints[0]);
    const isOwnEnd = sameCell(target, ownEndpoints[ownEndpoints.length - 1]);
    if ((isOwnStart || isOwnEnd) && path.length > 1) {
      const otherEnd = sameCell(path[0], ownEndpoints[0]) ? ownEndpoints[ownEndpoints.length - 1] : ownEndpoints[0];
      if (!sameCell(target, otherEnd)) return;
    }

    const nextPath = [...path, target];
    const nextPaths = { ...current, [dragging.color]: nextPath };
    pathsRef.current = nextPaths;
    dragRef.current = { ...dragging, last: target };
    setMoves(value => value + 1);
    setPaths(nextPaths);
    if (connectsPair(ownPair, nextPath)) {
      const now = Date.now();
      const remaining = Math.max(0, (roundEndsAtRef.current || now) - now);
      const extended = Math.min(duration * 1000, remaining + CONNECTION_TIME_BONUS * 1000);
      roundEndsAtRef.current = now + extended;
      setTimeLeft(Math.ceil(extended / 1000));
    }
  }, [duration, level]);

  const moveDrag = useCallback((x, y, boardWidth) => {
    if (x == null || y == null) {
      dragRef.current = null;
      return;
    }
    if (!dragRef.current || status !== 'playing') return;
    const target = toCell(x, y, boardWidth);
    if (!target) {
      dragRef.current = null;
      return;
    }
    // El dedo suele saltar varias celdas entre dos eventos; recorremos el
    // tramo intermedio para que el trazo no se sienta cortado o tosco.
    const gesture = dragRef.current;
    const from = gesture.last;
    if (from && !sameCell(from, target)) {
      let row = from[0];
      let col = from[1];
      const rowStep = Math.sign(target[0] - row);
      const colStep = Math.sign(target[1] - col);
      const rawDx = Math.abs(x - (gesture.x ?? x));
      const rawDy = Math.abs(y - (gesture.y ?? y));
      const horizontalFirst = rawDx >= rawDy;
      while (row !== target[0] || col !== target[1]) {
        // Respetamos la dirección física del dedo al cruzar una esquina.
        // Así un giro horizontal->vertical no se invierte arbitrariamente.
        const rowDistance = Math.abs(target[0] - row);
        const colDistance = Math.abs(target[1] - col);
        if (horizontalFirst && colDistance > 0) col += colStep;
        else if (!horizontalFirst && rowDistance > 0) row += rowStep;
        else if (rowDistance > 0) row += rowStep;
        else if (colDistance > 0) col += colStep;
        const next = [row, col];
        extendPath(next);
        // Solo avanzamos el cursor lógico si el trazo aceptó esa casilla.
        // Antes se lo adelantaba aun cuando el movimiento era inválido, y eso
        // podía impedir llegar a un extremo que sí era correcto.
        if (!dragRef.current || !sameCell(dragRef.current.last, next)) break;
        dragRef.current = { ...dragRef.current, x, y };
      }
    }
  }, [extendPath, status, toCell]);

  const showHint = useCallback(() => {
    if (status !== 'playing' || hintUsed) return;
    const pair = level.pairs.find(item => {
      const path = paths[item.color] || [];
      return !connectsPair(item, path);
    }) || level.pairs[0];
    const path = paths[pair.color] || [];
    const solution = pair.solution;
    const last = path[path.length - 1];
    const index = last ? solution.findIndex(cell => sameCell(cell, last)) : 0;
    const from = index >= 0 ? solution[index] : solution[0];
    const pathGoesForward = !path.length || sameCell(path[0], solution[0]);
    const nextIndex = pathGoesForward
      ? Math.min(solution.length - 1, Math.max(1, index + 1))
      : Math.max(0, index - 1);
    const next = solution[nextIndex];
    setHintCells([from, next]);
    setHintUsed(true);
    global.showToast?.({ text1: 'Pista: seguí el destello.', type: 'info' });
    hintTimer.current = setTimeout(() => setHintCells([]), 1800);
  }, [hintUsed, level.pairs, paths, status]);

  const finishLevel = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const completedRound = roundIdRef.current;
    const finalElapsed = Math.max(elapsed, Math.floor((Date.now() - (startedAt || Date.now())) / 1000));
    const stars = getStars(timeLeft, duration, hintUsed, moves, level);
    const previous = progress.completed?.[level.id] || {};
    const nextProgress = {
      unlocked: Math.max(progress.unlocked, Math.min(MAX_LEVELS, level.id + 1)),
      completed: {
        ...progress.completed,
        [level.id]: {
          stars: Math.max(stars, previous.stars || 0),
          bestMoves: Math.min(previous.bestMoves || Number.MAX_SAFE_INTEGER, moves),
          bestTime: Math.min(previous.bestTime || Number.MAX_SAFE_INTEGER, finalElapsed),
        },
      },
    };
    setElapsed(finalElapsed);
    setProgress(nextProgress);
    setLastStars(stars);
    setReward(0);
    setExpReward(0);
    setBonusReward(null);
    setRewardPending(Boolean(uid));
    setStatus('won');
    registrarProgreso('partidas_hoy');
    actualizarPasoTutorial(uid, 8).catch(() => {});
    saveProgress(nextProgress, level, stars)
      .then(result => {
        if (roundIdRef.current === completedRound) {
          setReward(result?.earned || 0);
          setExpReward(result?.exp || 0);
          setBonusReward(result?.bonus || null);
        }
      })
      .catch(() => {
        if (roundIdRef.current === completedRound) global.showToast?.({ text1: 'No pudimos verificar la recompensa.', type: 'error' });
      })
      .finally(() => {
        if (roundIdRef.current === completedRound) setRewardPending(false);
      });
  }, [duration, elapsed, hintUsed, level, moves, progress, registrarProgreso, saveProgress, startedAt, timeLeft, uid]);

  // Dejamos que React Native pinte el último tramo antes de mostrar el modal.
  // Si el usuario corrige la ruta durante ese instante, el cleanup cancela la
  // victoria pendiente y vuelve a evaluar el tablero real.
  useEffect(() => {
    if (status !== 'playing' || !isSolved(level, paths)) return undefined;
    winTimer.current = setTimeout(() => {
      winTimer.current = null;
      if (isSolved(level, pathsRef.current)) finishLevel();
    }, 120);
    return () => {
      if (winTimer.current) clearTimeout(winTimer.current);
      winTimer.current = null;
    };
  }, [finishLevel, level, paths, status]);

  const connectedPairs = level.pairs.filter(pair => connectsPair(pair, paths[pair.color] || [])).length;
  const illuminatedCells = useMemo(
    () => new Set(Object.values(paths).flatMap(path => path.map(keyOf))).size,
    [paths],
  );

  const online = myOnlineStats || { nivel: progress.unlocked || 1, puntos: gameScore(progress), estrellas: progressStars(progress) };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RoomBackground />
      <Image source={require('../../assets/juegos/conexion.png')} style={styles.beachBackground} resizeMode="cover" />
      <View style={styles.tint} />
      {status !== 'lobby' && <View style={styles.navLayer}>
        <TabButtons onExit={() => navigation?.navigate('main')} customAddButton={<View />} />
      </View>}

      {(status === 'loading' || status === 'playing' || status === 'won' || status === 'lost') && (
        <>
          <View style={styles.hud} pointerEvents="box-none">
            <View style={styles.levelHudCard}>
              <Text style={styles.hudKicker}>HILITO</Text>
              <Text style={styles.hudLevel}>NIVEL {level.id}</Text>
              <Text style={styles.hudTitle}>Uní cada color</Text>
            </View>
              <View style={styles.hudStats}>
              <View style={styles.hudStat}><Text style={styles.hudStatLabel}>MOVIMIENTOS</Text><Text style={styles.hudStatValue}>{moves}</Text></View>
              <View style={styles.hudStat}><Text style={styles.hudStatLabel}>TIEMPO</Text><Text style={styles.hudStatValue}>{formatTime(elapsed)}</Text></View>
              <View style={[styles.hudStat, timeLeft <= 12 && styles.hudStatWarning]}><Text style={styles.hudStatLabel}>LUZ</Text><Text style={styles.hudStatValue}>{timeLeft}s</Text></View>
            </View>
          </View>

          {hasActiveBoard && <View style={styles.boardArea}>
            <Board
              level={level}
              paths={paths}
              onTouchStart={beginDrag}
              onTouchMove={moveDrag}
              hintCells={hintCells}
              reveal={levelReveal}
            />
            <View style={styles.connectionProgress}>
              <View style={styles.lightTrack}>
                <View style={[styles.lightFill, { width: `${Math.max(0, Math.min(100, (timeLeft / duration) * 100))}%` }]} />
              </View>
              <Text style={styles.fillLabel} numberOfLines={1}>PARES {connectedPairs}/{level.pairs.length} · LUZ {illuminatedCells}/{level.size * level.size}</Text>
            </View>
          </View>}

          {status === 'playing' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => startLevel(level.id)} activeOpacity={0.8}>
                <Text style={styles.secondaryText}>↺</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hintButton, hintUsed && styles.hintUsed]} onPress={showHint} disabled={hintUsed} activeOpacity={0.8}>
                <Text style={styles.hintText}>{hintUsed ? '✓' : '💡'}</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.partnerDock}>
            <PartnerScore me={online} partner={partner} />
          </View>
        </>
      )}

      {status === 'loading' && (
        <View style={styles.loadingLevel}>
          <Text style={styles.loadingLevelText}>Preparando el próximo hilito…</Text>
        </View>
      )}

      <Modal visible={status === 'lobby'} transparent animationType="fade" onRequestClose={() => navigation?.navigate('main')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalNavLayer}>
            <TabButtons onExit={() => navigation?.navigate('main')} customAddButton={<View />} />
          </View>
          <View style={styles.lobbyCard}>
            <Text style={styles.lobbyEmoji}>🌅</Text>
            <Text style={styles.lobbyTitle}>Hilito</Text>
            <Text style={styles.lobbyDescription}>Uní los pares sin cruzar caminos y llená toda la grilla.</Text>
            <View style={styles.lobbyBadge}><Text style={styles.lobbyBadgeText}>✨ RETO NUEVO</Text></View>
            <Text style={styles.lobbyLevelLabel}>VAS A JUGAR</Text>
            <Text style={styles.lobbyLevelHero}>NIVEL {latestUnlocked}</Text>
            <View style={styles.lobbyMetaRow}>
              <View style={styles.lobbyMeta}><Text style={styles.lobbyMetaIcon}>▦</Text><Text style={styles.lobbyMetaText}>Tablero {lobbyGridSize}×{lobbyGridSize}</Text></View>
              <View style={styles.lobbyMeta}><Text style={styles.lobbyMetaIcon}>🌊</Text><Text style={styles.lobbyMetaText}>Dificultad viva</Text></View>
            </View>
            <View style={styles.lobbyTip}><Text style={styles.lobbyTipIcon}>💡</Text><Text style={styles.lobbyTipText}>Pensá el próximo giro antes de unir.</Text></View>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => startLevel(latestUnlocked)}
              disabled={!progressLoaded}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#ff8b78', '#ee5f78']} style={styles.playGradient}>
                <Text style={styles.playText}>{progressLoaded ? 'Jugar ahora' : 'Cargando…'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={status === 'won'} transparent animationType="none" onRequestClose={() => setStatus('lobby')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.winCard}>
            <TouchableOpacity style={styles.winCloseButton} onPress={() => navigation?.navigate('main')} activeOpacity={0.75}>
              <Text style={styles.winCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.winEmoji}>🐚</Text>
            <Text style={styles.winTitle}>¡Hilito completo!</Text>
            <View style={styles.stars}>
              {[0, 1, 2].map(index => (
                <Animated.Text key={index} style={[styles.star, index < revealedStars ? styles.starVisible : styles.starHidden]}>
                  {index < revealedStars ? '★' : '☆'}
                </Animated.Text>
              ))}
            </View>
            <Text style={styles.winLine}>{moves} movimientos · {formatTime(elapsed)}</Text>
            {rewardPending ? (
              <Text style={styles.replayText}>Verificando recompensa…</Text>
            ) : reward > 0 ? (
              <View style={styles.rewardPill}><Text style={styles.rewardText}>+{reward} 🪙 por nuevas estrellas</Text></View>
            ) : !uid ? (
              <Text style={styles.replayText}>Progreso guardado en este dispositivo.</Text>
            ) : (
              <Text style={styles.replayText}>Ya reclamaste estas estrellas. Mejorá tu récord para seguir brillando.</Text>
            )}
            {bonusReward && <View style={styles.bonusRewardPill}>
              <Text style={styles.bonusRewardText}>Cada 5 partidas: +1 {bonusReward.tipo === 'chicles' ? 'chicle' : 'globo'}</Text>
            </View>}
            {expReward > 0 && <View style={styles.expRewardPill}><Text style={styles.expRewardText}>+{expReward} EXP por completar la partida</Text></View>}
            <TouchableOpacity style={styles.playButton} onPress={() => {
              const next = Math.min(MAX_LEVELS, level.id + 1);
              startLevel(next <= latestUnlocked ? next : level.id);
            }} activeOpacity={0.85}>
              <LinearGradient colors={['#ff8b78', '#ee5f78']} style={styles.playGradient}>
                <Text style={styles.playText}>{level.id < MAX_LEVELS ? 'Siguiente nivel' : 'Volver a empezar'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startLevel(level.id)} style={styles.textAction}>
              <Text style={styles.textActionLabel}>Repetir este nivel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={status === 'lost'} transparent animationType="fade" onRequestClose={() => startLevel(level.id)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.winCard}>
            <Text style={styles.winEmoji}>🌙</Text>
            <Text style={styles.winTitle}>La luz se apagó</Text>
            <Text style={styles.replayText}>Uní cada pareja y llená toda la grilla. Cada conexión completa te devuelve unos segundos.</Text>
            <TouchableOpacity style={styles.playButton} onPress={() => startLevel(level.id)} activeOpacity={0.85}>
              <LinearGradient colors={['#ff8b78', '#ee5f78']} style={styles.playGradient}>
                <Text style={styles.playText}>Intentar de nuevo</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStatus('lobby')} style={styles.textAction}>
              <Text style={styles.textActionLabel}>Volver al menú</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HILITO.violet },
  beachBackground: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  tint: { ...StyleSheet.absoluteFillObject, zIndex: 1, backgroundColor: 'rgba(45, 25, 92, 0.56)' },
  navLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, elevation: 50 },
  modalNavLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, elevation: 100 },
  hud: {
    position: 'absolute', top: 94, left: 88, right: 14, zIndex: 5,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  levelHudCard: { minWidth: 130, transform: [{ translateY: 14 }] },
  hudKicker: { color: '#ece5ff', fontFamily: 'Delius', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, textShadowColor: 'rgba(28,14,65,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  hudLevel: { color: HILITO.mist, fontFamily: 'Delius', fontSize: 17, fontWeight: '900', marginTop: 1, textShadowColor: 'rgba(28,14,65,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  hudTitle: { color: '#e9e3ff', fontFamily: 'Delius', fontSize: 10, fontWeight: '800', marginTop: 1, textShadowColor: 'rgba(28,14,65,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  hudStats: { flexDirection: 'row', gap: 6, alignItems: 'stretch' },
  hudStat: { minWidth: 58, alignItems: 'center', backgroundColor: 'rgba(51,35,92,0.88)', borderWidth: 1, borderColor: 'rgba(230,222,255,0.62)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  hudStatWarning: { backgroundColor: 'rgba(184, 77, 84, 0.88)', borderColor: 'rgba(255,232,184,0.86)' },
  hudStatLabel: { color: '#fff2c8', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  hudStatValue: { color: '#ffffff', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', marginTop: 1 },
  boardArea: { position: 'absolute', top: 24, left: 0, right: 0, height: 390, width: '100%', alignItems: 'center', justifyContent: 'center', paddingTop: 0, paddingBottom: 0, zIndex: 20, elevation: 20 },
  boardShell: {
    zIndex: 21,
    maxWidth: '82%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden',
    backgroundColor: 'rgba(46, 31, 85, 0.94)', borderWidth: 3, borderColor: 'rgba(231,223,255,0.82)',
    shadowColor: '#211142', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.48, shadowRadius: 18, elevation: 10,
  },
  grid: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 8 },
  cell: { backgroundColor: 'rgba(232, 255, 250, 0.13)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,246,205,0.38)' },
  endpoint: { position: 'absolute', alignItems: 'flex-start', justifyContent: 'flex-start', borderColor: 'rgba(255,255,255,0.92)', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 3 },
  endpointShine: { width: '38%', height: '26%', borderRadius: 20, marginLeft: '18%', marginTop: '16%', backgroundColor: 'rgba(255,255,255,0.78)' },
  connectionProgress: { alignItems: 'center', width: 112, height: 27, marginTop: 10 },
  lightTrack: { width: '100%', height: 7, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(81, 42, 55, 0.52)', borderWidth: 1, borderColor: 'rgba(255, 213, 207, 0.32)' },
  lightFill: { height: '100%', borderRadius: 6, backgroundColor: '#f46f7d', shadowColor: '#ed5368', shadowOpacity: 0.55, shadowRadius: 4, elevation: 2 },
  fillLabel: { width: 230, marginTop: 6, color: '#fff4ce', fontFamily: 'Delius', fontWeight: '700', letterSpacing: 1, fontSize: 9, textAlign: 'center', textShadowColor: 'rgba(24,83,101,0.72)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  actionRow: { position: 'absolute', right: 14, top: 369, flexDirection: 'row', gap: 8, zIndex: 25, elevation: 25, alignItems: 'center' },
  secondaryButton: { width: 40, height: 40, backgroundColor: 'rgba(255,246,205,0.92)', borderWidth: 2, borderColor: '#d88762', borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#145366', shadowOpacity: 0.3, shadowRadius: 7, elevation: 5 },
  secondaryText: { color: '#b85f5d', fontSize: 24, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  hintButton: { width: 40, height: 40, backgroundColor: '#ffd37d', borderWidth: 2, borderColor: '#fff4cf', borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#b86b2f', shadowOpacity: 0.3, shadowRadius: 7, elevation: 5 },
  hintUsed: { opacity: 0.45 },
  hintText: { color: '#8b5b35', fontSize: 19, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
  partnerDock: { position: 'absolute', top: 139, right: 14, width: 205, zIndex: 7 },
  partnerCard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch', gap: 5, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(51,35,92,0.91)', borderWidth: 1, borderColor: 'rgba(230,222,255,0.66)', shadowColor: '#211142', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  partnerTitle: { width: '100%', textAlign: 'center', color: '#fff0b9', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', letterSpacing: 1.1, marginBottom: 1 },
  miniAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff0b9' },
  miniAvatarFallback: { backgroundColor: '#ee6f73', alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#fff', fontFamily: 'Delius', fontSize: 12, fontWeight: '900' },
  partnerEmoji: { fontSize: 17 },
  partnerPlayer: { minWidth: 42, maxWidth: 72, alignItems: 'center' },
  partnerName: { color: '#ffffff', fontFamily: 'Delius', fontSize: 9, lineHeight: 11, fontWeight: '800', textAlign: 'center' },
  partnerPoints: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' },
  partnerText: { color: '#ffffff', fontFamily: 'Delius', fontSize: 9, fontWeight: '800' },
  vsBadge: { width: 23, height: 23, borderRadius: 12, backgroundColor: 'rgba(255,246,205,0.22)', alignItems: 'center', justifyContent: 'center' },
  vsText: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
  partnerStatus: { width: '100%', alignItems: 'center', marginTop: 1 },
  partnerSub: { marginTop: 1, fontFamily: 'Delius', fontSize: 8.5, fontWeight: '700' },
  winning: { color: '#bfffe9' },
  trailing: { color: '#fff0b9' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(26,13,60,0.64)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingLevel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  loadingLevelText: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', textShadowColor: 'rgba(24,83,101,0.78)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  lobbyCard: { width: Math.min(W * 0.70, 365), maxWidth: '100%', borderRadius: 18, padding: 10, alignItems: 'center', backgroundColor: 'rgba(51,35,92,0.97)', borderWidth: 1, borderColor: 'rgba(230,222,255,0.76)', shadowColor: '#211142', shadowOpacity: 0.55, shadowRadius: 20, elevation: 12 },
  lobbyEmoji: { fontSize: 24, lineHeight: 27 },
  lobbyTitle: { fontFamily: 'Delius', color: '#fff8dc', fontSize: 21, fontWeight: '900', marginTop: 0 },
  lobbyDescription: { color: '#e8ffff', fontFamily: 'Delius', fontSize: 8.5, lineHeight: 11, textAlign: 'center', maxWidth: 285, marginTop: 2, marginBottom: 5 },
  lobbyLevelLabel: { color: '#ffe7a8', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 2 },
  lobbyLevelHero: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 29, lineHeight: 33, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(15,74,88,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5, marginBottom: 5 },
  lobbyBadge: { marginTop: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 14, backgroundColor: 'rgba(255,211,125,0.22)', borderWidth: 1, borderColor: 'rgba(255,231,168,0.72)' },
  lobbyBadgeText: { color: '#ffe7a8', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  lobbyMetaRow: { flexDirection: 'row', gap: 6, marginTop: 2, marginBottom: 5 },
  lobbyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 11, backgroundColor: 'rgba(255,246,205,0.12)', borderWidth: 1, borderColor: 'rgba(255,246,205,0.30)' },
  lobbyMetaIcon: { color: '#ffd37d', fontSize: 12 },
  lobbyMetaText: { color: '#e8ffff', fontFamily: 'Delius', fontSize: 8, fontWeight: '800' },
  lobbyTip: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: 5, opacity: 0.9 },
  lobbyTipIcon: { fontSize: 12, marginRight: 4 },
  lobbyTipText: { color: '#fff0c5', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '700' },
  resumePill: { width: '100%', marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,246,205,0.13)', borderWidth: 1, borderColor: 'rgba(255,246,205,0.40)', alignItems: 'center' },
  resumeText: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  resumeLevel: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 14, fontWeight: '900', marginTop: 3 },
  levelLabel: { color: '#ffd0dd', fontFamily: 'Delius', fontWeight: '800', letterSpacing: 1.2, fontSize: 8, marginTop: 10, marginBottom: 5 },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, maxWidth: 250 },
  levelButton: { width: 45, height: 39, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  levelSelected: { backgroundColor: 'rgba(255,112,148,0.30)', borderColor: '#ff9fba', transform: [{ translateY: -2 }] },
  levelLocked: { opacity: 0.35 },
  levelNumber: { color: '#fff', fontFamily: 'Delius', fontWeight: '900', fontSize: 13 },
  levelStars: { color: '#fff0b9', fontSize: 8, letterSpacing: -1, marginTop: 1 },
  levelName: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 9, fontWeight: '700', marginTop: 7, minHeight: 12 },
  playButton: { marginTop: 5, overflow: 'hidden', borderRadius: 10, minWidth: 160, shadowColor: '#ee6f70', shadowOpacity: 0.32, shadowRadius: 8, elevation: 4 },
  playDisabled: { opacity: 0.5 },
  playGradient: { paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center' },
  playText: { color: '#fff', fontFamily: 'Delius', fontWeight: '900', fontSize: 11, letterSpacing: 0.3 },
  recordText: { marginTop: 6, color: '#d8ffff', fontFamily: 'Delius', fontSize: 8 },
  winCard: { width: Math.min(W * 0.62, 330), maxWidth: '100%', borderRadius: 18, paddingVertical: 17, paddingHorizontal: 22, alignItems: 'center', backgroundColor: 'rgba(51,35,92,0.98)', borderWidth: 1, borderColor: 'rgba(230,222,255,0.80)' },
  winEmoji: { fontSize: 31 },
  winTitle: { color: '#fff8dc', fontFamily: 'Delius', fontWeight: '900', fontSize: 21, marginTop: 1 },
  winCloseButton: { position: 'absolute', top: 9, right: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,246,205,0.24)', zIndex: 3 },
  winCloseText: { color: '#fff8dc', fontSize: 24, lineHeight: 26, fontWeight: '700' },
  stars: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 2, minHeight: 34 },
  star: { color: '#fff0b9', fontSize: 25, marginHorizontal: 3, textShadowColor: 'rgba(192,107,42,0.48)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  starVisible: { opacity: 1, transform: [{ scale: 1 }] },
  starHidden: { opacity: 0.22, transform: [{ scale: 0.72 }] },
  winLine: { color: '#d8ffff', fontFamily: 'Delius', fontSize: 9, marginTop: 2 },
  rewardPill: { marginTop: 8, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: 'rgba(255,240,185,0.20)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,240,185,0.58)' },
  rewardText: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 10, fontWeight: '700' },
  bonusRewardPill: { marginTop: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(255,143,168,0.22)', borderWidth: 1, borderColor: 'rgba(255,190,205,0.62)' },
  expRewardPill: { marginTop: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(112,224,189,0.20)', borderWidth: 1, borderColor: 'rgba(184,234,217,0.68)' },
  expRewardText: { color: '#e9fff7', fontSize: 8, fontFamily: 'Delius', fontWeight: '900' },
  bonusRewardText: { color: '#ffe5ee', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '800' },
  replayText: { marginTop: 8, color: '#d8ffff', fontFamily: 'Delius', textAlign: 'center', fontSize: 8.5, lineHeight: 12 },
  textAction: { marginTop: 7, padding: 2 },
  textActionLabel: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 9, fontWeight: '700', textDecorationLine: 'underline' },
});
