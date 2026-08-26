import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db, functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot } from 'firebase/firestore';
import { gameColors, gamePanel } from '../theme/gameTheme';

// PRIORIDAD: toda tarjeta nueva debe incluir titulo, descripcion/texto y fecha (YYYY-MM-DD).
// La fecha alimenta el badge relativo y la fecha completa de la vista detallada.
const ADMIN_EMAIL = 'admin@gmail.com';
const FECHA_CORTE_INDICADOR = '2026-08-21';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MENSAJES_COMUNIDAD = [
  { titulo: '¡Un lote especial apareció!', cuerpo: 'Ardilla llegó con recompensas exclusivas. Entra a Amor y descubre el nuevo Lote Bosque Dorado.' },
  { titulo: 'Tu próxima aventura te espera', cuerpo: 'Hay nuevas actividades y premios esperando por ti. Vuelve a Amor y continúa jugando.' },
  { titulo: '¡Amor tiene una sorpresa!', cuerpo: 'Algo bonito acaba de llegar a Amor. Entra ahora para descubrirlo antes que nadie.' },
];

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

const textoHoraEnvio = valor => {
  const fecha = valor?.toDate?.() || (valor ? new Date(valor) : null);
  if (!fecha || Number.isNaN(fecha.getTime())) return 'Nunca enviada';
  return `Último envío: ${fecha.toLocaleDateString('es-AR')} · ${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
};

const SECCIONES = [
  { id: 'temporadas', titulo: 'Temporadas', descripcion: 'Nuevas aventuras y caminos por descubrir.', icono: 'event', tarjetas: [{ id: 'temporada-1', titulo: 'Temporada activa', texto: 'Descubre el nuevo camino de Menta.', fecha: '2026-08-20', detalle: 'Una nueva temporada llega con desafíos, recompensas y pequeñas historias para acompañarte durante tus partidas. Revisa las novedades y prepara todo para no perderte ninguna actividad.' }] },
  { id: 'eventos', titulo: 'Eventos', descripcion: 'Actividades especiales para compartir y disfrutar.', icono: 'celebration', tarjetas: [{ id: 'evento-1', titulo: 'Evento especial', texto: 'Hay una nueva actividad para disfrutar.', fecha: '2026-08-20', detalle: 'Durante este evento podrás participar en actividades especiales y encontrar sorpresas preparadas por Menta. Estate atento a las fechas y disfruta cada momento.' }] },
  { id: 'novedades', titulo: 'Novedades', descripcion: 'Noticias y cambios importantes de Amor.', icono: 'new-releases', tarjetas: [
    { id: 'actualizacion-1-0-5', titulo: 'Tus Animalitos brillan más que nunca', texto: 'Animalitos, trajes y temporadas tienen una nueva forma de disfrutarse.', fecha: '2026-08-23', detalle: '¡La versión 1.0.5 ya está aquí! Renovamos por completo la colección de Animalitos para que sea más bonita, ordenada y fácil de entender. Ahora puedes ver tus animalitos en un catálogo, conocer su rareza y temporada, revisar sus habilidades, consultar sus recompensas y mejorar cada uno con sus propias cartas. También existen cartas universales, que sirven como ayuda cuando te faltan cartas de un animal. El Comerciante ahora ofrece cartas únicamente de los animalitos que ya desbloqueaste, mientras que la experiencia se consigue jugando y mejorando a tus compañeros. El vestidor también cambió: los trajes aparecen en un catálogo horizontal de dos filas, cada uno tiene una rareza con su propio color y los que todavía no conseguiste se muestran bloqueados. Además, organizamos mejor los eventos de cada temporada y agregamos accesos especiales para revisar cómo se ven sus contenidos. Son muchos cambios, pero la idea es sencilla: que coleccionar, vestir y mejorar a tus animalitos sea más claro, divertido y especial.' },
    { id: 'actualizacion-1-0-2-a-1-0-4', titulo: 'Actualización General', texto: 'Arreglamos varias cosas para que Amor funcione mejor.', fecha: '2026-08-21', detalle: 'En esta actualización arreglamos varios problemas: ahora el tutorial avanza correctamente después de reclamar recompensas; el Comerciante entrega 3 cartas y se bloquea cuando corresponde; mejorar a Halcón funciona con las monedas y cartas correctas; las misiones y los juegos entregan recompensas más equilibradas; el nivel y la barra de EXP del perfil se muestran correctamente; las actualizaciones de la app llegan a producción; el menú de pareja carga mejor, muestra quién está conectado de verdad y no enseña personas que ya tienen pareja; también mejoramos las temporadas, los avisos y varias pantallas para que todo sea más claro y estable. La versión cambió de la 1.0.2 a la 1.0.4.' },
    { id: 'novedad-1', titulo: 'Novedades de Amor', texto: 'Pronto conocerás todas las mejoras.', fecha: '2026-08-20', detalle: 'Aquí aparecerán las noticias importantes, las mejoras recientes y todas esas pequeñas cosas que hacen que Amor se sienta cada vez más completa.' },
  ] },
  { id: 'mantenimiento', titulo: 'Mantenimiento', descripcion: 'Avisos sobre pausas y ajustes del juego.', icono: 'construction', tarjetas: [{ id: 'mantenimiento-1', titulo: 'Todo en orden', texto: 'Te avisaremos antes de cualquier pausa.', fecha: '2026-08-20', detalle: 'Cuando haya una pausa programada o un ajuste importante, encontrarás aquí la información necesaria para saber qué ocurre y cuándo volverá todo a la normalidad.' }] },
  { id: 'comunidad', titulo: 'Comunidad', descripcion: 'Mensajes para crecer juntos dentro de Amor.', icono: 'groups', tarjetas: [{ id: 'comunidad-1', titulo: 'Noticias de la comunidad', texto: 'Amor también crece contigo.', fecha: '2026-08-20', detalle: 'Este espacio reúne mensajes, celebraciones y novedades que nacen junto a la comunidad. Gracias por ser parte de este rincón y ayudarlo a crecer.' }] },
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
  const [tituloComunidad, setTituloComunidad] = useState(MENSAJES_COMUNIDAD[0].titulo);
  const [cuerpoComunidad, setCuerpoComunidad] = useState(MENSAJES_COMUNIDAD[0].cuerpo);
  const [enviandoComunidad, setEnviandoComunidad] = useState(false);
  const [modoComunidad, setModoComunidad] = useState('directo');
  const [notificacionesFirestore, setNotificacionesFirestore] = useState([]);
  const [firestoreDisponible, setFirestoreDisponible] = useState(true);
  const [proximoEnvio, setProximoEnvio] = useState(0);
  const [relojComunidad, setRelojComunidad] = useState(Date.now());
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

  useEffect(() => {
    if (!visible || seccionActiva !== 'comunidad' || !usuarioEsAdmin) return undefined;
    let activo = true;
    httpsCallable(functions, 'adminCommunityBroadcast')({ action: 'status' }).then(result => {
      if (activo) setProximoEnvio(Number(result.data?.nextAllowedAt) || 0);
    }).catch(() => {});
    httpsCallable(functions, 'adminCommunityBroadcast')({ action: 'ensure_templates' }).catch(() => {});
    const unsubscribe = onSnapshot(collection(db, 'notificaciones'), snapshot => {
      if (!activo) return;
      setFirestoreDisponible(true);
      setNotificacionesFirestore(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => String(a.nombre || a.id).localeCompare(String(b.nombre || b.id))));
    }, () => {
      if (activo) setFirestoreDisponible(false);
    });
    const interval = setInterval(() => setRelojComunidad(Date.now()), 1000);
    return () => { activo = false; unsubscribe(); clearInterval(interval); };
  }, [visible, seccionActiva, usuarioEsAdmin]);

  const esperaComunidad = Math.max(0, proximoEnvio - relojComunidad);
  const textoEspera = esperaComunidad > 0
    ? `${Math.floor(esperaComunidad / 60000)}m ${Math.floor((esperaComunidad % 60000) / 1000)}s`
    : null;
  const enviarComunidad = async () => {
    if (enviandoComunidad || esperaComunidad > 0 || !tituloComunidad.trim() || !cuerpoComunidad.trim()) return;
    setEnviandoComunidad(true);
    try {
      const result = await httpsCallable(functions, 'adminCommunityBroadcast')({ action: 'send', title: tituloComunidad, body: cuerpoComunidad });
      setProximoEnvio(Number(result.data?.nextAllowedAt) || Date.now() + 3600000);
      setRelojComunidad(Date.now());
      global.showToast?.({ type: 'success', text1: 'Aviso enviado a la comunidad', text2: `${Number(result.data?.sent) || 0} dispositivos alcanzados` });
    } catch (error) {
      const next = Number(error?.details?.nextAllowedAt || error?.customData?.details?.nextAllowedAt) || 0;
      if (next) setProximoEnvio(next);
      global.showToast?.({ type: 'error', text1: 'No pudimos enviar el aviso', text2: next ? 'Todavía debes esperar un poco.' : 'Inténtalo nuevamente.' });
    } finally {
      setEnviandoComunidad(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={cerrarAvisos}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={cerrarAvisos} />
        <View style={styles.position}>
          <View style={[styles.card, { width: modalWidth }]}>
            <View style={styles.header}>
              <View style={styles.headerIcon}><MaterialIcons name="notifications-none" size={23} color="#fff8dc" /></View>
              <View style={styles.headerInfo}><Text style={styles.title}>{seccion?.titulo || 'AVISOS'}</Text><Text style={styles.subtitle}>NOVEDADES DE AMOR</Text></View>
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
            </View> : usuarioEsAdmin && seccionActiva === 'comunidad' ? <View style={styles.communityAdmin}>
              <View style={styles.communityAdminHeader}><View style={styles.communityAdminIcon}><MaterialIcons name="campaign" size={17} color="#fff6d7" /></View><View><Text style={styles.communityAdminTitle}>MENSAJE PARA TODOS</Text><Text style={styles.communityAdminSubtitle}>Dos formas seguras de enviarlo</Text></View></View>
              <View style={styles.communityModes}><TouchableOpacity style={[styles.communityMode, modoComunidad === 'directo' && styles.communityModeActive]} onPress={() => setModoComunidad('directo')}><MaterialIcons name="send" size={9} color={modoComunidad === 'directo' ? '#fff8df' : '#66869b'} /><Text style={[styles.communityModeText, modoComunidad === 'directo' && styles.communityModeTextActive]}>DESDE AMOR</Text></TouchableOpacity><TouchableOpacity style={[styles.communityMode, modoComunidad === 'firestore' && styles.communityModeActive]} onPress={() => setModoComunidad('firestore')}><MaterialIcons name="cloud-queue" size={10} color={modoComunidad === 'firestore' ? '#fff8df' : '#66869b'} /><Text style={[styles.communityModeText, modoComunidad === 'firestore' && styles.communityModeTextActive]}>FIRESTORE</Text></TouchableOpacity></View>
              {modoComunidad === 'directo' ? <>
                <View style={styles.communityTemplates}>{MENSAJES_COMUNIDAD.map((mensaje, index) => <TouchableOpacity key={mensaje.titulo} style={[styles.communityTemplate, tituloComunidad === mensaje.titulo && styles.communityTemplateActive]} onPress={() => { setTituloComunidad(mensaje.titulo); setCuerpoComunidad(mensaje.cuerpo); }}><Text style={styles.communityTemplateText}>{index === 0 ? '🌰 Lote' : index === 1 ? '✨ Regreso' : '🎁 Sorpresa'}</Text></TouchableOpacity>)}</View>
                <TextInput style={styles.communityTitleInput} value={tituloComunidad} onChangeText={setTituloComunidad} maxLength={60} placeholder="Título de la notificación" placeholderTextColor="#9a8b79" />
                <TextInput style={styles.communityBodyInput} value={cuerpoComunidad} onChangeText={setCuerpoComunidad} maxLength={180} multiline placeholder="Escribe un mensaje bonito…" placeholderTextColor="#9a8b79" />
                <TouchableOpacity style={[styles.communitySend, (enviandoComunidad || esperaComunidad > 0) && styles.communitySendDisabled]} disabled={enviandoComunidad || esperaComunidad > 0} onPress={enviarComunidad}><MaterialIcons name={textoEspera ? 'schedule' : 'send'} size={13} color="#fff8df" /><Text style={styles.communitySendText}>{enviandoComunidad ? 'ENVIANDO…' : textoEspera ? `DISPONIBLE EN ${textoEspera}` : 'ENVIAR A TODA LA COMUNIDAD'}</Text></TouchableOpacity>
              </> : <View style={styles.firestoreAdmin}>
                <View style={styles.firestoreHint}><MaterialIcons name="auto-awesome" size={11} color="#a16e3f" /><Text style={styles.firestoreHintText}>Edita una plantilla y cambia <Text style={styles.firestoreCode}>enviar: “si”</Text>. Amor hará el resto y volverá el campo a “no”.</Text></View>
                <ScrollView style={styles.firestoreList} contentContainerStyle={styles.firestoreListContent} showsVerticalScrollIndicator={false}>
                  {!firestoreDisponible ? <View style={styles.firestoreEmpty}><MaterialIcons name="cloud-off" size={15} color="#9c7b68" /><Text style={styles.firestoreEmptyText}>No pudimos leer las plantillas todavía.</Text></View> : notificacionesFirestore.length === 0 ? <View style={styles.firestoreEmpty}><MaterialIcons name="hourglass-empty" size={15} color="#7894a5" /><Text style={styles.firestoreEmptyText}>Creando plantillas predeterminadas…</Text></View> : notificacionesFirestore.map(item => {
                    const procesando = ['procesando', 'esperando_entregas'].includes(item.estado);
                    const esperando = item.estado === 'esperando_cooldown';
                    const error = item.estado === 'error';
                    return <View key={item.id} style={[styles.firestoreItem, procesando && styles.firestoreItemWorking, esperando && styles.firestoreItemWaiting, error && styles.firestoreItemError]}><View style={[styles.firestoreStateIcon, procesando && styles.firestoreStateWorking, esperando && styles.firestoreStateWaiting, error && styles.firestoreStateError]}><MaterialIcons name={error ? 'error-outline' : procesando ? 'notifications-active' : esperando ? 'schedule' : 'check'} size={11} color="#fff" /></View><View style={styles.firestoreItemCopy}><Text style={styles.firestoreItemName}>{item.nombre || item.id}</Text><Text style={styles.firestoreItemTitle} numberOfLines={1}>{item.titulo}</Text><Text style={styles.firestoreItemMeta}>{item.estadoTexto || 'Lista para enviar'} · {textoHoraEnvio(item.ultimaVezEnviada)}</Text></View><View style={styles.firestoreReached}><Text style={styles.firestoreReachedValue}>{Number(item.dispositivosLlegados) || 0}</Text><Text style={styles.firestoreReachedLabel}>LLEGARON</Text></View></View>;
                  })}
                </ScrollView>
              </View>}
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
  itemIcon: { marginBottom: 5 },
  itemTitle: { width: '100%', color: '#476982', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', textAlign: 'center', transform: [{ translateY: 2 }] },
  itemText: { width: '100%', color: '#6b8aa1', fontFamily: 'Delius', fontSize: 5.2, lineHeight: 6, fontWeight: '700', marginTop: 4, textAlign: 'center', transform: [{ translateY: 2 }] },
  itemTime: { position: 'absolute', top: 5, right: 5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: '#bdd8e9' },
  itemTimeText: { color: '#476982', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
  routeDotCard: { position: 'absolute', top: 5, left: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: '#d94b4b', borderWidth: 1, borderColor: '#edf5fb' },
  itemTimeDisabled: { backgroundColor: '#c3cbd0' },
  itemDisabledText: { color: '#78848b' },
  itemArrow: { position: 'absolute', right: 5, bottom: 5 },
  indicators: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 6 },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7ca6c2', borderWidth: 1, borderColor: '#edf5fb' },
  indicatorActive: { height: 15, backgroundColor: '#5d89ab' },
  communityAdmin: { height: 215, paddingHorizontal: 14, paddingTop: 5, paddingBottom: 6 },
  communityAdminHeader: { height: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  communityAdminIcon: { width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5d89ab' },
  communityAdminTitle: { color: '#476982', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', letterSpacing: 0.7, transform: [{ translateY: 2 }] }, communityAdminSubtitle: { color: '#7ca0b8', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '700', marginTop: 2 },
  communityModes: { alignSelf: 'center', height: 23, marginTop: 2, marginBottom: 3, padding: 2, borderRadius: 9, flexDirection: 'row', gap: 2, backgroundColor: '#dce8ed', borderWidth: 1, borderColor: '#bfd2dc' },
  communityMode: { minWidth: 94, height: 17, paddingHorizontal: 8, borderRadius: 7, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  communityModeActive: { backgroundColor: '#5d89ab', shadowColor: '#385b74', shadowOpacity: 0.22, shadowRadius: 2, elevation: 2 },
  communityModeText: { color: '#66869b', fontFamily: 'Delius', fontSize: 5.4, fontWeight: '900', letterSpacing: 0.35 },
  communityModeTextActive: { color: '#fff8df' },
  communityTemplates: { height: 22, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  communityTemplate: { height: 19, paddingHorizontal: 8, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e4edf2', borderWidth: 1, borderColor: '#cadce7' }, communityTemplateActive: { backgroundColor: '#cfe4f1', borderColor: '#6f9dbb' }, communityTemplateText: { color: '#52748c', fontFamily: 'Delius', fontSize: 5.7, fontWeight: '900' },
  communityTitleInput: { height: 24, paddingHorizontal: 9, paddingTop: 3, paddingBottom: 1, borderRadius: 8, color: '#405e76', fontFamily: 'Delius', fontSize: 6.7, fontWeight: '900', backgroundColor: '#f7f1df', borderWidth: 1, borderColor: '#d8cba9' },
  communityBodyInput: { height: 42, marginTop: 4, paddingHorizontal: 9, paddingTop: 6, paddingBottom: 3, borderRadius: 8, color: '#526b7c', fontFamily: 'Delius', fontSize: 6, lineHeight: 7.5, fontWeight: '700', textAlignVertical: 'top', backgroundColor: '#f7f1df', borderWidth: 1, borderColor: '#d8cba9' },
  communitySend: { alignSelf: 'center', minWidth: 190, height: 25, marginTop: 4, paddingHorizontal: 12, borderRadius: 9, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5d89ab', borderWidth: 1, borderColor: '#476982' }, communitySendDisabled: { opacity: 0.58 }, communitySendText: { color: '#fff8df', fontFamily: 'Delius', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.4 },
  firestoreAdmin: { flex: 1, minHeight: 0 },
  firestoreHint: { minHeight: 29, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#f3e6c8', borderWidth: 1, borderColor: '#d8bc84' },
  firestoreHintText: { flex: 1, color: '#806244', fontFamily: 'Delius', fontSize: 5.3, lineHeight: 7, fontWeight: '700' },
  firestoreCode: { color: '#a55b48', fontWeight: '900' },
  firestoreList: { flex: 1, marginTop: 4 },
  firestoreListContent: { gap: 4, paddingBottom: 3 },
  firestoreItem: { minHeight: 47, paddingHorizontal: 7, borderRadius: 9, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#e8f0df', borderWidth: 1, borderColor: '#bcd0aa' },
  firestoreItemWorking: { backgroundColor: '#e0edf5', borderColor: '#90b4ca' },
  firestoreItemWaiting: { backgroundColor: '#f2e8cd', borderColor: '#d0b575' },
  firestoreItemError: { backgroundColor: '#f2dfd9', borderColor: '#cf988b' },
  firestoreStateIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7e9b63' },
  firestoreStateWorking: { backgroundColor: '#5d89ab' },
  firestoreStateWaiting: { backgroundColor: '#b58a45' },
  firestoreStateError: { backgroundColor: '#b76a5e' },
  firestoreItemCopy: { flex: 1, minWidth: 0 },
  firestoreItemName: { color: '#587043', fontFamily: 'Delius', fontSize: 5, lineHeight: 6, fontWeight: '900', letterSpacing: 0.45 },
  firestoreItemTitle: { color: '#456079', fontFamily: 'Delius', fontSize: 6.6, lineHeight: 8, fontWeight: '900' },
  firestoreItemMeta: { color: '#7d8790', fontFamily: 'Delius', fontSize: 4.3, lineHeight: 6, fontWeight: '700' },
  firestoreReached: { width: 37, alignItems: 'center', justifyContent: 'center' },
  firestoreReachedValue: { color: '#4f7188', fontFamily: 'Delius', fontSize: 11, lineHeight: 12, fontWeight: '900' },
  firestoreReachedLabel: { color: '#7893a5', fontFamily: 'Delius', fontSize: 3.5, fontWeight: '900', letterSpacing: 0.3 },
  firestoreEmpty: { height: 70, alignItems: 'center', justifyContent: 'center', gap: 5 },
  firestoreEmptyText: { color: '#7b8790', fontFamily: 'Delius', fontSize: 6, fontWeight: '800' },
});
