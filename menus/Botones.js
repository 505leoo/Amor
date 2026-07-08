import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTrofeos } from '../TrofeosContext';
import NewIndicator from '../components/NewIndicator';

const Botones = ({ navigation }) => {
  const { hasUnclaimedTrofeos } = useTrofeos();

  const buttonStyle = (base, width) => [styles.menuItem, base, width && { width }];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={buttonStyle(styles.inventarioItem, 44)}>
        <LinearGradient
          colors={['rgba(167, 136, 136, 0.1)', 'rgba(110, 99, 99, 0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <MaterialIcons name="inventory" size={20} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={buttonStyle(styles.trofeosItem, 44)}
        onPress={() => navigation?.navigate('trofeos')}
      >
        <View style={styles.trofeosButtonInner}>
          <LinearGradient
            colors={['rgba(167, 136, 136, 0.1)', 'rgba(110, 99, 99, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <MaterialIcons name="emoji-events" size={20} color="rgba(255,255,255,0.95)" />
          </LinearGradient>
          <View style={styles.indicatorPosition}>
            <NewIndicator show={hasUnclaimedTrofeos} size={7} color="#4ADE80" />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={buttonStyle(styles.tiendaItem, 44)}
        onPress={() => navigation?.navigate('tienda')}
      >
        <LinearGradient
          colors={['rgba(167, 136, 136, 0.1)', 'rgba(110, 99, 99, 0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <MaterialIcons name="store" size={20} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={buttonStyle(styles.coleccionItem, 44)}
        onPress={() => navigation?.navigate('coleccion')}
      >
        <LinearGradient
          colors={['rgba(167, 136, 136, 0.1)', 'rgba(110, 99, 99, 0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <MaterialIcons name="collections" size={20} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    left: 36,
    zIndex: 1000,
    alignItems: 'flex-start',
  },
  menuItem: {
    marginVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  trofeosButtonInner: {
    position: 'relative',
    width: '100%',
  },
  indicatorPosition: {
    position: 'absolute',
    top: 4,
    right: 6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  
  inventarioItem: {},
  trofeosItem: {},
  tiendaItem: {},
  coleccionItem: {},
});

export default Botones;
