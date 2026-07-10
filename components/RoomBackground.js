import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const RoomBackground = () => (
  <Image
    source={require('../assets/paredes/pared1.png')}
    style={StyleSheet.absoluteFill}
    contentFit="cover"
    contentPosition="center"
  />
);

export default RoomBackground;
