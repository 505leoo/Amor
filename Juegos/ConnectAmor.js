import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Canvas, Circle, Line, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';

const GRID_SIZE = 5;
const INITIAL_TIME = 60_000;
const BONUS_TIME = 4_500;
const PAIRS = [
  { id: 'rosa', color: '#ff7cad' },
  { id: 'oro', color: '#ffd278' },
  { id: 'lila', color: '#bfa2ff' },
];

const cellKey = ({ row, col }) => `${row}:${col}`;
const sameCell = (a, b) => a.row === b.row && a.col === b.col;
const distance = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

const neighbors = (cell, visited) => shuffle([
  { row: cell.row - 1, col: cell.col },
  { row: cell.row + 1, col: cell.col },
  { row: cell.row, col: cell.col - 1 },
  { row: cell.row, col: cell.col + 1 },
].filter((candidate) => (
  candidate.row >= 0
  && candidate.row < GRID_SIZE
  && candidate.col >= 0
  && candidate.col < GRID_SIZE
  && !visited.has(cellKey(candidate))
)));

const countTurns = (path) => path.reduce((turns, cell, index) => {
  if (index < 2) return turns;
  const before = path[index - 2];
  const previous = path[index - 1];
  const changedDirection = (previous.row - before.row) !== (cell.row - previous.row)
    || (previous.col - before.col) !== (cell.col - previous.col);
  return turns + (changedDirection ? 1 : 0);
}, 0);

const FALLBACK_ROUTE = [
  [2, 4], [1, 4], [0, 4], [0, 3], [1, 3], [2, 3], [2, 2], [1, 2], [0, 2],
  [0, 1], [0, 0], [1, 0], [1, 1], [2, 1], [2, 0], [3, 0], [4, 0], [4, 1],
  [3, 1], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [3, 3],
];

const fallbackPath = () => {
  const flipRows = Math.random() > 0.5;
  const flipCols = Math.random() > 0.5;
  const transpose = Math.random() > 0.5;
  return FALLBACK_ROUTE.map(([originalRow, originalCol]) => {
    const row = flipRows ? GRID_SIZE - 1 - originalRow : originalRow;
    const col = flipCols ? GRID_SIZE - 1 - originalCol : originalCol;
    return transpose ? { row: col, col: row } : { row, col };
  });
};

const createRoute = (minimumTurns) => {
  const targetLength = GRID_SIZE * GRID_SIZE;
  let bestCandidate = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const start = { row: Math.floor(Math.random() * GRID_SIZE), col: Math.floor(Math.random() * GRID_SIZE) };
    const visited = new Set([cellKey(start)]);
    let exploredNodes = 0;
    let bestRoute = null;
    const search = (path) => {
      if (exploredNodes += 1, exploredNodes > 2_500) return null;
      if (path.length === targetLength) {
        if (!bestRoute || countTurns(path) > countTurns(bestRoute)) bestRoute = path;
        return countTurns(path) >= minimumTurns ? path : null;
      }
      const current = path[path.length - 1];
      const options = neighbors(current, visited).sort((a, b) => neighbors(a, visited).length - neighbors(b, visited).length);

      for (const next of options) {
        visited.add(cellKey(next));
        const result = search([...path, next]);
        if (result) return result;
        visited.delete(cellKey(next));
      }
      return null;
    };

    const route = search([start]);
    if (route) return route;
    if (bestRoute && (!bestCandidate || countTurns(bestRoute) > countTurns(bestCandidate))) {
      bestCandidate = bestRoute;
    }
  }

  return bestCandidate || fallbackPath();
};

const createPuzzle = (difficulty) => {
  const route = createRoute(Math.min(14, 7 + difficulty * 2));
  const segmentLengths = difficulty % 2 === 0 ? [9, 8, 8] : [8, 9, 8];
  let cursor = 0;
  const pairs = PAIRS.map((pair, index) => {
    const cells = route.slice(cursor, cursor + segmentLengths[index]);
    cursor += segmentLengths[index];
    return { ...pair, start: cells[0], end: cells[cells.length - 1] };
  });
  return { pairs, routeTurns: countTurns(route) };
};

const timeForDifficulty = (difficulty) => Math.max(42_000, INITIAL_TIME - (difficulty - 1) * 4_000);

const ConnectAmor = ({ onExit }) => {
  const [boardSize, setBoardSize] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [puzzle, setPuzzle] = useState(() => createPuzzle(1));
  const [connections, setConnections] = useState([]);
  const [drag, setDrag] = useState(null);
  const [timeLeft, setTimeLeft] = useState(() => timeForDifficulty(1));
  const [status, setStatus] = useState('playing');
  const [tip, setTip] = useState('Tocá una gema y dibujá su camino por la grilla.');
  const gameRef = useRef(null);

  const geometry = useMemo(() => {
    const padding = boardSize * 0.12;
    const step = boardSize ? (boardSize - padding * 2) / (GRID_SIZE - 1) : 0;
    const point = (cell) => ({ x: padding + cell.col * step, y: padding + cell.row * step });
    const closestCell = (touch) => {
      if (!step) return null;
      const col = Math.round((touch.x - padding) / step);
      const row = Math.round((touch.y - padding) / step);
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
      const candidate = { row, col };
      const candidatePoint = point(candidate);
      const dx = candidatePoint.x - touch.x;
      const dy = candidatePoint.y - touch.y;
      return dx * dx + dy * dy <= (step * 0.48) ** 2 ? candidate : null;
    };
    return { padding, point, closestCell, step };
  }, [boardSize]);

  const dots = useMemo(() => puzzle.pairs.flatMap((pair) => [
    { id: `${pair.id}-start`, pairId: pair.id, color: pair.color, cell: pair.start },
    { id: `${pair.id}-end`, pairId: pair.id, color: pair.color, cell: pair.end },
  ]), [puzzle]);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const timer = setInterval(() => setTimeLeft((current) => Math.max(0, current - 100)), 100);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (timeLeft === 0) setStatus('lost');
  }, [timeLeft]);

  const resetPuzzle = (nextDifficulty = difficulty) => {
    setDifficulty(nextDifficulty);
    setPuzzle(createPuzzle(nextDifficulty));
    setConnections([]);
    setDrag(null);
    setTimeLeft(timeForDifficulty(nextDifficulty));
    setStatus('playing');
    setTip('La luz baja un poco más rápido, pero sigue siendo amable.');
  };

  const dotAt = (cell) => dots.find((dot) => sameCell(dot.cell, cell));
  const occupiedByOtherConnection = (cell, ownPairId) => connections.some((connection) => (
    connection.pairId !== ownPairId && connection.cells.some((entry) => sameCell(entry, cell))
  ));

  const startDrag = (touch) => {
    if (status !== 'playing') return;
    const cell = geometry.closestCell(touch);
    const origin = cell && dotAt(cell);
    if (!origin) return;

    if (connections.some((connection) => connection.pairId === origin.pairId)) {
      setConnections((current) => current.filter((connection) => connection.pairId !== origin.pairId));
      setTip('Podés redibujar esa conexión para encontrar otro camino.');
    }
    setDrag({ pairId: origin.pairId, color: origin.color, origin: origin.cell, cells: [origin.cell] });
  };

  const extendDrag = (touch) => {
    if (!drag || status !== 'playing') return;
    const next = geometry.closestCell(touch);
    const last = drag.cells[drag.cells.length - 1];
    if (!next || sameCell(next, last) || distance(next, last) !== 1) return;

    const previousIndex = drag.cells.findIndex((cell) => sameCell(cell, next));
    if (previousIndex >= 0) {
      setDrag((current) => ({ ...current, cells: current.cells.slice(0, previousIndex + 1) }));
      return;
    }

    const dot = dotAt(next);
    if ((dot && dot.pairId !== drag.pairId) || occupiedByOtherConnection(next, drag.pairId)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }
    setDrag((current) => ({ ...current, cells: [...current.cells, next] }));
  };

  const finishDrag = () => {
    if (!drag || status !== 'playing') return;
    const pair = puzzle.pairs.find((entry) => entry.id === drag.pairId);
    const last = drag.cells[drag.cells.length - 1];
    const reachedPartner = (sameCell(drag.origin, pair.start) && sameCell(last, pair.end))
      || (sameCell(drag.origin, pair.end) && sameCell(last, pair.start));

    if (!reachedPartner || drag.cells.length < 3) {
      setDrag(null);
      return;
    }

    const nextConnections = [...connections, { pairId: pair.id, color: pair.color, cells: drag.cells }];
    const filledCells = new Set(nextConnections.flatMap((connection) => connection.cells.map(cellKey)));
    setConnections(nextConnections);
    setTimeLeft((current) => Math.min(timeForDifficulty(difficulty), current + BONUS_TIME));
    setDrag(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (nextConnections.length === puzzle.pairs.length && filledCells.size === GRID_SIZE * GRID_SIZE) {
      setStatus('won');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (nextConnections.length === puzzle.pairs.length) {
      setTip('Las tres parejas se encontraron, pero falta iluminar algunos espacios. Tocá una gema para redibujar.');
    } else {
      setTip('Bien. Cada gema conectada devuelve un poco de luz.');
    }
  };

  gameRef.current = { status, startDrag, extendDrag, finishDrag };
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => gameRef.current.status === 'playing',
    onMoveShouldSetPanResponder: () => gameRef.current.status === 'playing',
    onPanResponderGrant: (event) => gameRef.current.startDrag({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }),
    onPanResponderMove: (event) => gameRef.current.extendDrag({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }),
    onPanResponderRelease: () => gameRef.current.finishDrag(),
    onPanResponderTerminate: () => setDrag(null),
  }), []);

  const duration = timeForDifficulty(difficulty);
  const progress = Math.max(0, timeLeft / duration);
  const timerColor = progress > 0.45 ? '#ff83b7' : progress > 0.2 ? '#ffcb73' : '#ff6879';
  const visiblePaths = drag ? [...connections, { pairId: 'preview', color: drag.color, cells: drag.cells }] : connections;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.backButton} activeOpacity={0.8}>
          <Text style={styles.backText}>‹ Juegos</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>CONEXIONES</Text>
          <Text style={styles.title}>Conecta Amor</Text>
        </View>
      </View>

      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${progress * 100}%`, backgroundColor: timerColor }]} />
      </View>
      <Text style={styles.hint}>{tip}</Text>

      <View
        style={styles.board}
        onLayout={(event) => setBoardSize(Math.floor(event.nativeEvent.layout.width))}
        {...panResponder.panHandlers}
      >
        {boardSize > 0 && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <RoundedRect x={0} y={0} width={boardSize} height={boardSize} r={28}>
              <LinearGradient start={vec(0, 0)} end={vec(boardSize, boardSize)} colors={['#2a1d45', '#10152f']} />
            </RoundedRect>
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
              const cell = { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
              const point = geometry.point(cell);
              return <Circle key={cellKey(cell)} cx={point.x} cy={point.y} r={geometry.step * 0.105} color="rgba(255,255,255,0.08)" />;
            })}
            {visiblePaths.flatMap((connection) => connection.cells.slice(1).map((cell, index) => {
              const from = geometry.point(connection.cells[index]);
              const to = geometry.point(cell);
              return <Line key={`${connection.pairId}-${index}`} p1={from} p2={to} color={connection.color} style="stroke" strokeWidth={10} strokeCap="round" opacity={connection.pairId === 'preview' ? 0.72 : 1} />;
            }))}
            {dots.map((dot) => {
              const point = geometry.point(dot.cell);
              return (
                <React.Fragment key={dot.id}>
                  <Circle cx={point.x} cy={point.y} r={23} color={`${dot.color}2e`} />
                  <Circle cx={point.x} cy={point.y} r={14} color={dot.color} />
                  <Circle cx={point.x - 4} cy={point.y - 5} r={4} color="rgba(255,255,255,0.82)" />
                </React.Fragment>
              );
            })}
          </Canvas>
        )}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendHeart}>♥</Text>
        <Text style={styles.legendText}>La ronda se completa cuando toda la grilla queda iluminada.</Text>
      </View>

      {status !== 'playing' && (
        <View style={styles.modalShade}>
          <View style={styles.modal}>
            <Text style={styles.modalHeart}>{status === 'won' ? '♥' : '♡'}</Text>
            <Text style={styles.modalTitle}>{status === 'won' ? 'Qué conexión' : 'La luz se apagó'}</Text>
            <Text style={styles.modalText}>{status === 'won' ? 'El próximo camino tendrá más vueltas.' : 'Probá de nuevo: todavía hay tiempo para descubrir el camino.'}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => resetPuzzle(status === 'won' ? difficulty + 1 : difficulty)} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>{status === 'won' ? 'Siguiente conexión' : 'Intentar otra vez'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d1024', paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  backButton: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 11, paddingVertical: 8 },
  backText: { color: '#fff2f7', fontFamily: 'Delius', fontSize: 13 },
  kicker: { color: '#ffb7d1', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#fff2f7', fontFamily: 'Delius', fontSize: 24, marginTop: 2 },
  timerTrack: { height: 10, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 20 },
  hint: { color: 'rgba(255,240,247,0.64)', fontFamily: 'Delius', fontSize: 12, lineHeight: 18, marginTop: 10, marginBottom: 18 },
  board: { width: '100%', aspectRatio: 1, borderRadius: 28, overflow: 'hidden', shadowColor: '#f78fbe', shadowOpacity: 0.16, shadowRadius: 20, elevation: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  legendHeart: { color: '#ff83b7', fontSize: 18 },
  legendText: { color: 'rgba(255,240,247,0.58)', fontFamily: 'Delius', fontSize: 11 },
  modalShade: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,6,18,0.73)', padding: 26 },
  modal: { width: '100%', maxWidth: 340, alignItems: 'center', borderRadius: 28, backgroundColor: '#2b1b43', borderWidth: 1, borderColor: 'rgba(255,184,214,0.38)', padding: 28 },
  modalHeart: { color: '#ff89bb', fontSize: 44 },
  modalTitle: { color: '#fff2f7', fontFamily: 'Delius', fontSize: 24, marginTop: 5 },
  modalText: { color: 'rgba(255,240,247,0.70)', fontFamily: 'Delius', fontSize: 13, lineHeight: 19, marginTop: 9, textAlign: 'center' },
  primaryButton: { backgroundColor: '#ef6fa4', borderRadius: 18, marginTop: 22, paddingHorizontal: 22, paddingVertical: 13 },
  primaryButtonText: { color: '#fff', fontFamily: 'Delius', fontSize: 13 },
});

export default ConnectAmor;
