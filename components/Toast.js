import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const TOAST_W = 210;

const THEMES = {
  info: {
    grad:    ['#93c5fd', '#60a5fa'],
    barGrad: ['#3b82f6', '#1d4ed8'],
    icon:    'upload',
    shadow:  '#60a5fa',
  },
  success: {
    grad:    ['#f9a8d4', '#e879f9'],
    barGrad: ['#f472b6', '#c026d3'],
    icon:    'check',
    shadow:  '#e879f9',
  },
  error: {
    grad:    ['#fca5a5', '#f87171'],
    barGrad: ['#f87171', '#dc2626'],
    icon:    'alert-circle',
    shadow:  '#f87171',
  },
};

const Toast = forwardRef((_, ref) => {
  const [config, setConfig] = useState(null);
  const barWidth  = useRef(new Animated.Value(0)).current;
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-70)).current;
  const seqRef    = useRef(null);

  useImperativeHandle(ref, () => ({
    show({ text1, text2, message, type = 'success', duration = 2500 }) {
      const t1 = text1 || message || '';
      const persistent = duration >= 99999;

      if (seqRef.current) seqRef.current.stop();
      barWidth.setValue(0);

      // Si ya está visible y es persistent, solo actualizar texto
      const alreadyVisible = config && persistent;
      if (!alreadyVisible) {
        opacity.setValue(0);
        translateY.setValue(-70);
      }

      setConfig({ text1: t1, text2, type, duration, persistent });

      if (persistent) {
        // Solo entrada, sin barra ni salida automática
        seqRef.current = Animated.parallel([
          Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, speed: 7, bounciness: 4, useNativeDriver: true }),
        ]);
        seqRef.current.start();
      } else {
        seqRef.current = Animated.sequence([
          Animated.parallel([
            Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, speed: 7, bounciness: 4, useNativeDriver: true }),
          ]),
          Animated.timing(barWidth, { toValue: TOAST_W, duration, useNativeDriver: false }),
          Animated.parallel([
            Animated.timing(opacity,    { toValue: 0, duration: 320, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: -70, duration: 320, useNativeDriver: true }),
          ]),
        ]);
        seqRef.current.start(({ finished }) => {
          if (finished) setConfig(null);
        });
      }
    },
    hide() {
      if (seqRef.current) seqRef.current.stop();
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -70, duration: 320, useNativeDriver: true }),
      ]).start(() => setConfig(null));
    },
  }));

  if (!config) return null;

  const theme = THEMES[config.type] || THEMES.success;

  return (
    <Animated.View style={[s.wrap, { opacity, transform: [{ translateY }], shadowColor: theme.shadow }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.98)', 'rgba(253,242,248,0.98)']}
        style={s.card}
      >
        <LinearGradient colors={theme.grad} style={s.iconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Feather name={theme.icon} size={11} color="#fff" />
        </LinearGradient>
        <View style={s.texts}>
          <Text style={s.title} numberOfLines={1}>{config.text1}</Text>
          {config.text2 ? <Text style={s.sub} numberOfLines={1}>{config.text2}</Text> : null}
        </View>
      </LinearGradient>
      <View style={s.track}>
        <Animated.View style={[s.fill, { width: barWidth }]}>
          <LinearGradient
            colors={theme.barGrad}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 16,
    right: 60,
    width: TOAST_W,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  texts: { flex: 1 },
  title: { color: '#2d1b3d', fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
  sub:   { color: '#a78baa', fontSize: 10, marginTop: 1 },
  track: { height: 2.5, backgroundColor: 'rgba(233,168,220,0.2)' },
  fill:  { height: 2.5 },
});

export default Toast;
