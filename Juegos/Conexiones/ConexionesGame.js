import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, StatusBar, Image,
  PanResponder, Animated, Easing,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { doc, increment, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import RoomBackground from '../../components/RoomBackground';
import TabButtons from '../../components/TabButtons';

const { width: W, height: H } = Dimensions.get('window');
const STORAGE_PREFIX = 'conexiones_progreso_v1_';

const COLORS = {
  coral:  '#ff7396',
  blue:   '#62bfff',
  mint:   '#70e0bd',
  violet: '#b997ff',
};
const MAX_LEVELS = 99;
const LEVEL_CACHE = new Map();

const COLOR_CYCLE = ['coral', 'blue', 'mint', 'violet'];

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
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const start = [Math.floor(rand() * size), Math.floor(rand() * size)];
  const path = [start];
  const used = new Set([keyOf(start)]);
  let nodes = 0;
  const search = () => {
    if (path.length === total) return true;
    if (nodes++ > total * total * 55) return false;
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
  return Math.round((turns * 7 + detour * 8 + pressure * 3 + interference * 4 + separation * 0.5) / size);
}

function splitRoute(route, pairCount, rand) {
  const total = route.length;
  const minChunk = Math.max(4, Math.floor(total / (pairCount * 2.2)));
  const gaps = pairCount - 1;
  const usable = total - minChunk * pairCount;
  let remaining = usable;
  const cuts = [];
  for (let i = 0; i < gaps; i += 1) {
    const maxCut = remaining - minChunk * (gaps - i - 1);
    const cut = Math.max(1, Math.floor(maxCut * (0.2 + rand() * 0.65)));
    cuts.push(cut);
    remaining -= cut;
  }
  const lengths = [];
  cuts.concat([remaining]).forEach(extra => lengths.push(minChunk + extra));
  lengths[lengths.length - 1] += total - lengths.reduce((sum, value) => sum + value, 0);
  let index = 0;
  return lengths.map((length, pairIndex) => {
    const solution = route.slice(index, index + length);
    index += length;
    return { color: COLOR_CYCLE[pairIndex % COLOR_CYCLE.length], solution };
  });
}

function generateLevel(levelId, difficultyBias = 0) {
  const cacheKey = `${levelId}:${difficultyBias}`;
  if (LEVEL_CACHE.has(cacheKey)) return LEVEL_CACHE.get(cacheKey);
  // La grilla se mantiene compacta: la dificultad sale de los cruces,
  // no de hacer el tablero cada vez más grande.
  const size = 5;
  const pairCount = Math.min(COLOR_CYCLE.length, 3 + Math.floor(levelId / 2));
  let best = null;
  // El primer tablero debe abrir instantáneamente; desde el segundo
  // activamos la búsqueda de rutas más retorcidas.
  const easyPack = levelId % 5 === 0 || levelId % 5 === 1;
  const attempts = levelId === 1 ? 0 : easyPack ? 3 : 12;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const seed = levelId * 9176 + attempt * 7919;
    const candidate = buildHamiltonian(size, seed);
    // Un mismo recorrido puede producir tableros muy distintos según dónde
    // se corten los colores. Probamos varios cortes y nos quedamos con el que
    // tenga más giros, rodeos y extremos poco evidentes.
    for (let splitAttempt = 0; splitAttempt < 4; splitAttempt += 1) {
      const pairs = splitRoute(candidate, pairCount, rng(seed + 31 + splitAttempt * 101));
      const score = routeDifficulty(pairs, size);
      // Normal y difícil eligen el candidato con más decisiones/rodeos.
      // Solo el sesgo negativo del modo recuperación busca uno sencillo.
      if (!best || (difficultyBias < 0 ? score < best.score : score > best.score)) best = { pairs, score };
    }
  }
  const fallback = splitRoute(buildSnake(size, levelId), pairCount, rng(levelId + 77));
  const pairs = best?.pairs || fallback;
  const difficultyScore = best?.score || routeDifficulty(pairs, size);
  const difficulty = difficultyScore < 22 ? 'Pulso' : difficultyScore < 34 ? 'Tensión' : difficultyScore < 48 ? 'Nudo' : 'Caos';
  const result = {
    id: levelId,
    size,
    nombre: `${difficulty} ${levelId}`,
    rewardPerStar: 8 + levelId * 2,
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
const parMoves = level => level.pairs.reduce((total, pair) => total + pair.solution.length - 1, 0);
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
  return level.pairs.every(pair => {
    const path = paths[pair.color] || [];
    return connectsPair(pair, path);
  });
}

function getStars(level, moves, elapsed, hintUsed) {
  const extraMoves = Math.max(0, moves - parMoves(level));
  // Las tres estrellas deben sentirse ganadas: los tableros complejos tienen
  // menos margen y resolver demasiado rápido ya no regala la máxima nota.
  const difficulty = level.difficultyScore || 0;
  const perfectTime = Math.max(28, 58 - Math.floor(difficulty * 0.45));
  if (!hintUsed && extraMoves <= 0 && elapsed <= perfectTime) return 3;
  if (extraMoves <= 5 && elapsed <= 125) return 2;
  return 1;
}

const MiniAvatar = memo(({ profile, fallback }) => {
  const name = profile?.nombre || fallback;
  if (profile?.photoURL) return <ExpoImage source={{ uri: profile.photoURL }} style={styles.miniAvatar} contentFit="cover" cachePolicy="memory" />;
  return <View style={[styles.miniAvatar, styles.miniAvatarFallback]}><Text style={styles.miniAvatarText}>{(name || '?')[0].toUpperCase()}</Text></View>;
});

const PartnerScore = memo(({ me, partner }) => {
  const myLevel = me?.nivel || 1;
  const partnerLevel = partner?.nivel || 1;
  if (!partner) return (
    <View style={styles.partnerCard}><Text style={styles.partnerEmoji}>💌</Text><Text style={styles.partnerText}>Conectá una pareja para competir.</Text></View>
  );
  return (
    <View style={styles.partnerCard}>
      <Text style={styles.partnerTitle}>PROGRESO EN PAREJA</Text>
      <MiniAvatar profile={me} fallback="Tú" />
      <View style={styles.partnerPlayer}><Text style={styles.partnerName}>Tú</Text><Text style={styles.partnerPoints}>Nivel {myLevel}</Text></View>
      <View style={styles.vsBadge}><Text style={styles.vsText}>VS</Text></View>
      <View style={styles.partnerPlayer}><Text style={styles.partnerName} numberOfLines={1}>{(partner.nombre || 'Pareja').trim().split(/\s+/)[0]}</Text><Text style={styles.partnerPoints}>Nivel {partnerLevel}</Text></View>
      <MiniAvatar profile={partner} fallback="P" />
      <View style={styles.partnerStatus}><Text style={styles.partnerSub}>Cada uno a su ritmo</Text></View>
    </View>
  );
});

const Board = memo(({ level, paths, onTouchStart, onTouchMove, hintCells }) => {
  const width = Math.min(W * 0.82, H * 0.43, 330);
  const endpoints = useMemo(() => endpointsFor(level), [level]);
  const cell = width / level.size;
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => onTouchStart(event.nativeEvent.locationX, event.nativeEvent.locationY, width),
    onPanResponderMove: event => onTouchMove(event.nativeEvent.locationX, event.nativeEvent.locationY, width),
    onPanResponderRelease: () => onTouchMove(null, null, width),
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
        {level.pairs.map(pair => {
          const path = paths[pair.color] || [];
          if (path.length < 2) return null;
          const points = path.map(([row, col]) => `${col * cell + cell / 2},${row * cell + cell / 2}`).join(' ');
          return (
            <Polyline
              key={pair.color}
              points={points}
              fill="none"
              stroke={COLORS[pair.color]}
              strokeWidth={cell * 0.50}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.92}
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
        return (
          <View
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
            ]}
          >
            <View style={styles.endpointShine} />
          </View>
        );
      })}
    </View>
  );
});

export default memo(function ConexionesGame({ navigation }) {
  const uid = auth.currentUser?.uid;
  const [status, setStatus] = useState('lobby');
  const [selectedId, setSelectedId] = useState(1);
  const [difficultyBias, setDifficultyBias] = useState(0);
  const [paths, setPaths] = useState(() => initialPaths(generateLevel(1)));
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintCells, setHintCells] = useState([]);
  const [progress, setProgress] = useState({ unlocked: 1, completed: {} });
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [reward, setReward] = useState(0);
  const [lastStars, setLastStars] = useState(0);
  const [revealedStars, setRevealedStars] = useState(0);
  const [myOnlineStats, setMyOnlineStats] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partner, setPartner] = useState(null);
  const dragRef = useRef(null);
  const completedRef = useRef(false);
  const hintTimer = useRef(null);
  const starTimer = useRef(null);

  const level = useMemo(() => generateLevel(selectedId, difficultyBias), [selectedId, difficultyBias]);
  const latestUnlocked = Math.min(progress.unlocked || 1, MAX_LEVELS);

  useEffect(() => {
    const storageKey = `${STORAGE_PREFIX}${uid || 'guest'}`;
    // El menú puede mostrarse inmediatamente; la partida guardada se
    // hidrata en segundo plano para no dejar al usuario frente a "Cargando".
    setProgressLoaded(true);
    AsyncStorage.getItem(storageKey).then(value => {
      if (value) {
        const saved = JSON.parse(value);
        if (saved && typeof saved.unlocked === 'number') {
          setProgress(saved);
        }
      }
    }).catch(() => {});
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'usuarios', uid), snapshot => {
      const data = snapshot.data() || {};
      setMyOnlineStats({ ...(data.juegos?.conexiones || {}), nivel: data.juegos?.conexiones?.nivel || 1, nombre: data.nombre, photoURL: data.photoURL });
      setPartnerId(data.pareja || null);
    }, () => {});
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!partnerId) {
      setPartner(null);
      return undefined;
    }
    return onSnapshot(doc(db, 'usuarios', partnerId), other => {
      const otherData = other.data() || {};
      setPartner({ nombre: otherData.nombre, photoURL: otherData.photoURL, nivel: otherData.juegos?.conexiones?.nivel || 1, ...(otherData.juegos?.conexiones || {}) });
    }, () => setPartner(null));
  }, [partnerId]);

  useEffect(() => {
    if (status !== 'playing' || !startedAt) return undefined;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt, status]);

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    if (starTimer.current) clearInterval(starTimer.current);
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

  const saveProgress = useCallback(async (nextProgress, completedLevel, stars, earned) => {
    const storageKey = `${STORAGE_PREFIX}${uid || 'guest'}`;
    AsyncStorage.setItem(storageKey, JSON.stringify(nextProgress)).catch(() => {});
    if (!uid) return;

    const onlineStats = {
      nivel: nextProgress.unlocked,
      estrellas: progressStars(nextProgress),
      puntos: gameScore(nextProgress),
      ultimoNivel: completedLevel.id,
      ultimaConexion: serverTimestamp(),
    };
    setDoc(doc(db, 'usuarios', uid), { juegos: { conexiones: onlineStats } }, { merge: true }).catch(() => {});
    if (earned > 0) updateDoc(doc(db, 'usuarios', uid), { dinero: increment(earned) }).catch(() => {});
  }, [uid]);

  const startLevel = useCallback((levelId = selectedId) => {
    if (levelId > latestUnlocked) return;
    const recent = Object.values(progress.completed || {})
      .filter(item => item && item.stars)
      .slice(-3);
    const lastStars = recent.length ? recent[recent.length - 1].stars : 0;
    const strongRun = recent.length >= 2 && recent.every(item => item.stars >= 2);
    const nextBias = strongRun ? 1 : lastStars === 1 ? -1 : 0;
    setDifficultyBias(nextBias);
    const nextLevel = generateLevel(levelId, nextBias);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setSelectedId(nextLevel.id);
    setPaths(initialPaths(nextLevel));
    setMoves(0);
    setElapsed(0);
    setStartedAt(Date.now());
    setHintUsed(false);
    setHintCells([]);
    setReward(0);
    setLastStars(0);
    completedRef.current = false;
    dragRef.current = null;
    setStatus('playing');
  }, [latestUnlocked, progress.completed, selectedId]);

  const toCell = useCallback((x, y, boardWidth) => {
    const cellSize = boardWidth / level.size;
    const row = Math.max(0, Math.min(level.size - 1, Math.floor(y / cellSize)));
    const col = Math.max(0, Math.min(level.size - 1, Math.floor(x / cellSize)));
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
    const ends = endpointsFor(level);
    const endpointColor = ends[keyOf(cell)];
    if (endpointColor) {
      // Empezar desde un punto reinicia solo ese color: evita un camino partido.
      setPaths(current => ({ ...current, [endpointColor]: [cell] }));
      dragRef.current = { color: endpointColor, last: cell, x, y };
      return;
    }
    // Permite retomar desde cualquier celda ya trazada: al tocarla,
    // conservamos el tramo anterior y descartamos solo lo que está después.
    const existing = level.pairs.find(pair => (paths[pair.color] || []).some(item => sameCell(item, cell)));
    if (existing) {
      const currentPath = paths[existing.color] || [];
      const index = currentPath.findIndex(item => sameCell(item, cell));
      setPaths(current => ({ ...current, [existing.color]: currentPath.slice(0, index + 1) }));
      dragRef.current = { color: existing.color, last: cell, x, y };
      return;
    }
    const color = findPathEnd(cell, paths);
    if (color) dragRef.current = { color, last: cell, x, y };
  }, [findPathEnd, level, paths, status, toCell]);

  const extendPath = useCallback((target) => {
    const dragging = dragRef.current;
    if (!dragging) return;
    setPaths(current => {
      const path = current[dragging.color] || [];
      const last = path[path.length - 1];
      if (!last || sameCell(last, target)) return current;
      if (!neighbours(last, target)) return current;

      const previous = path[path.length - 2];
      if (sameCell(previous, target)) {
        dragRef.current = { ...dragging, last: target };
        return { ...current, [dragging.color]: path.slice(0, -1) };
      }

      const targetKey = keyOf(target);
      const endpoints = endpointsFor(level);
      if (endpoints[targetKey] && endpoints[targetKey] !== dragging.color) return current;
      if (path.some(cell => sameCell(cell, target))) return current;

      const occupiedByOther = level.pairs.some(pair => pair.color !== dragging.color
        && (current[pair.color] || []).some(cell => sameCell(cell, target)));
      if (occupiedByOther) return current;

      const ownEndpoints = level.pairs.find(pair => pair.color === dragging.color).solution;
      if (connectsPair({ solution: ownEndpoints }, path)) return current;
      const isOwnStart = sameCell(target, ownEndpoints[0]);
      const isOwnEnd = sameCell(target, ownEndpoints[ownEndpoints.length - 1]);
      if ((isOwnStart || isOwnEnd) && path.length > 1) {
        const otherEnd = sameCell(path[0], ownEndpoints[0]) ? ownEndpoints[ownEndpoints.length - 1] : ownEndpoints[0];
        if (!sameCell(target, otherEnd)) return current;
      }

      dragRef.current = { ...dragging, last: target };
      setMoves(value => value + 1);
      return { ...current, [dragging.color]: [...path, target] };
    });
  }, [level]);

  const moveDrag = useCallback((x, y, boardWidth) => {
    if (x == null || y == null) {
      dragRef.current = null;
      return;
    }
    if (!dragRef.current || status !== 'playing') return;
    const target = toCell(x, y, boardWidth);
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
        // Sincronizamos inmediatamente el cursor lógico con el cursor visual;
        // el siguiente evento no vuelve a calcular el giro desde una celda vieja.
        if (dragRef.current) dragRef.current = { ...dragRef.current, last: next, x, y };
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
    const finalElapsed = Math.max(elapsed, Math.floor((Date.now() - (startedAt || Date.now())) / 1000));
    const stars = getStars(level, moves, finalElapsed, hintUsed);
    const previous = progress.completed?.[level.id] || {};
    const extraStars = Math.max(0, stars - (previous.stars || 0));
    const earned = extraStars * level.rewardPerStar;
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
    setReward(earned);
    setStatus('won');
    saveProgress(nextProgress, level, stars, earned);
  }, [elapsed, hintUsed, level, moves, progress, saveProgress, startedAt]);

  useEffect(() => {
    if (status === 'playing' && isSolved(level, paths)) finishLevel();
  }, [finishLevel, level, paths, status]);

  const connectedPairs = level.pairs.filter(pair => connectsPair(pair, paths[pair.color] || [])).length;
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

      {(status === 'playing' || status === 'won') && (
        <>
          <View style={styles.hud} pointerEvents="box-none">
            <View style={styles.levelHudCard}>
              <Text style={styles.hudKicker}>CONEXIONES</Text>
              <Text style={styles.hudLevel}>NIVEL {level.id}</Text>
              <Text style={styles.hudTitle}>Reto de conexión</Text>
            </View>
            <View style={styles.hudStats}>
              <View style={styles.hudStat}><Text style={styles.hudStatLabel}>MOVIMIENTOS</Text><Text style={styles.hudStatValue}>{moves}</Text></View>
              <View style={styles.hudStat}><Text style={styles.hudStatLabel}>TIEMPO</Text><Text style={styles.hudStatValue}>{formatTime(elapsed)}</Text></View>
            </View>
          </View>

          <View style={styles.boardArea}>
            <Board
              level={level}
              paths={paths}
              onTouchStart={beginDrag}
              onTouchMove={moveDrag}
              hintCells={hintCells}
            />
            <Text style={styles.fillLabel}>PARES UNIDOS {connectedPairs}/{level.pairs.length}</Text>
          </View>

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

      <Modal visible={status === 'lobby'} transparent animationType="fade" onRequestClose={() => navigation?.navigate('main')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalNavLayer}>
            <TabButtons onExit={() => navigation?.navigate('main')} customAddButton={<View />} />
          </View>
          <View style={styles.lobbyCard}>
            <Text style={styles.lobbyEmoji}>🌅</Text>
            <Text style={styles.lobbyTitle}>Conexiones</Text>
            <Text style={styles.lobbyDescription}>Uní los pares sin cruzar caminos.</Text>
            <View style={styles.lobbyBadge}><Text style={styles.lobbyBadgeText}>✨ RETO NUEVO</Text></View>
            <Text style={styles.lobbyLevelLabel}>VAS A JUGAR</Text>
            <Text style={styles.lobbyLevelHero}>NIVEL {latestUnlocked}</Text>
            <View style={styles.lobbyMetaRow}>
              <View style={styles.lobbyMeta}><Text style={styles.lobbyMetaIcon}>▦</Text><Text style={styles.lobbyMetaText}>Tablero 5×5</Text></View>
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

      <Modal visible={status === 'won'} transparent animationType="fade" onRequestClose={() => setStatus('lobby')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.winCard}>
            <TouchableOpacity style={styles.winCloseButton} onPress={() => navigation?.navigate('main')} activeOpacity={0.75}>
              <Text style={styles.winCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.winEmoji}>🐚</Text>
            <Text style={styles.winTitle}>¡Todo conectado!</Text>
            <View style={styles.stars}>
              {[0, 1, 2].map(index => (
                <Animated.Text key={index} style={[styles.star, index < revealedStars ? styles.starVisible : styles.starHidden]}>
                  {index < revealedStars ? '★' : '☆'}
                </Animated.Text>
              ))}
            </View>
            <Text style={styles.winLine}>{moves} movimientos · {formatTime(elapsed)}</Text>
            {reward > 0 ? (
              <View style={styles.rewardPill}><Text style={styles.rewardText}>+{reward} 🪙 por nuevas estrellas</Text></View>
            ) : (
              <Text style={styles.replayText}>Ya reclamaste estas estrellas. Mejorá tu récord para seguir brillando.</Text>
            )}
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#75cfe0' },
  beachBackground: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  tint: { ...StyleSheet.absoluteFillObject, zIndex: 1, backgroundColor: 'rgba(15, 74, 88, 0.12)' },
  navLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, elevation: 50 },
  modalNavLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, elevation: 100 },
  hud: {
    position: 'absolute', top: 94, left: 88, right: 14, zIndex: 5,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  levelHudCard: { minWidth: 130, transform: [{ translateY: 14 }] },
  hudKicker: { color: '#fff4cf', fontFamily: 'Delius', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, textShadowColor: 'rgba(24,83,101,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  hudLevel: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 17, fontWeight: '900', marginTop: 1, textShadowColor: 'rgba(24,83,101,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  hudTitle: { color: '#e8ffff', fontFamily: 'Delius', fontSize: 10, fontWeight: '800', marginTop: 1, textShadowColor: 'rgba(24,83,101,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  hudStats: { flexDirection: 'row', gap: 6, alignItems: 'stretch' },
  hudStat: { minWidth: 58, alignItems: 'center', backgroundColor: 'rgba(20,93,112,0.78)', borderWidth: 1, borderColor: 'rgba(255,248,220,0.58)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  hudStatLabel: { color: '#fff2c8', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  hudStatValue: { color: '#ffffff', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', marginTop: 1 },
  boardArea: { position: 'absolute', top: 24, left: 0, right: 0, height: 390, width: '100%', alignItems: 'center', justifyContent: 'center', paddingTop: 0, paddingBottom: 0, zIndex: 20, elevation: 20 },
  boardShell: {
    zIndex: 21,
    maxWidth: '82%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden',
    backgroundColor: 'rgba(19, 94, 112, 0.90)', borderWidth: 3, borderColor: 'rgba(255,243,194,0.78)',
    shadowColor: '#145366', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 10,
  },
  grid: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 8 },
  cell: { backgroundColor: 'rgba(232, 255, 250, 0.13)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,246,205,0.38)' },
  endpoint: { position: 'absolute', alignItems: 'flex-start', justifyContent: 'flex-start', borderColor: 'rgba(255,255,255,0.92)', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 3 },
  endpointShine: { width: '38%', height: '26%', borderRadius: 20, marginLeft: '18%', marginTop: '16%', backgroundColor: 'rgba(255,255,255,0.78)' },
  fillLabel: { marginTop: 10, color: '#fff4ce', fontFamily: 'Delius', fontWeight: '700', letterSpacing: 1, fontSize: 9, textShadowColor: 'rgba(24,83,101,0.72)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  actionRow: { position: 'absolute', right: 14, top: 369, flexDirection: 'row', gap: 8, zIndex: 25, elevation: 25, alignItems: 'center' },
  secondaryButton: { width: 40, height: 40, backgroundColor: 'rgba(255,246,205,0.92)', borderWidth: 2, borderColor: '#d88762', borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#145366', shadowOpacity: 0.3, shadowRadius: 7, elevation: 5 },
  secondaryText: { color: '#b85f5d', fontSize: 24, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  hintButton: { width: 40, height: 40, backgroundColor: '#ffd37d', borderWidth: 2, borderColor: '#fff4cf', borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#b86b2f', shadowOpacity: 0.3, shadowRadius: 7, elevation: 5 },
  hintUsed: { opacity: 0.45 },
  hintText: { color: '#8b5b35', fontSize: 19, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
  partnerDock: { position: 'absolute', top: 139, right: 14, width: 205, zIndex: 7 },
  partnerCard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch', gap: 5, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(20,93,112,0.88)', borderWidth: 1, borderColor: 'rgba(255,246,205,0.62)', shadowColor: '#145366', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(12,70,84,0.48)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  lobbyCard: { width: Math.min(W * 0.70, 365), maxWidth: '100%', borderRadius: 18, padding: 15, alignItems: 'center', backgroundColor: 'rgba(20,93,112,0.96)', borderWidth: 1, borderColor: 'rgba(255,246,205,0.72)', shadowColor: '#145366', shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  lobbyEmoji: { fontSize: 28, lineHeight: 32 },
  lobbyTitle: { fontFamily: 'Delius', color: '#fff8dc', fontSize: 23, fontWeight: '900', marginTop: 1 },
  lobbyDescription: { color: '#e8ffff', fontFamily: 'Delius', fontSize: 9, lineHeight: 13, textAlign: 'center', maxWidth: 285, marginTop: 4, marginBottom: 8 },
  lobbyLevelLabel: { color: '#ffe7a8', fontFamily: 'Delius', fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 4 },
  lobbyLevelHero: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(15,74,88,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5, marginBottom: 8 },
  lobbyBadge: { marginTop: 2, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: 'rgba(255,211,125,0.22)', borderWidth: 1, borderColor: 'rgba(255,231,168,0.72)' },
  lobbyBadgeText: { color: '#ffe7a8', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  lobbyMetaRow: { flexDirection: 'row', gap: 8, marginTop: 3, marginBottom: 8 },
  lobbyMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 11, backgroundColor: 'rgba(255,246,205,0.12)', borderWidth: 1, borderColor: 'rgba(255,246,205,0.30)' },
  lobbyMetaIcon: { color: '#ffd37d', fontSize: 14 },
  lobbyMetaText: { color: '#e8ffff', fontFamily: 'Delius', fontSize: 8, fontWeight: '800' },
  lobbyTip: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: 8, opacity: 0.9 },
  lobbyTipIcon: { fontSize: 14, marginRight: 5 },
  lobbyTipText: { color: '#fff0c5', fontFamily: 'Delius', fontSize: 8, fontWeight: '700' },
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
  playButton: { marginTop: 8, overflow: 'hidden', borderRadius: 10, minWidth: 170, shadowColor: '#ee6f70', shadowOpacity: 0.32, shadowRadius: 8, elevation: 4 },
  playDisabled: { opacity: 0.5 },
  playGradient: { paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
  playText: { color: '#fff', fontFamily: 'Delius', fontWeight: '900', fontSize: 12, letterSpacing: 0.3 },
  recordText: { marginTop: 6, color: '#d8ffff', fontFamily: 'Delius', fontSize: 8 },
  winCard: { width: Math.min(W * 0.62, 330), maxWidth: '100%', borderRadius: 18, paddingVertical: 17, paddingHorizontal: 22, alignItems: 'center', backgroundColor: 'rgba(20,93,112,0.97)', borderWidth: 1, borderColor: 'rgba(255,246,205,0.78)' },
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
  replayText: { marginTop: 8, color: '#d8ffff', fontFamily: 'Delius', textAlign: 'center', fontSize: 8.5, lineHeight: 12 },
  textAction: { marginTop: 7, padding: 2 },
  textActionLabel: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 9, fontWeight: '700', textDecorationLine: 'underline' },
});
