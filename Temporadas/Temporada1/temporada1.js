import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import RoomBackground from '../../components/RoomBackground';
import Guirladas from '../../components/Guirladas';
import Player from '../../Player';
import Poster1 from '../../Poster1';

const Temporada1 = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RoomBackground />
      <Guirladas />
      <Poster1 />
      <Player />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default Temporada1;
