import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';

const SECCIONES = [
  {
    id: 'sonido',
    titulo: 'Sonido',
    icono: 'volume-up',
    color: '#7ca6c2',
    opciones: [
      { id: 'musica', titulo: 'Música', icon: 'music-note', defecto: true, desc: 'Ambientación sonora relajante durante tu juego.' },
      { id: 'efectos', titulo: 'Efectos', icon: 'audiotrack', defecto: true, desc: 'Sonidos de clics, recompensas y acciones.' },
      { id: 'notif-sonido', titulo: 'Notificaciones', icon: 'notifications-active', defecto: true, desc: 'Alertas sonoras para mensajes y regalos.' },
      { id: 'vibracion', titulo: 'Vibración', icon: 'vibration', defecto: true, desc: 'Retroalimentación háptica en interacciones.' },
    ],
  },
  {
    id: 'visual',
    titulo: 'Visual',
    icono: 'palette',
    color: '#a87840',
    opciones: [
      { id: 'animaciones', titulo: 'Animaciones', icon: 'animation', defecto: true, desc: 'Efectos visuales y transiciones suaves.' },
      { id: 'particulas', titulo: 'Partículas', icon: 'bubble-chart', defecto: true, desc: 'Confeti y efectos de celebración bonitos.' },
      { id: 'brillo', titulo: 'Modo nocturno', icon: 'dark-mode', defecto: false, desc: 'Reduce la intensidad del brillo nocturno.' },
      { id: 'sombras', titulo: 'Sombras', icon: 'filter-list', defecto: true, desc: 'Efectos de sombra para mayor profundidad.' },
    ],
  },
  {
    id: 'notificaciones',
    titulo: 'Notificaciones',
    icono: 'notifications',
    color: '#d94b4b',
    opciones: [
      { id: 'avisos-temporada', titulo: 'Temporadas', icon: 'event', defecto: true, desc: 'Notificaciones de nuevas temporadas.' },
      { id: 'regalos', titulo: 'Regalos', icon: 'card-giftcard', defecto: true, desc: 'Alertas cuando recibes regalos y monedas.' },
      { id: 'recompensas-diarias', titulo: 'Recordatorio', icon: 'today', defecto: false, desc: 'Recordatorio para reclamar tu recompensa.' },
      { id: 'amigos-online', titulo: 'Amigos', icon: 'person-add', defecto: false, desc: 'Notifica cuando tus amigos se conectan.' },
      { id: 'eventos-proximos', titulo: 'Eventos', icon: 'schedule', defecto: true, desc: 'Recordatorio antes de eventos especiales.' },
    ],
  },
  {
    id: 'privacidad',
    titulo: 'Privacidad',
    icono: 'lock',
    color: '#5d89ab',
    opciones: [
      { id: 'perfil-publico', titulo: 'Perfil visible', icon: 'person', defecto: true, desc: 'Permite que otros vean tu perfil.' },
      { id: 'aceptar-regalos', titulo: 'Recibir regalos', icon: 'card-giftcard', defecto: true, desc: 'Permite que te envíen regalos.' },
      { id: 'estadisticas', titulo: 'Compartir datos', icon: 'analytics', defecto: true, desc: 'Ayuda a mejorar el juego anónimamente.' },
      { id: 'modo-incognito', titulo: 'Modo incógnito', icon: 'visibility-off', defecto: false, desc: 'No aparecer en ránkings de jugadores.' },
    ],
  },
  {
    id: 'accesibilidad',
    titulo: 'Accesibilidad',
    icono: 'accessibility',
    color: '#6da160',
    opciones: [
      { id: 'texto-grande', titulo: 'Texto grande', icon: 'text-fields', defecto: false, desc: 'Aumenta el tamaño de fuentes.' },
      { id: 'contraste-alto', titulo: 'Contraste', icon: 'contrast', defecto: false, desc: 'Colores más intensos para mejor visibilidad.' },
      { id: 'reductor-movimiento', titulo: 'Menos movimiento', icon: 'gps-off', defecto: false, desc: 'Minimiza animaciones para comodidad.' },
      { id: 'subtitulos', titulo: 'Subtítulos', icon: 'closed-caption', defecto: false, desc: 'Muestra texto para diálogos y efectos.' },
    ],
  },
  {
    id: 'experiencia',
    titulo: 'Experiencia',
    icono: 'sports-esports',
    color: '#c99d42',
    opciones: [
      { id: 'dificultad-facil', titulo: 'Modo fácil', icon: 'trending-down', defecto: false, desc: 'Reduce la dificultad de juegos.' },
      { id: 'hints', titulo: 'Pistas', icon: 'lightbulb', defecto: true, desc: 'Muestra ayudas durante juegos.' },
      { id: 'tutoriales', titulo: 'Tutoriales', icon: 'school', defecto: true, desc: 'Vuelve a ver guías de nuevas funciones.' },
      { id: 'puntuaciones', titulo: 'Puntuaciones', icon: 'leaderboard', defecto: true, desc: 'Guarda y comparte tus mejores resultados.' },
    ],
  },
  {
    id: 'sistema',
    titulo: 'Sistema',
    icono: 'storage',
    color: '#8d6024',
    opciones: [
      { id: 'auto-update', titulo: 'Auto-actualizar', icon: 'cloud-download', defecto: true, desc: 'Descarga actualizaciones con WiFi.' },
      { id: 'cache-agresivo', titulo: 'Caché', icon: 'storage', defecto: true, desc: 'Guarda recursos para cargas rápidas.' },
      { id: 'logs', titulo: 'Diagnóstico', icon: 'bug-report', defecto: true, readonly: true, desc: 'Envía reportes para mejorar.' },
    ],
  },
  {
    id: 'sobre',
    titulo: 'Información',
    icono: 'info',
    color: '#b07a43',
    opciones: [
      { id: 'version', titulo: 'Versión v2.5.0', icon: 'code', defecto: false, readonly: true, desc: 'Última actualización 20 ago 2026.' },
      { id: 'soporte', titulo: 'Soporte', icon: 'help-outline', defecto: false, readonly: true, desc: 'Contacta con el equipo de Menta.' },
      { id: 'creditos', titulo: 'Créditos', icon: 'groups', defecto: false, readonly: true, desc: 'Conoce al equipo detrás de Amor.' },
      { id: 'licencia', titulo: 'Términos', icon: 'description', defecto: false, readonly: true, desc: 'Lee términos de servicio.' },
    ],
  },
];

export const ConfiguracionModal = ({ visible, onClose }) => {
  const { width: screenWidth } = useWindowDimensions();
  const [pagina, setPagina] = useState(0);
  const [seccionActiva, setSeccionActiva] = useState(null);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
  const [configuraciones, setConfiguraciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const swipeStart = useRef(null);
  const fade = useRef(new Animated.Value(0)).current;
  const modalWidth = Math.min(Math.max(screenWidth - 32, 320), 360);
  const gridWidth = modalWidth - 16;
  const tileWidth = Math.floor((gridWidth - 12) / 3);

  const seccion = SECCIONES.find(item => item.id === seccionActiva);
  const opciones = seccion?.opciones || [];
  const paginas = [];
  for (let index = 0; index < opciones.length; index += 6) paginas.push(opciones.slice(index, index + 6));
  const opcion = opcionSeleccionada ? opciones.find(o => o.id === opcionSeleccionada) : null;

  // Cargar configuraciones guardadas
  useEffect(() => {
    const cargarConfig = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setCargando(false);
        return;
      }
      try {
        const configGuardada = await AsyncStorage.getItem(`config_${uid}`);
        if (configGuardada) {
          setConfiguraciones(JSON.parse(configGuardada));
        } else {
          const configInicial = {};
          SECCIONES.forEach(sec => {
            sec.opciones.forEach(opt => {
              configInicial[opt.id] = opt.defecto;
            });
          });
          setConfiguraciones(configInicial);
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      } finally {
        setCargando(false);
      }
    };
    cargarConfig();
  }, [visible]);

  const guardarConfig = async (nuevaConfig) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await AsyncStorage.setItem(`config_${uid}`, JSON.stringify(nuevaConfig));
      setConfiguraciones(nuevaConfig);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
    }
  };

  const toggleOpcion = (opcionId) => {
    const nuevaConfig = { ...configuraciones, [opcionId]: !configuraciones[opcionId] };
    guardarConfig(nuevaConfig);
  };

  const cerrarConfiguracion = () => {
    setSeccionActiva(null);
    setOpcionSeleccionada(null);
    setPagina(0);
    onClose();
  };

  useEffect(() => {
    if (!visible) return undefined;
    setPagina(0);
    setSeccionActiva(null);
    setOpcionSeleccionada(null);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    return undefined;
  }, [visible]);

  useEffect(() => {
    if (!seccionActiva) return undefined;
    setPagina(0);
    setOpcionSeleccionada(null);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    return undefined;
  }, [seccionActiva]);

  if (cargando) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={cerrarConfiguracion}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={cerrarConfiguracion} />
        <View style={styles.position}>
          <View style={[styles.card, { width: modalWidth }]}>
            <View style={styles.header}>
              <View style={styles.headerIcon}><MaterialIcons name="settings" size={23} color="#fff8dc" /></View>
              <View style={styles.headerInfo}><Text style={styles.title}>{seccion?.titulo || 'CONFIGURACIÓN'}</Text><Text style={styles.subtitle}>PREFERENCIAS DE MENTA</Text></View>
              {seccionActiva && <TouchableOpacity style={styles.back} onPress={() => opcionSeleccionada ? setOpcionSeleccionada(null) : setSeccionActiva(null)} hitSlop={8}><MaterialIcons name="arrow-back" size={17} color="#405e76" /></TouchableOpacity>}
              <TouchableOpacity style={styles.close} onPress={cerrarConfiguracion} hitSlop={8}><MaterialIcons name="close" size={18} color="#76552f" /></TouchableOpacity>
            </View>

            {!seccionActiva ? (
              <ScrollView style={styles.sectionList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.sectionListContent}>
                {SECCIONES.map(section => (
                  <TouchableOpacity key={section.id} style={styles.sectionRow} activeOpacity={0.8} onPress={() => setSeccionActiva(section.id)}>
                    <View style={styles.sectionRowIcon}><MaterialIcons name={section.icono} size={15} color={section.color} /></View>
                    <View style={styles.sectionRowInfo}>
                      <Text style={styles.sectionRowText} numberOfLines={1}>{section.titulo}</Text>
                      <Text style={styles.sectionRowDescription} numberOfLines={1}>{section.opciones.length} opciones</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={17} color="#7ca6c2" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : opcionSeleccionada ? (
              <View style={styles.detail}>
                <Text style={styles.detailTitle}>{opcion.titulo}</Text>
                <View style={styles.detailRule} />
                <Text style={[styles.detailDesc, { color: seccion.color }]}>{opcion.desc}</Text>
                {!opcion.readonly && (
                  <View style={[styles.detailToggle, { borderColor: seccion.color + '40', backgroundColor: seccion.color + '08' }]}>
                    <View style={styles.detailToggleLabelWrap}>
                      <MaterialIcons name={opcion.icon} size={20} color={seccion.color} style={{ marginRight: 8 }} />
                      <Text style={[styles.detailToggleLabel, { color: seccion.color }]}>Activo:</Text>
                    </View>
                    <Switch
                      value={configuraciones[opcion.id] || false}
                      onValueChange={() => toggleOpcion(opcion.id)}
                      trackColor={{ false: '#e0e0e0', true: seccion.color + '40' }}
                      thumbColor={configuraciones[opcion.id] ? seccion.color : '#999'}
                      style={styles.switch}
                    />
                  </View>
                )}
                {opcion.readonly && (
                  <View style={[styles.detailInfo, { backgroundColor: seccion.color + '08', borderColor: seccion.color + '20' }]}>
                    <MaterialIcons name="info-outline" size={16} color={seccion.color} />
                    <Text style={[styles.detailInfoText, { color: seccion.color }]}>Solo lectura</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.carousel}>
                <View style={styles.touchArea} onStartShouldSetResponder={() => true} onResponderGrant={({ nativeEvent }) => { swipeStart.current = nativeEvent.pageY; }} onResponderRelease={({ nativeEvent }) => {
                  const distancia = nativeEvent.pageY - swipeStart.current;
                  if (Math.abs(distancia) > 25 && paginas.length > 1) setPagina(actual => distancia < 0 ? (actual + 1) % paginas.length : (actual - 1 + paginas.length) % paginas.length);
                  swipeStart.current = null;
                }}>
                  <View style={[styles.page, { width: gridWidth }]}>
                    <View style={styles.list}>
                      {(paginas[pagina] || []).map(opt => (
                        <Animated.View key={opt.id} style={{ opacity: fade }}>
                          <TouchableOpacity activeOpacity={0.75} onPress={() => setOpcionSeleccionada(opt.id)} style={[styles.item, { width: tileWidth, height: 90 }, opt.readonly && styles.itemReadonly]}>
                            <View style={[styles.itemIconBg, { backgroundColor: seccion.color + '20', borderColor: seccion.color + '40' }]}>
                              <MaterialIcons name={opt.icon} size={18} color={seccion.color} />
                            </View>
                            <Text style={[styles.itemTitle, opt.readonly && styles.itemTitleReadonly]} numberOfLines={2}>{opt.titulo}</Text>
                            <View style={[styles.itemToggle, { backgroundColor: configuraciones[opt.id] ? seccion.color + '30' : '#f0f0f0' }]}>
                              <Switch
                                value={configuraciones[opt.id] || false}
                                onValueChange={() => !opt.readonly && toggleOpcion(opt.id)}
                                trackColor={{ false: '#ddd', true: seccion.color + '40' }}
                                thumbColor={configuraciones[opt.id] ? seccion.color : '#aaa'}
                                disabled={opt.readonly}
                                style={styles.itemSwitch}
                              />
                            </View>
                          </TouchableOpacity>
                        </Animated.View>
                      ))}
                    </View>
                  </View>
                </View>
                {paginas.length > 1 && <View style={styles.indicators}>{paginas.map((_, index) => <View key={index} style={[styles.indicator, pagina === index && styles.indicatorActive]} />)}</View>}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16, 9, 5, 0.82)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  dismiss: { ...StyleSheet.absoluteFillObject },
  position: { width: '100%', alignItems: 'center', transform: [{ translateY: -10 }] },
  card: { height: 295, overflow: 'hidden', borderRadius: 18, backgroundColor: '#edf5fb', borderWidth: 3, borderColor: '#8eb3ce', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 28 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: '#d6e9f6', borderBottomWidth: 1, borderBottomColor: '#92b8d2' },
  headerIcon: { width: 33, height: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5d89ab', borderWidth: 1, borderColor: '#edf8ff' },
  headerInfo: { flex: 1, marginLeft: 10 },
  title: { color: '#405e76', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  subtitle: { color: '#65869f', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800', letterSpacing: 0.6, marginTop: 1 },
  back: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(250,253,255,0.76)', borderWidth: 1, borderColor: '#a9c9dd', marginRight: 5 },
  close: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(250,253,255,0.76)', borderWidth: 1, borderColor: '#a9c9dd' },

  sectionList: { flex: 1 },
  sectionListContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 5 },
  sectionRow: { width: '100%', height: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, borderRadius: 9, backgroundColor: '#dfeef8', borderWidth: 1, borderColor: '#bdd8e9' },
  sectionRowIcon: { width: 23, alignItems: 'center', justifyContent: 'center' },
  sectionRowInfo: { flex: 1, marginLeft: 5 },
  sectionRowText: { color: '#476982', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  sectionRowDescription: { color: '#6b8aa1', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '700', marginTop: 1 },

  detail: { height: 215, paddingHorizontal: 24, paddingTop: 10, alignItems: 'stretch', justifyContent: 'flex-start' },
  detailTitle: { color: '#405e76', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  detailRule: { height: 1, backgroundColor: '#bdd8e9', marginBottom: 8 },
  detailDesc: { fontFamily: 'Delius', fontSize: 7.5, fontWeight: '700', textAlign: 'center', lineHeight: 10, marginBottom: 12 },
  detailToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5 },
  detailToggleLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  detailToggleLabel: { fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900' },
  switch: { marginLeft: 8 },
  detailInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  detailInfoText: { fontFamily: 'Delius', fontSize: 7.5, fontWeight: '700', marginLeft: 8 },

  carousel: { height: 215, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  touchArea: { width: '100%', height: 215, alignItems: 'center', justifyContent: 'center' },
  page: { height: 215, justifyContent: 'flex-start', alignSelf: 'center', paddingTop: 8 },
  list: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: 6, rowGap: 6 },
  item: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 5, borderRadius: 9, backgroundColor: '#dfeef8', borderWidth: 1, borderColor: '#bdd8e9' },
  itemReadonly: { backgroundColor: '#d7dde1', borderColor: '#c3cbd0', opacity: 0.7 },
  itemIconBg: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 4 },
  itemTitle: { width: '100%', color: '#476982', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  itemTitleReadonly: { color: '#78848b' },
  itemToggle: { width: 40, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemSwitch: { transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] },

  indicators: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 6 },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7ca6c2', borderWidth: 1, borderColor: '#edf5fb' },
  indicatorActive: { height: 15, backgroundColor: '#5d89ab' },
});
