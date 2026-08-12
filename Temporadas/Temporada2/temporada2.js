import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import TabButtons from '../../components/TabButtons';
import Loading from '../../components/Loading';

const Temporada2 = ({ navigation }) => {
  const loadingRef = useRef(null);
  useEffect(() => { loadingRef.current?.fadeOut(); }, []);
  return (
  <View style={styles.container}>
    <StatusBar hidden />
    <Image
      source={require('../../assets/temporadas/libro/Temporada2/fondo2.png')}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
      contentFit="cover"
      cachePolicy="memory"
    />
    <TabButtons onExit={() => navigation?.navigate?.('temporadas')} customAddButton={<View />} />
    <TouchableOpacity style={styles.kittyBtn} activeOpacity={0.85} onPress={() => navigation?.navigate?.('kitty')}>
      <Image
        source={require('../../assets/temporadas/libro/Temporada2/kitty2.png')}
        style={styles.kitty}
        contentFit="contain"
        cachePolicy="memory"
      />
    </TouchableOpacity>
    <Loading ref={loadingRef} />
  </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  kittyBtn: {
    position: 'absolute',
    bottom: '68%',
    right: '2%',
  },
  kitty: { width: 120, height: 120 },
});

export default Temporada2;
