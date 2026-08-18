import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

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

// Repisa izquierda: temporadas + animalitos
export const LibrosRepisa = ({ onPressTemporadas, onPressAnimalitos }) => (
  <View style={{ position: 'absolute', bottom: 0, left: 18, zIndex: 3, flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
    <Libro onPress={onPressTemporadas} source={require('../assets/temporadas/libro/libro1.png')} />
    <Libro onPress={onPressAnimalitos} source={require('../assets/temporadas/libro/libro3.png')} opacity={0.82} />
  </View>
);

// Repisa derecha: juegos (libro2 — libro abierto, diferente al resto)
export const LibroJuegos = ({ onPress }) => (
  <View style={{ position: 'absolute', bottom: 18, right: 18, zIndex: 3, alignItems: 'flex-end' }}>
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{ shadowColor: '#604a32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 7, elevation: 9 }}>
      <LinearGradient colors={['#f8ebc9', '#e6c98e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 128, height: 58, borderRadius: 11, borderWidth: 1.5, borderColor: '#bd9256', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, overflow: 'hidden' }}>
        <View style={{ width: 39, height: 39, borderRadius: 12, backgroundColor: '#5f9aaa', borderWidth: 1, borderColor: '#e4f3e9', alignItems: 'center', justifyContent: 'center', shadowColor: '#3c6876', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 3 }}>
          <MaterialIcons name="sports-esports" size={22} color="#fff8dc" />
        </View>
        <View style={{ marginLeft: 9, justifyContent: 'center' }}>
          <Text style={{ color: '#65492f', fontFamily: 'Delius', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 }}>JUGAR</Text>
          <Text style={{ color: '#80613d', fontFamily: 'Delius', fontSize: 9, fontWeight: '800', marginTop: 1 }}>Conexiones · T1</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);
