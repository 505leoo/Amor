import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function UpdateModal({ status, version, description, onAccept }) {
  const visible = status === 'available' || status === 'downloading';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <LinearGradient colors={['#fffaf0', '#fff0d4']} style={styles.card}>
          <View style={styles.glow} />
          <Text style={styles.sparkle}>✦</Text>
          <Text style={styles.eyebrow}>UNA SORPRESA PARA USTEDES</Text>
          <Text style={styles.title}>¡Hay una nueva versión!</Text>
          {!!version && <View style={styles.badge}><Text style={styles.badgeText}>VERSIÓN {version}</Text></View>}
          <Text style={styles.description}>
            {description || 'Preparamos nuevas mejoras con mucho cariño para que su rinconcito se sienta más bonito, cómodo y especial.'}
          </Text>
          {status === 'downloading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#fff8dc" size="small" />
              <Text style={styles.loadingText}>Preparando la actualización...</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.nowButton} onPress={onAccept} activeOpacity={0.85}>
                <Text style={styles.nowText}>Actualizar ahora</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.hint}>La app se abrirá de nuevo al terminar.</Text>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(40,28,35,0.68)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 390, borderRadius: 30, paddingHorizontal: 24, paddingVertical: 27, alignItems: 'center', borderWidth: 2, borderColor: '#f2c66d', overflow: 'hidden', elevation: 18, shadowColor: '#2a1520', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  glow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -110, backgroundColor: 'rgba(255,210,92,0.22)' },
  sparkle: { fontSize: 28, color: '#d89a27', marginBottom: 5 },
  eyebrow: { color: '#b47b27', fontSize: 11, fontWeight: '900', letterSpacing: 1.3, textAlign: 'center' },
  title: { color: '#693b31', fontSize: 25, fontWeight: '900', textAlign: 'center', marginTop: 7 },
  badge: { marginTop: 11, paddingHorizontal: 13, paddingVertical: 5, borderRadius: 15, backgroundColor: '#f0b94e' },
  badgeText: { color: '#fffaf0', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  description: { color: '#79564c', fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center', marginTop: 15 },
  actions: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 22 },
  nowButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d79635', elevation: 4, shadowColor: '#ad6d17', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  nowText: { color: '#fffaf0', fontSize: 14, fontWeight: '900' },
  loading: { minHeight: 50, marginTop: 22, paddingHorizontal: 18, borderRadius: 16, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d79635' },
  loadingText: { color: '#fffaf0', fontSize: 14, fontWeight: '800' },
  hint: { color: '#aa887c', fontSize: 11, fontWeight: '600', marginTop: 13 },
});
