import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const Poster1 = ({ containerStyle }) => (
  <View style={[styles.container, containerStyle]} pointerEvents="none">
    <Image source={require('./assets/posters/poster1.png')} style={styles.image} contentFit="contain" />
  </View>
);

const styles = StyleSheet.create({
  container: { position: 'absolute' },
  image: { width: '100%', height: '100%' },
});

export default Poster1;
