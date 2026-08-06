import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

const ANIMALITOS = {
  halcon: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
};

const Player = ({ containerStyle }) => {
  const [animalito, setAnimalito] = useState('halcon');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (snap.exists()) setAnimalito(snap.data().animalito ?? 'halcon');
    });
    return unsub;
  }, []);

  return (
    <View style={[styles.container, containerStyle]} pointerEvents="box-none">
      <Image
        source={ANIMALITOS[animalito] ?? ANIMALITOS.halcon}
        style={styles.image}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', zIndex: 1 },
  image: { width: '100%', height: '100%', top: '10%', left: '43%' },
});

export default Player;
