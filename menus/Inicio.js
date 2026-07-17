import React, { useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import Eventos from './Eventos';
import Botones from './Botones';
import BotonesDerecha from './BotonesDerecha';
import Hud from './Hud';
import Hud2 from './Hud2';
import PlayerRemera from '../PlayerRemera';
import PlayerManos from '../PlayerManos';
import Poster1 from '../Poster1';
import Frases from '../Frases';
import Mensajes from './Mensajes';
import { useTheme } from '../ThemeContext';
import { useSeason } from '../SeasonContext';
import RoomBackground from '../components/RoomBackground';
import Guirladas from '../components/Guirladas';
import { useDebug } from '../DebugContext';

const REMERA_STYLE = { bottom: -213, left: '24%', transform: [{ translateX: -50 }], width: 450, height: 700 };

const Inicio = memo(({ navigation, onReady, cartaMessage, selectedSticker, frase, fraseColor, style }) => {
  const { currentTheme, themes } = useTheme();
  const { getDisplaySeason, isDevMode } = useSeason();
  const { isDebugMode } = useDebug();
  const theme = themes[currentTheme];
  const displaySeason = getDisplaySeason();

  useEffect(() => {
    onReady?.();
  }, []);

  const goFrases    = useCallback(() => navigation.navigate('frasesExpandida'), [navigation]);
  const goVestuario = useCallback(() => navigation.navigate('Vestuario'), [navigation]);
  const goTemas     = useCallback(() => navigation.navigate('Temas'), [navigation]);
  const goSeason    = useCallback(() => navigation.navigate('seasonInfo'), [navigation]);

  return (
    <View style={[styles.container, style]}>
      <RoomBackground />
      <Guirladas />
      <StatusBar hidden={true} />
      <Eventos navigation={navigation} />
      <Botones navigation={navigation} />
      <BotonesDerecha navigation={navigation} />
      <Hud navigation={navigation} />
      <Hud2 navigation={navigation} />
      <Poster1 containerStyle={styles.poster1} />
      <Frases containerStyle={styles.frases} frase={frase} fraseColor={fraseColor} onPress={goFrases} />
      <PlayerManos containerStyle={styles.manos} />
      <PlayerRemera containerStyle={REMERA_STYLE} />
      <Mensajes navigation={navigation} message={cartaMessage} selectedSticker={selectedSticker} />

      <TouchableOpacity style={styles.vestuarioBtn} onPress={goVestuario}>
        <Text style={styles.vestuarioBtnText}>Vestuario</Text>
      </TouchableOpacity>

      {isDebugMode && (
        <TouchableOpacity style={styles.temasButton} onPress={goTemas}>
          <MaterialIcons name="palette" size={24} color="rgba(255,255,255,0.95)" />
          <Text style={styles.temasButtonText}>Temas</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.seasonIndicator}
        onPress={isDebugMode ? goSeason : undefined}
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
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  poster1: {
    position: 'absolute',
    width: 90,
    height: 200,
    top: '60.6%',
    left: '72%',
    transform: [{ translateX: -100 }, { translateY: -150 }],
  },
  frases: { position: 'absolute' },
  manos: {
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
  vestuarioBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  temasButton: {
    position: 'absolute',
    top: 150,
    right: 20,
    backgroundColor: 'rgba(167,136,136,0.1)',
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
  seasonIndicator: { position: 'absolute', top: 63, right: 13 },
  textContainer: { alignItems: 'flex-start' },
  seasonTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  seasonTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '600', letterSpacing: 1.8 },
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
  devModeTitle:  { color: '#FF9800' },
  devModeNumber: { color: '#FF9800' },
  devModeName:   { color: '#FF9800' },
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
