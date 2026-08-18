import React, { memo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, StatusBar } from 'react-native';
import RoomBackground from '../components/RoomBackground';
import TabButtons from '../components/TabButtons';
import { auth } from '../firebaseConfig';

const { height: H } = Dimensions.get('window');

const FILAS = [[
  { id: 'tortitas', emoji: '🥞', accent: '#f7971e', nivel: 3, temporada: 2, temporadaNombre: 'Dulces Sorpresas' },
  { id: 'conexiones', emoji: '🫶', accent: '#ff6f91', nivel: 1, temporada: 1, temporadaNombre: 'Amanecer Dorado' },
]];

const CARD_H = Math.floor((H * 0.78) / 3) - 8;
const CARD_W = Math.floor(CARD_H * 0.82);

const GameCard = ({ juego, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
    <View style={[styles.accentBar, { backgroundColor: juego.accent }]} />
    <View style={[styles.accentGlow, { backgroundColor: juego.accent }]} />

    <Text style={styles.cardEmoji}>{juego.emoji}</Text>
    <Text style={styles.cardName}>{juego.id.charAt(0).toUpperCase() + juego.id.slice(1)}</Text>
    <View style={styles.badgeRow}>
      <View style={[styles.badge, { borderColor: juego.accent + '55' }]}><Text style={[styles.badgeText, { color: juego.accent }]}>N·{juego.nivel}</Text></View>
      <View style={styles.seasonBadge}><Text style={styles.seasonBadgeText}>T{juego.temporada}</Text></View>
    </View>
  </TouchableOpacity>
);

const Juegos = memo(({ navigation }) => {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const isAdmin = auth.currentUser?.email?.toLowerCase() === 'admin@gmail.com';
    if (!isAdmin) navigation?.navigate('conexiones');
    setChecked(true);
  }, [navigation]);
  if (!checked || auth.currentUser?.email?.toLowerCase() !== 'admin@gmail.com') return null;
  return <View style={styles.container}>
    <StatusBar hidden />
    <RoomBackground />
    <TabButtons onExit={() => navigation?.navigate('main')} />

    <View style={styles.filas}>
      {FILAS.map((fila, i) => (
        <ScrollView
          key={i}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filaContent}
        >
          {fila.map(juego => (
            <GameCard
              key={juego.id}
              juego={juego}
              onPress={() => navigation?.navigate(juego.id)}
            />
          ))}
        </ScrollView>
      ))}
    </View>
  </View>;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filas: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 52,
    gap: 4,
  },
  filaContent: {
    paddingLeft: 120,
    paddingRight: 12,
    gap: 4,
    alignItems: 'center',
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 6,
    backgroundColor: 'rgba(10,6,18,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 12,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    opacity: 0.9,
  },
  accentGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: CARD_W * 0.45,
    opacity: 0.04,
  },
  cardEmoji: {
    fontSize: CARD_H * 0.25,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Delius',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  badgeRow: { position: 'absolute', bottom: -10, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10, elevation: 10 },
  seasonBadge: { borderWidth: 1, borderColor: 'rgba(255,231,168,0.48)', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(255,231,168,0.12)' },
  seasonBadgeText: { color: '#ffe7a8', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});

export default Juegos;
