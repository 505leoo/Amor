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
    left: 450,
    bottom: 100,
    width: 250,
    height: 250,
    zIndex: 1,
  },
  manos: {
    position: 'absolute',
    left: 490,
    bottom: -10,
    width: 160,
    height: 300,
    zIndex: 1,
  },
  remera: {
    position: 'absolute',
    left: 471,
    bottom: 65,
    width: 200,
    height: 180,
    zIndex: 1,
    opacity: 0.7,
  },
});

export default Vestuario;
