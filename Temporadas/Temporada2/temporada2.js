import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Rect, Line, G } from 'react-native-svg';
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
    <TouchableOpacity style={styles.paletaBtn} activeOpacity={0.85} onPress={() => navigation?.navigate?.('paleta')}>
      <Svg width={84} height={84} viewBox="0 0 64 64" style={styles.paletaSvg}>
        <G>
          <Circle cx="32" cy="26" r="18" fill="#ff9bb3" />
          <Circle cx="24" cy="20" r="6" fill="#ffd1a8" opacity="0.5" />
          <Line x1="32" y1="44" x2="32" y2="60" stroke="#7a5" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
          <Rect x="28" y="52" width="8" height="6" rx="2" fill="#ffd1a8" opacity="0.9" />
        </G>
      </Svg>
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
  paletaBtn: {
    position: 'absolute',
    bottom: '54%',
    left: '6%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletaSvg: { width: 84, height: 84 },
});

export default Temporada2;
