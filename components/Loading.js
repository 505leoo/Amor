import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Animated, StyleSheet, Dimensions, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const Loading = forwardRef((_, ref) => {
  const curtain = useRef(new Animated.Value(-height)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-width * 0.5)).current;

  const animateShimmer = () => {
    shimmerOpacity.setValue(1);
    shimmerX.setValue(-width * 0.5);
    Animated.timing(shimmerX, {
      toValue: width,
      duration: 550,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  useImperativeHandle(ref, () => ({
    fadeIn: (onDone) => {
      curtain.setValue(-height);
      Animated.timing(curtain, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        animateShimmer();
        onDone?.();
      });
    },
    fadeOut: (onDone) => {
      shimmerOpacity.setValue(0);
      Animated.timing(curtain, {
        toValue: -height,
        duration: 380,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onDone?.());
    },
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.curtain, { transform: [{ translateY: curtain }] }]}
    >
      {/* Borde inferior con shimmer */}
      <View style={styles.edge}>
        <View style={styles.edgeLine} />

        {/* Shimmer que cruza el borde */}
        <Animated.View style={[styles.shimmerWrap, { opacity: shimmerOpacity }]}>
          <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.95)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
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
  edge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  edgeLine: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  shimmerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    width: width * 0.45,
    height: 3,
  },
});

export default Loading;
