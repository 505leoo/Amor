import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import ThemeParticles from '../components/ThemeParticles';

const Temas = ({ navigation }) => {
  const { currentTheme, changeTheme, themes } = useTheme();
  const theme = themes[currentTheme];

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ThemeParticles particleType={theme.particles} />

      <TouchableOpacity onPress={() => navigation.navigate('main')} style={styles.exitButton}>
        <MaterialIcons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={styles.themeTabs}>
        {Object.entries(themes).map(([key, t]) => (
          <TouchableOpacity
            key={key}
            onPress={() => changeTheme(key)}
            style={[styles.themeTab, currentTheme === key && styles.activeTab]}
          >
            <LinearGradient
              colors={t.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.themeTabGradient}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.previewInfo}>
        <Text style={styles.themeName}>{theme.name}</Text>
        <Text style={styles.themeDesc}>Vista previa del tema</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  exitButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  themeTabs: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 10,
    zIndex: 10,
  },
  themeTab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activeTab: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  themeTabGradient: {
    flex: 1,
  },
  previewInfo: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  themeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  themeDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
});

export default Temas;