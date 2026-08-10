import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import TabButtons from '../../components/TabButtons';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

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
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (snap.exists()) setHalconDesbloqueado(!!snap.data().halconDesbloqueado);
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
        <Image
          source={require('../../assets/temporadas/libro/Temporada1/Eventos/capsula1.png')}
          style={styles.capsulaImg}
          contentFit="contain"
          cachePolicy="memory"
        />
      </TouchableOpacity>
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
    bottom: '5%',
    right: '8%',
    width: 130,
    height: 130,
    zIndex: 10,
  },
  capsulaImg: { width: '100%', height: '100%' },

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
