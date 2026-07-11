import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';

const OFFSETS = {
  'TÚ\nPUEDES':      -3,
  'ERES\nLUZ':        3,
  'TODO\nPASA':      -2,
  'SÉ\nFELIZ':        2,
  'BRILLA\nSIEMPRE': -3,
  'CONFÍA\nEN TI':    3,
  'ERES\nSUFICIENTE': -2,
  'SIGUE\nADELANTE':  2,
  'HOY ES\nTU DÍA':  -3,
  'MERECES\nLO MEJOR': 3,
  'FLORECE\nSOLA':   -2,
  'RESPIRA\nPROFUNDO': 2,
};

const LONG_FRASES = new Set(['SIGUE\nADELANTE', 'ERES\nSUFICIENTE', 'MERECES\nLO MEJOR', 'RESPIRA\nPROFUNDO']);

const Frases = ({ containerStyle, frase, fraseColor, onPress }) => {
  const [fontsLoaded] = useFonts({ Delius: require('./fonts/Delius.ttf') });
  const offset = frase ? (OFFSETS[frase] ?? 0) : 0;
  const isLong = frase ? LONG_FRASES.has(frase) : false;
  return (
    <TouchableOpacity style={[styles.container, containerStyle]} onPress={onPress} activeOpacity={0.8}>
      <Image source={require('./assets/frases/frases1.png')} style={StyleSheet.absoluteFill} contentFit="contain" />
      {frase && fontsLoaded ? (
        <Text style={[styles.frase, { marginTop: offset }, isLong && { fontSize: 8.5 }, fraseColor && { color: fraseColor }]} numberOfLines={3}>{frase}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 115,
    height: 145,
    top: '50%',
    left: '13%',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.82,
  },
  frase: {
    width: '75%',
    textAlign: 'center',
    fontSize: 10,
    top: -3,
    left: 2,
    color: '#333',
    fontFamily: 'Delius',
  },
});

export default Frases;
