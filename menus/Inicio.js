import React, { useEffect, useRef, memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import { FloatingBook, AnimalitosBook, LibrosRepisa } from '../components/botones';
import RoomBackground from '../components/RoomBackground';
import Guirladas from '../components/Guirladas';
import Player from '../Player';
import Pareja from '../components/Pareja';
import PanelPerfil from '../components/PanelPerfil';
import RecompensaOverlay from '../components/RecompensaOverlay';
const REGALO_SEGUNDOS = 2 * 60;

const RegaloDaily = () => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [segundos, setSegundos] = useState(REGALO_SEGUNDOS);
  const [showReward, setShowReward] = useState(false);
  const listo = segundos <= 0;

  useEffect(() => {
    if (listo) return;
    const id = setInterval(() => setSegundos(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [listo]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -3, duration: 2000, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0,  duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (!listo) return;
    const shake = () => Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 5,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 50, useNativeDriver: true }),
    ]).start();
    const id = setInterval(shake, 2000);
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
    ])).start();
    return () => clearInterval(id);
  }, [listo]);

  const handleCloseReward = () => {
    setShowReward(false);
    setSegundos(REGALO_SEGUNDOS);
    shakeAnim.setValue(0);
    pulseAnim.setValue(1);
  };

  const lazoCol  = listo ? '#f2b8cb' : '#7a4a5a';
  const nudoCol  = listo ? '#e8849f' : '#5a3040';
  const tapaCol  = listo ? '#d4789a' : '#6a3a4a';
  const cuerpoCol= listo ? '#b5607a' : '#4a2535';
  const timerText = `${Math.floor(segundos / 60)}m ${segundos % 60}s`;

  return (
    <>
      <TouchableOpacity
        onPress={() => listo && setShowReward(true)}
        activeOpacity={listo ? 0.75 : 1}
        style={rd.wrap}
      >
        <Text style={listo ? rd.timerListo : rd.timer}>
          {listo ? '\u2665 abrir' : timerText}
        </Text>
        <Animated.View style={{
          transform: [
            { translateY: floatAnim },
            { rotate: shakeAnim.interpolate({ inputRange: [-5, 5], outputRange: ['-6deg', '6deg'] }) },
            { scale: pulseAnim },
          ],
        }}>
          <View style={rd.lazoWrap}>
            <View style={[rd.ala, rd.alaIzq, { backgroundColor: lazoCol }]} />
            <View style={[rd.ala, rd.alaDer, { backgroundColor: lazoCol }]} />
            <View style={[rd.nudo, { backgroundColor: nudoCol }]} />
            <View style={[rd.palito, { backgroundColor: lazoCol }]} />
          </View>
          <View style={[rd.tapa, { backgroundColor: tapaCol }]}>
            <View style={rd.tapaRaya} />
            <View style={rd.tapaBrillo} />
          </View>
          <View style={[rd.cuerpo, { backgroundColor: cuerpoCol }, listo && rd.cuerpoListo]}>
            <View style={rd.cuerpoRaya} />
            <View style={rd.cuerpoLinea} />
            <View style={rd.cuerpoBrillo} />
          </View>
        </Animated.View>
      </TouchableOpacity>
      <RecompensaOverlay
        visible={showReward}
        titulo="Regalo del día"
        monedas={32}
        onClose={handleCloseReward}
      />
    </>
  );
};

const rd = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 8, right: 55,
    alignItems: 'center',
  },
  timer: {
    fontSize: 8, color: 'rgba(255,255,255,0.38)',
    letterSpacing: 0.8, marginBottom: 5, fontStyle: 'italic',
  },
  timerListo: {
    fontSize: 9, color: '#f2b8cb',
    letterSpacing: 1, marginBottom: 5, fontWeight: '700',
  },
  lazoWrap: {
    alignItems: 'center', justifyContent: 'center',
    height: 16, width: 38, marginBottom: -1,
  },
  ala: { position: 'absolute', width: 13, height: 9, borderRadius: 6, opacity: 0.9 },
  alaIzq: { left: 3, top: 2, transform: [{ rotate: '25deg' }] },
  alaDer: { right: 3, top: 2, transform: [{ rotate: '-25deg' }] },
  nudo: { position: 'absolute', width: 6, height: 6, borderRadius: 3, zIndex: 2, top: 5 },
  palito: { position: 'absolute', width: 1.5, height: 16, borderRadius: 1, bottom: -8, zIndex: 1 },
  tapa: { width: 38, height: 10, borderTopLeftRadius: 2, borderTopRightRadius: 2, overflow: 'hidden' },
  tapaRaya: { position: 'absolute', width: 1.5, height: '100%', backgroundColor: 'rgba(255,255,255,0.18)', left: '50%', marginLeft: -0.75 },
  tapaBrillo: { position: 'absolute', top: 1, left: 4, width: 9, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  cuerpo: { width: 38, height: 30, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  cuerpoListo: { shadowColor: '#f2b8cb', shadowOpacity: 0.8, shadowRadius: 10, elevation: 12 },
  cuerpoRaya: { position: 'absolute', width: 1.5, height: '100%', backgroundColor: 'rgba(255,255,255,0.12)', left: '50%', marginLeft: -0.75 },
  cuerpoLinea: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', top: '45%' },
  cuerpoBrillo: { position: 'absolute', top: 3, left: 4, width: 8, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
});

const Inicio = memo(({ navigation, onReady, style }) => {
  useEffect(() => {
    onReady?.();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <RoomBackground />
      <Guirladas />
      <StatusBar hidden={true} />
      <Player containerStyle={styles.player} />
      <Pareja />
      <PanelPerfil navigation={navigation} />
      <View style={styles.canjearWrap}>
        <TouchableOpacity style={styles.canjearBtn} activeOpacity={0.75} onPress={() => navigation?.navigate('canjear')}>
          <View style={styles.canjearRow}>
            <Text style={styles.canjearText}>canjear</Text>
            <Svg width={18} height={18} viewBox="0 0 10 9" style={styles.canjearHeart}>
              <Path d="M5 8 C5 8 1 5.2 1 2.8 C1 1.3 2.1 0.5 3.2 0.5 C4 0.5 4.6 0.9 5 1.5 C5.4 0.9 6 0.5 6.8 0.5 C7.9 0.5 9 1.3 9 2.8 C9 5.2 5 8 5 8 Z" fill="rgba(220,80,110,0.82)" strokeLinejoin="round" />
              <Path d="M5 8 C5 8 1 5.2 1 2.8 C1 1.3 2.1 0.5 3.2 0.5 C4 0.5 4.6 0.9 5 1.5 C5.4 0.9 6 0.5 6.8 0.5 C7.9 0.5 9 1.3 9 2.8 C9 5.2 5 8 5 8 Z" fill="none" stroke="rgba(255,160,190,0.6)" strokeWidth={0.6} strokeLinejoin="round" />
              <Circle cx={3.8} cy={2.4} r={0.9} fill="rgba(255,255,255,0.28)" />
            </Svg>
          </View>
          <View style={styles.canjearLinea} />
        </TouchableOpacity>
      </View>
      <RegaloDaily />
      <LibrosRepisa onPressTemporadas={() => navigation.navigate('temporadas')} onPressAnimalitos={() => navigation.navigate('animalitos')} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  player: {
    position: 'absolute',
    bottom: 0,
    left: '40%',
    width: 90,
    height: 90,
  },
  canjearWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -370 }, { translateY: -70 }],
    zIndex: 10,
  },
  canjearBtn: {
    alignItems: 'flex-start',
    padding: 8,
  },
  canjearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  canjearText: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 6,
    textTransform: 'uppercase',
    fontFamily: 'Delius',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  canjearHeart: {
    marginLeft: 8,
    marginBottom: -3,
    transform: [{ rotate: '-22deg' }],
  },
  canjearLinea: {
    height: 0.5,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  vestuarioBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default Inicio;
