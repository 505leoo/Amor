import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image as RNImage, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

const EVENTOS_ANUNCIOS = {
  lotes: { titulo: 'Lotes', accesible: 'Ver lote de Ardilla' },
};
const EVENTOS_ORDEN = ['lotes'];

const ARDILLA_BASE = require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png');
const ARDILLA_TRAJE_1 = require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat1.png');
const ARDILLA_TRAJE_2 = require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat2.png');
const ICONO_ARDILLA = require('../assets/inicio/iconos/icono-ardilla-bellota-v2.png');

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

function FechaAurora() {
  const brillo = useRef(new Animated.Value(0)).current;
  const resplandor = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animacion = Animated.loop(Animated.sequence([
      Animated.timing(brillo, { toValue: 1, duration: 1700, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(brillo, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    const pulso = Animated.loop(Animated.sequence([
      Animated.timing(resplandor, { toValue: 1, duration: 1250, useNativeDriver: true }),
      Animated.timing(resplandor, { toValue: 0, duration: 1250, useNativeDriver: true }),
    ]));
    animacion.start();
    pulso.start();
    return () => { animacion.stop(); pulso.stop(); };
  }, [brillo, resplandor]);
  const moverBrillo = brillo.interpolate({ inputRange: [0, 1], outputRange: [-60, 250] });
  const opacidadResplandor = resplandor.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.42] });
  const escalaResplandor = resplandor.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  return (
    <View pointerEvents="none" style={styles.fechaAuroraPage}>
      <Svg style={styles.fechaAuroraBackdrop} width="100%" height="100%" viewBox="0 0 800 450" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="auroraRadial" cx="50%" cy="43%" rx="68%" ry="84%">
            <Stop offset="0" stopColor="#fffafd" />
            <Stop offset="0.34" stopColor="#ffe5f0" />
            <Stop offset="0.7" stopColor="#f4c7dc" />
            <Stop offset="1" stopColor="#dfa9c4" />
          </RadialGradient>
        </Defs>
        <Path d="M0 0H800V450H0Z" fill="url(#auroraRadial)" />
        <Path d="M400 193 L328 -45 H472 Z M400 193 L590 -30 H687 Z M400 193 L849 85 V160 Z M400 193 L850 310 V398 Z M400 193 L585 480 H493 Z M400 193 L216 480 H307 Z M400 193 L-48 311 V399 Z M400 193 L-49 85 V160 Z M400 193 L211 -30 H114 Z" fill="#fff8ff" opacity="0.2" />
        <Circle cx="400" cy="193" r="188" fill="none" stroke="#fff5ff" strokeWidth="3" opacity="0.28" />
        <Circle cx="400" cy="193" r="239" fill="none" stroke="#8f83b7" strokeWidth="2" opacity="0.13" />
        <Circle cx="400" cy="193" r="292" fill="none" stroke="#fffaff" strokeWidth="7" opacity="0.18" />
        <Circle cx="400" cy="193" r="132" fill="#fffaff" opacity="0.1" />
        <Circle cx="168" cy="88" r="4" fill="#fff" opacity="0.8" />
        <Circle cx="641" cy="104" r="3" fill="#fff" opacity="0.75" />
        <Circle cx="672" cy="330" r="5" fill="#f8d8ed" opacity="0.9" />
        <Circle cx="132" cy="344" r="3" fill="#dbe9ff" opacity="0.95" />
        <Circle cx="237" cy="55" r="2" fill="#fbe2f4" opacity="0.9" />
        <Circle cx="581" cy="365" r="3" fill="#e8d7ff" opacity="0.9" />
        <Path d="M90 180 l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#fff" opacity="0.55" />
        <Path d="M705 205 l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffe4f5" opacity="0.62" />
      </Svg>

      <View style={styles.fechaAuroraHeader}>
        <View style={styles.fechaAuroraHeaderLine} />
        <Text style={styles.fechaAuroraEyebrow}>UNA FECHA PARA RECORDAR</Text>
        <View style={styles.fechaAuroraHeaderLine} />
      </View>
      <Text style={styles.fechaAuroraTitle}>CUMPLEAÑOS</Text>
      <View style={styles.fechaAuroraNameWrap}>
        <Text style={styles.fechaAuroraName}>Aurora · 18 años</Text>
        <Animated.View style={[styles.fechaAuroraShine, { transform: [{ translateX: moverBrillo }, { skewX: '-18deg' }] }]} />
      </View>

      <View style={styles.fechaAuroraStage}>
        <Animated.View style={[styles.fechaAuroraHalo, { opacity: opacidadResplandor, transform: [{ scale: escalaResplandor }] }]} />
        <View style={styles.fechaAuroraOrbit} />
        <Animated.View style={[styles.fechaAuroraBadge, { transform: [{ scale: resplandor.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] }]}>
          <View style={styles.fechaAuroraBadgeInner}>
            <MaterialIcons name="cake" size={31} color="#fff8ff" />
            <Text style={styles.fechaAuroraAge}>18</Text>
            <Text style={styles.fechaAuroraAgeLabel}>AÑOS</Text>
          </View>
        </Animated.View>
        <View style={[styles.fechaAuroraSpark, styles.fechaAuroraSparkOne]}><Text style={styles.fechaAuroraSparkText}>✦</Text></View>
        <View style={[styles.fechaAuroraSpark, styles.fechaAuroraSparkTwo]}><Text style={styles.fechaAuroraSparkTextSmall}>✦</Text></View>
        <View style={[styles.fechaAuroraSpark, styles.fechaAuroraSparkThree]}><Text style={styles.fechaAuroraSparkTextSmall}>✦</Text></View>
        <View style={[styles.fechaAuroraSpark, styles.fechaAuroraSparkFour]}><Text style={styles.fechaAuroraSparkText}>✧</Text></View>
        <View style={[styles.fechaAuroraSpark, styles.fechaAuroraSparkFive]}><Text style={styles.fechaAuroraSparkTextSmall}>✧</Text></View>
      </View>

      <View style={styles.fechaAuroraInfo}>
        <Text style={styles.fechaAuroraInfoKicker}>UN NUEVO CAPÍTULO COMIENZA</Text>
        <Text style={styles.fechaAuroraInfoTitle}>Aurora cumple 18 años</Text>
        <Text style={styles.fechaAuroraInfoText}>Una celebración llena de rosa, violeta, risas y recuerdos para guardar juntos.</Text>
      </View>
      <View style={styles.fechaAuroraButton}>
        <MaterialIcons name="cake" size={16} color="#fffaff" />
        <Text style={styles.fechaAuroraButtonText}>CELEBRAR SUS 18</Text>
      </View>
    </View>
  );
}

export default function Anuncios({ visible, onClose, onOpen, renderContent, evento = 'lotes' }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const closeOpacity = useRef(new Animated.Value(0.45)).current;
  // Este carrusel queda reservado únicamente para el anuncio de Lotes.
  const eventos = EVENTOS_ORDEN;
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    setPagina(0);
  }, [evento]);
  const eventoActual = EVENTOS_ANUNCIOS.lotes;
  const eventoKey = 'lotes';
  const cerrarAnuncio = () => {
    onClose?.();
  };

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
        {eventoKey === 'fechas' && <FechaAurora />}
        {!renderContent && <TouchableOpacity
          style={[styles.openButtonHit, eventoKey === 'lotes' && styles.openButtonHitLote]}
          activeOpacity={0.82}
          onPress={() => onOpen?.(eventoKey)}
          accessibilityRole="button"
          accessibilityLabel={eventoActual.accesible}
        />}
        {renderContent ? renderContent() : null}
        <Animated.View style={[styles.closeLayer, { opacity: closeOpacity }]}>
          <TouchableOpacity style={styles.close} onPress={cerrarAnuncio} accessibilityLabel={pagina < eventos.length - 1 ? "Ver siguiente anuncio" : "Cerrar anuncios"} hitSlop={10}>
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
  openButtonHit: { position: 'absolute', bottom: 30, width: 158, height: 31, borderRadius: 11, zIndex: 9, elevation: 9 },
  openButtonHitLote: { width: 128 },
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
  fechaAuroraPage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 7, elevation: 7, alignItems: 'center', overflow: 'hidden', backgroundColor: '#f8d6e5' },
  fechaAuroraBackdrop: { ...StyleSheet.absoluteFillObject },
  fechaAuroraHeader: { position: 'absolute', top: '5%', flexDirection: 'row', alignItems: 'center', gap: 9 },
  fechaAuroraHeaderLine: { width: 34, height: 1, backgroundColor: '#c8789d', opacity: 0.72 },
  fechaAuroraEyebrow: { color: '#a65d82', fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  fechaAuroraTitle: { position: 'absolute', top: '8%', color: '#8c3f68', fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: 4.2, textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  fechaAuroraNameWrap: { position: 'absolute', top: '18.8%', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 7 },
  fechaAuroraName: { color: '#c55388', fontSize: 15, fontWeight: '900', letterSpacing: 1.3, textShadowColor: 'rgba(255,239,249,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  fechaAuroraShine: { position: 'absolute', top: -2, left: 0, width: 22, height: 29, backgroundColor: 'rgba(255,255,255,0.55)' },
  fechaAuroraStage: { position: 'absolute', top: '25%', left: '50%', width: 260, height: 170, transform: [{ translateX: -130 }] },
  fechaAuroraHalo: { position: 'absolute', left: 30, top: 5, width: 200, height: 150, borderRadius: 100, backgroundColor: 'rgba(255,245,255,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.42)' },
  fechaAuroraOrbit: { position: 'absolute', left: 50, top: 17, width: 160, height: 123, borderRadius: 80, borderWidth: 1, borderColor: 'rgba(255,229,250,0.55)', transform: [{ rotate: '-12deg' }] },
  fechaAuroraBadge: { position: 'absolute', left: 72, top: 16, width: 116, height: 116, borderRadius: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: '#df78a7', borderWidth: 2, borderColor: '#fff1fb', shadowColor: '#a94f7e', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 9, elevation: 8 },
  fechaAuroraBadgeInner: { width: 94, height: 94, borderRadius: 47, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ed9fbe', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.78)' },
  fechaAuroraAge: { marginTop: -2, color: '#fffaff', fontSize: 27, lineHeight: 27, fontWeight: '900', textShadowColor: '#b84e7e', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  fechaAuroraAgeLabel: { marginTop: -1, color: '#fff0f8', fontSize: 7, fontWeight: '900', letterSpacing: 1.4 },
  fechaAuroraSpark: { position: 'absolute' },
  fechaAuroraSparkOne: { left: 26, top: 24 },
  fechaAuroraSparkTwo: { right: 20, top: 26 },
  fechaAuroraSparkThree: { right: 44, bottom: 12 },
  fechaAuroraSparkFour: { left: 52, bottom: 17 },
  fechaAuroraSparkFive: { right: 61, top: 4 },
  fechaAuroraSparkText: { color: '#fff7ff', fontSize: 26, textShadowColor: '#d28ec0', textShadowRadius: 6 },
  fechaAuroraSparkTextSmall: { color: '#fff7ff', fontSize: 15, textShadowColor: '#8a82bb', textShadowRadius: 5 },
  fechaAuroraInfo: { position: 'absolute', bottom: 72, width: 290, alignItems: 'center' },
  fechaAuroraInfoKicker: { color: '#b15d87', fontSize: 7, fontWeight: '900', letterSpacing: 1.25, textAlign: 'center' },
  fechaAuroraInfoTitle: { marginTop: 2, color: '#803d65', fontSize: 15, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  fechaAuroraInfoText: { marginTop: 4, color: '#89546f', fontSize: 8.5, lineHeight: 12, fontWeight: '700', textAlign: 'center' },
  fechaAuroraButton: { position: 'absolute', bottom: 30, zIndex: 9, minWidth: 158, height: 31, paddingHorizontal: 19, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#d66f9d', borderWidth: 1.5, borderColor: '#aa4f7d', shadowColor: '#99446d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.32, shadowRadius: 4, elevation: 9 },
  fechaAuroraButtonText: { color: '#fffaff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
