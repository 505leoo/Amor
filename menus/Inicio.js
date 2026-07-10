import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import NotificationSystem from '../utils/NotificationSystem';
import Eventos from './Eventos';
import Botones from './Botones';
import BotonesDerecha from './BotonesDerecha';
import Hud from './Hud';
import Hud2 from './Hud2';
import Player from '../Player';
import PlayerRemera from '../PlayerRemera';
import PlayerManoI from '../PlayerManoI';
import PlayerManoD from '../PlayerManoD';
import Poster1 from '../Poster1';
import Frases from '../Frases';
import FrasesExpandida from '../FrasesExpandida';
import Mensajes from './Mensajes';
import { useTheme } from '../ThemeContext';
import { useSeason } from '../SeasonContext';
import ThemeParticles from '../components/ThemeParticles';
import RoomBackground from '../components/RoomBackground';
import Guirladas from '../components/Guirladas';
import { useDebug } from '../DebugContext';

const Inicio = ({ navigation, onReady, cartaMessage, selectedSticker, frase }) => {
  const { currentTheme, themes } = useTheme();
  const { getDisplaySeason, isDevMode } = useSeason();
  const { isDebugMode } = useDebug();
  const theme = themes[currentTheme];
  const displaySeason = getDisplaySeason();
  const [showFrasesExpandida, setShowFrasesExpandida] = React.useState(false);

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
      <RoomBackground />
      <Guirladas />
      <StatusBar hidden={true} />
      {false ? <ThemeParticles particleType={particlesType} /> : null}
      <Eventos navigation={navigation} />
      <Botones navigation={navigation} />
      <BotonesDerecha navigation={navigation} />
      <Hud navigation={navigation} />
      <Hud2 navigation={navigation} />
      <Poster1 containerStyle={styles.poster1} />
      <Frases containerStyle={styles.frases} frase={frase} onPress={() => navigation.navigate('frasesExpandida')} />
      <PlayerManoI containerStyle={styles.manoI} />
      <PlayerManoD containerStyle={styles.manoD} />
      <PlayerRemera containerStyle={{ bottom: -213, left: '24%', transform: [{ translateX: -50 }], width: 450, height: 700 }} />
      {showFrasesExpandida && null}
      <Mensajes navigation={navigation} message={cartaMessage} selectedSticker={selectedSticker} />

      <TouchableOpacity style={styles.vestuarioBtn} onPress={() => navigation.navigate('Vestuario')}>
        <Text style={styles.vestuarioBtnText}>Vestuario</Text>
      </TouchableOpacity>
      
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
  poster1: {
    position: 'absolute',
    width: 90,
    height: 200,
    top: '60.6%',
    left: '72%',
    transform: [{ translateX: -100 }, { translateY: -150 }],
  },
  frases: {
    position: 'absolute',
    width: 80,
    height: 80,
    top: '50%',
    left: '20%',
    transform: [{ translateY: -40 }],
  },
  cabeza: {
    position: 'absolute',
    bottom: -213,
    left: '24%',
    transform: [{ translateX: -50 }],
    width: 450,
    height: 700,
  },
  manoI: {
    position: 'absolute',
    bottom: -213,
    left: '24%',
    transform: [{ translateX: -50 }],
    width: 450,
    height: 700,
  },
  manoD: {
    position: 'absolute',
    bottom: -213,
    left: '24%',
    transform: [{ translateX: -50 }],
    width: 450,
    height: 700,
  },
  vestuarioBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    left: '38%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  vestuarioBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});

export default Inicio;