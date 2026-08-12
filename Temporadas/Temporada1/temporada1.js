import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import TabButtons from '../../components/TabButtons';
import Loading from '../../components/Loading';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

const ChicleSvg = ({ size = 110 }) => {
  const R = size / 2 - 8;
  const cx = size / 2;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="capGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%"  stopColor="#c4a0f5" />
          <Stop offset="50%" stopColor="#ff8fa8" />
          <Stop offset="100%" stopColor="#f5c842" />
        </LinearGradient>
        <LinearGradient id="capGlow" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0%"   stopColor="#fff" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx={cx} cy={cx} r={R + 10} fill="rgba(196,160,245,0.12)" />
      <Circle cx={cx} cy={cx} r={R + 5}  fill="rgba(255,143,168,0.18)" />
      <Circle cx={cx} cy={cx} r={R} fill="url(#capGrad)" />
      <Circle cx={cx} cy={cx} r={R} fill="url(#capGlow)" />
      <Circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      <Circle cx={cx} cy={cx} r={R + 4} fill="none" stroke="rgba(196,160,245,0.4)" strokeWidth={1} strokeDasharray="5 4" />
      <Ellipse cx={cx - R * 0.28} cy={cx - R * 0.28} rx={R * 0.38} ry={R * 0.2} fill="rgba(255,255,255,0.38)" />
      <Ellipse cx={cx - R * 0.1}  cy={cx - R * 0.5}  rx={R * 0.13} ry={R * 0.07} fill="rgba(255,255,255,0.22)" />
    </Svg>
  );
};

const EventCard = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.evBase}>
    <Image
      source={require('../../assets/temporadas/libro/Temporada1/Historia/eventohis1.png')}
      style={styles.evImg}
      contentFit="contain"
      cachePolicy="memory"
    />
  </TouchableOpacity>
);

const Temporada1 = ({ navigation }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const halconAnim = useRef(new Animated.Value(0)).current;
  const [halconDesbloqueado, setHalconDesbloqueado] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const loadingRef = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { loadingRef.current?.fadeOut(); return; }
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (snap.exists()) setHalconDesbloqueado(!!snap.data().halconDesbloqueado);
      loadingRef.current?.fadeOut();
    });
    const unsubH = onSnapshot(doc(db, 'Historias', uid), snap => {
      if (!snap.exists()) return;
      const t1 = snap.data().temporada1 || {};
      setProgreso(Object.values(t1).filter(Boolean).length);
    });
    return () => { unsub(); unsubH(); };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -3, duration: 2200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 2200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(halconAnim, { toValue: -5, duration: 1800, useNativeDriver: true }),
        Animated.timing(halconAnim, { toValue: 0,  duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image
        source={require('../../assets/temporadas/libro/Temporada1/fondo1.png')}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        contentFit="cover"
        cachePolicy="memory"
      />
      <TabButtons onExit={() => navigation?.navigate?.('temporadas')} customAddButton={<View />} />
      {halconDesbloqueado && (
        <Animated.View style={[styles.halconWrap, { transform: [{ translateY: halconAnim }] }]}>
          <Image
            source={require('../../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png')}
            style={styles.halcon}
            contentFit="contain"
            cachePolicy="memory"
          />
        </Animated.View>
      )}
      <EventCard onPress={() => navigation?.navigate?.('historia1')} />
      <TouchableOpacity style={styles.capsulaBtn} onPress={() => navigation?.navigate?.('capsula1')}>
        <ChicleSvg size={62} />
      </TouchableOpacity>
      <Loading ref={loadingRef} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  halconWrap: {
    position: 'absolute',
    bottom: '18%',
    left: '55%',
  },
  halcon: { width: 80, height: 80 },

  capsulaBtn: {
    position: 'absolute',
    bottom: '1%',
    right: '1%',
    zIndex: 10,
  },

  evBase: {
    position: 'absolute',
    width: 200,
    height: 260,
    top: '50%',
    marginTop: -130,
    left: 70,
  },
  evImg: {
    width: '100%',
    height: '100%',
  },
});

export default Temporada1;
