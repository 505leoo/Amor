import React, { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';

const { width: W } = Dimensions.get('window');

const HEIGHT = 120;
const SVG_H  = 280;
const Y_LEFT  = 22;
const Y_RIGHT = -6;
const SAG     = 38;

const getRopeY = (t) => {
  const anchor   = Y_LEFT + (Y_RIGHT - Y_LEFT) * t;
  const catenary = SAG * (Math.cosh((t - 0.5) * 3) - Math.cosh(0.5 * 3)) / (1 - Math.cosh(0.5 * 3));
  return anchor + catenary;
};

const BULB_COUNT = 16;
const WAVE_STEP  = 180;
const CYCLE      = 3600;
const END_X      = W * 0.78;

const bulbs = Array.from({ length: BULB_COUNT }).map((_, i) => {
  const t   = (i + 1.5) / (BULB_COUNT + 2);
  const x   = t * END_X;
  const ry  = getRopeY(t);
  const r   = 5.5 + Math.random() * 4;
  const gap = 4 + Math.random() * 4;
  const jump    = Math.random() < 0.4 ? (Math.random() < 0.5 ? -2 : 2) : 0;
  const skipTo  = Math.random() < 0.2;
  const baseDelay = skipTo
    ? Math.floor(Math.random() * BULB_COUNT) * WAVE_STEP
    : (i + jump) * WAVE_STEP;
  return {
    id: i, x,
    ropeY: ry,
    bulbY: ry + r + gap,
    r,
    delay:   Math.max(0, baseDelay) + Math.random() * 100,
    minGlow: 0.12 + Math.random() * 0.1,
    maxGlow: 0.82 + Math.random() * 0.18,
  };
});

const makePath = () => {
  const pts = Array.from({ length: 80 }).map((_, i) => {
    const t = i / 79;
    return { x: t * END_X, y: getRopeY(t) };
  });
  return pts.reduce((d, p, i) => i === 0 ? `M${p.x} ${p.y}` : `${d} L${p.x} ${p.y}`, '');
};
const ROPE_PATH = makePath();

// Aura animada: View pequeño centrado en la bombilla, no pantalla completa
const BulbGlow = memo(({ x, bulbY, r, delay, minGlow, maxGlow }) => {
  const opacity = useRef(new Animated.Value(minGlow)).current;
  const size = r * 15; // diámetro del View = tamaño máximo del aura

  useEffect(() => {
    const run = () =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: maxGlow, duration: CYCLE * 0.42, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: minGlow, duration: CYCLE * 0.58, useNativeDriver: true }),
      ]).start(() => run());
    run();
    return () => opacity.stopAnimation();
  }, []);

  return (
    <Animated.View style={{
      opacity,
      position: 'absolute',
      left: x - size / 2,
      top: bulbY - size / 2,
      width: size,
      height: size,
    }}>
      <Svg width={size} height={size} pointerEvents="none">
        <Circle cx={size/2} cy={size/2} r={r * 7}   fill="rgba(255,190,70,0.07)" />
        <Circle cx={size/2} cy={size/2} r={r * 3}   fill="rgba(255,228,140,0.22)" />
        <Circle cx={size/2} cy={size/2} r={r * 1.7} fill="rgba(255,248,200,0.5)" />
      </Svg>
    </Animated.View>
  );
});

// SVG estático único para bombillas + cuerda — se renderiza una sola vez
const StaticLayer = memo(() => (
  <Svg width={W} height={SVG_H} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
    {/* Cuerda */}
    <Path d={ROPE_PATH} stroke="rgba(0,0,0,0.22)" strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <Path d={ROPE_PATH} stroke="#9a8555"           strokeWidth={0.9} fill="none" strokeLinecap="round" />

    {bulbs.map(b => (
      <G key={b.id}>
        {/* Hilo */}
        <Path d={`M ${b.x} ${b.ropeY} L ${b.x} ${b.bulbY - b.r}`}
          stroke="#7a6535" strokeWidth={0.8} strokeLinecap="round" />
        {/* Bombilla */}
        <Circle cx={b.x} cy={b.bulbY} r={b.r}       fill="rgba(255,255,242,1)" />
        {/* Brillo especular */}
        <Circle cx={b.x - b.r * 0.28} cy={b.bulbY - b.r * 0.32} r={b.r * 0.24} fill="rgba(255,255,255,0.88)" />
      </G>
    ))}
  </Svg>
));

const Guirladas = memo(() => (
  <View style={styles.container} pointerEvents="none">
    {/* Auras animadas — Views pequeños, no pantalla completa */}
    {bulbs.map(b => <BulbGlow key={b.id} {...b} />)}
    {/* Cuerda y bombillas estáticas — un solo SVG */}
    <StaticLayer />
  </View>
));

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: HEIGHT,
    zIndex: 100,
    elevation: 100,
    overflow: 'visible',
  },
});

export default Guirladas;
