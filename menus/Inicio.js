import React, { useEffect, useCallback, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { Image } from 'expo-image';
import Eventos from './Eventos';
import Botones from './Botones';
import BotonesDerecha from './BotonesDerecha';
import Hud from './Hud';
import Hud2 from './Hud2';
import PlayerRemera from '../PlayerRemera';
import PlayerManos from '../PlayerManos';
import Poster1 from '../Poster1';
import Frases from '../Frases';
import Mensajes from './Mensajes';
import RoomBackground from '../components/RoomBackground';
import Guirladas from '../components/Guirladas';
const FloatingBook = ({ onPress }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.temporadasBtn, { transform: [{ translateY: floatAnim }] }]}>
      <TouchableOpacity onPress={onPress}>
        <Image
          source={require('../assets/temporadas/libro/libro1.png')}
          style={styles.temporadasImg}
          contentFit="contain"
          cachePolicy="memory"
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const REMERA_STYLE = { bottom: -213, left: '24%', transform: [{ translateX: -50 }], width: 450, height: 700 };

const Inicio = memo(({ navigation, onReady, cartaMessage, selectedSticker, frase, fraseColor, style }) => {
  useEffect(() => {
    onReady?.();
  }, []);

  const goFrases    = useCallback(() => navigation.navigate('frasesExpandida'), [navigation]);
  const goVestuario = useCallback(() => navigation.navigate('Vestuario'), [navigation]);

  return (
    <View style={[styles.container, style]}>
      <RoomBackground />
      <Guirladas />
      <StatusBar hidden={true} />
      <Eventos navigation={navigation} />
      <Botones navigation={navigation} />
      <BotonesDerecha navigation={navigation} />
      <Hud navigation={navigation} />
      <Hud2 navigation={navigation} />
      <Poster1 containerStyle={styles.poster1} />
      <Frases containerStyle={styles.frases} frase={frase} fraseColor={fraseColor} onPress={goFrases} />
      <PlayerManos containerStyle={styles.manos} />
      <PlayerRemera containerStyle={REMERA_STYLE} />
      <Mensajes navigation={navigation} message={cartaMessage} selectedSticker={selectedSticker} />
      <FloatingBook onPress={() => navigation.navigate('temporadas')} />

      <TouchableOpacity style={styles.vestuarioBtn} onPress={goVestuario}>
        <Text style={styles.vestuarioBtnText}>Vestuario</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  poster1: {
    position: 'absolute',
    width: 90,
    height: 200,
    top: '60.6%',
    left: '72%',
    transform: [{ translateX: -100 }, { translateY: -150 }],
  },
  frases: { position: 'absolute' },
  manos: {
    position: 'absolute',
    bottom: -213,
    left: '24%',
    transform: [{ translateX: -50 }],
    width: 450,
    height: 700,
  },
  temporadasBtn: {
    position: 'absolute',
    bottom: 85,
    left: 30,
  },
  temporadasImg: {
    width: 100,
    height: 100,
  },
  vestuarioBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    left: '38%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  vestuarioBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default Inicio;
