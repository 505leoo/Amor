import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNewIndicator } from '../NewIndicatorContext';
import NewIndicator from '../components/NewIndicator';

const Hud2 = ({ navigation }) => {
  const { hasNewBuzon } = useNewIndicator();

  return (
    <LinearGradient
      colors={['rgba(167, 136, 136, 0.1)', 'rgba(110, 99, 99, 0.15)']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={() => navigation?.navigate('menu')}
      >
        <Ionicons name="settings" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.iconButtonWrapper}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.navigate('buzon')}>
          <Ionicons name="mail" size={20} color="#fff" />
        </TouchableOpacity>
        <NewIndicator show={hasNewBuzon} />
      </View>
      
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={() => navigation?.navigate('menu', { openTabId: 'friends' })}
      >
        <Ionicons name="people" size={20} color="#fff" />
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -1,
    right: 0.5,
    width: 200,
    height: 48,
    borderBottomLeftRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 18,
    zIndex: 50,
  },
  iconButtonWrapper: {
    position: 'relative',
    marginHorizontal: 10,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});

export default Hud2;