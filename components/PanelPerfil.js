import React, { useEffect, useState, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Defs, LinearGradient, Stop, G, Text as SvgText, Ellipse } from 'react-native-svg';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const ANIMALITOS = {
  halcon: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
};

export default memo(function PanelPerfil({ navigation }) {
  const [nombre, setNombre] = useState(auth.currentUser?.displayName || 'amigo');
  const [animalito, setAnimalito] = useState('halcon');
  const [avatarUri, setAvatarUri] = useState(null);
  const [nivel, setNivel] = useState(1);
  const [exp, setExp] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (!snap.exists()) return;
      const d = snap.data() || {};
      setNombre(d.datosCompletos?.nombre || d.nombre || auth.currentUser?.displayName || 'amigo');
      setAnimalito(d.animalito ?? 'halcon');
      setAvatarUri(d.iconoUrl || d.photoURL || null);
      const currentExp = typeof d.exp === 'number' ? d.exp : 0;
      setExp(currentExp);
      setNivel(1 + Math.floor(currentExp / 125));
    }, () => {});
  }, []);

  return (
    <TouchableOpacity style={styles.wrap} onPress={() => navigation?.navigate('perfil')} activeOpacity={0.8}>
      <View style={styles.avatarBox}>
        <Image source={avatarUri ? { uri: avatarUri } : (ANIMALITOS[animalito] ?? ANIMALITOS.halcon)} style={styles.avatar} contentFit="contain" cachePolicy="memory-disk" />
      </View>
      <View style={styles.greetingBox}>
        <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>
        <View style={styles.profileLevelBar}>
          <View style={styles.profileHeartWrap}>
            <Svg width="22" height="20" viewBox="0 0 36 30">
              <Defs><LinearGradient id="perfilHeartReal" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#ff5a8f" /><Stop offset="50%" stopColor="#ff6b9d" /><Stop offset="100%" stopColor="#d9577f" /></LinearGradient></Defs>
              <G><Path d="M 18 30 C 8 22 2 15 2 10 C 2 5 5 2 9 2 C 12 2 14.5 3.5 18 7 C 21.5 3.5 24 2 27 2 C 31 2 34 5 34 10 C 34 15 28 22 18 30 Z" fill="url(#perfilHeartReal)" /><Path d="M 9 4 Q 11 2 13 5 Q 11.5 1 9 2 C 5 2 3 4.5 3 8" fill="#ffffff" opacity="0.5" /><Ellipse cx="11" cy="7" rx="3" ry="3.5" fill="#ffffff" opacity="0.35" /><SvgText x="18" y="20" fontSize="14" fontWeight="bold" fill="#ffffff" textAnchor="middle" dominantBaseline="middle">{String(nivel)}</SvgText></G>
            </Svg>
          </View>
          <View style={styles.profileLevelTrack}><View style={[styles.profileLevelFill, { width: `${Math.round((exp % 125) / 125 * 100)}%` }]} /></View>
        </View>
      </View>
      <Text style={styles.profileArrow}>›</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1e1bd',
    width: 205,
    borderRadius: 9,
    paddingLeft: 4, paddingRight: 12, paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#d0ad70',
    shadowColor: '#5f4428', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  avatarBox: {
    width: 38, height: 38, borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#fff7e6', borderWidth: 1, borderColor: '#d5b475',
  },
  avatar: { width: '100%', height: '100%' },
  greetingBox: { marginLeft: 8, maxWidth: 132, flex: 1 },
  nombre: {
    fontFamily: 'Delius', fontSize: 12, lineHeight: 14, fontWeight: '900',
    color: '#594329', letterSpacing: 0.1,
  },
  profileLevelBar: { alignSelf: 'flex-start', width: 104, height: 17, marginTop: 2, flexDirection: 'row', alignItems: 'center' },
  profileHeartWrap: { width: 22, height: 20, alignItems: 'center', justifyContent: 'center', marginRight: 0, zIndex: 2, elevation: 2 },
  profileLevelTrack: { width: 70, height: 7, marginLeft: -10, borderRadius: 4, overflow: 'hidden', backgroundColor: '#dcd0bb', borderWidth: 1, borderColor: '#c9b8a0', transform: [{ translateY: 2 }] },
  profileLevelFill: { height: '100%', borderRadius: 4, backgroundColor: '#df477e' },
  profileArrow: { color: '#795a37', fontFamily: 'Delius', fontSize: 28, lineHeight: 30, fontWeight: '700', marginLeft: 6, marginTop: -2 },
});
