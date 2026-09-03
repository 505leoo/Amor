import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';

const LINES = [
  { key: 'tl', x: -3.5, y: -3.5, rotate: '45deg' }, { key: 'tr', x: 3.5, y: -3.5, rotate: '-45deg' },
  { key: 'bl', x: -3.5, y: 3.5, rotate: '-45deg' }, { key: 'br', x: 3.5, y: 3.5, rotate: '45deg' },
];

const Target = ({ x, y, onFinish }) => {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start(onFinish);
  }, [onFinish, progress]);
  return <Animated.View pointerEvents="none" style={[styles.target, { left: x - 14, top: y - 14 }, {
    opacity: progress.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 1, 0] }),
    transform: [{ scale: progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1.18, 1, 0.82] }) }],
  }]}>
    {LINES.map(line => <View key={line.key} style={[styles.line, { transform: [{ translateX: line.x }, { translateY: line.y }, { rotate: line.rotate }] }]} />)}
  </Animated.View>;
};

const GlobalClickEffect = forwardRef(function GlobalClickEffect(_, ref) {
  const nextId = useRef(0);
  const [targets, setTargets] = useState([]);
  useImperativeHandle(ref, () => ({ show(x, y) {
    const id = ++nextId.current;
    setTargets([{ id, x, y }]);
  } }), []);
  return <Modal
    visible={targets.length > 0}
    transparent
    animationType="none"
    statusBarTranslucent
    navigationBarTranslucent
    hardwareAccelerated
    onRequestClose={() => {}}
  >
    <View pointerEvents="none" style={styles.layer} collapsable={false}>
      {targets.map(target => <Target key={target.id} x={target.x} y={target.y} onFinish={() => setTargets(current => current.filter(item => item.id !== target.id))} />)}
    </View>
  </Modal>;
});

const styles = StyleSheet.create({
  layer: { flex: 1, backgroundColor: 'transparent' },
  target: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', width: 6, height: 1.8, borderRadius: 2, backgroundColor: '#000000' },
});

export default GlobalClickEffect;
