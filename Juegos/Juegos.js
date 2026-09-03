import React, { memo, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RoomBackground from '../components/RoomBackground';
import TabButtons from '../components/TabButtons';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const CONEXIONES_SEASON = 'TEMPORADA 1';
const DULCES_SEASON = 'TEMPORADA 2';

const Juegos = memo(({ navigation }) => {
  const [checked, setChecked] = useState(false);
  const [conexionesLevel, setConexionesLevel] = useState(1);

  useEffect(() => {
    setChecked(true);
  }, [navigation]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid), snapshot => {
      setConexionesLevel(Math.max(1, snapshot.data()?.juegos?.conexiones?.nivel || 1));
    }, () => {});
  }, []);

  if (!checked) return null;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <RoomBackground />
      </View>
      <TabButtons onExit={() => navigation?.navigate('main')} />

      <View style={styles.content}>
        <Text style={styles.kicker}>JUEGOS DE AMOR · VIOLETA</Text>

        <View style={styles.cardsRow}>
          <TouchableOpacity style={styles.card} activeOpacity={0.84} onPress={() => navigation?.navigate('conexiones')}>
          <View style={styles.glow} />
          <Text style={styles.heart}>♾</Text>
          <Text style={styles.cardTitle}>Hilito</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}><Text style={styles.metaText}>🎮 NIVEL {conexionesLevel}</Text></View>
            <View style={[styles.metaBadge, styles.seasonBadge]}><Text style={styles.metaText}>🌸 {CONEXIONES_SEASON}</Text></View>
          </View>
          <Text style={styles.cardDescription}>Uní los pares, llená la grilla y cuidá tu luz.</Text>
          <View style={styles.playBadge}>
            <Text style={styles.playText}>JUGAR</Text>
          </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, styles.dulcesCard]} activeOpacity={0.84} onPress={() => navigation?.navigate('dulces')}>
          <View style={styles.dulcesGlow} />
          <Text style={styles.candy}>🍭</Text>
          <Text style={styles.cardTitle}>Lluvia de Dulces</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, styles.dulcesBadge]}><Text style={styles.metaText}>🍬 T2</Text></View>
            <View style={[styles.metaBadge, styles.seasonBadge]}><Text style={styles.metaText}>✨ {DULCES_SEASON}</Text></View>
          </View>
          <Text style={styles.cardDescription}>Atrapá las golosinas, encadená aciertos y llená tu frasco de dulzura.</Text>
          <View style={[styles.playBadge, styles.dulcesPlayBadge]}><Text style={styles.playText}>JUGAR</Text></View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 10,
    elevation: 10,
  },
  kicker: { color: '#ffb7d1', fontSize: 10, fontWeight: '800', letterSpacing: 2.4, marginBottom: 8 },
  cardsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    position: 'relative',
    zIndex: 11,
    elevation: 11,
  },
  card: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(48,31,95,0.90)',
    borderColor: 'rgba(215,200,255,0.48)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 7,
    minHeight: 140,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
    zIndex: 12,
    elevation: 12,
    width: 228,
  },
  dulcesCard: { marginTop: 7, backgroundColor: 'rgba(101,39,116,0.92)', borderColor: 'rgba(255,215,143,0.58)' },
  glow: { backgroundColor: '#9b82ff', borderRadius: 100, height: 110, opacity: 0.22, position: 'absolute', top: -55, width: 110 },
  dulcesGlow: { backgroundColor: '#ff93c8', borderRadius: 100, height: 125, opacity: 0.23, position: 'absolute', top: -65, width: 125 },
  heart: { color: '#b8a8ff', fontSize: 31, lineHeight: 35, textShadowColor: 'rgba(155,130,255,0.65)', textShadowRadius: 12 },
  candy: { fontSize: 31, lineHeight: 35, textShadowColor: 'rgba(255,154,205,0.7)', textShadowRadius: 12 },
  cardTitle: { color: '#fff4f9', fontFamily: 'Delius', fontSize: 17, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 4, marginTop: 5 },
  metaBadge: { backgroundColor: 'rgba(255,190,218,0.15)', borderColor: 'rgba(255,207,228,0.34)', borderRadius: 8, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 3 },
  seasonBadge: { backgroundColor: 'rgba(167,231,205,0.14)', borderColor: 'rgba(187,244,218,0.34)' },
  dulcesBadge: { backgroundColor: 'rgba(255,191,220,0.2)', borderColor: 'rgba(255,224,238,0.46)' },
  metaText: { color: '#fff0f7', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.35 },
  cardDescription: { color: 'rgba(255,240,247,0.72)', fontFamily: 'Delius', fontSize: 8.5, lineHeight: 12, marginTop: 6, textAlign: 'center' },
  playBadge: { backgroundColor: '#8064ee', borderRadius: 9, marginTop: 8, paddingHorizontal: 13, paddingVertical: 6 },
  dulcesPlayBadge: { backgroundColor: '#e35d9c' },
  playText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
});

export default Juegos;
