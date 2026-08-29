import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useMusicPlayer } from '../MusicContext';

const CONFETTI_COLORS = ['#f29bb2', '#f7c96b', '#a7d8c5', '#d6a8e8', '#f7a77e', '#9fd4ee'];
const CONFETTI = Array.from({ length: 58 }, (_, index) => ({
  left: `${3 + ((index * 29) % 94)}%`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  size: 6 + (index % 6),
  delay: (index * 53) % 600,
  duration: 1850 + ((index * 137) % 500),
  drift: index % 2 === 0 ? 1 : -1,
}));
const CONFETTI_HEIGHT = Dimensions.get('window').height + 60;
const REWARD_SOUND = require('../assets/sounds/reward.mp3');
const pausarSeguro = player => {
  try {
    const resultado = player?.pause?.();
    resultado?.catch?.(() => {});
  } catch (_) {
    // Expo puede liberar el reproductor antes de ejecutar el cleanup.
  }
};

export default function RecompensaOverlay({ visible, onClose, children, imagen, texto, encabezado = "¡TE TOCÓ!", mensaje = "La recompensa ya está guardada en tu cuenta." }) {
  const { player: musicPlayer } = useMusicPlayer();
  const rewardPlayer = useAudioPlayer(REWARD_SOUND, { downloadFirst: true, updateInterval: 100 });
  const rewardStatus = useAudioPlayerStatus(rewardPlayer);
  const volumenAnterior = useRef(null);
  const sonidoIniciado = useRef(false);
  const confettiAnimationsRef = useRef([]);
  if (confettiAnimationsRef.current.length !== CONFETTI.length) {
    confettiAnimationsRef.current = CONFETTI.map(() => new Animated.Value(0));
  }
  const confettiAnimations = confettiAnimationsRef.current;
  const entrada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !rewardStatus.isLoaded) return undefined;
    let cancelado = false;
    const reproducirRecompensa = async () => {
      try {
        if (volumenAnterior.current == null) volumenAnterior.current = musicPlayer.volume ?? 0.22;
        musicPlayer.volume = volumenAnterior.current * 0.3;
        await rewardPlayer.seekTo(0);
        if (!cancelado) {
          await rewardPlayer.play();
          sonidoIniciado.current = true;
        }
      } catch (error) {
        musicPlayer.volume = volumenAnterior.current ?? musicPlayer.volume;
        volumenAnterior.current = null;
      }
    };
    reproducirRecompensa();
    return () => {
      cancelado = true;
      pausarSeguro(rewardPlayer);
      if (volumenAnterior.current != null) {
        musicPlayer.volume = volumenAnterior.current;
        volumenAnterior.current = null;
      }
      sonidoIniciado.current = false;
    };
  }, [visible, rewardStatus.isLoaded, rewardPlayer, musicPlayer]);

  useEffect(() => {
    if (!visible || !sonidoIniciado.current || rewardStatus.playing) return;
    musicPlayer.volume = volumenAnterior.current ?? musicPlayer.volume;
    volumenAnterior.current = null;
    sonidoIniciado.current = false;
  }, [visible, rewardStatus.playing, musicPlayer]);

  useEffect(() => () => {
    pausarSeguro(rewardPlayer);
    if (volumenAnterior.current != null) musicPlayer.volume = volumenAnterior.current;
  }, [musicPlayer, rewardPlayer]);

  useEffect(() => {
    if (!visible) return undefined;
    entrada.setValue(0);
    Animated.spring(entrada, { toValue: 1, friction: 8, tension: 55, useNativeDriver: false }).start();
    const animations = confettiAnimations.map((value, index) => {
      value.setValue(0);
      return Animated.sequence([
        Animated.delay(CONFETTI[index].delay),
        Animated.timing(value, { toValue: 1, duration: CONFETTI[index].duration, useNativeDriver: false }),
      ]);
    });
    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [visible, confettiAnimations]);

  const contenido = imagen || texto ? (
    <>
      {imagen && <Image source={imagen} style={styles.image} contentFit="contain" />}
      {texto && <Text style={styles.title}>{texto}</Text>}
    </>
  ) : children;

  return (
    <Modal visible={Boolean(visible)} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View pointerEvents="none" style={styles.confettiLayer}>
          {CONFETTI.map((piece, index) => (
            <Animated.View
              key={`${piece.left}-${index}`}
              style={[styles.confetti, { left: piece.left, width: piece.size + 2, height: piece.size * (index % 3 === 0 ? 1.25 : 2.1), backgroundColor: piece.color, borderRadius: index % 3 === 0 ? 8 : 3 }, {
                opacity: confettiAnimations[index].interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: confettiAnimations[index].interpolate({ inputRange: [0, 0.2, 0.45, 0.7, 1], outputRange: [0, 12 * piece.drift, -10 * piece.drift, 15 * piece.drift, 0] }) },
                  { rotate: confettiAnimations[index].interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: ['0deg', `${120 * piece.drift}deg`, `${-260 * piece.drift}deg`, `${540 * piece.drift}deg`] }) },
                ],
                top: confettiAnimations[index].interpolate({ inputRange: [0, 1], outputRange: [-20, CONFETTI_HEIGHT] }),
              }]}
            />
          ))}
        </View>
        <Animated.View style={[styles.card, {
          opacity: entrada,
          transform: [{ scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
        }]}>
          <Text style={styles.eyebrow}>{encabezado}</Text>
          <View style={styles.artwork}>
            <Animated.View style={[styles.content, { opacity: entrada }]}>{contenido}</Animated.View>
          </View>
          <Text style={styles.message}>{mensaje}</Text>
          <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onClose}>
            <Text style={styles.buttonText}>CONTINUAR</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(54,29,12,0.66)' },
  confettiLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', zIndex: 1, elevation: 1 },
  confetti: { position: 'absolute', top: -4, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  card: { width: 248, minHeight: 215, padding: 18, alignItems: 'center', borderRadius: 22, backgroundColor: '#fff3c7', borderWidth: 2, borderColor: '#d58a2d', elevation: 20, zIndex: 10 },
  eyebrow: { color: '#bb7426', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  artwork: { width: '100%', minHeight: 102, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', minHeight: 102, alignItems: 'center', justifyContent: 'center' },
  image: { width: 112, height: 102 },
  title: { color: '#683714', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  message: { marginTop: 3, color: '#96602b', fontSize: 7.5, fontWeight: '700', textAlign: 'center' },
  button: { marginTop: 12, height: 31, minWidth: 125, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c77b27', borderWidth: 1, borderColor: '#8f501b' },
  buttonText: { color: '#fff9df', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
