import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Punto verde indicador de "nuevo" / no leído.
 * Debe usarse dentro de un contenedor con position relative (ej. el botón del icono en Hud2).
 */
export default function NewIndicator({ show = true, size = 8, color = '#4ADE80' }) {
  if (!show) return null;
  return (
    <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
});
