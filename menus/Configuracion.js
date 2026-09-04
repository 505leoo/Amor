import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import NotificationSystem from '../utils/NotificationSystem';
import { gameColors, gamePanel } from '../theme/gameTheme';
import { GameLoadingState } from '../components/GameStates';

const APP_VERSION = require('../package.json').version;

const SECCIONES = [
  { id: 'experiencia', titulo: 'Experiencia', icono: 'tune', color: '#7b8f52', opciones: [
    { id: 'notificaciones', titulo: 'Notificaciones', icon: 'notifications-active', defecto: true, desc: 'Recibe avisos de tu pareja, regalos y novedades importantes.' },
  ] },
  { id: 'cuenta', titulo: 'Cuenta', icono: 'person', color: '#5d89ab', opciones: [
    { id: 'cerrar-sesion', titulo: 'Cerrar sesión', icon: 'logout', readonly: true, action: 'logout', desc: 'Cierra tu sesión en este dispositivo.' },
    { id: 'borrar-preferencias', titulo: 'Restablecer preferencias', icon: 'restart-alt', readonly: true, action: 'reset', desc: 'Borra solo tus preferencias guardadas y vuelve a los valores iniciales.' },
  ] },
  { id: 'informacion', titulo: 'Información', icono: 'info', color: '#b07a43', opciones: [
    { id: 'version', titulo: `Versión ${APP_VERSION}`, icon: 'code', readonly: true, desc: `Actualmente tienes Amor ${APP_VERSION}. Las nuevas versiones se reciben automáticamente en producción.` },
    { id: 'soporte', titulo: 'Soporte', icon: 'help-outline', readonly: true, desc: 'Si encontrás un error, contáselo a la persona que administra la app.' },
  ] },
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

  const toggleOpcion = async (opcionId) => {
    const nuevaConfig = { ...configuraciones, [opcionId]: !configuraciones[opcionId] };
    await guardarConfig(nuevaConfig);
    if (opcionId === 'notificaciones') {
      const uid = auth.currentUser?.uid;
      if (nuevaConfig.notificaciones) {
        await NotificationSystem.registerForPushNotifications().catch(() => {});
      } else {
        await NotificationSystem.clearDeviceTokenForUser(uid).catch(() => {});
        NotificationSystem.clearNotificationListeners();
      }
    }
  };

  const ejecutarAccion = async accion => {
    const uid = auth.currentUser?.uid;
    if (accion === 'logout') {
      const usuarioId = auth.currentUser?.uid;
      cerrarConfiguracion();
      await NotificationSystem.clearDeviceTokenForUser(usuarioId);
      await NotificationSystem.notifyUserOffline();
      NotificationSystem.clearNotificationListeners();
      await signOut(auth).catch(() => {});
      return;
    }
    if (accion === 'reset' && uid) {
      await AsyncStorage.removeItem(`config_${uid}`).catch(() => {});
      const valoresIniciales = {};
      SECCIONES.forEach(sec => sec.opciones.forEach(opt => { valoresIniciales[opt.id] = Boolean(opt.defecto); }));
      setConfiguraciones(valoresIniciales);
    }
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

  if (cargando) return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.overlay}><GameLoadingState compact label="Cargando tus preferencias…" /></View>
    </Modal>
  );

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
                  opcion.action ? (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: seccion.color, borderColor: seccion.color }]} onPress={() => ejecutarAccion(opcion.action)} activeOpacity={0.8}>
                      <MaterialIcons name={opcion.icon} size={17} color="#fff8dc" />
                      <Text style={styles.actionButtonText}>{opcion.action === 'logout' ? 'Cerrar sesión' : 'Restablecer preferencias'}</Text>
                    </TouchableOpacity>
                  ) : <View style={[styles.detailInfo, { backgroundColor: seccion.color + '08', borderColor: seccion.color + '20' }]}>
                    <MaterialIcons name="info-outline" size={16} color={seccion.color} />
                    <Text style={[styles.detailInfoText, { color: seccion.color }]}>Información</Text>
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
  overlay: { flex: 1, backgroundColor: gameColors.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  dismiss: { ...StyleSheet.absoluteFillObject },
  position: { width: '100%', alignItems: 'center', transform: [{ translateY: -10 }] },
  card: { height: 295, overflow: 'hidden', ...gamePanel },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: gameColors.parchmentDeep, borderBottomWidth: 1, borderBottomColor: gameColors.gold },
  headerIcon: { width: 33, height: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: gameColors.wood, borderWidth: 1, borderColor: gameColors.parchmentLight },
  headerInfo: { flex: 1, marginLeft: 10 },
  title: { color: gameColors.text, fontFamily: 'Delius', fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  subtitle: { color: gameColors.textSoft, fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800', letterSpacing: 0.6, marginTop: 1 },
  back: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: gameColors.parchmentLight, borderWidth: 1, borderColor: gameColors.gold, marginRight: 5 },
  close: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: gameColors.parchmentLight, borderWidth: 1, borderColor: gameColors.gold },

  sectionList: { flex: 1 },
  sectionListContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 5 },
  sectionRow: { width: '100%', height: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, borderRadius: 9, backgroundColor: gameColors.parchmentLight, borderWidth: 1, borderColor: gameColors.parchmentDeep },
  sectionRowIcon: { width: 23, alignItems: 'center', justifyContent: 'center' },
  sectionRowInfo: { flex: 1, marginLeft: 5 },
  sectionRowText: { color: gameColors.text, fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  sectionRowDescription: { color: gameColors.textSoft, fontFamily: 'Delius', fontSize: 5.5, fontWeight: '700', marginTop: 1 },

  detail: { height: 215, paddingHorizontal: 24, paddingTop: 10, alignItems: 'stretch', justifyContent: 'flex-start' },
  detailTitle: { color: gameColors.text, fontFamily: 'Delius', fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  detailRule: { height: 1, backgroundColor: gameColors.parchmentDeep, marginBottom: 8 },
  detailDesc: { fontFamily: 'Delius', fontSize: 7.5, fontWeight: '700', textAlign: 'center', lineHeight: 10, marginBottom: 12 },
  detailToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5 },
  detailToggleLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  detailToggleLabel: { fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900' },
  switch: { marginLeft: 8 },
  detailInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  detailInfoText: { fontFamily: 'Delius', fontSize: 7.5, fontWeight: '700', marginLeft: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5 },
  actionButtonText: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', marginLeft: 7 },

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
