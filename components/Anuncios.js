import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image as RNImage, Modal, PanResponder, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';

const EVENTOS_ANUNCIOS = {
  reporte: { titulo: 'Reporte Semanal', accesible: 'Abrir reporte semanal', fondo: require('../assets/inicio/anuncios/anuncioreporte.png') },
  fechas: { titulo: 'Fechas Importantes', accesible: 'Fechas importantes', fondo: require('../assets/inicio/anuncios/anunciocumple.png') },
};
const EVENTOS_ORDEN = ['reporte', 'fechas'];

export default function Anuncios({ visible, onClose, onOpen, renderContent, evento = 'reporte', eventosDisponibles = EVENTOS_ORDEN }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const closeOpacity = useRef(new Animated.Value(0.45)).current;
  const eventos = eventosDisponibles.filter(key => EVENTOS_ANUNCIOS[key]);
  const [pagina, setPagina] = useState(Math.max(0, eventos.indexOf(evento)));
  const touchStart = useRef(null);
  useEffect(() => {
    const indice = eventos.indexOf(evento);
    setPagina(indice >= 0 ? indice : 0);
  }, [evento, eventosDisponibles]);
  const eventoActual = EVENTOS_ANUNCIOS[eventos[pagina]] || EVENTOS_ANUNCIOS.reporte;
  const eventoKey = eventos[pagina] || 'reporte';
  const cambiarEvento = direccion => setPagina(actual => Math.max(0, Math.min(eventos.length - 1, actual + direccion)));
  const swipeResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: event => { touchStart.current = event.nativeEvent.pageX; },
    onPanResponderRelease: event => {
      const distancia = event.nativeEvent.pageX - touchStart.current;
      if (Math.abs(distancia) >= 28) cambiarEvento(distancia < 0 ? 1 : -1);
      else onOpen?.(eventoKey);
    },
  }).panHandlers;

  useEffect(() => {
    if (eventoActual.fondo) {
      Asset.loadAsync(eventoActual.fondo)
        .then(() => console.log('[Anuncios] Fondo local preparado'))
        .catch(error => console.warn('[Anuncios] Error preparando fondo', error?.message || error));
    }
    if (!visible) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [visible, opacity, eventoActual.fondo]);

  useEffect(() => {
    if (!visible) return undefined;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(closeOpacity, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(closeOpacity, { toValue: 0.42, duration: 850, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [visible, closeOpacity]);

  return (
    <Modal visible={Boolean(visible)} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar hidden />
      <Animated.View style={[styles.root, { opacity }]}>
        {eventoActual.fondo && <RNImage
          source={eventoActual.fondo}
          style={[styles.background, eventoKey === 'fechas' && styles.backgroundCumple]}
          resizeMode="cover"
          onLoad={() => console.log('[Anuncios] Fondo local cargado')}
          onError={error => console.warn('[Anuncios] Error cargando fondo', error?.nativeEvent || error)}
        />}
        {!renderContent && <View style={styles.backgroundTouch} {...swipeResponder} accessibilityLabel={eventoActual.accesible} />}
        {!renderContent && <View style={styles.pagination}>
          <View style={styles.dots}>{eventos.map((key, index) => <View key={key} style={[styles.dot, index === pagina && styles.dotActive]} />)}</View>
        </View>}
        {renderContent ? renderContent() : null}
        <Animated.View style={[styles.closeLayer, { opacity: closeOpacity }]}>
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Cerrar anuncio" hitSlop={10}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 38, backgroundColor: '#fff5e7' },
  background: { position: 'absolute', top: 0, left: '-5%', width: '110%', height: '120%' },
  backgroundCumple: { left: 0, width: '100%', height: '112%' },
  backgroundTouch: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, elevation: 5 },
  pagination: { position: 'absolute', bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 12, elevation: 12 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(118,85,47,0.3)' },
  dotActive: { width: 16, backgroundColor: '#76552f' },
  closeLayer: { position: 'absolute', top: 0, right: 0, width: 70, height: 70, zIndex: 10, elevation: 10 },
  close: { position: 'absolute', top: 16, right: 16, width: 29, height: 29, alignItems: 'center', justifyContent: 'center', zIndex: 11 },
  closeText: { color: '#69452d', fontSize: 30, lineHeight: 29, fontWeight: '300' },
});
