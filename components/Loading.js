import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from '@react-native-community/blur';

const { width, height } = Dimensions.get('window');

const Loading = forwardRef((_, ref) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const isVisible = useRef(false);

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    fadeIn: (onDone) => {
      isVisible.current = true;
      opacity.setValue(0);
      scale.setValue(1.04);
      translateY.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start(() => onDone?.());
    },
    fadeOut: (onDone) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -18,
          duration: 480,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isVisible.current = false;
        scale.setValue(1);
        translateY.setValue(0);
        onDone?.();
      });
    },
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity, transform: [{ scale }, { translateY }] }]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="dark"
        blurAmount={18}
        reducedTransparencyFallbackColor="rgba(10,10,10,0.85)"
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default Loading;
