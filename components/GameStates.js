import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gameColors, gamePanel, gameText } from '../theme/gameTheme';

export const GameLoadingState = ({ label = 'Preparando todo…', compact = false }) => (
  <View style={[styles.state, compact && styles.compact]} accessibilityRole="progressbar" accessibilityLabel={label}>
    <ActivityIndicator size={compact ? 'small' : 'large'} color={gameColors.goldDark} />
    <Text style={styles.message}>{label}</Text>
  </View>
);

export const GameEmptyState = ({ icon = 'auto-awesome', title = 'Todavía no hay nada aquí', message, actionLabel, onAction }) => (
  <View style={styles.state}>
    <View style={styles.icon}><MaterialIcons name={icon} size={24} color={gameColors.goldDark} /></View>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {actionLabel && onAction ? <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.78} accessibilityRole="button"><Text style={styles.buttonText}>{actionLabel}</Text></TouchableOpacity> : null}
  </View>
);

export const GameErrorState = ({ title = 'Algo se enredó', message = 'No pudimos cargar esta parte. Tu progreso sigue a salvo.', onRetry }) => (
  <View style={[styles.state, styles.error]}>
    <View style={[styles.icon, styles.errorIcon]}><MaterialIcons name="cloud-off" size={24} color={gameColors.danger} /></View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry ? <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.78} accessibilityRole="button"><Text style={styles.buttonText}>VOLVER A INTENTAR</Text></TouchableOpacity> : null}
  </View>
);

const styles = StyleSheet.create({
  state: { minWidth: 210, minHeight: 130, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 16, ...gamePanel },
  compact: { minWidth: 150, minHeight: 76, paddingVertical: 10, borderWidth: 2 },
  error: { borderColor: '#b7775c' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: gameColors.parchmentDeep, borderWidth: 1, borderColor: gameColors.gold },
  errorIcon: { backgroundColor: '#f5d9c7', borderColor: '#d69a77' },
  title: { ...gameText, marginTop: 8, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  message: { ...gameText, marginTop: 5, maxWidth: 260, color: gameColors.textSoft, fontSize: 8, lineHeight: 11, fontWeight: '700', textAlign: 'center' },
  button: { marginTop: 11, minWidth: 120, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: gameColors.green, borderWidth: 1, borderColor: gameColors.greenDark },
  buttonText: { ...gameText, color: gameColors.white, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
});

