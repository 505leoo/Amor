import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSeason } from '../SeasonContext';

const DevModeDot = () => {
  const { isDevMode } = useSeason();
  if (!isDevMode) return null;
  return <View style={styles.dot} />;
};

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 18,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8C00',
    zIndex: 9999,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 10,
  },
});

export default DevModeDot;
