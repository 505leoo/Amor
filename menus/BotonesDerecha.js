import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const BotonesDerecha = ({ navigation }) => {
  const handleEventosPress = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate('menu');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.menuItem, { width: 44 }]} onPress={handleEventosPress}>
        <LinearGradient
          colors={['rgba(167, 136, 136, 0.1)', 'rgba(110, 99, 99, 0.15)']}
          style={styles.gradient}
        >
          <MaterialIcons name="event" size={20} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.menuItem, { width: 44 }]}
        onPress={() => navigation?.navigate('stickers')}
      >
        <LinearGradient
          colors={['rgba(167, 136, 136, 0.1)', 'rgba(110, 99, 99, 0.15)']}
          style={styles.gradient}
        >
          <MaterialIcons name="face" size={20} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    right: 24,
    zIndex: 50,
    alignItems: 'flex-end',
  },
  menuItem: {
    marginVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  stickersItem: {},
  eventosItem: {},
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  
});

export default BotonesDerecha;