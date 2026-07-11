import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import TabButtons from '../components/TabButtons';
import Player from '../Player';
import PlayerRemera from '../PlayerRemera';
import PlayerManos from '../PlayerManos';

const Vestuario = ({ navigation }) => (
  <View style={styles.container}>
    <StatusBar hidden={true} />
    <Image source={require('../assets/paredes/vestuario1.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
    <Player
      containerStyle={styles.cabeza}
      showNameTag={false}
      onSelectSticker={() => {}}
    />
    <PlayerManos containerStyle={styles.manos} />
    <PlayerRemera containerStyle={styles.remera} />
    <TabButtons onExit={() => navigation.navigate('main')} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  cabeza: {
    position: 'absolute',
    left: 443,
    bottom: 55,
    width: 240,
    height: 300,
    zIndex: 2,
  },
  manos: {
    position: 'absolute',
    left: 487,
    bottom: 20,
    width: 160,
    height: 300,
    zIndex: 1,
  },
  remera: {
    position: 'absolute',
    left: 475,
    bottom: 67,
    width: 183,
    height: 180,
    zIndex: 1,
    opacity: 3,
  },
});

export default Vestuario;
