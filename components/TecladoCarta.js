import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const LAYOUT = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m','⌫','✓'],
  [' '],
];

const TecladoCarta = ({ value, onChange, onDone }) => {
  const handlePress = (key) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key === '✓') {
      onDone();
    } else {
      onChange(value + key);
    }
  };

  return (
    <View style={styles.container}>
      {LAYOUT.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isSpace = key === ' ';
            const isBackspace = key === '⌫';
            return (
              <TouchableOpacity
                key={key}
                style={[styles.key, isSpace && styles.spaceKey, isBackspace && styles.backspaceKey, key === '✓' && styles.doneKey]}
                onPress={() => handlePress(key)}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, key === '✓' && styles.doneText]}>
                  {isSpace ? '___' : key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const KEY_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  keyText: {
    fontSize: KEY_SIZE * 0.42,
    color: '#2c2c2c',
  },
  spaceKey: {
    width: width * 0.55,
    height: KEY_SIZE,
  },
  spaceText: {
    fontSize: KEY_SIZE * 0.32,
    color: '#555',
  },
  backspaceKey: {
    backgroundColor: 'rgba(255,100,100,0.75)',
  },
  doneKey: {
    backgroundColor: 'rgba(255,182,193,0.9)',
    borderRadius: 6,
    elevation: 4,
  },
  doneText: {
    fontSize: KEY_SIZE * 0.42,
    color: '#2c2c2c',
  },
});

export default TecladoCarta;
