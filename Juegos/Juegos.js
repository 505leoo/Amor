import React, { memo, useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RoomBackground from '../components/RoomBackground';
import TabButtons from '../components/TabButtons';
import { auth } from '../firebaseConfig';
import ConnectAmor from './ConnectAmor';

const Juegos = memo(({ navigation }) => {
  const [checked, setChecked] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const isAdmin = auth.currentUser?.email?.toLowerCase() === 'admin@gmail.com';
    if (!isAdmin) navigation?.navigate('conexiones');
    setChecked(true);
  }, [navigation]);

  const openGame = useCallback(() => setPlaying(true), []);
  const closeGame = useCallback(() => setPlaying(false), []);

  if (!checked || auth.currentUser?.email?.toLowerCase() !== 'admin@gmail.com') return null;
  if (playing) return <ConnectAmor onExit={closeGame} />;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RoomBackground />
      <TabButtons onExit={() => navigation?.navigate('main')} />

      <View style={styles.content}>
        <Text style={styles.kicker}>JUEGOS DE AMOR</Text>
        <Text style={styles.title}>Un pequeño mundo{`\n`}para compartir</Text>

        <TouchableOpacity style={styles.card} activeOpacity={0.84} onPress={openGame}>
          <View style={styles.glow} />
          <Text style={styles.heart}>♥</Text>
          <Text style={styles.cardTitle}>Conecta Amor</Text>
          <Text style={styles.cardDescription}>Uní las gemas que se buscan antes de que la luz se apague.</Text>
          <View style={styles.playBadge}>
            <Text style={styles.playText}>JUGAR</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.note}>Más minijuegos llegarán a este rincón.</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingLeft: 120, paddingRight: 28 },
  kicker: { color: '#ffb7d1', fontSize: 10, fontWeight: '800', letterSpacing: 2.4 },
  title: { color: '#fff3df', fontFamily: 'Delius', fontSize: 27, lineHeight: 34, marginTop: 7 },
  card: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(32,18,52,0.86)',
    borderColor: 'rgba(255,173,210,0.36)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 20,
    minHeight: 230,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingVertical: 27,
    width: 245,
  },
  glow: { backgroundColor: '#ff73aa', borderRadius: 100, height: 155, opacity: 0.13, position: 'absolute', top: -72, width: 155 },
  heart: { color: '#ff8fbd', fontSize: 58, textShadowColor: 'rgba(255,143,189,0.55)', textShadowRadius: 16 },
  cardTitle: { color: '#fff4f9', fontFamily: 'Delius', fontSize: 20, marginTop: 4 },
  cardDescription: { color: 'rgba(255,240,247,0.68)', fontFamily: 'Delius', fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: 'center' },
  playBadge: { backgroundColor: '#ed6b9e', borderRadius: 12, marginTop: 19, paddingHorizontal: 17, paddingVertical: 8 },
  playText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  note: { color: 'rgba(255,255,255,0.42)', fontFamily: 'Delius', fontSize: 10, marginTop: 16 },
});

export default Juegos;
