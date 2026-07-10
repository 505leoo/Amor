import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

const Player = ({ onSelectSticker, centered = false, showNameTag = true, containerStyle }) => {
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [playerName, setPlayerName] = useState('Aurora');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();

      if (data.selectedSticker) {
        setSelectedSticker(data.selectedSticker);
      } else if (data.currentStickerId || data.currentStickerUrl) {
        setSelectedSticker({
          id: data.currentStickerId || null,
          name: data.currentStickerName || null,
          imageUrl: data.currentStickerUrl || null,
        });
      } else {
        setSelectedSticker(null);
      }

      setPlayerName(data.datosCompletos?.nombre || data.nombre || 'Aurora');
    });

    return () => unsubscribe();
  }, []);

  const imageUri = selectedSticker?.imageUrl || selectedSticker?.url || selectedSticker?.image || selectedSticker?.image_url || null;

  return (
    <View style={[centered ? styles.containerCentered : styles.container, containerStyle]} pointerEvents="box-none">
      {imageUri ? (
        <TouchableOpacity style={styles.imageTouchable} onPress={onSelectSticker} activeOpacity={0.8}>
          <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
          {showNameTag && (
            <View style={styles.nameTag}>
              <Text style={styles.nameText}>{playerName}</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.imageTouchable} onPress={onSelectSticker} activeOpacity={0.8}>
          <Image source={require('./assets/player/cabeza1.png')} style={styles.image} contentFit="contain" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  containerCentered: {
    position: 'relative',
    alignSelf: 'center',
    width: 140,
    height: 160,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 10,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  addButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameTag: {
    position: 'absolute',
    top: -22,
    left: 27,
    backgroundColor: '#8080805b',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
  },
  nameText: {
    color: '#ffffffde',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Player;
