import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import TabButtons from '../../components/TabButtons';
import Loading from '../../components/Loading';

export default function Kitty({ navigation }) {
  const loadingRef = useRef(null);
  useEffect(() => { loadingRef.current?.fadeOut(); }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image
        source={require('../../assets/temporadas/libro/Temporada2/fondo2.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory"
      />
      <TabButtons onExit={() => navigation?.navigate?.('temporada2')} customAddButton={<View />} />
      <Loading ref={loadingRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
