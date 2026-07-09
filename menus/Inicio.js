import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
const { width, height } = Dimensions.get('window');
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import NotificationSystem from '../utils/NotificationSystem';
import Eventos from './Eventos';
import Botones from './Botones';
import BotonesDerecha from './BotonesDerecha';
import Hud from './Hud';
import Hud2 from './Hud2';
import Player from '../Player';
import Mensajes from './Mensajes';
import { useTheme } from '../ThemeContext';
import { useSeason } from '../SeasonContext';
import { useDebug } from '../DebugContext';
import ThemeParticles from '../components/ThemeParticles';

const Inicio = ({ navigation, onReady, cartaMessage, selectedSticker }) => {
  const { currentTheme, themes } = useTheme();
  const { getDisplaySeason, isDevMode } = useSeason();
  const { isDebugMode } = useDebug();
  const theme = themes[currentTheme];
  const displaySeason = getDisplaySeason();

  const gradientColors = displaySeason ? displaySeason.gradient : theme?.gradient;
  const particlesType = displaySeason ? displaySeason.particles : theme?.particles;

  // Las notificaciones (registro + user_online + entrada) se gestionan solo en App.js al cambiar auth.
  useEffect(() => {
    NotificationSystem.setupNotificationListeners();
  }, []);

  useEffect(() => {
    if (onReady && gradientColors && displaySeason) {
      onReady();
    }
  }, [displaySeason, gradientColors, onReady]);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Image source={require('../assets/menu/pared1.png')} style={styles.backgroundImage} />
      {false ? <ThemeParticles particleType={particlesType} /> : null}
      <Eventos navigation={navigation} />
      <Botones navigation={navigation} />
      <BotonesDerecha navigation={navigation} />
      <Hud navigation={navigation} />
      <Hud2 navigation={navigation} />
      <Player onSelectSticker={() => navigation.navigate('coleccion')} />
      <Mensajes navigation={navigation} message={cartaMessage} selectedSticker={selectedSticker} />
      
      {isDebugMode && (
        <TouchableOpacity 
          style={styles.temasButton} 
          onPress={() => navigation.navigate('Temas')}
        >
          <MaterialIcons name="palette" size={24} color="rgba(255,255,255,0.95)" />
          <Text style={styles.temasButtonText}>Temas</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={styles.seasonIndicator}
        onPress={isDebugMode ? () => navigation.navigate('seasonInfo') : undefined}
      >
        <View style={styles.textContainer}>
          {displaySeason ? (
            <>
              <View style={styles.seasonTitleRow}>
                <Text style={[styles.seasonTitle, isDevMode && styles.devModeTitle]}>TEMPORADA</Text>
                <Text style={[styles.seasonNumber, isDevMode && styles.devModeNumber]}>{displaySeason.number}</Text>
              </View>
              <Text style={[styles.seasonName, isDevMode && styles.devModeName]}>{displaySeason.name}</Text>
            </>
          ) : (
            <Text style={styles.noSeasonText}>SIN TEMPORADA</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  temasButton: {
    position: 'absolute',
    top: 150,
    right: 20,
    backgroundColor: 'rgba(167, 136, 136, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  temasButtonText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  seasonIndicator: {
    position: 'absolute',
    top: 63,
    right: 13,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  seasonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  seasonTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.8,
  },
  seasonNumber: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  seasonName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  devModeTitle: {
    color: '#FF9800',
  },
  devModeNumber: {
    color: '#FF9800',
  },
  devModeName: {
    color: '#FF9800',
  },
  noSeasonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
    resizeMode: 'stretch',
  },
  overlayImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
    zIndex: -999,
    elevation: -999,
    opacity: 1,
  },
});

export default Inicio;