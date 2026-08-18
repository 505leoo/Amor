import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import RoomBackground from './components/RoomBackground';
import TabButtons from './components/TabButtons';

export default function Comerciante({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RoomBackground />
      <TabButtons onExit={() => navigation?.navigate?.('main')} customAddButton={<View />} />
      <View style={styles.card}>
        <Text style={styles.icon}>🛒</Text>
        <Text style={styles.title}>COMERCIANTE</Text>
        <Text style={styles.subtitle}>Intercambia y consigue objetos</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { width: 290, paddingVertical: 24, alignItems: 'center', backgroundColor: '#f1dfaa', borderWidth: 2, borderColor: '#c79635', borderRadius: 14, shadowColor: '#6d4b1b', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  icon: { fontSize: 34, marginBottom: 4 },
  title: { color: '#a56b16', fontFamily: 'Delius', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { color: '#88642b', fontFamily: 'Delius', fontSize: 11, marginTop: 4 },
});
