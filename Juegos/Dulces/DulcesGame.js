import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import RoomBackground from '../../components/RoomBackground';
import TabButtons from '../../components/TabButtons';
import { useMisiones } from '../../MisionesContext';

const { width: W } = Dimensions.get('window');
const MAX_LEVEL = 200;
const SABORES = ['🍓', '🍒', '🍪', '🍩', '🧁', '🍰', '🍭', '🍬', '🍫', '🍡', '🍎', '🍯'];
const shuffle = values => [...values].sort(() => Math.random() - 0.5);

const getLevelConfig = level => {
  const requestedCards = level <= 2 ? 2
    : level <= 5 ? 3
      : level <= 15 ? 4
        : level <= 35 ? 6
          : level <= 50 ? 8
            : level <= 125 ? 10
              : 12;
  const pairs = Math.max(1, Math.ceil(requestedCards / 2));
  const total = pairs * 2;
  const columns = total <= 8 ? 4 : 5;
  const time = level <= 2 ? 45
    : level <= 5 ? 42
      : level <= 15 ? 38
        : level <= 35 ? 34
          : level <= 50 ? 30
            : level <= 125 ? 27
              : 24;
  return {
    level,
    pairs,
    total,
    columns,
    rows: Math.ceil(total / columns),
    time,
  };
};

const makeDeck = level => {
  const config = getLevelConfig(level);
  const selected = SABORES.slice(0, config.pairs);
  return shuffle([...selected, ...selected]).map((flavor, index) => ({
    id: `${level}-${index}-${flavor}`,
    flavor,
    pair: flavor,
  }));
};

const HeartMark = () => (
  <Svg width={25} height={23} viewBox="0 0 25 23">
    <Path d="M12.5 21S2 14.6 1.2 7.9C.6 2.7 6.8.1 10.2 4.1L12.5 7l2.3-2.9C18.2.1 24.4 2.7 23.8 7.9 23 14.6 12.5 21 12.5 21Z" fill="#a95f76" stroke="#fff0d0" strokeWidth="1.2" />
    <Path d="M5.5 6.2c.5-1.4 2.2-2 3.4-.9" fill="none" stroke="rgba(255,255,255,0.72)" strokeLinecap="round" strokeWidth="1.2" />
  </Svg>
);

const DulcesGame = memo(({ navigation }) => {
  const { registrarProgreso } = useMisiones();
  const [status, setStatus] = useState('lobby');
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [level, setLevel] = useState(1);
  const [deck, setDeck] = useState([]);
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getLevelConfig(1).time);
  const [locked, setLocked] = useState(false);
  const [bestMoves, setBestMoves] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [revealedStars, setRevealedStars] = useState(0);
  const [rewardData, setRewardData] = useState(null);
  const uid = auth.currentUser?.uid;
  const timerRef = useRef(null);
  const previewTimerRef = useRef(null);
  const previewCountRef = useRef(0);
  const starTimersRef = useRef([]);
  const timeRef = useRef(getLevelConfig(1).time);
  const levelRef = useRef(1);
  const movesRef = useRef(0);
  const activeRef = useRef(false);

  const config = useMemo(() => getLevelConfig(level), [level]);

  useEffect(() => {
    let active = true;
    const localKey = `@amor:memoria-sabores:nivel:${uid || 'guest'}`;
    AsyncStorage.getItem(localKey).then(value => {
      if (active) setUnlockedLevel(Math.max(1, Math.min(MAX_LEVEL, Number(value) || 1)));
    }).catch(() => {});
    if (!uid) return () => { active = false; };
    const gameRef = doc(db, 'usuarios', uid, 'juegos', 'memoriaSabores');
    const unsubscribe = onSnapshot(gameRef, snapshot => {
      const saved = Math.max(1, Math.min(MAX_LEVEL, Number(snapshot.data()?.nivel) || 1));
      setUnlockedLevel(saved);
      AsyncStorage.setItem(localKey, String(saved)).catch(() => {});
    }, () => {});
    return () => { active = false; unsubscribe(); };
  }, [uid]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = null;
    starTimersRef.current.forEach(timer => clearTimeout(timer));
    starTimersRef.current = [];
  }, []);

  const finish = useCallback(result => {
    clearTimer();
    activeRef.current = false;
    setLocked(false);
    setStatus(result);
  }, [clearTimer]);

  useEffect(() => () => {
    activeRef.current = false;
    clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    if (status !== 'won') return undefined;
    setRevealedStars(0);
    starTimersRef.current = Array.from({ length: earnedStars }, (_, index) => setTimeout(() => {
      setRevealedStars(index + 1);
      Vibration.vibrate(75);
    }, 320 * (index + 1)));
    return () => {
      starTimersRef.current.forEach(timer => clearTimeout(timer));
      starTimersRef.current = [];
    };
  }, [earnedStars, status]);

  const startClock = useCallback(() => {
    if (timerRef.current || !activeRef.current) return;
    timerRef.current = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(Math.max(0, timeRef.current));
      if (timeRef.current <= 0) finish('lost');
    }, 1000);
  }, [finish]);

  const saveProgress = useCallback(async (completedLevel, stars, movesUsed) => {
    const nextLevel = Math.min(MAX_LEVEL, completedLevel + 1);
    AsyncStorage.setItem(`@amor:memoria-sabores:nivel:${uid || 'guest'}`, String(nextLevel)).catch(() => {});
    if (!uid) return { coins: 0, diamonds: 0, exp: 0, bonus: null };
    const gameRef = doc(db, 'usuarios', uid, 'juegos', 'memoriaSabores');
    return runTransaction(db, async transaction => {
      const snapshot = await transaction.get(gameRef);
      const remote = snapshot.exists() ? snapshot.data() || {} : {};
      const userRef = doc(db, 'usuarios', uid);
      const userSnapshot = await transaction.get(userRef);
      const userData = userSnapshot.data() || {};
      const oldLevel = Math.max(1, Number(remote.nivel) || 1);
      const completed = { ...(remote.completados || {}) };
      const old = completed[completedLevel] || {};
      completed[completedLevel] = {
        estrellas: Math.max(Number(old.estrellas) || 0, Math.min(3, stars)),
        movimientos: Math.min(Number(old.movimientos) || movesUsed, movesUsed),
        completadoEn: serverTimestamp(),
      };
      const grantedStars = Math.max(0, Math.min(3, stars) - (Number(old.estrellas) || 0));
      const coins = grantedStars * (6 + Math.min(completedLevel, 20));
      const diamonds = grantedStars + (stars === 3 ? 1 : 0);
      const completedGames = (Number(remote.partidasCompletadas) || 0) + 1;
      const bonus = completedGames % 5 === 0
        ? { tipo: completedGames % 10 === 0 ? 'globos' : 'chicles', cantidad: 2 }
        : null;
      transaction.set(gameRef, {
        nivel: Math.max(oldLevel, nextLevel),
        ultimoNivel: completedLevel,
        estrellas: Object.values(completed).reduce((total, item) => total + (Number(item.estrellas) || 0), 0),
        partidasCompletadas: completedGames,
        completados: completed,
        actualizadoEn: serverTimestamp(),
      }, { merge: true });
      transaction.set(userRef, {
        exp: (Number(userData.exp) || 0) + 8,
        ...(coins > 0 ? { dinero: (Number(userData.dinero) || 0) + coins } : {}),
        ...(diamonds > 0 ? { diamantes: (Number(userData.diamantes) || 0) + diamonds } : {}),
        ...(bonus?.tipo === 'chicles' ? { chicles: (Number(userData.chicles) || 0) + bonus.cantidad } : {}),
        ...(bonus?.tipo === 'globos' ? { globos: (Number(userData.globos) || 0) + bonus.cantidad } : {}),
      }, { merge: true });
      return { coins, diamonds, exp: 8, bonus };
    });
  }, [uid]);

  const startLevel = useCallback(nextLevel => {
    const target = Math.max(1, Math.min(MAX_LEVEL, nextLevel));
    const nextConfig = getLevelConfig(target);
    clearTimer();
    levelRef.current = target;
    timeRef.current = nextConfig.time;
    movesRef.current = 0;
    activeRef.current = true;
    setLevel(target);
    setDeck(makeDeck(target));
    setSelected([]);
    setMatched([]);
    setMoves(0);
    setTimeLeft(nextConfig.time);
    setLocked(false);
    setBestMoves(null);
    setPreviewing(true);
    setPreviewCount(3);
    previewCountRef.current = 3;
    setStatus('playing');
    previewTimerRef.current = setInterval(() => {
      previewCountRef.current -= 1;
      if (previewCountRef.current <= 0) {
        clearInterval(previewTimerRef.current);
        previewTimerRef.current = null;
        setPreviewCount(0);
        setPreviewing(false);
        startClock();
        return;
      }
      setPreviewCount(previewCountRef.current);
    }, 1000);
  }, [clearTimer, finish, startClock]);

  const handleCardPress = useCallback(index => {
    if (!activeRef.current || previewing || locked || selected.includes(index) || matched.includes(index)) return;
    const nextSelected = [...selected, index];
    setSelected(nextSelected);
    if (nextSelected.length < 2) return;

    setLocked(true);
    const first = deck[nextSelected[0]];
    const second = deck[nextSelected[1]];
    const nextMoves = movesRef.current + 1;
    movesRef.current = nextMoves;
    setMoves(nextMoves);

    if (first.pair === second.pair) {
      setTimeout(() => {
        if (!activeRef.current) return;
        const nextMatched = [...matched, ...nextSelected];
        setMatched(nextMatched);
        setSelected([]);
        setLocked(false);
        if (nextMatched.length === deck.length) {
          const earnedLevel = Math.min(MAX_LEVEL, levelRef.current + 1);
          setUnlockedLevel(previous => {
            const next = Math.max(previous, earnedLevel);
            AsyncStorage.setItem('@amor:memoria-sabores:nivel', String(next)).catch(() => {});
            return next;
          });
          setBestMoves(nextMoves);
          const efficiency = nextMoves / config.pairs;
          const stars = timeLeft > config.time * 0.35 && efficiency <= 2.4 ? 3 : efficiency <= 3.4 ? 2 : 1;
          setEarnedStars(stars);
          registrarProgreso('partidas_hoy');
          saveProgress(levelRef.current, stars, nextMoves).then(setRewardData).catch(() => {});
          finish('won');
        }
      }, 420);
    } else {
      Vibration.vibrate(130);
      setTimeout(() => {
        if (!activeRef.current) return;
        setSelected([]);
        setLocked(false);
      }, 780);
    }
  }, [config.pairs, config.time, deck, finish, locked, matched, previewing, registrarProgreso, saveProgress, selected, timeLeft]);

  const leaveToGames = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    navigation?.navigate('main');
  }, [clearTimer, navigation]);

  const leaveToHome = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    navigation?.navigate('main');
  }, [clearTimer, navigation]);

  const goToLobby = () => {
    activeRef.current = false;
    clearTimer();
    setStatus('lobby');
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RoomBackground />
      <Image source={require('../../assets/juegos/conexion.png')} style={styles.beachBackground} contentFit="cover" />
      <View pointerEvents="none" style={styles.tint} />

      {status !== 'lobby' && <View style={styles.navLayer}><TabButtons onExit={leaveToGames} customAddButton={<View />} /></View>}

      {status !== 'lobby' && <>
        <View style={styles.hud} pointerEvents="box-none">
          <View style={styles.titleBlock}>
            <Text style={styles.hudKicker}>MEMORIA DE SABORES · T2</Text>
            <Text style={styles.hudTitle}>Recordá las parejas</Text>
            <Text style={styles.hudSubtitle}>Encontrá cada sabor antes de que se apague la luz.</Text>
          </View>
          <View style={styles.hudStats}>
            <View style={styles.hudStat}><Text style={styles.statLabel}>NIVEL</Text><Text style={styles.statValue}>{level}</Text></View>
            <View style={[styles.hudStat, timeLeft <= 8 && styles.warningStat]}><Text style={styles.statLabel}>TIEMPO</Text><Text style={styles.statValue}>{timeLeft}s</Text></View>
            <View style={styles.hudStat}><Text style={styles.statLabel}>MOVIMIENTOS</Text><Text style={styles.statValue}>{moves}</Text></View>
          </View>
        </View>
        <View style={styles.boardArea}>
          <View style={[styles.boardShell, { width: Math.min(W - 150, 290), aspectRatio: config.columns / config.rows }]}>
            <View style={styles.boardGrid}>
              {deck.map((card, index) => <MemoryCard key={card.id} card={card} index={index} rows={config.rows} columns={config.columns} faceUp={previewing || selected.includes(index) || matched.includes(index)} matched={matched.includes(index)} onPress={handleCardPress} />)}
            </View>
            {previewing && <View pointerEvents="none" style={styles.previewCount}><Text style={styles.previewCountText}>{previewCount}</Text><Text style={styles.previewCountLabel}>PREPARATE</Text></View>}
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.timeBarTrack}><View style={[styles.timeBarFill, { width: `${Math.max(0, (timeLeft / config.time) * 100)}%` }, timeLeft <= 8 && styles.timeBarWarning]} /></View>
            <Text style={styles.timeBarLabel}>LUZ {timeLeft}s</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, (matched.length / config.total) * 100)}%` }]} /></View>
            <Text style={styles.progressText}>{previewing ? 'MEMORIZÁ LOS SABORES…' : `PAREJAS ${matched.length / 2}/${config.pairs} · NIVEL ${level}`}</Text>
          </View>
        </View>
        <View style={styles.levelBadge}><Text style={styles.levelBadgeText}>NIVEL {level} · {config.pairs} PAREJAS</Text></View>
      </>}

      <Modal visible={status === 'lobby'} transparent animationType="fade" onRequestClose={leaveToGames}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalNavLayer}><TabButtons onExit={leaveToGames} customAddButton={<View />} /></View>
          <View style={styles.lobbyCard}>
            <Text style={styles.lobbyEmoji}>🍓🍪</Text>
            <Text style={styles.lobbyTitle}>Memoria de Sabores</Text>
            <Text style={styles.lobbyDescription}>Destapá dos cartas, recordá dónde viste cada sabor y encontrá todas las parejas.</Text>
            <View style={styles.lobbyBadge}><Text style={styles.lobbyBadgeText}>✨ RETO DE TEMPORADA 2</Text></View>
            <View style={styles.lobbyMetaRow}>
              <View style={styles.lobbyMeta}><Text style={styles.lobbyMetaIcon}>▦</Text><Text style={styles.lobbyMetaText}>Nivel {unlockedLevel}</Text></View>
              <View style={styles.lobbyMeta}><Text style={styles.lobbyMetaIcon}>🧠</Text><Text style={styles.lobbyMetaText}>Memoria viva</Text></View>
            </View>
            <View style={styles.lobbyTip}><Text style={styles.lobbyTipIcon}>💡</Text><Text style={styles.lobbyTipText}>Las cartas y el tiempo crecen por etapas.</Text></View>
            <TouchableOpacity style={styles.playButton} onPress={() => startLevel(unlockedLevel)} activeOpacity={0.85}><LinearGradient colors={['#ff8b78', '#ee5f78']} style={styles.playGradient}><Text style={styles.playText}>Jugar nivel {unlockedLevel}</Text></LinearGradient></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={status === 'won'} transparent animationType="fade" onRequestClose={leaveToHome}>
        <View style={styles.modalBackdrop}><View style={styles.resultCard}>
          <Text style={styles.resultEmoji}>🏆</Text>
          <Text style={styles.resultTitle}>¡Sabor encontrado!</Text>
          <Text style={styles.resultLevel}>NIVEL {level} COMPLETADO</Text>
          <View style={styles.stars}>{[0, 1, 2].map(index => <Text key={index} style={[styles.star, index < revealedStars ? styles.starVisible : styles.starHidden]}>{index < revealedStars ? '★' : '☆'}</Text>)}</View>
          <Text style={styles.resultLine}>{bestMoves} movimientos · {config.pairs} parejas</Text>
          {rewardData && <View style={styles.rewardStack}>
            {rewardData.coins > 0 && <Text style={styles.rewardText}>+{rewardData.coins} 🪙</Text>}
            {rewardData.diamonds > 0 && <Text style={styles.diamondRewardText}>+{rewardData.diamonds} 💎</Text>}
            {rewardData.exp > 0 && <Text style={styles.expRewardText}>+{rewardData.exp} EXP</Text>}
            {rewardData.bonus && <Text style={styles.bonusRewardText}>+{rewardData.bonus.cantidad} {rewardData.bonus.tipo === 'chicles' ? '🍬' : '🎈'}</Text>}
          </View>}
          <TouchableOpacity style={styles.playButton} onPress={() => startLevel(Math.min(MAX_LEVEL, level + 1))} activeOpacity={0.85}><LinearGradient colors={['#ff8b78', '#ee5f78']} style={styles.playGradient}><Text style={styles.playText}>{level < MAX_LEVEL ? 'Siguiente nivel' : 'Volver a empezar'}</Text></LinearGradient></TouchableOpacity>
          <TouchableOpacity onPress={leaveToHome} style={styles.textAction}><Text style={styles.textActionLabel}>Salir</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={status === 'lost'} transparent animationType="fade" onRequestClose={() => startLevel(level)}>
        <View style={styles.modalBackdrop}><View style={styles.resultCard}>
          <Text style={styles.resultEmoji}>🌙</Text>
          <Text style={styles.resultTitle}>La memoria se apagó</Text>
          <Text style={styles.resultLine}>Todavía quedan sabores por descubrir. Mirá con atención y probá otra vez.</Text>
          <TouchableOpacity style={styles.playButton} onPress={() => startLevel(level)} activeOpacity={0.85}><LinearGradient colors={['#ff8b78', '#ee5f78']} style={styles.playGradient}><Text style={styles.playText}>Intentar de nuevo</Text></LinearGradient></TouchableOpacity>
          <TouchableOpacity onPress={goToLobby} style={styles.textAction}><Text style={styles.textActionLabel}>Volver a niveles</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
});

const MemoryCard = memo(({ card, index, rows, columns, faceUp, matched, onPress }) => {
  const flip = useRef(new Animated.Value(faceUp ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(flip, { toValue: faceUp ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [faceUp, flip]);
  const frontScale = flip.interpolate({ inputRange: [0, 1], outputRange: [1, 0.04] });
  const backScale = flip.interpolate({ inputRange: [0, 1], outputRange: [0.04, 1] });
  const frontOpacity = flip.interpolate({ inputRange: [0, 0.18, 1], outputRange: [1, 1, 0] });
  const backOpacity = flip.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, 0, 1] });
  return <Pressable onPress={() => onPress(index)} style={[styles.memoryCard, { width: `${(100 / columns) - 2}%`, height: `${Math.max(20, (100 / rows) - 3)}%` }]} disabled={matched} accessibilityLabel={faceUp ? `Sabor ${card.flavor}` : 'Carta de sabor'}>
    <Animated.View style={[styles.cardFace, styles.cardFront, { opacity: frontOpacity, transform: [{ scaleX: frontScale }] }]}><HeartMark /></Animated.View>
    <Animated.View style={[styles.cardFace, styles.cardBack, matched && styles.cardMatched, { opacity: backOpacity, transform: [{ scaleX: backScale }] }]}><Text style={styles.flavor}>{card.flavor}</Text></Animated.View>
  </Pressable>;
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#38205f' },
  beachBackground: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  tint: { ...StyleSheet.absoluteFillObject, zIndex: 1, backgroundColor: 'rgba(45,25,92,0.56)' },
  navLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, elevation: 50 },
  hud: { position: 'absolute', top: 52, left: 72, right: 12, zIndex: 8, elevation: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  titleBlock: { minWidth: 155 },
  hudKicker: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 1.1, textShadowColor: '#34205b', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  hudTitle: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 17, fontWeight: '900', marginTop: 0, textShadowColor: '#34205b', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  hudSubtitle: { color: '#f5ddff', fontFamily: 'Delius', fontSize: 7.5, marginTop: 0 },
  hudStats: { flexDirection: 'row', gap: 6 },
  hudStat: { minWidth: 49, alignItems: 'center', backgroundColor: 'rgba(51,35,92,0.90)', borderWidth: 1, borderColor: 'rgba(230,222,255,0.62)', borderRadius: 7, paddingHorizontal: 5, paddingVertical: 4 },
  warningStat: { backgroundColor: 'rgba(184,77,84,0.92)', borderColor: '#ffe8b8' },
  statLabel: { color: '#fff2c8', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900', letterSpacing: 0.3 },
  statValue: { color: '#fff', fontFamily: 'Delius', fontSize: 11, fontWeight: '900', marginTop: 0 },
  boardArea: { position: 'absolute', top: 136, left: 72, right: 18, bottom: 25, alignItems: 'center', justifyContent: 'center', zIndex: 5, elevation: 5 },
  boardShell: { position: 'relative', padding: 0, borderRadius: 14, backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0, elevation: 0 },
  boardGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignContent: 'center', justifyContent: 'center' },
  memoryCard: { minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  cardFace: { position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1.2 },
  cardFront: { backgroundColor: '#c49aa5', borderColor: '#ffe8d0', shadowColor: '#351f4d', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardBack: { backgroundColor: '#fff1ca', borderColor: '#ffbd8d', shadowColor: '#351f4d', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardMatched: { backgroundColor: '#ffd2e6', borderColor: '#fff0b9' },
  flavor: { fontSize: 22 },
  progressWrap: { alignItems: 'center', width: 190, marginTop: 11 },
  timeBarTrack: { width: 220, height: 9, overflow: 'hidden', borderRadius: 6, backgroundColor: 'rgba(35,20,67,0.72)', borderWidth: 1, borderColor: 'rgba(255,240,196,0.58)' },
  timeBarFill: { height: '100%', borderRadius: 6, backgroundColor: '#ffd37d' },
  timeBarWarning: { backgroundColor: '#f46f7d' },
  timeBarLabel: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  progressTrack: { width: '100%', height: 7, overflow: 'hidden', borderRadius: 6, backgroundColor: 'rgba(51,35,92,0.65)', borderWidth: 1, borderColor: 'rgba(255,213,207,0.38)' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#f46f7d' },
  progressText: { color: '#fff4ce', fontFamily: 'Delius', fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginTop: 5 },
  previewCount: { position: 'absolute', alignItems: 'center', justifyContent: 'center', top: '50%', left: '50%', marginLeft: -35, marginTop: -35, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(51,35,92,0.82)', borderWidth: 1.5, borderColor: '#ffe7a8', zIndex: 20, elevation: 20 },
  previewCountText: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 28, fontWeight: '900', lineHeight: 31 },
  previewCountLabel: { color: '#ffe7a8', fontFamily: 'Delius', fontSize: 6, fontWeight: '900', letterSpacing: 0.7 },
  levelBadge: { position: 'absolute', left: 88, bottom: 22, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(51,35,92,0.78)', borderWidth: 1, borderColor: 'rgba(230,222,255,0.44)', zIndex: 8 },
  levelBadgeText: { color: '#ffe7a8', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(26,13,60,0.66)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  modalNavLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, elevation: 100 },
  lobbyCard: { width: Math.min(W * 0.70, 365), maxWidth: '100%', borderRadius: 18, padding: 12, alignItems: 'center', backgroundColor: 'rgba(51,35,92,0.98)', borderWidth: 1, borderColor: 'rgba(230,222,255,0.78)', shadowColor: '#211142', shadowOpacity: 0.56, shadowRadius: 20, elevation: 12 },
  lobbyEmoji: { fontSize: 29, lineHeight: 34 },
  lobbyTitle: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 22, fontWeight: '900' },
  lobbyDescription: { color: '#e8ffff', fontFamily: 'Delius', fontSize: 8.5, lineHeight: 12, textAlign: 'center', maxWidth: 285, marginTop: 3, marginBottom: 7 },
  lobbyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 14, backgroundColor: 'rgba(255,211,125,0.22)', borderWidth: 1, borderColor: 'rgba(255,231,168,0.72)' },
  lobbyBadgeText: { color: '#ffe7a8', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  lobbyMetaRow: { flexDirection: 'row', gap: 6, marginTop: 9, marginBottom: 7 },
  lobbyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 11, backgroundColor: 'rgba(255,246,205,0.12)', borderWidth: 1, borderColor: 'rgba(255,246,205,0.30)' },
  lobbyMetaIcon: { color: '#ffd37d', fontSize: 12 },
  lobbyMetaText: { color: '#e8ffff', fontFamily: 'Delius', fontSize: 8, fontWeight: '800' },
  lobbyTip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 7, opacity: 0.9 },
  lobbyTipIcon: { fontSize: 12, marginRight: 4 },
  lobbyTipText: { color: '#fff0c5', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '700' },
  playButton: { minWidth: 160, overflow: 'hidden', borderRadius: 10, shadowColor: '#ee6f70', shadowOpacity: 0.32, shadowRadius: 8, elevation: 4 },
  playGradient: { paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center' },
  playText: { color: '#fff', fontFamily: 'Delius', fontWeight: '900', fontSize: 11, letterSpacing: 0.3 },
  resultCard: { width: Math.min(W * 0.62, 330), maxWidth: '100%', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 22, alignItems: 'center', backgroundColor: 'rgba(51,35,92,0.98)', borderWidth: 1, borderColor: 'rgba(230,222,255,0.80)', shadowColor: '#211142', shadowOpacity: 0.56, shadowRadius: 20, elevation: 12 },
  resultEmoji: { fontSize: 34 },
  resultTitle: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 21, fontWeight: '900', marginTop: 2 },
  resultLevel: { color: '#ffe7a8', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 6 },
  stars: { flexDirection: 'row', marginTop: 2 },
  star: { color: '#fff0b9', fontSize: 25, marginHorizontal: 3, textShadowColor: '#c06b2a', textShadowRadius: 4 },
  starVisible: { opacity: 1, transform: [{ scale: 1 }] },
  starHidden: { opacity: 0.22, transform: [{ scale: 0.72 }] },
  scorePill: { minWidth: 135, alignItems: 'center', marginTop: 10, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(255,240,185,0.18)', borderWidth: 1, borderColor: 'rgba(255,240,185,0.58)' },
  scorePillLabel: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  scorePillValue: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 26, fontWeight: '900' },
  resultLine: { color: '#d8ffff', fontFamily: 'Delius', textAlign: 'center', fontSize: 8.5, lineHeight: 12, marginTop: 8 },
  rewardStack: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 8 },
  rewardText: { color: '#fff0b9', fontFamily: 'Delius', fontSize: 9, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(255,211,125,0.18)', borderWidth: 1, borderColor: 'rgba(255,231,168,0.52)' },
  diamondRewardText: { color: '#bdefff', fontFamily: 'Delius', fontSize: 9, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(74,190,224,0.18)', borderWidth: 1, borderColor: 'rgba(177,237,255,0.52)' },
  expRewardText: { color: '#d7fff0', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(112,224,189,0.18)', borderWidth: 1, borderColor: 'rgba(184,234,217,0.52)' },
  bonusRewardText: { color: '#ffe5ee', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(255,143,168,0.18)', borderWidth: 1, borderColor: 'rgba(255,190,205,0.52)' },
  textAction: { marginTop: 10, padding: 4 },
  textActionLabel: { color: '#ffd0dd', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '800' },
});

export default DulcesGame;
