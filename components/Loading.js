import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Animated, StyleSheet, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const Loading = forwardRef((_, ref) => {
  const curtain = useRef(new Animated.Value(-height)).current;
  const directionRef = useRef(1); // 1 = top-down, -1 = bottom-up

  useImperativeHandle(ref, () => ({
    fadeIn: (onDone) => {
      const dir = directionRef.current;
      curtain.setValue(-height * dir);
      Animated.timing(curtain, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onDone?.());
    },
    fadeOut: (onDone) => {
      const dir = directionRef.current;
      directionRef.current = dir * -1;
      Animated.timing(curtain, {
        toValue: height * dir,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onDone?.());
    },
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.curtain, { transform: [{ translateY: curtain }] }]}
    />
  );
});

const styles = StyleSheet.create({
  curtain: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: '#080808',
    zIndex: 9999,
    elevation: 9999,
  },
});

export default Loading;
