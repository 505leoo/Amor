import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const ANIMALITOS = {
  halcon: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
};

export default function PanelPerfil({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [animalito, setAnimalito] = useState('halcon');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setNombre(d.datosCompletos?.nombre || d.nombre || '');
      setAnimalito(d.animalito ?? 'halcon');
    });
    return unsub;
  }, []);

  return (
    <TouchableOpacity style={styles.wrap} onPress={() => navigation?.navigate('perfil')} activeOpacity={0.8}>
      <View style={styles.avatarBox}>
        <Image
          source={ANIMALITOS[animalito] ?? ANIMALITOS.halcon}
          style={styles.avatar}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </View>
      {!!nombre && <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatar: { width: '100%', height: '100%' },
  nombre: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    maxWidth: 60,
    textAlign: 'center',
  },
});
