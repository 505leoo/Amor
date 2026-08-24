import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMusicPlayer } from '../MusicContext';

const formatTime = seconds => {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}`;
};

const MusicPlayer = ({ onClose }) => {
  const { status, isPlaying, toggle, trackName } = useMusicPlayer();
  const duration = Math.max(0, Number(status?.duration) || 0);
  const position = Math.max(0, Number(status?.currentTime) || 0);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return <View style={styles.container}>
    <View style={styles.note}><MaterialIcons name="music-note" size={17} color="#fff8df" /></View>
    <View style={styles.info}>
      <Text style={styles.title}>{trackName}</Text>
      <View style={styles.progressBar}><View style={[styles.progress, { width: `${progress * 100}%` }]} /></View>
      <Text style={styles.time}>{formatTime(position)} · en bucle</Text>
    </View>
    <TouchableOpacity style={styles.playButton} onPress={toggle} activeOpacity={0.78} accessibilityLabel={isPlaying ? 'Pausar música' : 'Reproducir música'}>
      <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={18} color="#fff8df" />
    </TouchableOpacity>
    {onClose && <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={6}><MaterialIcons name="close" size={14} color="#76552f" /></TouchableOpacity>}
  </View>;
};

const styles = StyleSheet.create({
  container: { width: 210, height: 49, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 8 },
  note: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#a96f45', borderWidth: 1, borderColor: '#875333' },
  info: { flex: 1, marginHorizontal: 7 }, title: { color: '#76552f', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  progressBar: { height: 3, marginTop: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(118,85,47,0.18)' }, progress: { height: '100%', borderRadius: 2, backgroundColor: '#c58b49' },
  time: { marginTop: 2, color: '#9b7952', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '700' },
  playButton: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8b5f3d' },
  close: { position: 'absolute', top: -7, right: -7, width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5dc', borderWidth: 1, borderColor: '#d0ad70' },
});

export default MusicPlayer;
