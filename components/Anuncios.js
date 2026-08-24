import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image as RNImage, Modal, PanResponder, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

const EVENTOS_ANUNCIOS = {
  reporte: { titulo: 'Reporte Semanal', accesible: 'Abrir reporte semanal', fondo: require('../assets/inicio/anuncios/anuncioreporte.png') },
  fechas: { titulo: 'Fechas Importantes', accesible: 'Fechas importantes', fondo: require('../assets/inicio/anuncios/anunciocumple.png') },
  lotes: { titulo: 'Lotes', accesible: 'Ver lote de Ardilla' },
};
const EVENTOS_ORDEN = ['lotes', 'reporte', 'fechas'];

const ARDILLA_BASE = require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png');
const ARDILLA_TRAJE_1 = require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat1.png');
const ARDILLA_TRAJE_2 = require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat2.png');
const ICONO_ARDILLA = require('../assets/inicio/iconos/icono-ardilla-bellota.png');

function LoteArdilla() {
  const brilloNombre = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animacion = Animated.loop(Animated.sequence([
      Animated.timing(brilloNombre, { toValue: 1, duration: 1450, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(brilloNombre, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    animacion.start();
    return () => animacion.stop();
  }, [brilloNombre]);
  const moverBrillo = brilloNombre.interpolate({ inputRange: [0, 1], outputRange: [-55, 245] });
  const compensarTextoBrillo = brilloNombre.interpolate({ inputRange: [0, 1], outputRange: [55, -245] });

  return (
    <View pointerEvents="none" style={styles.lotePage}>
      <Svg style={styles.loteBackdrop} width="100%" height="100%" viewBox="0 0 800 450" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="loteRadial" cx="50%" cy="43%" rx="67%" ry="82%">
            <Stop offset="0" stopColor="#fffbe9" />
            <Stop offset="0.34" stopColor="#ffe9a9" />
            <Stop offset="0.7" stopColor="#efcf88" />
            <Stop offset="1" stopColor="#d9ad63" />
          </RadialGradient>
        </Defs>
        <Path d="M0 0H800V450H0Z" fill="url(#loteRadial)" />
        <Path d="M400 193 L328 -45 H472 Z M400 193 L590 -30 H687 Z M400 193 L849 85 V160 Z M400 193 L850 310 V398 Z M400 193 L585 480 H493 Z M400 193 L216 480 H307 Z M400 193 L-48 311 V399 Z M400 193 L-49 85 V160 Z M400 193 L211 -30 H114 Z" fill="#fff9da" opacity="0.19" />
        <Circle cx="400" cy="193" r="188" fill="none" stroke="#fff8d5" strokeWidth="3" opacity="0.22" />
        <Circle cx="400" cy="193" r="239" fill="none" stroke="#a87535" strokeWidth="2" opacity="0.1" />
        <Circle cx="400" cy="193" r="292" fill="none" stroke="#fff9dd" strokeWidth="7" opacity="0.13" />
        <Circle cx="400" cy="193" r="132" fill="#fffde9" opacity="0.08" />
      </Svg>
      <View style={styles.loteHeader}>
        <View style={styles.loteHeaderLine} />
        <Text style={styles.loteEyebrow}>NUEVA SECCIÓN</Text>
        <View style={styles.loteHeaderLine} />
      </View>
      <Text style={styles.loteTitle}>LOTES</Text>
      <Text style={styles.loteSubtitle}>Bosque Dorado</Text>

      <View style={styles.ardillasStage}>
        <RNImage source={ARDILLA_TRAJE_2} style={[styles.ardillaImage, styles.ardillaTraje2]} resizeMode="contain" />
        <RNImage source={ARDILLA_TRAJE_1} style={[styles.ardillaImage, styles.ardillaTraje1]} resizeMode="contain" />
        <RNImage source={ARDILLA_BASE} style={[styles.ardillaImage, styles.ardillaBase]} resizeMode="contain" />
        <View style={styles.sparkleOne}><Text style={styles.sparkleText}>✦</Text></View>
        <View style={styles.sparkleTwo}><Text style={styles.sparkleTextSmall}>✦</Text></View>
      </View>

      <View style={styles.loteInfo}>
        <View style={styles.loteNameWrap}>
          <Text style={styles.loteName}>Ardilla y sus primeros trajes</Text>
          <Animated.View style={[styles.loteNameShine, { transform: [{ translateX: moverBrillo }] }]}>
            <Animated.Text
              numberOfLines={1}
              style={[styles.loteName, styles.loteNameShineText, { transform: [{ translateX: compensarTextoBrillo }] }]}
            >Ardilla y sus primeros trajes</Animated.Text>
          </Animated.View>
        </View>
        <View style={styles.loteExtrasRow}>
          <Text style={styles.loteIncludes}>1 Animalito  ·  2 trajes</Text>
          <View style={styles.loteExtraDivider} />
          <RNImage source={ICONO_ARDILLA} style={styles.loteIconReward} resizeMode="cover" />
          <View>
            <Text style={styles.loteIconLabel}>ICONO EXCLUSIVO</Text>
            <Text style={styles.loteIconIncluded}>incluido en el lote</Text>
          </View>
        </View>
      </View>
      <View style={styles.loteButton}>
        <MaterialIcons name="shopping-bag" size={16} color="#fffaf0" />
        <Text style={styles.loteButtonText}>VER LOTE</Text>
      </View>
    </View>
  );
}

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
    const recursos = eventoKey === 'lotes'
      ? [ARDILLA_BASE, ARDILLA_TRAJE_1, ARDILLA_TRAJE_2, ICONO_ARDILLA]
      : eventoActual.fondo ? [eventoActual.fondo] : [];
    if (recursos.length) {
      Asset.loadAsync(recursos)
        .then(() => console.log('[Anuncios] Fondo local preparado'))
        .catch(error => console.warn('[Anuncios] Error preparando fondo', error?.message || error));
    }
    if (!visible) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [visible, opacity, eventoActual.fondo, eventoKey]);

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
        {eventoKey === 'lotes' && <LoteArdilla />}
        {!renderContent && <View style={[styles.backgroundTouch, eventoKey === 'lotes' && styles.backgroundTouchLote]} {...swipeResponder} accessibilityLabel={eventoActual.accesible} />}
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
  backgroundTouch: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },
  backgroundTouchLote: { zIndex: 8 },
  pagination: { position: 'absolute', bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 12, elevation: 12 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(118,85,47,0.3)' },
  dotActive: { width: 16, backgroundColor: '#76552f' },
  closeLayer: { position: 'absolute', top: 0, right: 0, width: 70, height: 70, zIndex: 10, elevation: 10 },
  close: { position: 'absolute', top: 16, right: 16, width: 29, height: 29, alignItems: 'center', justifyContent: 'center', zIndex: 11 },
  closeText: { color: '#69452d', fontSize: 30, lineHeight: 29, fontWeight: '300' },
  lotePage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 7, elevation: 7, alignItems: 'center', overflow: 'hidden', backgroundColor: '#f6ebcf' },
  loteBackdrop: { ...StyleSheet.absoluteFillObject },
  loteHeader: { position: 'absolute', top: '5%', flexDirection: 'row', alignItems: 'center', gap: 9 },
  loteHeaderLine: { width: 34, height: 1, backgroundColor: '#bd8d47', opacity: 0.7 },
  loteEyebrow: { color: '#9b6a31', fontSize: 9, fontWeight: '800', letterSpacing: 2.1 },
  loteTitle: { position: 'absolute', top: '8%', color: '#684322', fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: 5, textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  loteSubtitle: { position: 'absolute', top: '18.8%', color: '#b47a35', fontSize: 13, fontWeight: '700', letterSpacing: 1.3 },
  ardillasStage: { position: 'absolute', top: '18%', left: '50%', width: 350, height: 195, transform: [{ translateX: -175 }] },
  ardillaImage: { position: 'absolute' },
  ardillaBase: { left: 54, top: 2, width: 176, height: 188, zIndex: 6 },
  ardillaTraje1: { left: 164, top: 47, width: 103, height: 113, zIndex: 4 },
  ardillaTraje2: { left: 219, top: 75, width: 61, height: 68, zIndex: 2 },
  sparkleOne: { position: 'absolute', left: 54, top: 28, zIndex: 8 },
  sparkleTwo: { position: 'absolute', right: 1, top: 18, zIndex: 8 },
  sparkleText: { color: '#d69c37', fontSize: 25, textShadowColor: '#fff', textShadowRadius: 5 },
  sparkleTextSmall: { color: '#d69c37', fontSize: 15, textShadowColor: '#fff', textShadowRadius: 4 },
  loteInfo: { position: 'absolute', bottom: 72, alignItems: 'center' },
  loteNameWrap: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  loteName: { color: '#9b651d', fontSize: 14, fontWeight: '900', textShadowColor: 'rgba(255,229,142,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  loteNameShine: { position: 'absolute', top: 0, left: 0, width: 25, height: 25, overflow: 'hidden' },
  loteNameShineText: { position: 'absolute', top: 2, left: 7, width: 230, color: '#fff8b8', textShadowColor: '#fff3a0', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5 },
  loteExtrasRow: { marginTop: 3, minWidth: 225, height: 33, paddingHorizontal: 9, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,228,0.58)', borderWidth: 1, borderColor: 'rgba(164,111,43,0.28)' },
  loteIncludes: { color: '#8c673f', fontSize: 8, fontWeight: '700' },
  loteExtraDivider: { width: 1, height: 20, marginHorizontal: 8, backgroundColor: 'rgba(145,94,36,0.24)' },
  loteIconReward: { width: 27, height: 27, marginRight: 6, borderRadius: 8, borderWidth: 1.5, borderColor: '#b97b35' },
  loteIconLabel: { color: '#8f5b1d', fontSize: 7, lineHeight: 9, fontWeight: '900', letterSpacing: 0.45 },
  loteIconIncluded: { color: '#a47c50', fontSize: 6.5, lineHeight: 8, fontWeight: '600' },
  loteButton: { position: 'absolute', bottom: 30, zIndex: 9, minWidth: 128, height: 31, paddingHorizontal: 19, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#b97b35', borderWidth: 1.5, borderColor: '#8b5827', shadowColor: '#68401f', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 3, elevation: 9 },
  loteButtonText: { color: '#fffaf0', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
