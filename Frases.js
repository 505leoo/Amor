import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';

const Frases = ({ containerStyle, frase, onPress }) => {
  const [fontsLoaded] = useFonts({ Delius: require('./fonts/Delius.ttf') });
  return (
    <TouchableOpacity style={[styles.container, containerStyle]} onPress={onPress} activeOpacity={0.8}>
      <Image source={require('./assets/frases/frases1.png')} style={styles.image} contentFit="contain" />
      {frase && fontsLoaded ? (
        <Text style={styles.frase} numberOfLines={3}>{frase}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute' },
  image: { width: '100%', height: '100%' },
  frase: {
    position: 'absolute',
    width: '80%',
    textAlign: 'center',
    alignSelf: 'center',
    top: '30%',
    fontSize: 9,
    color: '#333',
    fontFamily: 'Delius',
  },
});

export default Frases;
