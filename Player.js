import React, { useState, useEffect, memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

const ANIMALITOS = {
  halcon: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
};
const SKINS = {
  default: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
  halcont1: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont1.png'),
  halcont2: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont2.png'),
};

export const SinAnimal = memo(() => (
  <View style={styles.sinAnimalWrap}>
    <Text style={styles.sinAnimalEmoji}>🐾</Text>
    <Text style={styles.sinAnimalText}>ANIMAL{'\n'}SIN EQUIPAR</Text>
  </View>
));

const PlayerContent = ({ animalito, skin, loading, imageStyle, placeholder }) => {
  const source = animalito ? (SKINS[skin || 'default'] ?? SKINS.default ?? ANIMALITOS[animalito] ?? null) : null;

  return (
    <>
      {loading ? null : source ? (
        <Image
          source={source}
          style={[styles.image, imageStyle]}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : (
        placeholder ?? null
      )}
    </>
  );
};

const Player = memo(({ containerStyle, imageStyle, uid: uidProp, placeholder, disabled }) => {
  const [animalito, setAnimalito] = useState(null);
  const [skin, setSkin] = useState('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si está deshabilitado, no escuchar cambios
    if (disabled) {
      setLoading(false);
      return;
    }

    const uid = uidProp ?? auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setAnimalito(data.animalito ?? null);
        setSkin(data.skin ?? 'default');
      }
      setLoading(false);
    });
    return unsub;
  }, [uidProp, disabled]);

  return (
    <View style={[styles.container, containerStyle]} pointerEvents="box-none">
      <PlayerContent animalito={animalito} skin={skin} loading={loading} imageStyle={imageStyle} placeholder={placeholder} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: 'absolute', zIndex: 1 },
  image: { width: '100%', height: '100%', top: '10%', left: '43%' },
  sinAnimalWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  sinAnimalEmoji: {
    fontSize: 18,
    opacity: 0.5,
  },
  sinAnimalText: {
    fontSize: 7,
    fontWeight: '800',
    color: 'rgba(90,42,58,0.4)',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 10,
  },
});

export default Player;
