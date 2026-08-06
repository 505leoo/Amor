import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';

export default function RecompensaOverlay({ visible, imagen, titulo, texto, monedas, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <LottieView
          source={require('../assets/Lottie/reward.json')}
          autoPlay loop
          style={s.lottie}
        />
        <Animated.View style={[s.carta, { transform: [{ scale: scaleAnim }] }]}>
          {imagen && (
            <Image source={imagen} style={s.img} contentFit="cover" cachePolicy="memory" />
          )}
          <View style={s.cartaBody}>
            {titulo ? <Text style={s.titulo}>{titulo}</Text> : null}
            {texto  ? <Text style={s.texto}>{texto}</Text>   : null}
            {monedas != null && (
              <View style={s.monedasRow}>
                <Text style={s.monedasEmoji}>🪙</Text>
                <Text style={s.monedasNum}>+{monedas}</Text>
              </View>
            )}
          </View>
        </Animated.View>
        <Text style={s.hint}>toca para continuar</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  lottie: {
    position: 'absolute',
    width: 420, height: 420,
  },
  carta: {
    backgroundColor: '#fcf7d0',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 14,
    minWidth: 200,
  },
  img: { width: 200, height: 160 },
  cartaBody: {
    paddingHorizontal: 24, paddingVertical: 18,
    alignItems: 'center', gap: 8,
  },
  titulo: {
    fontSize: 13, fontWeight: '800', color: '#5a2a3a',
    fontFamily: 'Omori', letterSpacing: 0.5, textAlign: 'center',
  },
  texto: {
    fontSize: 11, color: '#8a5a6a',
    fontFamily: 'Delius', textAlign: 'center', lineHeight: 16,
  },
  monedasRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4,
    backgroundColor: 'rgba(201,116,143,0.1)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(201,116,143,0.25)',
  },
  monedasEmoji: { fontSize: 18 },
  monedasNum: {
    fontSize: 16, fontWeight: '900', color: '#c9748f',
    fontFamily: 'Omori',
  },
  hint: {
    position: 'absolute', bottom: 24,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10, fontFamily: 'Delius', letterSpacing: 1,
  },
});
