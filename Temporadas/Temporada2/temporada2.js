import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import TabButtons from '../../components/TabButtons';
import Loading from '../../components/Loading';
import Eventos from '../../menus/Eventos';

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
    <TouchableOpacity style={styles.comercianteBtn} activeOpacity={0.75} onPress={() => navigation?.navigate?.('comerciante', { temporada: 't2' })}>
      <View style={styles.comercianteIcon}><MaterialIcons name="storefront" size={19} color="#f4fff0" /></View>
      <View style={styles.comercianteInfo}><Text style={styles.comercianteTitle}>COMERCIANTE</Text><Text style={styles.comercianteSub}>Intercambia objetos</Text></View>
      <MaterialIcons name="chevron-right" size={21} color="#466a50" />
    </TouchableOpacity>
    <Eventos navigation={navigation} temporada="t2" />
    <Loading ref={loadingRef} />
  </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  comercianteBtn: { position: 'absolute', bottom: '24%', left: 28, transform: [{ translateY: -37 }], width: 150, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 8, backgroundColor: '#dce9dc', borderWidth: 1, borderColor: '#a8c4a9', shadowColor: '#405744', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 7, elevation: 9, zIndex: 20 },
  comercianteIcon: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#6f9876', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eff9e9' },
  comercianteInfo: { flex: 1, marginLeft: 6 }, comercianteTitle: { color: '#3f6348', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' }, comercianteSub: { color: '#56745c', fontFamily: 'Delius', fontSize: 6, fontWeight: '700' },
});

export default Temporada2;
