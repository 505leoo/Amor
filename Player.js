import React, { useCallback, useEffect, memo, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useUserDocument } from './hooks/useUserDocument';
import { ANIMALITOS_POR_ID, IMAGENES_POR_SKIN } from './data/animalitos';

export const SinAnimal = memo(() => (
  <View style={styles.sinAnimalWrap}>
    <Text style={styles.sinAnimalEmoji}>🐾</Text>
    <Text style={styles.sinAnimalText}>ANIMAL{'\n'}SIN EQUIPAR</Text>
  </View>
));

const PlayerContent = memo(({ animalito, skin, loading, imageStyle, placeholder, onLoadStart, onLoad, onError }) => {
  const skinsDisponibles = IMAGENES_POR_SKIN[animalito] || {};
  const source = animalito ? (skinsDisponibles[skin || 'default'] ?? skinsDisponibles.default ?? ANIMALITOS_POR_ID[animalito]?.imagen ?? null) : null;

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
});

const Player = memo(({ containerStyle, imageStyle, uid: uidProp, placeholder, disabled }) => {
  const { data: userData, loaded: userLoaded, uid } = useUserDocument(
    data => ({ animalito: data?.animalito, skin: data?.skin }),
    uidProp,
    (a, b) => a?.animalito === b?.animalito && a?.skin === b?.skin,
  );
  const playerReveal = useRef(new Animated.Value(0)).current;
  const imageLoaded = useRef(false);
  const animalito = userData?.animalito ?? null;
  const skin = userData?.skin ?? 'default';
  const loading = !disabled && Boolean(uid) && !userLoaded;

  const hidePlayer = useCallback(() => {
    playerReveal.stopAnimation();
    playerReveal.setValue(0);
  }, [playerReveal]);
  const revealPlayer = useCallback(() => {
    Animated.timing(playerReveal, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [playerReveal]);
  const handleLoadStart = useCallback(() => {
    imageLoaded.current = false;
    hidePlayer();
  }, [hidePlayer]);
  const handleLoad = useCallback(() => {
    imageLoaded.current = true;
    revealPlayer();
  }, [revealPlayer]);
  const handleError = useCallback(() => {
    imageLoaded.current = false;
    hidePlayer();
  }, [hidePlayer]);

  useEffect(() => {
    if (disabled) {
      hidePlayer();
      return;
    }
    if (!uid || !userLoaded) hidePlayer();
    else if (!animalito || imageLoaded.current) revealPlayer();
  }, [animalito, disabled, hidePlayer, revealPlayer, uid, userLoaded]);

  useEffect(() => {
    if (!loading && !animalito) revealPlayer();
  }, [animalito, loading, revealPlayer]);

  return (
    <View style={[styles.container, containerStyle]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: playerReveal }]}>
        <PlayerContent
          animalito={animalito}
          skin={skin}
          loading={loading}
          imageStyle={imageStyle}
          placeholder={placeholder}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
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
