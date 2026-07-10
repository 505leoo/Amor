import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import TabButtons from '../components/TabButtons';
import Player from '../Player';
import PlayerRemera from '../PlayerRemera';
import PlayerManoI from '../PlayerManoI';
import PlayerManoD from '../PlayerManoD';

const Vestuario = ({ navigation }) => (
  <View style={styles.container}>
    <StatusBar hidden={true} />
    <Image source={require('../assets/paredes/vestuario1.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
    <PlayerManoI containerStyle={styles.manoI} />
    <PlayerManoD containerStyle={styles.manoD} />
    <PlayerRemera containerStyle={styles.remera} />
    <Player
      containerStyle={styles.cabeza}
      showNameTag={false}
      onSelectSticker={() => {}}
    />
    <TabButtons onExit={() => navigation.navigate('main')} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  cabeza: {
    position: 'absolute',
    left: 487,
    bottom: 65,
    width: 160,
    height: 300,
    zIndex: 3,
  },
  manoI: {
    position: 'absolute',
    left: 480,
    bottom: 20,
    width: 120,
    height: 300,
    zIndex: 1,
  },
  manoD: {
    position: 'absolute',
    left: 534,
    bottom: 20,
    width: 120,
    height: 300,
    zIndex: 1,
  },
  remera: {
    position: 'absolute',
    left: 510.9,
    bottom: 97,
    width: 113,
    height: 180,
    zIndex: 1,
    opacity: 2,
  },
});

export default Vestuario;
