import React from 'react';
import { StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const RoomBackground = () => (
  <ExpoImage
    source={require('../assets/temporadas/neutral.png')}
    style={StyleSheet.absoluteFill}
    contentFit="cover"
    cachePolicy="memory-disk"
  />
);

export default RoomBackground;
