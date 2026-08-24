import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { gameColors, gamePanel } from '../theme/gameTheme';

// PRIORIDAD: toda tarjeta nueva debe incluir titulo, descripcion/texto y fecha (YYYY-MM-DD).
// La fecha alimenta el badge relativo y la fecha completa de la vista detallada.
const ADMIN_EMAIL = 'admin@gmail.com';
const FECHA_CORTE_INDICADOR = '2026-08-21';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const obtenerPartesFecha = fecha => {
  const [anio, mes, dia] = String(fecha).split('-').map(Number);
  return { anio, mes, dia };
};

const textoFechaRelativa = fecha => {
  const { anio, mes, dia } = obtenerPartesFecha(fecha);
  const ahora = new Date();
  const hoy = Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const destino = Date.UTC(anio, mes - 1, dia);
  const dias = Math.round((destino - hoy) / 86400000);
  if (dias === 0) return 'Hoy';
  if (dias > 0) return `En ${dias}d`;
  return `Hace ${Math.abs(dias)}d`;
};

const textoFechaCompleta = fecha => {
  const { anio, mes, dia } = obtenerPartesFecha(fecha);
  return `Escrita el ${dia} de ${MESES[mes - 1]} de ${anio}`;
};

const SECCIONES = [
  { id: 'temporadas', titulo: 'Temporadas', descripcion: 'Nuevas aventuras y caminos por descubrir.', icono: 'event', tarjetas: [{ id: 'temporada-1', titulo: 'Temporada activa', texto: 'Descubre el nuevo camino de Menta.', fecha: '2026-08-20', detalle: 'Una nueva temporada llega con desafíos, recompensas y pequeñas historias para acompañarte durante tus partidas. Revisa las novedades y prepara todo para no perderte ninguna actividad.' }] },
  { id: 'eventos', titulo: 'Eventos', descripcion: 'Actividades especiales para compartir y disfrutar.', icono: 'celebration', tarjetas: [{ id: 'evento-1', titulo: 'Evento especial', texto: 'Hay una nueva actividad para disfrutar.', fecha: '2026-08-20', detalle: 'Durante este evento podrás participar en actividades especiales y encontrar sorpresas preparadas por Menta. Estate atento a las fechas y disfruta cada momento.' }] },
  { id: 'novedades', titulo: 'Novedades', descripcion: 'Noticias y cambios importantes de Menta.', icono: 'new-releases', tarjetas: [
    { id: 'actualizacion-1-0-5', titulo: 'Tus Animalitos brillan más que nunca', texto: 'Animalitos, trajes y temporadas tienen una nueva forma de disfrutarse.', fecha: '2026-08-23', detalle: '¡La versión 1.0.5 ya está aquí! Renovamos por completo la colección de Animalitos para que sea más bonita, ordenada y fácil de entender. Ahora puedes ver tus animalitos en un catálogo, conocer su rareza y temporada, revisar sus habilidades, consultar sus recompensas y mejorar cada uno con sus propias cartas. También existen cartas universales, que sirven como ayuda cuando te faltan cartas de un animal. El Comerciante ahora ofrece cartas únicamente de los animalitos que ya desbloqueaste, mientras que la experiencia se consigue jugando y mejorando a tus compañeros. El vestidor también cambió: los trajes aparecen en un catálogo horizontal de dos filas, cada uno tiene una rareza con su propio color y los que todavía no conseguiste se muestran bloqueados. Además, organizamos mejor los eventos de cada temporada y agregamos accesos especiales para revisar cómo se ven sus contenidos. Son muchos cambios, pero la idea es sencilla: que coleccionar, vestir y mejorar a tus animalitos sea más claro, divertido y especial.' },
    { id: 'actualizacion-1-0-2-a-1-0-4', titulo: 'Actualización General', texto: 'Arreglamos varias cosas para que Amor funcione mejor.', fecha: '2026-08-21', detalle: 'En esta actualización arreglamos varios problemas: ahora el tutorial avanza correctamente después de reclamar recompensas; el Comerciante entrega 3 cartas y se bloquea cuando corresponde; mejorar a Halcón funciona con las monedas y cartas correctas; las misiones y los juegos entregan recompensas más equilibradas; el nivel y la barra de EXP del perfil se muestran correctamente; las actualizaciones de la app llegan a producción; el menú de pareja carga mejor, muestra quién está conectado de verdad y no enseña personas que ya tienen pareja; también mejoramos las temporadas, los avisos y varias pantallas para que todo sea más claro y estable. La versión cambió de la 1.0.2 a la 1.0.4.' },
    { id: 'novedad-1', titulo: 'Novedades de Menta', texto: 'Pronto conocerás todas las mejoras.', fecha: '2026-08-20', detalle: 'Aquí aparecerán las noticias importantes, las mejoras recientes y todas esas pequeñas cosas que hacen que Menta se sienta cada vez más completa.' },
  ] },
  { id: 'mantenimiento', titulo: 'Mantenimiento', descripcion: 'Avisos sobre pausas y ajustes del juego.', icono: 'construction', tarjetas: [{ id: 'mantenimiento-1', titulo: 'Todo en orden', texto: 'Te avisaremos antes de cualquier pausa.', fecha: '2026-08-20', detalle: 'Cuando haya una pausa programada o un ajuste importante, encontrarás aquí la información necesaria para saber qué ocurre y cuándo volverá todo a la normalidad.' }] },
  { id: 'comunidad', titulo: 'Comunidad', descripcion: 'Mensajes para crecer juntos dentro de Menta.', icono: 'groups', tarjetas: [{ id: 'comunidad-1', titulo: 'Noticias de la comunidad', texto: 'Menta también crece contigo.', fecha: '2026-08-20', detalle: 'Este espacio reúne mensajes, celebraciones y novedades que nacen junto a la comunidad. Gracias por ser parte de este rincón y ayudarlo a crecer.' }] },
];

export const AVISOS_CLAVES = SECCIONES.flatMap(seccion => seccion.tarjetas.filter(tarjeta => tarjeta.fecha >= FECHA_CORTE_INDICADOR).map(tarjeta => `${seccion.id}:${tarjeta.id}:${tarjeta.fecha}`));
export const AVISOS_REVISION = AVISOS_CLAVES.join('|');
export const hayAvisosPendientes = revisionAnterior => {
  const conocidas = new Set(String(revisionAnterior || '').split('|').filter(Boolean));
  return AVISOS_CLAVES.some(clave => !conocidas.has(clave));
};

export const AvisosModal = ({ visible, onClose }) => {
  const { width: screenWidth } = useWindowDimensions();
  const [pagina, setPagina] = useState(0);
  const [seccionActiva, setSeccionActiva] = useState(null);
  const [avisoSeleccionado, setAvisoSeleccionado] = useState(null);
  const [avisoPendiente, setAvisoPendiente] = useState(null);
  const usuarioEsAdmin = auth.currentUser?.email?.toLowerCase() === ADMIN_EMAIL;
  const swipeStart = useRef(null);
  const fade = useRef(new Animated.Value(0)).current;
  const modalWidth = Math.min(Math.max(screenWidth - 32, 320), 360);
  const gridWidth = modalWidth - 16;
  const tileWidth = Math.floor((gridWidth - 12) / 3);
  const seccion = SECCIONES.find(item => item.id === seccionActiva);
  const tarjetas = seccion?.tarjetas || [];
  const paginas = [];
  for (let index = 0; index < tarjetas.length; index += 6) paginas.push(tarjetas.slice(index, index + 6));

  const cerrarAvisos = async () => {
    const uid = auth.currentUser?.uid;
    const revision = uid ? await AsyncStorage.getItem(`indicador_avisos_${uid}`).catch(() => '') : '';
    const quedanPendientes = hayAvisosPendientes(revision);
    setAvisoPendiente(null);
    onClose(quedanPendientes);
  };

  const marcarAvisoLeido = async (grupo, tarjeta) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const clave = `${grupo.id}:${tarjeta.id}:${tarjeta.fecha}`;
    const revisionAnterior = await AsyncStorage.getItem(`indicador_avisos_${uid}`).catch(() => '');
    const clavesVigentes = new Set(AVISOS_CLAVES);
    const conocidas = new Set(String(revisionAnterior || '').split('|').filter(item => clavesVigentes.has(item)));
    conocidas.add(clave);
    await AsyncStorage.setItem(`indicador_avisos_${uid}`, [...conocidas].join('|')).catch(() => {});
    if (avisoPendiente?.seccionId === grupo.id && avisoPendiente?.tarjetaId === tarjeta.id) setAvisoPendiente(null);
  };

  useEffect(() => {
    if (!visible) return undefined;
    setPagina(0);
    setSeccionActiva(null);
    setAvisoSeleccionado(null);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    return undefined;
  }, [visible]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    let activo = true;
    AsyncStorage.getItem(`indicador_avisos_${uid}`).then(revisionAnterior => {
      if (!activo) return;
      const conocidas = new Set(String(revisionAnterior || '').split('|').filter(Boolean));
      let pendiente = null;
      for (const grupo of SECCIONES) {
        const tarjeta = grupo.tarjetas.find(item => item.fecha >= FECHA_CORTE_INDICADOR && !conocidas.has(`${grupo.id}:${item.id}:${item.fecha}`));
        if (tarjeta) {
          pendiente = { seccionId: grupo.id, tarjetaId: tarjeta.id };
          break;
        }
      }
      setAvisoPendiente(pendiente);
    }).catch(() => setAvisoPendiente(null));
    return () => { activo = false; };
  }, [visible]);

  useEffect(() => {
    if (!seccionActiva) return undefined;
    setPagina(0);
    setAvisoSeleccionado(null);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    return undefined;
  }, [seccionActiva]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={cerrarAvisos}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={cerrarAvisos} />
        <View style={styles.position}>
          <View style={[styles.card, { width: modalWidth }]}>
            <View style={styles.header}>
              <View style={styles.headerIcon}><MaterialIcons name="notifications-none" size={23} color="#fff8dc" /></View>
              <View style={styles.headerInfo}><Text style={styles.title}>{seccion?.titulo || 'AVISOS'}</Text><Text style={styles.subtitle}>NOVEDADES DE MENTA</Text></View>
              {seccionActiva && <TouchableOpacity style={styles.back} onPress={() => avisoSeleccionado ? setAvisoSeleccionado(null) : setSeccionActiva(null)} hitSlop={8}><MaterialIcons name="arrow-back" size={17} color="#405e76" /></TouchableOpacity>}
              <TouchableOpacity style={styles.close} onPress={cerrarAvisos} hitSlop={8}><MaterialIcons name="close" size={18} color="#76552f" /></TouchableOpacity>
            </View>
            {!seccionActiva ? <View style={styles.sectionList}>
              {SECCIONES.map(section => <TouchableOpacity key={section.id} style={styles.sectionRow} activeOpacity={0.8} onPress={() => setSeccionActiva(section.id)}>
                <View style={styles.sectionRowIcon}><MaterialIcons name={section.icono} size={15} color="#5d89ab" /></View>
                <View style={styles.sectionRowInfo}>
                  <Text style={styles.sectionRowText} numberOfLines={1}>{section.titulo}</Text>
                  <Text style={styles.sectionRowDescription} numberOfLines={1}>{section.descripcion}</Text>
                </View>
                {avisoPendiente?.seccionId === section.id && <View style={styles.routeDot} />}
                <MaterialIcons name="chevron-right" size={17} color="#7ca6c2" />
              </TouchableOpacity>)}
            </View> : avisoSeleccionado ? <View style={styles.detail}>
              <Text style={styles.detailTitle}>{avisoSeleccionado.titulo}</Text>
              <View style={styles.detailRule} />
              <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator>
                <Text style={styles.detailText}>{avisoSeleccionado.detalle || avisoSeleccionado.texto}</Text>
                <Text style={styles.detailDate}>{textoFechaCompleta(avisoSeleccionado.fecha)}</Text>
                <Text style={styles.detailSignature}>- Administración de Amor.</Text>
              </ScrollView>
            </View> : <View style={styles.carousel}>
              <View style={styles.touchArea} onStartShouldSetResponder={() => true} onResponderGrant={({ nativeEvent }) => { swipeStart.current = nativeEvent.pageY; }} onResponderRelease={({ nativeEvent }) => {
                const distancia = nativeEvent.pageY - swipeStart.current;
                if (Math.abs(distancia) > 25 && paginas.length > 1) setPagina(actual => distancia < 0 ? (actual + 1) % paginas.length : (actual - 1 + paginas.length) % paginas.length);
                swipeStart.current = null;
              }}>
                <View style={[styles.page, { width: gridWidth }]}>
                  <View style={styles.list}>
                    {(paginas[pagina] || []).map(aviso => { const bloqueado = textoFechaRelativa(aviso.fecha).startsWith('En ') && !usuarioEsAdmin; return <Animated.View key={aviso.id} style={{ opacity: fade }}><TouchableOpacity disabled={bloqueado} activeOpacity={0.78} onPress={async () => { if (!bloqueado) { await marcarAvisoLeido(seccion, aviso); setAvisoSeleccionado(aviso); } }} style={[styles.item, { width: tileWidth, height: 90 }, bloqueado && styles.itemDisabled]}>
                      <View style={[styles.itemTime, bloqueado && styles.itemTimeDisabled]}><Text style={[styles.itemTimeText, bloqueado && styles.itemDisabledText]}>{textoFechaRelativa(aviso.fecha)}</Text></View>
                      {avisoPendiente?.seccionId === seccion.id && avisoPendiente?.tarjetaId === aviso.id && <View style={styles.routeDotCard} />}
                      <MaterialIcons name={seccion.icono} size={19} color={bloqueado ? '#aebbc4' : '#5d89ab'} style={styles.itemIcon} />
                      <Text style={[styles.itemTitle, bloqueado && styles.itemDisabledText]} numberOfLines={2}>{aviso.titulo}</Text>
                      <Text style={[styles.itemText, bloqueado && styles.itemDisabledText]} numberOfLines={3}>{aviso.texto}</Text>
                      <MaterialIcons name="arrow-forward" size={12} color="#6b8aa1" style={styles.itemArrow} />
                    </TouchableOpacity></Animated.View>; })}
                  </View>
                </View>
              </View>
              {paginas.length > 1 && <View style={styles.indicators}>{paginas.map((_, index) => <View key={index} style={[styles.indicator, pagina === index && styles.indicatorActive]} />)}</View>}
            </View>}
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
  sectionList: { flex: 1, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 5 },
  sectionRow: { width: '100%', height: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, borderRadius: 9, backgroundColor: gameColors.parchmentLight, borderWidth: 1, borderColor: gameColors.parchmentDeep },
  sectionRowIcon: { width: 23, alignItems: 'center', justifyContent: 'center' },
  sectionRowInfo: { flex: 1, marginLeft: 5 },
  sectionRowText: { color: gameColors.text, fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  sectionRowDescription: { color: gameColors.textSoft, fontFamily: 'Delius', fontSize: 5.5, fontWeight: '700', marginTop: 1 },
  routeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d94b4b', marginRight: 7 },
  detail: { height: 215, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 6, alignItems: 'stretch' },
  detailTitle: { color: gameColors.text, fontFamily: 'Delius', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  detailRule: { height: 1, backgroundColor: gameColors.parchmentDeep, marginVertical: 9 },
  detailScroll: { flex: 1 },
  detailScrollContent: { paddingBottom: 16 },
  detailText: { color: gameColors.text, fontFamily: 'Delius', fontSize: 8, lineHeight: 12, fontWeight: '700', textAlign: 'left' },
  detailDate: { color: '#6b8aa1', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800', marginTop: 18, textAlign: 'left' },
  detailSignature: { color: '#476982', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', marginTop: 9, textAlign: 'right' },
  carousel: { height: 215, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  touchArea: { width: '100%', height: 215, alignItems: 'center', justifyContent: 'center' },
  page: { height: 215, justifyContent: 'flex-start', alignSelf: 'center', paddingTop: 8 },
  list: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: 6, rowGap: 6 },
  item: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 5, borderRadius: 9, backgroundColor: '#dfeef8', borderWidth: 1, borderColor: '#bdd8e9' },
  itemDisabled: { backgroundColor: '#d7dde1', borderColor: '#c3cbd0' },
  itemIcon: { marginBottom: 3 },
  itemTitle: { width: '100%', color: '#476982', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  itemText: { width: '100%', color: '#6b8aa1', fontFamily: 'Delius', fontSize: 5.2, lineHeight: 6, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  itemTime: { position: 'absolute', top: 5, right: 5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: '#bdd8e9' },
  itemTimeText: { color: '#476982', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
  routeDotCard: { position: 'absolute', top: 5, left: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: '#d94b4b', borderWidth: 1, borderColor: '#edf5fb' },
  itemTimeDisabled: { backgroundColor: '#c3cbd0' },
  itemDisabledText: { color: '#78848b' },
  itemArrow: { position: 'absolute', right: 5, bottom: 5 },
  indicators: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 6 },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7ca6c2', borderWidth: 1, borderColor: '#edf5fb' },
  indicatorActive: { height: 15, backgroundColor: '#5d89ab' },
});
