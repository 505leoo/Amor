import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

export const getTrophyColors = (nivel = 1) => {
  const rankIndex = Math.floor((nivel - 1) / 3);
  const colorSets = [
    ['#CD7F32', '#8B4513', '#A0522D'],
    ['#C0C0C0', '#A9A9A9', '#808080'],
    ['#708090', '#2F4F4F', '#696969'],
    ['#FFD700', '#FFA500', '#DAA520'],
    ['#B9F2FF', '#87CEEB', '#4682B4'],
  ];
  return colorSets[Math.min(rankIndex, colorSets.length - 1)];
};

export const getTrophyRank = (nivel = 1) => {
  const ranks = ['Bronce', 'Plata', 'Hierro', 'Oro', 'Diamante'];
  const rankIndex = Math.floor((nivel - 1) / 3);
  const subRank = ((nivel - 1) % 3) + 1;
  return `${ranks[Math.min(rankIndex, ranks.length - 1)]} ${subRank}`;
};

const TrophyIcon = ({ nivel = 1, scale = 1 }) => {
  const trophyColors = getTrophyColors(nivel);
  return (
    <View style={[styles.trophyContainer, { transform: [{ scale }] }]}>
      <LinearGradient colors={trophyColors} style={styles.modernCup}>
        <Text style={styles.victorySymbol}>★</Text>
        <View style={styles.cleanHighlight} />
      </LinearGradient>
      <View style={styles.roundedHandleLeft} />
      <View style={styles.roundedHandleRight} />
      <LinearGradient colors={['#DAA520', '#B8860B']} style={styles.trophyStem} />
      <LinearGradient colors={['#B8860B', '#8B7355']} style={styles.trophyBase} />
    </View>
  );
};

const styles = StyleSheet.create({
  trophyContainer: {
    width: 160,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernCup: {
    width: 100,
    height: 85,
    borderRadius: 12,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 2,
    borderColor: '#B8860B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  victorySymbol: {
    fontSize: 20,
    color: '#ffffffd3',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cleanHighlight: {
    position: 'absolute',
    top: 15,
    left: 20,
    width: 20,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    transform: [{ rotate: '-15deg' }],
  },
  trophyStem: {
    width: 20,
    height: 40,
    borderRadius: 10,
    marginTop: -1,
    borderWidth: 1,
    borderColor: '#8B7355',
  },
  trophyBase: {
    width: 75,
    height: 20,
    borderRadius: 10,
    marginTop: -1,
    borderWidth: 1,
    borderColor: '#654321',
  },
  roundedHandleLeft: {
    position: 'absolute',
    left: 9.5,
    top: 50,
    width: 24,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: '#ccb637',
    borderRightWidth: 0,
  },
  roundedHandleRight: {
    position: 'absolute',
    right: 8,
    top: 50,
    width: 24,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: '#ccb637',
    borderLeftWidth: 0,
  },
});

export default TrophyIcon;
