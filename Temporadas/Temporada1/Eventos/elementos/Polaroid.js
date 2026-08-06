import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../../firebaseConfig';

export default function Polaroid({ fotoUrl, capsulaId, uid, onGuardado }) {
  const [subiendo, setSubiendo] = useState(false);

  const elegirFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      global.showToast?.({ message: 'Se necesita permiso para acceder a las fotos', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled) return;
    subirFoto(result.assets[0].uri);
  };

  const subirFoto = async (uri) => {
    try {
      setSubiendo(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `capsulas/${capsulaId}/${uid}/polaroid.${ext}`);
      const task = uploadBytesResumable(storageRef, blob);
      task.on('state_changed', null, (err) => {
        console.error('Error subiendo foto:', err);
        setSubiendo(false);
      }, async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onGuardado?.('fotos', { url });
        setSubiendo(false);
      });
    } catch (e) {
      console.error('Error en Polaroid:', e);
      setSubiendo(false);
    }
  };

  return (
    <TouchableOpacity style={styles.polaroid} onPress={elegirFoto} activeOpacity={0.85} disabled={subiendo}>
      <View style={styles.fotoWrap}>
        {subiendo ? (
          <ActivityIndicator color="#888" />
        ) : fotoUrl ? (
          <Image source={{ uri: fotoUrl }} style={styles.foto} contentFit="cover" cachePolicy="memory" />
        ) : (
          <View style={styles.fotoVacia}>
            <Text style={styles.fotoVaciaIcono}>📷</Text>
            <Text style={styles.fotoVaciaTexto}>Toca para{'\n'}agregar foto</Text>
          </View>
        )}
      </View>
      <View style={styles.pieWrap}>
        <Text style={styles.pie}>~ mi foto ~</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  polaroid: {
    backgroundColor: '#fefefe',
    padding: 8,
    paddingBottom: 28,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ rotate: '-2deg' }],
  },
  fotoWrap: {
    width: 120,
    height: 130,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  foto: { width: '100%', height: '100%' },
  fotoVacia: { alignItems: 'center', gap: 6 },
  fotoVaciaIcono: { fontSize: 28 },
  fotoVaciaTexto: { fontSize: 9, color: '#aaa', textAlign: 'center', fontFamily: 'Delius' },
  pieWrap: { position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center' },
  pie: { fontSize: 10, color: '#999', fontFamily: 'Delius' },
});
