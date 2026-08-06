import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const RoomBackground = () => (
  <Image
    source={require('../assets/temporadas/neutral.png')}
    style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
    contentFit="cover"
    contentPosition="center"
    cachePolicy="memory-disk"
  />
);

export default RoomBackground;
