import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

const CORAZONES = [
  { left: '3%', size: 10, delay: 900, duration: 8500, opacity: 0.20, drift: 14 },
  { left: '9%', size: 18, delay: 0, duration: 10400, opacity: 0.27, drift: -18 },
  { left: '16%', size: 8, delay: 3600, duration: 7400, opacity: 0.18, drift: 12 },
  { left: '23%', size: 14, delay: 1700, duration: 9300, opacity: 0.24, drift: 20 },
  { left: '31%', size: 11, delay: 5200, duration: 8000, opacity: 0.20, drift: -15 },
  { left: '38%', size: 20, delay: 2800, duration: 11200, opacity: 0.25, drift: 23 },
  { left: '46%', size: 9, delay: 600, duration: 7700, opacity: 0.19, drift: -12 },
  { left: '53%', size: 15, delay: 4300, duration: 9600, opacity: 0.26, drift: -21 },
  { left: '61%', size: 8, delay: 2100, duration: 7200, opacity: 0.17, drift: 11 },
  { left: '68%', size: 17, delay: 1100, duration: 10600, opacity: 0.25, drift: 18 },
  { left: '76%', size: 12, delay: 5700, duration: 8300, opacity: 0.21, drift: -17 },
  { left: '83%', size: 21, delay: 3200, duration: 11600, opacity: 0.24, drift: -24 },
  { left: '90%', size: 9, delay: 1400, duration: 7600, opacity: 0.18, drift: 13 },
  { left: '96%', size: 15, delay: 4700, duration: 9900, opacity: 0.24, drift: -15 },
];

const FloatingHeart = memo(({ config, index }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const travel = Animated.loop(Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: config.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    const animation = Animated.sequence([Animated.delay(config.delay), travel]);
    animation.start();
    return () => animation.stop();
  }, [config.delay, config.duration, progress]);

  const color = index % 3 === 0 ? '#bc718a' : index % 3 === 1 ? '#ce8295' : '#a87892';
  return <Animated.View style={[
    styles.heart,
    { left: config.left, width: config.size, height: config.size },
    {
      opacity: progress.interpolate({ inputRange: [0, 0.08, 0.84, 1], outputRange: [0, config.opacity, config.opacity, 0] }),
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [55, -1000] }) },
        { translateX: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, config.drift, -config.drift * 0.25] }) },
        { rotate: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-9deg', '8deg', '-5deg'] }) },
      ],
    },
  ]}>
    <Svg width="100%" height="100%" viewBox="0 0 24 24">
      <Path d="M12 21C10.7 19.5 3 14.4 3 8.3A4.3 4.3 0 0 1 11 6c.4.7.7 1.3 1 2 .3-.7.6-1.3 1-2a4.3 4.3 0 0 1 8 2.3C21 14.4 13.3 19.5 12 21Z" fill={color} />
    </Svg>
  </Animated.View>;
});

const RoomBackground = memo(() => (
  <View pointerEvents="none" style={styles.container}>
    <Svg width="100%" height="100%" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#eee2e2" />
          <Stop offset="0.48" stopColor="#eadbde" />
          <Stop offset="1" stopColor="#e5d5d9" />
        </LinearGradient>
        <Pattern id="texture" width="38" height="38" patternUnits="userSpaceOnUse">
          <Circle cx="4" cy="7" r="1.2" fill="#9f7180" opacity="0.12" />
          <Circle cx="25" cy="28" r="0.8" fill="#ffffff" opacity="0.34" />
          <Path d="M10 31c2-3 5 0 2 3-3-3-6 0-2-3Z" fill="#b67d8e" opacity="0.07" />
        </Pattern>
      </Defs>
      <Rect width="1600" height="900" fill="url(#base)" />
      <Circle cx="260" cy="105" r="330" fill="#fff8f4" opacity="0.16" />
      <Circle cx="1350" cy="780" r="430" fill="#c89fac" opacity="0.10" />
      <Rect width="1600" height="900" fill="url(#texture)" />
      <Path d="M0 760C280 690 430 830 745 755S1230 700 1600 790V900H0Z" fill="#cdaeb5" opacity="0.10" />
      <Path d="M0 800C330 735 530 865 840 795s480-60 760 12" fill="none" stroke="#fff" strokeWidth="4" opacity="0.13" />
    </Svg>
    <View style={styles.hearts}>
      {CORAZONES.map((config, index) => <FloatingHeart key={index} config={config} index={index} />)}
    </View>
    <View style={styles.finish} />
  </View>
));

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#eadbde' },
  hearts: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  heart: { position: 'absolute', bottom: -40 },
  finish: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,250,247,0.025)' },
});

export default RoomBackground;
