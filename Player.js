import React, { useState, useEffect, memo, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useUserDocument } from './hooks/useUserDocument';

const ANIMALITOS = {
  halcon: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
  ardilla: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png'),
};
const SKINS_POR_ANIMAL = {
  halcon: {
    default: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
    halcont1: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont1.png'),
    halcont2: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont2.png'),
  },
  ardilla: {
    default: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png'),
    ardillat1: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat1.png'),
    ardillat2: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat2.png'),
  },
};

export const SinAnimal = memo(() => (
  <View style={styles.sinAnimalWrap}>
    <Text style={styles.sinAnimalEmoji}>🐾</Text>
    <Text style={styles.sinAnimalText}>ANIMAL{'\n'}SIN EQUIPAR</Text>
  </View>
));

const PlayerContent = ({ animalito, skin, loading, imageStyle, placeholder, onLoadStart, onLoad, onError }) => {
  const skinsDisponibles = SKINS_POR_ANIMAL[animalito] || {};
  const source = animalito ? (skinsDisponibles[skin || 'default'] ?? skinsDisponibles.default ?? ANIMALITOS[animalito] ?? null) : null;

  return (
    <>
      {loading ? null : source ? (
        <Image
          source={source}
          style={[styles.image, imageStyle]}
          contentFit="contain"
          cachePolicy="memory-disk"
          onLoadStart={onLoadStart}
          onLoad={onLoad}
          onError={onError}
        />
      ) : (
        placeholder ?? null
      )}
    </>
  );
};

const Player = memo(({ containerStyle, imageStyle, uid: uidProp, placeholder, disabled }) => {
  const { data: userData, loaded: userLoaded, uid } = useUserDocument(
    data => ({ animalito: data?.animalito, skin: data?.skin }),
    uidProp,
    (a, b) => a?.animalito === b?.animalito && a?.skin === b?.skin,
  );
  const [animalito, setAnimalito] = useState(null);
  const [skin, setSkin] = useState('default');
  const [loading, setLoading] = useState(true);
  const playerReveal = useRef(new Animated.Value(0)).current;

  const hidePlayer = () => {
    playerReveal.stopAnimation();
    playerReveal.setValue(0);
  };
  const revealPlayer = () => {
    Animated.timing(playerReveal, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  useEffect(() => {
    if (disabled) {
      hidePlayer();
      setLoading(false);
      return;
    }
    if (!uid) { hidePlayer(); setLoading(false); return; }
    if (!userLoaded) { setLoading(true); return; }
    setAnimalito(userData?.animalito ?? null);
    setSkin(userData?.skin ?? 'default');
    setLoading(false);
  }, [disabled, uid, userLoaded, userData?.animalito, userData?.skin]);

  useEffect(() => {
    if (!loading && !animalito) revealPlayer();
  }, [animalito, loading]);

  return (
    <View style={[styles.container, containerStyle]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: playerReveal }]}>
        <PlayerContent
          animalito={animalito}
          skin={skin}
          loading={loading}
          imageStyle={imageStyle}
          placeholder={placeholder}
          onLoadStart={hidePlayer}
          onLoad={revealPlayer}
          onError={hidePlayer}
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: 'absolute', zIndex: 1 },
  image: { width: '100%', height: '100%', top: '10%', left: '43%' },
  sinAnimalWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  sinAnimalEmoji: {
    fontSize: 18,
    opacity: 0.5,
  },
  sinAnimalText: {
    fontSize: 7,
    fontWeight: '800',
    color: 'rgba(90,42,58,0.4)',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 10,
  },
});

export default Player;
