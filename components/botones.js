import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const BOOK_SIZE = 88;
const SHELF_H = 14;
const SHELF_W = 58;
const SHELF = { height: SHELF_H, width: SHELF_W, borderRadius: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 5, elevation: 8 };

const Libro = ({ onPress, opacity, source }) => (
  <View style={{ width: SHELF_W, height: SHELF_H + 60, justifyContent: 'flex-end' }}>
    <LinearGradient colors={['#7a8490', '#4e565e']} style={SHELF} />
    <TouchableOpacity onPress={onPress} style={{ position: 'absolute', bottom: SHELF_H - 36, alignSelf: 'center' }}>
      <Image
        source={source}
        style={{ width: BOOK_SIZE, height: BOOK_SIZE, opacity: opacity ?? 1 }}
        contentFit="contain"
        cachePolicy="memory"
      />
    </TouchableOpacity>
  </View>
);

export const LibrosRepisa = ({ onPressTemporadas, onPressAnimalitos }) => (
  <View style={{ position: 'absolute', bottom: 0, left: 18, zIndex: 3, flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
    <Libro onPress={onPressTemporadas} source={require('../assets/temporadas/libro/libro1.png')} />
    <Libro onPress={onPressAnimalitos} source={require('../assets/temporadas/libro/libro3.png')} opacity={0.82} />
  </View>
);
