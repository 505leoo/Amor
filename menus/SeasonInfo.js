import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSeason } from '../SeasonContext';
import { useTheme } from '../ThemeContext';
import ThemeParticles from '../components/ThemeParticles';

const SeasonInfo = ({ navigation }) => {
  const {
    currentSeason,
    devSeason,
    isDevMode,
    seasons,
    changeSeason,
    changeDevSeason,
    toggleDevMode,
    getDaysSinceScheduled,
    getDisplaySeason
  } = useSeason();

  const { currentTheme, themes } = useTheme();
  const theme = themes[currentTheme];

  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const [selectorType, setSelectorType] = useState('public');

  const displaySeason = getDisplaySeason();

  const daysRemaining = () => {
    if (!displaySeason) return 0;
    const now = new Date();
    const end = new Date(displaySeason.endDate || displaySeason.end);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleSelectSeason = (seasonId) => {
    if (selectorType === 'public') changeSeason(seasonId);
    else changeDevSeason(seasonId);
    setShowSeasonSelector(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={displaySeason ? displaySeason.gradient : theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <ThemeParticles particleType={displaySeason ? displaySeason.particles : theme.particles} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('main')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Información de Temporada</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.mainCard}>
            <Text style={styles.seasonIconLarge}>{displaySeason?.icon || '🌅'}</Text>
            <Text style={styles.seasonTitle}>{displaySeason?.name || 'Sin temporada activa'}</Text>
            <Text style={styles.seasonSub}>{displaySeason ? `Temporada ${displaySeason.number}` : ''}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBubble}>
                <Text style={styles.statNumber}>{daysRemaining()}</Text>
                <Text style={styles.statLabel}>Días</Text>
              </View>
              <View style={styles.statBubble}>
                <Text style={styles.statNumber}>{getDaysSinceScheduled()}</Text>
                <Text style={styles.statLabel}>Días Activa</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionPrimary} onPress={() => { setSelectorType('public'); setShowSeasonSelector(true); }}>
              <MaterialIcons name="public" size={18} color="#fff" />
              <Text style={styles.actionText}>Programar Temporada Pública</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.devCard}>
            <View style={styles.devRow}>
              <View>
                <Text style={styles.devTitle}>Modo Desarrollo</Text>
                <Text style={styles.devSubtitle}>{isDevMode ? 'Activo — vista de desarrollador' : 'Inactivo'}</Text>
              </View>
              <TouchableOpacity style={styles.devToggle} onPress={toggleDevMode}>
                <MaterialIcons name={isDevMode ? 'visibility' : 'visibility-off'} size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.actionSecondary} onPress={() => { setSelectorType('dev'); setShowSeasonSelector(true); }}>
              <MaterialIcons name="build" size={16} color="#fff" />
              <Text style={styles.actionText}>Cambiar Temporada Dev</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSectionSimple}>
            <Text style={styles.sectionTitle}>Estadísticas rápidas</Text>
            <View style={styles.infoRowSimple}>
              <View style={styles.infoPill}>
                <MaterialIcons name="inventory" size={18} color="#fff" />
                <Text style={styles.infoPillText}>{Object.keys(seasons).length} temporadas</Text>
              </View>
              <View style={styles.infoPill}>
                <MaterialIcons name="schedule" size={18} color="#fff" />
                <Text style={styles.infoPillText}>{displaySeason ? new Date(displaySeason.startDate).toLocaleDateString('es-ES') : '-'}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

      </LinearGradient>

      {showSeasonSelector && (
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorModalSimple}>
            <View style={styles.selectorHeaderSimple}>
              <Text style={styles.selectorTitleSimple}>{selectorType === 'public' ? 'Programar Para Todos' : 'Seleccionar Dev'}</Text>
              <TouchableOpacity onPress={() => setShowSeasonSelector(false)}>
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.selectorList}>
              {Object.entries(seasons).map(([key, s]) => (
                <TouchableOpacity key={key} style={styles.selectorItem} onPress={() => handleSelectSeason(key)}>
                  <LinearGradient colors={s.gradient} style={styles.selectorGradient}>
                    <Text style={styles.selectorIcon}>{s.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectorName}>{s.name}</Text>
                      <Text style={styles.selectorMeta}>Temporada {s.number}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  header: {
    marginTop: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  content: { flex: 1, paddingTop: 40, paddingHorizontal: 20, paddingBottom: 45 },
  mainCard: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginVertical: 20,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  seasonIconLarge: { fontSize: 48 },
  seasonTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  seasonSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statBubble: { backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  actionPrimary: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,123,255,0.9)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  actionSecondary: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,152,0,0.9)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  devCard: { backgroundColor: 'rgba(0,0,0,0.28)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  devRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  devTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  devSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  devToggle: { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 6 },
  infoSectionSimple: { marginTop: 18, paddingHorizontal: 2 },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  infoRowSimple: { flexDirection: 'row', gap: 10, marginTop: 10 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  infoPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  selectorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  selectorModalSimple: { width: '92%', maxHeight: '80%', backgroundColor: 'rgba(0,0,0,0.95)', borderRadius: 16, overflow: 'hidden' },
  selectorHeaderSimple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  selectorTitleSimple: { color: '#fff', fontSize: 16, fontWeight: '800' },
  selectorList: { padding: 10 },
  selectorItem: { marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  selectorGradient: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  selectorIcon: { fontSize: 22 },
  selectorName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  selectorMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
});

export default SeasonInfo;