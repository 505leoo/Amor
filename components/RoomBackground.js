import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const RoomBackground = () => (
  <Image
    source={require('../assets/paredes/pared1.png')}
    style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
    contentFit="cover"
    contentPosition="center"
    cachePolicy="memory"
  />
);

export default RoomBackground;
