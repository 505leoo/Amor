import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const Loading = forwardRef((_, ref) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useImperativeHandle(ref, () => ({
    fadeIn: (onDone) => {
      opacity.stopAnimation();
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start(() => onDone?.());
    },
    fadeOut: (onDone) => {
      opacity.stopAnimation();
      Animated.timing(opacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start(() => onDone?.());
    },
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity }]} />
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
    backgroundColor: '#8f9295',
  },
});

export default Loading;
