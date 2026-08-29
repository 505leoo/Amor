import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useUserDocument } from '../hooks/useUserDocument';
import NotificationSystem from '../utils/NotificationSystem';

const AVATAR = require('../assets/inicio/iconos/icono1.jpg');
const HALCON = require('../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png');
const ARDILLA = require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png');
const AJOLOTE = require('../assets/temporadas/libro/Temporada2/Animales/Ajolote/ajolote1.png');
const AJOLOTE_ALGODON = require('../assets/temporadas/libro/Temporada2/Animales/Ajolote/skins/ajolotet1.png');
const AJOLOTE_GUARDIAN = require('../assets/temporadas/libro/Temporada2/Animales/Ajolote/skins/ajolotet2.png');
const ERIZO = require('../assets/temporadas/libro/Temporada2/Animales/Erizo/erizo1.png');
const ERIZO_ARANDANOS = require('../assets/temporadas/libro/Temporada2/Animales/Erizo/skins/erizot1.png');
const ERIZO_CHOCOLATERO = require('../assets/temporadas/libro/Temporada2/Animales/Erizo/skins/erizot2.png');

const NOTICIAS = [
  {
    id: 'lotes-animalitos-temporada-2',
    titulo: 'Nuevos Animalitos',
    resumen: 'Ajolote y Erizo ya tienen lote',
    categoria: 'LOTES DE TEMPORADA',
    fecha: 'AHORA',
    icono: 'auto-awesome',
    color: '#956aac',
    etiqueta: 'DOS COLECCIONES PARA DESCUBRIR',
    titular: 'Ajolote y Erizo llegaron a los lotes',
    descripcion: 'Dos Animalitos, dos lotes y una forma más linda de completar tu colección.',
    cierre: 'Cada lote tiene un giro gratis y premios únicos que no vuelven a aparecer al conseguirlos.',
  },
  {
    id: 'cumpleanos-aurora',
    titulo: 'Cumpleaños de Aurora',
    resumen: 'Una ruta para celebrar juntos',
    categoria: 'CELEBRACIÓN',
    fecha: 'AHORA',
    icono: 'cake',
    color: '#d66f9d',
    etiqueta: 'UNA FECHA PARA GUARDAR EN EL CORAZÓN',
    titular: 'Hoy celebramos a Aurora',
    descripcion: 'Preparamos una aventura especial para acompañar su cumpleaños con recuerdos, fotos y pequeños momentos compartidos.',
    cierre: 'Que este nuevo año le regale muchos momentos bonitos para guardar juntos.',
  },
  {
    id: 'perfiles',
    titulo: 'Perfiles',
    resumen: 'Nuevo estilo personal',
    categoria: 'NOVEDAD',
    fecha: 'AHORA',
    icono: 'account-circle',
    color: '#b45f70',
    etiqueta: 'NUEVO ESTILO PARA LOS PERFILES',
    titular: 'Tu historia, ahora se ve como tuya',
    descripcion: 'El perfil ahora es un pequeño libro donde puedes presumir lo que conseguiste y decorar tu propio espacio.',
    cierre: 'Más formas de hacer tu perfil único llegarán pronto.',
  },
  {
    id: 'invitacion-halcon-tarde',
    titulo: 'Carta de Halcón',
    resumen: 'Algo para ustedes dos…',
    categoria: 'INVITACIÓN',
    fecha: 'MAÑANA',
    icono: 'mail-outline',
    color: '#bd6675',
    etiqueta: 'UNA TARDE PARA VOLVER A ENCONTRARSE',
    titular: 'Halcón los invita a los dos',
    descripcion: 'Una pequeña salida mañana a la 1 de la tarde, preparada con cariño para compartir sin apuros.',
    cierre: 'A veces una tarde tranquila puede decir lo que cuesta poner en palabras.',
  },
];

export const NOTICIAS_ID = NOTICIAS[0].id;
export const NOTICIAS_IDS = NOTICIAS.map(noticia => noticia.id);
const INVITACION_ID = 'invitacion-halcon-tarde';
const CUMPLEANOS_ID = 'cumpleanos-aurora';
const LOTES_ANIMALITOS_ID = 'lotes-animalitos-temporada-2';
const COSTO_CONFIRMACION = 500;
const FECHA_INVITACION = '2026-08-26';
const HORA_INVITACION = '13:00';

const FrameSample = () => <View style={styles.frameSample}>
  <LinearGradient colors={['#ffe49b', '#c26b7c', '#76405e']} style={styles.frameOuter}>
    <View style={styles.frameInner}><ExpoImage source={AVATAR} style={styles.frameAvatar} contentFit="cover" cachePolicy="memory-disk" /></View>
    <View style={styles.frameGem}><MaterialIcons name="favorite" size={8} color="#fff5ce" /></View>
  </LinearGradient>
  <View style={styles.frameMiniStack}><View style={[styles.miniFrame, { backgroundColor: '#5f9871' }]} /><View style={[styles.miniFrame, { backgroundColor: '#6874ad' }]} /><View style={[styles.miniFrame, { backgroundColor: '#b26a8e' }]} /></View>
</View>;

const BadgeSample = () => <View style={styles.badgeSample}>
  {[['favorite', '#c46875'], ['pets', '#5593a4'], ['auto-awesome', '#8c68b2']].map(([icon, color], index) => <View key={icon} style={[styles.badgeMedal, { backgroundColor: color, transform: [{ translateY: index === 1 ? -5 : 2 }] }]}><View style={styles.badgeRing}><MaterialIcons name={icon} size={13} color="#fff3c5" /></View><View style={styles.badgeTail} /></View>)}
</View>;

const CornerSample = () => <LinearGradient colors={['#fff0b2', '#dfb674', '#638d5c']} style={styles.cornerSample}>
  <Svg style={StyleSheet.absoluteFill} viewBox="0 0 150 82" pointerEvents="none"><Circle cx="120" cy="18" r="16" fill="#fff0a0" opacity="0.8" /><Path d="M0 55 Q31 31 61 55 T120 49 T160 58 V90 H0Z" fill="#76925b" /><Path d="M0 68 Q37 51 73 68 T146 63 T160 71 V90 H0Z" fill="#4f704c" /><Path d="M18 65 V38 M132 67 V34" stroke="#624c34" strokeWidth="5" /><Circle cx="18" cy="32" r="17" fill="#779b60" /><Circle cx="132" cy="28" r="20" fill="#668b58" /></Svg>
  <ExpoImage source={HALCON} style={styles.cornerAnimal} contentFit="contain" cachePolicy="memory-disk" />
  <View style={styles.cornerFlower}><MaterialIcons name="local-florist" size={12} color="#fff2c8" /></View>
</LinearGradient>;

const CollectionSample = () => <View style={styles.collectionSample}>
  <View style={[styles.animalCard, styles.animalCardBack]}><ExpoImage source={ARDILLA} style={styles.collectionAnimal} contentFit="contain" cachePolicy="memory-disk" /></View>
  <View style={[styles.animalCard, styles.animalCardFront]}><ExpoImage source={HALCON} style={styles.collectionAnimal} contentFit="contain" cachePolicy="memory-disk" /><View style={styles.collectionCheck}><MaterialIcons name="check" size={7} color="#fff" /></View></View>
  <View style={styles.collectionCount}><Text style={styles.collectionCountText}>1/8</Text></View>
</View>;

const Feature = ({ title, detail, color, children }) => <View style={[styles.feature, { borderColor: color }]}>
  <View style={styles.featureVisual}>{children}</View>
  <View style={styles.featureCopy}><Text style={[styles.featureTitle, { color }]}>{title}</Text><Text style={styles.featureDetail} numberOfLines={2}>{detail}</Text></View>
</View>;

const BirthdayBody = () => <View style={styles.birthdayBody}>
  <LinearGradient colors={['#fff0f7', '#f8d6e5']} style={styles.birthdayHero}>
    <View style={styles.birthdayIcon}><MaterialIcons name="cake" size={25} color="#fff8fc" /></View>
    <View style={styles.birthdayHeroCopy}><Text style={styles.birthdayKicker}>EVENTO ESPECIAL</Text><Text style={styles.birthdayHeroTitle}>Un día con Aurora</Text><Text style={styles.birthdayHeroText}>Una ruta para convertir cada parada en un recuerdo.</Text></View>
  </LinearGradient>
  <Text style={styles.birthdayIntro}>Para celebrar su cumpleaños, Aurora tiene una aventura preparada de principio a fin: salir, mirar la ciudad con otros ojos y guardar cada momento para volver a visitarlo juntos.</Text>
  <View style={styles.birthdaySteps}>
    <View style={styles.birthdayStep}><View style={[styles.birthdayStepIcon, { backgroundColor: '#e887a8' }]}><MaterialIcons name="directions-bus" size={14} color="#fff" /></View><Text style={styles.birthdayStepTitle}>El comienzo</Text><Text style={styles.birthdayStepText}>La primera foto da inicio al recorrido.</Text></View>
    <View style={styles.birthdayStep}><View style={[styles.birthdayStepIcon, { backgroundColor: '#a978c9' }]}><MaterialIcons name="location-city" size={14} color="#fff" /></View><Text style={styles.birthdayStepTitle}>Momentos</Text><Text style={styles.birthdayStepText}>Regalos, paseo, Obelisco y algo rico.</Text></View>
    <View style={styles.birthdayStep}><View style={[styles.birthdayStepIcon, { backgroundColor: '#d2779c' }]}><MaterialIcons name="local-florist" size={14} color="#fff" /></View><Text style={styles.birthdayStepTitle}>El cierre</Text><Text style={styles.birthdayStepText}>Las flores guardan el último recuerdo.</Text></View>
  </View>
  <View style={styles.birthdayNote}><MaterialIcons name="favorite" size={13} color="#d66f9d" /><Text style={styles.birthdayNoteText}>Cada foto queda como una pequeña prueba de que ese día fue suyo.</Text></View>
</View>;

const AnimalitosLotesBody = () => <View style={styles.animalitosLotesBody}>
  <LinearGradient colors={['#ffe7f2', '#eadcf8', '#f6e0ba']} style={styles.animalitosLotesHero}>
    <Text style={styles.animalitosLotesKicker}>LOTES DE TEMPORADA 2</Text>
    <Text style={styles.animalitosLotesTitle}>Dos nuevos amigos</Text>
    <Text style={styles.animalitosLotesText}>Un giro gratis y premios únicos en cada lote.</Text>
    <ExpoImage source={AJOLOTE} style={styles.animalitosLotesAjolote} contentFit="contain" cachePolicy="memory-disk" />
    <ExpoImage source={ERIZO} style={styles.animalitosLotesErizo} contentFit="contain" cachePolicy="memory-disk" />
  </LinearGradient>
  <View style={styles.animalitosLotesFila}>
    <View style={[styles.animalitosLoteMini, styles.animalitosLoteAjolote]}><ExpoImage source={AJOLOTE_ALGODON} style={styles.animalitosLoteMiniImage} contentFit="contain" cachePolicy="memory-disk" /><View><Text style={styles.animalitosLoteMiniKicker}>AJOLOTE</Text><Text style={styles.animalitosLoteMiniTitle}>Reino de Caramelo</Text></View></View>
    <View style={[styles.animalitosLoteMini, styles.animalitosLoteErizo]}><ExpoImage source={ERIZO_CHOCOLATERO} style={styles.animalitosLoteMiniImage} contentFit="contain" cachePolicy="memory-disk" /><View><Text style={[styles.animalitosLoteMiniKicker, styles.animalitosLoteErizoKicker]}>ERIZO</Text><Text style={styles.animalitosLoteMiniTitle}>Dulce Medianoche</Text></View></View>
  </View>
</View>;

export default function Noticias({ visible, onDismiss, onContinue, version, initialNoticiaId }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const invitationPulse = useRef(new Animated.Value(0)).current;
  const [noticiaSeleccionada, setNoticiaSeleccionada] = useState(NOTICIAS[0].id);
  const [miNoticia, setMiNoticia] = useState(null);
  const [noticiaPareja, setNoticiaPareja] = useState(null);
  const [respondiendo, setRespondiendo] = useState(false);
  const noticia = NOTICIAS.find(item => item.id === noticiaSeleccionada) || NOTICIAS[0];
  const { data: usuario, uid } = useUserDocument(data => ({
    pareja: data?.pareja || null,
    nombre: data?.nombre || data?.displayName || 'Tú',
    dinero: Math.max(0, Number(data?.dinero) || 0),
  }), undefined, (a, b) => a?.pareja === b?.pareja && a?.nombre === b?.nombre && a?.dinero === b?.dinero);
  const parejaUid = usuario?.pareja || null;
  const { data: pareja } = useUserDocument(data => ({ nombre: data?.nombre || data?.displayName || 'Tu pareja' }), parejaUid || '', (a, b) => a?.nombre === b?.nombre);
  const esInvitacion = noticia.id === INVITACION_ID;
  const esCumpleanos = noticia.id === CUMPLEANOS_ID;
  const esLotesAnimalitos = noticia.id === LOTES_ANIMALITOS_ID;
  const miRespuesta = miNoticia?.respuesta || 'pensando';
  const respuestaPareja = noticiaPareja?.respuesta || 'pensando';
  const invitationScale = invitationPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] });

  useEffect(() => {
    if (!visible) return undefined;
    setNoticiaSeleccionada(NOTICIAS.some(item => item.id === initialNoticiaId) ? initialNoticiaId : NOTICIAS[0].id);
    reveal.setValue(0);
    shine.setValue(0);
    Animated.spring(reveal, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
    const shimmer = Animated.loop(Animated.sequence([
      Animated.delay(700),
      Animated.timing(shine, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(1600),
    ]));
    shimmer.start();
    return () => shimmer.stop();
  }, [initialNoticiaId, reveal, shine, visible]);

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(invitationPulse, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(invitationPulse, { toValue: 0, duration: 850, useNativeDriver: true }),
      Animated.delay(700),
    ]));
    if (visible && !miNoticia?.continuada) pulse.start();
    else invitationPulse.setValue(0);
    return () => pulse.stop();
  }, [invitationPulse, miNoticia?.continuada, visible]);

  useEffect(() => {
    if (!uid) return undefined;
    setNoticiaPareja(null);
    const propiaRef = doc(db, 'usuarios', uid, 'noticias', INVITACION_ID);
    const unsubscribePropia = onSnapshot(propiaRef, snapshot => setMiNoticia(snapshot.exists() ? snapshot.data() : null), () => setMiNoticia(null));
    const unsubscribePareja = parejaUid
      ? onSnapshot(doc(db, 'usuarios', parejaUid, 'noticias', INVITACION_ID), snapshot => setNoticiaPareja(snapshot.exists() ? snapshot.data() : null), () => setNoticiaPareja(null))
      : () => {};
    return () => { unsubscribePropia(); unsubscribePareja(); };
  }, [parejaUid, uid]);

  useEffect(() => {
    if (!visible || !uid || noticiaSeleccionada !== INVITACION_ID || miNoticia?.visto) return;
    setDoc(doc(db, 'usuarios', uid, 'noticias', INVITACION_ID), {
      noticiaId: INVITACION_ID,
      tipo: 'invitacion_pareja',
      parejaUid,
      eventoFecha: FECHA_INVITACION,
      eventoHora: HORA_INVITACION,
      visto: true,
      vistoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    }, { merge: true }).catch(() => {});
  }, [miNoticia?.visto, noticiaSeleccionada, parejaUid, uid, visible]);

  const guardarContinuada = async () => {
    if (uid) {
      await setDoc(doc(db, 'usuarios', uid, 'noticias', noticia.id), {
        noticiaId: noticia.id,
        visto: true,
        continuada: true,
        continuadaEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
    onContinue?.(noticia.id);
  };

  const responderInvitacion = async respuesta => {
    if (!uid || !parejaUid || respondiendo || miNoticia?.respuesta) return;
    setRespondiendo(true);
    try {
      await runTransaction(db, async transaction => {
        const usuarioRef = doc(db, 'usuarios', uid);
        const noticiaRef = doc(db, 'usuarios', uid, 'noticias', INVITACION_ID);
        const [usuarioSnap, noticiaSnap] = await Promise.all([transaction.get(usuarioRef), transaction.get(noticiaRef)]);
        if (!usuarioSnap.exists()) throw new Error('usuario_no_encontrado');
        if (noticiaSnap.data()?.respuesta) throw new Error('respuesta_guardada');
        const dinero = Math.max(0, Number(usuarioSnap.data()?.dinero) || 0);
        if (respuesta === 'confirmado' && dinero < COSTO_CONFIRMACION) throw new Error('monedas_insuficientes');
        if (respuesta === 'confirmado') transaction.set(usuarioRef, { dinero: dinero - COSTO_CONFIRMACION }, { merge: true });
        transaction.set(noticiaRef, {
          noticiaId: INVITACION_ID,
          tipo: 'invitacion_pareja',
          parejaUid,
          eventoFecha: FECHA_INVITACION,
          eventoHora: HORA_INVITACION,
          visto: true,
          respuesta,
          costoPagado: respuesta === 'confirmado' ? COSTO_CONFIRMACION : 0,
          respondidoEn: serverTimestamp(),
          actualizadoEn: serverTimestamp(),
        }, { merge: true });
      });
      const confirmo = respuesta === 'confirmado';
      global.showToast?.({ type: confirmo ? 'success' : 'info', text1: confirmo ? 'Tu lugar quedó reservado' : 'Halcón guardará la invitación con cariño' });
      NotificationSystem.sendToPartner(
        uid,
        confirmo ? '💌 Una respuesta para la tarde de mañana' : '💌 La invitación de Halcón tiene una respuesta',
        confirmo ? `${usuario?.nombre || 'Tu pareja'} confirmó que quiere compartir la tarde contigo.` : `${usuario?.nombre || 'Tu pareja'} prefirió no confirmar esta vez.`,
        { type: 'noticia_invitacion', noticiaId: INVITACION_ID },
        { windowHours: 0, maxCount: 10, type: 'noticia_invitacion' },
      ).catch(() => {});
    } catch (error) {
      const sinMonedas = error?.message === 'monedas_insuficientes';
      global.showToast?.({ type: 'error', text1: sinMonedas ? 'Necesitas 500 monedas para confirmar' : 'No pudimos guardar tu respuesta todavía' });
    } finally {
      setRespondiendo(false);
    }
  };

  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-150, 480] });
  const estadoVisual = useMemo(() => ({
    confirmado: { texto: 'Confirmado', icono: 'favorite', color: '#6f9660', fondo: '#e2efd7' },
    rechazado: { texto: 'Esta vez no', icono: 'spa', color: '#9c7465', fondo: '#efe1d5' },
    pensando: { texto: 'Pensándolo', icono: 'schedule', color: '#b37a43', fondo: '#f5e5bf' },
  }), []);
  const miVisual = estadoVisual[miRespuesta];
  const parejaVisual = estadoVisual[respuestaPareja];

  return <Modal visible={Boolean(visible)} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
    <StatusBar hidden />
    <View style={styles.backdrop}>
      <View pointerEvents="none" style={styles.backdropGlow} />
      <Animated.View style={[styles.card, { opacity: reveal, transform: [{ scale }] }]}>
        <LinearGradient colors={['#fff8e7', '#f4dfb9', '#ead1aa']} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.paperCircleOne} /><View pointerEvents="none" style={styles.paperCircleTwo} />
        <View style={styles.header}>
          <View style={styles.newsPill}><MaterialIcons name="campaign" size={10} color="#fff7dc" /><Text style={styles.newsPillText}>NOVEDADES DE AMOR</Text></View>
          <Text style={styles.versionText}>ACTUALIZACIÓN {version ? `v${version}` : 'NUEVA'}</Text>
          <TouchableOpacity style={styles.close} onPress={onDismiss} accessibilityLabel="Cerrar noticias por ahora"><MaterialIcons name="close" size={17} color="#70482d" /></TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.newsList}>
            <View style={styles.newsListHeading}><Text style={styles.newsListEyebrow}>ARCHIVO</Text><Text style={styles.newsListTitle}>Noticias</Text><Text style={styles.newsListCount}>{NOTICIAS.length} {NOTICIAS.length === 1 ? 'historia' : 'historias'}</Text></View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.newsListContent}>
              {NOTICIAS.map(item => {
                const active = item.id === noticia.id;
                const isInvitation = item.id === INVITACION_ID;
                const invitationStyle = isInvitation && !miNoticia?.continuada ? { transform: [{ scale: invitationScale }] } : null;
                return <Animated.View key={item.id} style={invitationStyle}><TouchableOpacity onPress={() => setNoticiaSeleccionada(item.id)} activeOpacity={0.82} style={[styles.newsListItem, isInvitation && styles.newsListItemInvitation, active && styles.newsListItemActive]}>
                  <LinearGradient colors={active ? [item.color, '#8f5263'] : isInvitation ? ['#d87b8d', '#a94f68'] : ['#ead4ae', '#d9bd91']} style={[styles.newsListIcon, isInvitation && styles.newsListIconInvitation]}><MaterialIcons name={item.icono} size={isInvitation ? 15 : 17} color={active || isInvitation ? '#fff6dc' : '#856342'} />{isInvitation && <View style={styles.invitationIconSpark}><MaterialIcons name="auto-awesome" size={5} color="#fff2aa" /></View>}</LinearGradient>
                  <View style={styles.newsListCopy}><View style={styles.newsListMeta}><Text style={[styles.newsListDate, (active || isInvitation) && styles.newsListTextActive]}>{item.fecha}</Text>{isInvitation && !miNoticia?.continuada && <View style={styles.newBadge}><Text style={styles.newBadgeText}>{noticiaPareja?.respuesta ? 'RESPUESTA' : 'SECRETO'}</Text></View>}</View><Text style={[styles.newsListItemTitle, (active || isInvitation) && styles.newsListTextActive]} numberOfLines={1}>{item.titulo}</Text><Text style={[styles.newsListItemSummary, (active || isInvitation) && styles.newsListSummaryActive]} numberOfLines={1}>{isInvitation && noticiaPareja?.respuesta ? `${pareja?.nombre || 'Tu pareja'} ya respondió` : item.resumen}</Text></View>
                  {active && <MaterialIcons name="chevron-right" size={13} color="#fff3d4" />}
                </TouchableOpacity></Animated.View>;
              })}
            </ScrollView>
            <View style={styles.newsListHint}><MaterialIcons name="history" size={11} color="#987049" /><Text style={styles.newsListHintText}>Las noticias anteriores quedarán guardadas aquí.</Text></View>
          </View>

          <View style={styles.newsDetail}>
            <View style={styles.detailHeader}>
              <View style={[styles.detailCategory, { backgroundColor: `${noticia.color}20`, borderColor: `${noticia.color}66` }]}><Text style={[styles.detailCategoryText, { color: noticia.color }]}>{noticia.categoria}</Text></View>
              <View style={styles.detailHeadingCopy}><Text style={styles.eyebrow}>{noticia.etiqueta}</Text><View style={styles.titleWrap}><Text style={styles.title}>{noticia.titular}</Text><Animated.View pointerEvents="none" style={[styles.titleShine, { transform: [{ translateX: shineX }, { rotate: '-12deg' }] }]} /></View><Text style={styles.description} numberOfLines={2}>{noticia.descripcion}</Text></View>
            </View>

            {esLotesAnimalitos ? <AnimalitosLotesBody /> : esCumpleanos ? <BirthdayBody /> : esInvitacion ? <View style={styles.invitationBody}>
              <LinearGradient colors={['#f7e2cd', '#efc9bd', '#ddb59f']} style={styles.invitationLetter}>
                <View pointerEvents="none" style={styles.invitationSun} />
                <View style={styles.invitationDate}><MaterialIcons name="wb-sunny" size={10} color="#fff0be" /><View><Text style={styles.invitationDateMain}>MAÑANA · 13:00</Text><Text style={styles.invitationDateSub}>UNA TARDE PARA LOS DOS</Text></View></View>
                <ExpoImage source={HALCON} style={styles.invitationHalcon} contentFit="contain" cachePolicy="memory-disk" />
                <View style={styles.invitationSeal}><MaterialIcons name="favorite" size={10} color="#fff3d6" /></View>
                <Text style={styles.invitationFrom}>UNA CARTA DE HALCÓN</Text>
              </LinearGradient>

              <View style={styles.invitationMain}>
                <View style={styles.invitationMessage}><MaterialIcons name="format-quote" size={15} color="#c88a78" /><Text style={styles.invitationMessageText}>Amor lamenta esos pequeños tropiezos de hace algunas actualizaciones. Halcón cree que una tarde bonita, sin apuros y juntos, puede ser un nuevo comienzo.</Text></View>
                <View style={styles.responseRow}>
                  <View style={[styles.responseCard, { borderColor: miVisual.color }]}><View style={[styles.responseAvatar, { backgroundColor: miVisual.fondo }]}><MaterialIcons name="person" size={13} color={miVisual.color} /></View><View style={styles.responseCopy}><Text style={styles.responseName}>TÚ</Text><View style={styles.responseStatus}><MaterialIcons name={miVisual.icono} size={8} color={miVisual.color} /><Text style={[styles.responseStatusText, { color: miVisual.color }]}>{miVisual.texto}</Text></View><Text style={styles.responseSeen}>Invitación abierta</Text></View></View>
                  <View style={[styles.responseCard, { borderColor: parejaVisual.color }]}><View style={[styles.responseAvatar, { backgroundColor: parejaVisual.fondo }]}><MaterialIcons name="favorite-border" size={13} color={parejaVisual.color} /></View><View style={styles.responseCopy}><Text style={styles.responseName} numberOfLines={1}>{pareja?.nombre || 'TU PAREJA'}</Text><View style={styles.responseStatus}><MaterialIcons name={parejaVisual.icono} size={8} color={parejaVisual.color} /><Text style={[styles.responseStatusText, { color: parejaVisual.color }]}>{parejaVisual.texto}</Text></View><Text style={styles.responseSeen}>{noticiaPareja?.visto ? 'Ya abrió la carta' : 'Aún no abrió la carta'}</Text></View></View>
                </View>
                {!parejaUid ? <View style={styles.noPartner}><MaterialIcons name="favorite-border" size={12} color="#a36c68" /><Text style={styles.noPartnerText}>Necesitas tener una pareja para compartir esta invitación.</Text></View> : miNoticia?.respuesta ? <View style={styles.decisionSaved}><MaterialIcons name={miRespuesta === 'confirmado' ? 'favorite' : 'spa'} size={12} color={miVisual.color} /><Text style={styles.decisionSavedText}>{miRespuesta === 'confirmado' ? 'Tu lugar está reservado. Ahora puedes esperar su respuesta.' : 'Tu respuesta quedó guardada con suavidad. La otra persona podrá verla.'}</Text></View> : <View style={styles.invitationActions}><TouchableOpacity style={styles.rejectButton} onPress={() => responderInvitacion('rechazado')} disabled={respondiendo} activeOpacity={0.82}><Text style={styles.rejectText}>ESTA VEZ NO</Text></TouchableOpacity><TouchableOpacity style={[styles.confirmButton, usuario?.dinero < COSTO_CONFIRMACION && styles.confirmButtonLow]} onPress={() => responderInvitacion('confirmado')} disabled={respondiendo} activeOpacity={0.84}>{respondiendo ? <ActivityIndicator size="small" color="#fff7dc" /> : <><MaterialIcons name="favorite" size={11} color="#fff7dc" /><Text style={styles.confirmText}>CONFIRMAR</Text><View style={styles.confirmCost}><Text style={styles.coinMini}>●</Text><Text style={styles.confirmCostText}>500</Text></View></>}</TouchableOpacity></View>}
              </View>
            </View> : <View style={styles.detailBody}>
              <View style={styles.heroColumn}>
                <View style={styles.profilePreview}>
                  <LinearGradient colors={['#f5d9ac', '#d89377']} style={styles.previewTop}><Text style={styles.previewTopText}>MI PERFIL</Text><MaterialIcons name="auto-awesome" size={10} color="#fff5cf" /></LinearGradient>
                  <View style={styles.previewBody}><FrameSample /><View style={styles.previewInfo}><Text style={styles.previewName}>Tu nombre</Text><Text style={styles.previewPhrase}>“Colecciono momentos.”</Text><View style={styles.previewStats}><View><Text style={styles.previewStatValue}>12</Text><Text style={styles.previewStatLabel}>NIVEL</Text></View><View><Text style={styles.previewStatValue}>4</Text><Text style={styles.previewStatLabel}>CHAPAS</Text></View><View><Text style={styles.previewStatValue}>3</Text><Text style={styles.previewStatLabel}>MARCOS</Text></View></View></View></View>
                </View>
                <View style={styles.promise}><MaterialIcons name="palette" size={13} color="#a3653b" /><View style={styles.promiseCopy}><Text style={styles.promiseTitle}>COMBINA · DESBLOQUEA · PRESUME</Text><Text style={styles.promiseText} numberOfLines={2}>Tu pareja también podrá ver cada detalle cuando visite tu perfil.</Text></View></View>
              </View>

              <View style={styles.featuresColumn}>
                <View style={styles.featureRow}><Feature title="MARCOS" detail="Bordes con personalidad." color="#a45e70"><FrameSample /></Feature><Feature title="CHAPAS" detail="Logros que evolucionan." color="#a87534"><BadgeSample /></Feature></View>
                <View style={styles.featureRow}><Feature title="MI RINCONCITO" detail="Una escena completamente tuya." color="#5d865f"><CornerSample /></Feature><Feature title="COLECCIÓN" detail="Animalitos y trajes obtenidos." color="#7362a3"><CollectionSample /></Feature></View>
              </View>
            </View>}

            <View style={styles.footer}><Text style={styles.footerText}>{noticia.cierre}</Text>{(!esInvitacion || miNoticia?.respuesta) && <TouchableOpacity style={styles.continueButton} onPress={guardarContinuada} activeOpacity={0.84}><Text style={styles.continueText}>CONTINUAR</Text><MaterialIcons name="arrow-forward" size={13} color="#fff8df" /></TouchableOpacity>}</View>
          </View>
        </View>
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(29,19,14,0.86)' },
  backdropGlow: { position: 'absolute', width: '72%', height: '62%', borderRadius: 220, backgroundColor: 'rgba(232,173,91,0.16)', shadowColor: '#f4c16c', shadowOpacity: 0.55, shadowRadius: 45 },
  card: { width: '91%', maxWidth: 760, height: '84%', maxHeight: 365, minHeight: 300, position: 'relative', overflow: 'hidden', borderRadius: 20, borderWidth: 3, borderColor: '#a86d3d', shadowColor: '#120b07', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.72, shadowRadius: 18, elevation: 28 },
  paperCircleOne: { position: 'absolute', width: 250, height: 250, borderRadius: 125, right: -95, top: -120, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(142,93,51,0.12)' },
  paperCircleTwo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, left: -75, bottom: -90, backgroundColor: 'rgba(181,115,75,0.09)' },
  header: { height: 41, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(145,93,50,0.2)' },
  newsPill: { height: 22, paddingHorizontal: 8, borderRadius: 11, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: '#ba6f61', borderWidth: 1, borderColor: '#8d4e49' },
  newsPillText: { color: '#fff7dc', fontFamily: 'Delius', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.65 },
  versionText: { marginLeft: 8, color: '#a8784b', fontFamily: 'Delius', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.55 },
  close: { marginLeft: 'auto', width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,226,0.72)', borderWidth: 1, borderColor: '#d0ac75' },
  body: { flex: 1, minHeight: 0, flexDirection: 'row' },
  newsList: { width: 137, minWidth: 137, padding: 8, backgroundColor: 'rgba(224,197,157,0.43)', borderRightWidth: 1, borderRightColor: 'rgba(137,87,46,0.24)' },
  newsListHeading: { height: 49, paddingHorizontal: 3, justifyContent: 'center' },
  newsListEyebrow: { color: '#a27147', fontFamily: 'Delius', fontSize: 5.2, lineHeight: 6, fontWeight: '900', letterSpacing: 0.9 },
  newsListTitle: { color: '#583721', fontFamily: 'Delius', fontSize: 14, lineHeight: 16, fontWeight: '900' },
  newsListCount: { color: '#9a7551', fontFamily: 'Delius', fontSize: 5.4, lineHeight: 7, fontWeight: '700' },
  newsListContent: { gap: 5, paddingBottom: 8 },
  newsListItem: { minHeight: 55, paddingHorizontal: 5, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(255,247,224,0.65)', borderWidth: 1, borderColor: '#d4b689' },
  newsListItemInvitation: { minHeight: 48, paddingVertical: 4, backgroundColor: '#b65b72', borderColor: '#f1b6b4', shadowColor: '#d85173', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 6, elevation: 5 },
  newsListItemActive: { backgroundColor: '#a95f6f', borderColor: '#7d4251', shadowColor: '#71404c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 3, elevation: 3 },
  newsListIcon: { width: 31, height: 31, flexShrink: 0, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,243,211,0.65)' },
  newsListIconInvitation: { width: 28, height: 28, borderRadius: 9, position: 'relative', borderColor: '#ffd5c2' },
  invitationIconSpark: { position: 'absolute', right: 2, top: 2 },
  newsListCopy: { flex: 1, minWidth: 0 },
  newsListMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  newsListDate: { color: '#a07854', fontFamily: 'Delius', fontSize: 4.3, lineHeight: 5, fontWeight: '900', letterSpacing: 0.35 },
  newBadge: { height: 9, paddingHorizontal: 3, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1c662' },
  newBadgeText: { color: '#71451f', fontSize: 3.7, fontWeight: '900', letterSpacing: 0.25 },
  newsListItemTitle: { color: '#67442d', fontFamily: 'Delius', fontSize: 7.5, lineHeight: 9, fontWeight: '900' },
  newsListItemSummary: { color: '#987457', fontFamily: 'Delius', fontSize: 4.5, lineHeight: 6, fontWeight: '700' },
  newsListTextActive: { color: '#fff6dc' },
  newsListSummaryActive: { color: '#f0d9d8' },
  newsListHint: { marginTop: 'auto', minHeight: 38, padding: 6, borderRadius: 9, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(255,246,220,0.5)', borderWidth: 1, borderColor: 'rgba(182,145,98,0.42)' },
  newsListHintText: { flex: 1, color: '#987252', fontFamily: 'Delius', fontSize: 4.6, lineHeight: 6, fontWeight: '700' },
  newsDetail: { flex: 1, minWidth: 0 },
  detailHeader: { minHeight: 60, paddingHorizontal: 11, paddingVertical: 6, flexDirection: 'row', gap: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(146,95,52,0.16)' },
  detailCategory: { width: 48, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  detailCategoryText: { fontFamily: 'Delius', fontSize: 5.4, fontWeight: '900', letterSpacing: 0.45 },
  detailHeadingCopy: { flex: 1, minWidth: 0 },
  birthdayBody: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingVertical: 7, gap: 7 },
  birthdayHero: { minHeight: 68, padding: 9, borderRadius: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: '#edb3c9' },
  birthdayIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d66f9d', borderWidth: 2, borderColor: '#fff8fc' },
  birthdayHeroCopy: { flex: 1, marginLeft: 9 }, birthdayKicker: { color: '#bd5d86', fontSize: 6.5, fontWeight: '900', letterSpacing: 1 }, birthdayHeroTitle: { color: '#803d65', fontSize: 16, fontWeight: '900', marginTop: 2 }, birthdayHeroText: { color: '#9d607d', fontSize: 8, fontWeight: '700', marginTop: 2 },
  birthdayIntro: { color: '#79536a', fontSize: 8.5, lineHeight: 12, fontWeight: '700', paddingHorizontal: 3 },
  birthdaySteps: { flex: 1, flexDirection: 'row', gap: 6 }, birthdayStep: { flex: 1, padding: 7, borderRadius: 11, backgroundColor: '#fff6fa', borderWidth: 1, borderColor: '#f0cada' }, birthdayStepIcon: { width: 27, height: 27, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, birthdayStepTitle: { color: '#75445b', fontSize: 8, fontWeight: '900', marginTop: 5 }, birthdayStepText: { color: '#9a7182', fontSize: 6.5, lineHeight: 9, fontWeight: '700', marginTop: 2 },
  birthdayNote: { minHeight: 31, paddingHorizontal: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fce6ef', borderWidth: 1, borderColor: '#efbfd2' }, birthdayNoteText: { flex: 1, color: '#9b5976', fontSize: 7, lineHeight: 10, fontWeight: '800' },
  ajoloteBody: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingVertical: 7, gap: 6 },
  ajoloteHero: { height: 78, overflow: 'hidden', borderRadius: 14, borderWidth: 1.2, borderColor: '#d986ad', flexDirection: 'row', alignItems: 'center' },
  ajoloteHeroGlow: { position: 'absolute', right: 15, width: 82, height: 82, borderRadius: 41, backgroundColor: 'rgba(255,248,198,0.42)' },
  ajoloteHeroCopy: { flex: 1, paddingLeft: 11, zIndex: 2 }, ajoloteKicker: { color: '#9a4875', fontSize: 5.8, fontWeight: '900', letterSpacing: 1 }, ajoloteHeroTitle: { color: '#71345d', fontSize: 14, fontWeight: '900', marginTop: 2 }, ajoloteHeroText: { width: 170, color: '#8b5674', fontSize: 7, lineHeight: 9.5, fontWeight: '700', marginTop: 2 },
  ajoloteHeroImage: { width: 91, height: 86, marginRight: 3, marginBottom: -8 },
  ajolotePresentacion: { minHeight: 31, paddingHorizontal: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff0f6', borderWidth: 1, borderColor: '#edbfd4' }, ajolotePresentacionText: { flex: 1, color: '#85536f', fontSize: 6.8, lineHeight: 9.5, fontWeight: '700' },
  ajoloteTrajesFila: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 6 },
  ajoloteTraje: { flex: 1, minWidth: 0, padding: 5, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }, ajoloteTrajeEpico: { backgroundColor: '#f3e8fa', borderColor: '#c8a2dc' }, ajoloteTrajeLegendario: { backgroundColor: '#fff0d1', borderColor: '#d9a456' },
  ajoloteTrajeImage: { width: 56, height: 58 }, ajoloteTrajeCopy: { flex: 1, minWidth: 0, marginLeft: 3 }, ajoloteTrajeRareza: { color: '#9b63ba', fontSize: 5.4, fontWeight: '900', letterSpacing: 0.7 }, ajoloteTrajeRarezaLegendaria: { color: '#b87824' }, ajoloteTrajeNombre: { color: '#71405e', fontSize: 7.1, lineHeight: 8.5, fontWeight: '900', marginTop: 2 }, ajoloteTrajeDetalle: { color: '#966d83', fontSize: 5.5, lineHeight: 7, fontWeight: '700', marginTop: 2 },
  erizoBody: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingVertical: 7, gap: 6 },
  erizoHero: { height: 78, overflow: 'hidden', borderRadius: 14, borderWidth: 1.2, borderColor: '#ba92c8', flexDirection: 'row', alignItems: 'center' },
  erizoHeroMoon: { position: 'absolute', right: 15, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,226,155,0.25)', borderWidth: 1, borderColor: 'rgba(255,226,155,0.32)' },
  erizoHeroStars: { position: 'absolute', top: 6, left: 13, color: '#f0c873', fontSize: 7, letterSpacing: 3 },
  erizoHeroCopy: { flex: 1, paddingLeft: 11, paddingTop: 7, zIndex: 2 }, erizoKicker: { color: '#e7c977', fontSize: 5.8, fontWeight: '900', letterSpacing: 1 }, erizoHeroTitle: { color: '#fff0c7', fontSize: 13.5, fontWeight: '900', marginTop: 2 }, erizoHeroText: { width: 172, color: '#e5d5ea', fontSize: 7, lineHeight: 9.5, fontWeight: '700', marginTop: 2 },
  erizoHeroImage: { width: 91, height: 87, marginRight: 2, marginBottom: -9 },
  erizoPresentacion: { minHeight: 31, paddingHorizontal: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f2eaf6', borderWidth: 1, borderColor: '#cdb1d8' }, erizoPresentacionText: { flex: 1, color: '#614a6d', fontSize: 6.7, lineHeight: 9.2, fontWeight: '700' },
  erizoTrajesFila: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 6 },
  erizoTraje: { flex: 1, minWidth: 0, padding: 5, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }, erizoTrajeEpico: { backgroundColor: '#eee4f7', borderColor: '#aa85c5' }, erizoTrajeLegendario: { backgroundColor: '#f6e5cc', borderColor: '#c89448' },
  erizoTrajeImage: { width: 56, height: 58 }, erizoTrajeCopy: { flex: 1, minWidth: 0, marginLeft: 3 }, erizoTrajeRareza: { color: '#7b55a6', fontSize: 5.4, fontWeight: '900', letterSpacing: 0.7 }, erizoTrajeRarezaLegendaria: { color: '#a56625' }, erizoTrajeNombre: { color: '#4d3658', fontSize: 7.1, lineHeight: 8.5, fontWeight: '900', marginTop: 2 }, erizoTrajeDetalle: { color: '#765f7f', fontSize: 5.5, lineHeight: 7, fontWeight: '700', marginTop: 2 },
  animalitosLotesBody: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingVertical: 7, gap: 7 },
  animalitosLotesHero: { height: 80, overflow: 'hidden', borderRadius: 14, borderWidth: 1.2, borderColor: '#c39ac7', padding: 10 },
  animalitosLotesKicker: { color: '#7b517e', fontSize: 5.8, fontWeight: '900', letterSpacing: 1 }, animalitosLotesTitle: { color: '#5b375e', fontSize: 14, fontWeight: '900', marginTop: 2 }, animalitosLotesText: { width: 164, color: '#805f80', fontSize: 7, lineHeight: 9.5, fontWeight: '700', marginTop: 2 },
  animalitosLotesAjolote: { position: 'absolute', right: 65, bottom: -9, width: 75, height: 75 }, animalitosLotesErizo: { position: 'absolute', right: -4, bottom: -10, width: 84, height: 84 },
  animalitosLotesFila: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 7 },
  animalitosLoteMini: { flex: 1, minWidth: 0, padding: 5, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }, animalitosLoteAjolote: { backgroundColor: '#fff0f6', borderColor: '#e5aac6' }, animalitosLoteErizo: { backgroundColor: '#f0e9f8', borderColor: '#b897cb' },
  animalitosLoteMiniImage: { width: 54, height: 57 }, animalitosLoteMiniKicker: { color: '#c45d90', fontSize: 5.3, fontWeight: '900', letterSpacing: 0.7 }, animalitosLoteErizoKicker: { color: '#76569a' }, animalitosLoteMiniTitle: { width: 72, color: '#5c405d', fontSize: 7.2, lineHeight: 8.7, fontWeight: '900', marginTop: 2 },
  detailBody: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', gap: 7 },
  heroColumn: { width: '38%', minWidth: 0, gap: 6 },
  eyebrow: { color: '#a15c46', fontFamily: 'Delius', fontSize: 6.2, lineHeight: 8, fontWeight: '900', letterSpacing: 0.9 },
  titleWrap: { position: 'relative', overflow: 'hidden', marginTop: 2, borderRadius: 4 },
  title: { color: '#55351f', fontFamily: 'Delius', fontSize: 13.5, lineHeight: 15.5, fontWeight: '900' },
  titleShine: { position: 'absolute', top: -20, left: 0, width: 30, height: 75, backgroundColor: 'rgba(255,246,184,0.52)' },
  description: { marginTop: 1, color: '#806047', fontFamily: 'Delius', fontSize: 6, lineHeight: 7.5, fontWeight: '700' },
  profilePreview: { flex: 1, minHeight: 91, overflow: 'hidden', borderRadius: 11, backgroundColor: '#fff4d9', borderWidth: 1.2, borderColor: '#c59461', shadowColor: '#795033', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  previewTop: { height: 20, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(119,72,42,0.22)' },
  previewTopText: { color: '#74452f', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 },
  previewBody: { flex: 1, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewInfo: { flex: 1, minWidth: 0 },
  previewName: { color: '#563522', fontFamily: 'Delius', fontSize: 10.5, lineHeight: 12, fontWeight: '900' },
  previewPhrase: { color: '#997253', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '700' },
  previewStats: { height: 29, marginTop: 5, paddingHorizontal: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#8562a5' },
  previewStatValue: { color: '#fff4cf', fontSize: 8, lineHeight: 9, fontWeight: '900', textAlign: 'center' },
  previewStatLabel: { color: '#e8d8f1', fontSize: 4, fontWeight: '900', textAlign: 'center' },
  featuresColumn: { flex: 1, minWidth: 0, gap: 6 },
  featureRow: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 6 },
  feature: { flex: 1, minWidth: 0, padding: 5, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,249,230,0.74)', borderWidth: 1.2 },
  featureVisual: { width: '46%', height: '100%', minHeight: 55, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { flex: 1, minWidth: 0 },
  featureTitle: { fontFamily: 'Delius', fontSize: 7.2, lineHeight: 9, fontWeight: '900', letterSpacing: 0.35 },
  featureDetail: { marginTop: 2, color: '#806047', fontFamily: 'Delius', fontSize: 5.4, lineHeight: 7, fontWeight: '700' },
  promise: { minHeight: 37, paddingHorizontal: 7, borderRadius: 9, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(243,220,178,0.82)', borderWidth: 1, borderColor: '#d1a76b' },
  promiseCopy: { flex: 1, minWidth: 0 },
  promiseTitle: { color: '#8c5835', fontFamily: 'Delius', fontSize: 6.2, lineHeight: 8, fontWeight: '900', letterSpacing: 0.45 },
  promiseText: { color: '#88684d', fontFamily: 'Delius', fontSize: 5.2, lineHeight: 7, fontWeight: '700' },
  footer: { height: 43, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(145,93,50,0.2)' },
  footerText: { flex: 1, color: '#8b684b', fontFamily: 'Delius', fontSize: 6.2, fontWeight: '700' },
  continueButton: { height: 29, paddingHorizontal: 13, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#a76649', borderWidth: 1, borderColor: '#75442f', shadowColor: '#68402c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.27, shadowRadius: 3, elevation: 4 },
  continueText: { color: '#fff8df', fontFamily: 'Delius', fontSize: 6.8, fontWeight: '900', letterSpacing: 0.55 },
  invitationBody: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', gap: 8 },
  invitationLetter: { width: '35%', minWidth: 150, position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, borderRadius: 13, borderWidth: 1.3, borderColor: '#b97869', shadowColor: '#7b463c', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.27, shadowRadius: 5, elevation: 4 },
  invitationSun: { position: 'absolute', width: 118, height: 118, top: -55, right: -32, borderRadius: 59, backgroundColor: 'rgba(255,239,180,0.65)', borderWidth: 10, borderColor: 'rgba(255,248,213,0.22)' },
  invitationDate: { position: 'absolute', zIndex: 3, left: 7, top: 7, height: 27, paddingHorizontal: 7, borderRadius: 9, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(145,78,70,0.84)', borderWidth: 1, borderColor: '#f3d2a8' },
  invitationDateMain: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 7.2, lineHeight: 8, fontWeight: '900', letterSpacing: 0.35 },
  invitationDateSub: { color: '#f1cfbf', fontFamily: 'Delius', fontSize: 3.8, lineHeight: 5, fontWeight: '900', letterSpacing: 0.35 },
  invitationHalcon: { position: 'absolute', width: 127, height: 123, alignSelf: 'center', bottom: 17 },
  invitationSeal: { position: 'absolute', right: 9, bottom: 8, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b95068', borderWidth: 2, borderColor: '#f6d5aa', shadowColor: '#7b3044', shadowOpacity: 0.35, shadowRadius: 3, elevation: 3 },
  invitationFrom: { zIndex: 2, color: '#7d4e3d', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900', letterSpacing: 0.8 },
  invitationMain: { flex: 1, minWidth: 0, justifyContent: 'space-between', gap: 6 },
  invitationMessage: { flex: 1, minHeight: 54, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 11, flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: 'rgba(255,248,229,0.75)', borderWidth: 1, borderColor: '#d5ad83' },
  invitationMessageText: { flex: 1, color: '#75533f', fontFamily: 'Delius', fontSize: 6.4, lineHeight: 9, fontWeight: '700' },
  responseRow: { height: 58, flexDirection: 'row', gap: 6 },
  responseCard: { flex: 1, minWidth: 0, paddingHorizontal: 7, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,248,229,0.82)', borderWidth: 1.2 },
  responseAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(125,84,57,0.14)' },
  responseCopy: { flex: 1, minWidth: 0 },
  responseName: { color: '#63412e', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 8, fontWeight: '900', letterSpacing: 0.3 },
  responseStatus: { marginTop: 1, flexDirection: 'row', gap: 3, alignItems: 'center' },
  responseStatusText: { fontFamily: 'Delius', fontSize: 6.2, lineHeight: 8, fontWeight: '900' },
  responseSeen: { color: '#9b775c', fontFamily: 'Delius', fontSize: 4.5, lineHeight: 6, fontWeight: '700' },
  invitationActions: { height: 31, flexDirection: 'row', justifyContent: 'flex-end', gap: 7 },
  rejectButton: { minWidth: 86, height: 31, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ead9c8', borderWidth: 1, borderColor: '#ba9680' },
  rejectText: { color: '#896555', fontFamily: 'Delius', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.35 },
  confirmButton: { minWidth: 143, height: 31, paddingHorizontal: 10, borderRadius: 10, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b75c70', borderWidth: 1, borderColor: '#823e51', shadowColor: '#853c51', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  confirmButtonLow: { backgroundColor: '#aa7b78', borderColor: '#865f5b' },
  confirmText: { color: '#fff7dc', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.45 },
  confirmCost: { height: 18, marginLeft: 3, paddingHorizontal: 5, borderRadius: 9, flexDirection: 'row', gap: 3, alignItems: 'center', backgroundColor: 'rgba(103,45,57,0.4)' },
  coinMini: { width: 10, height: 10, borderRadius: 5, color: '#fff2a5', backgroundColor: '#d8a13a', fontSize: 4, lineHeight: 8, textAlign: 'center', borderWidth: 1, borderColor: '#f7da78' },
  confirmCostText: { color: '#fff4c9', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900' },
  decisionSaved: { height: 31, paddingHorizontal: 9, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(241,226,198,0.9)', borderWidth: 1, borderColor: '#cba77d' },
  decisionSavedText: { flex: 1, color: '#7d5b45', fontFamily: 'Delius', fontSize: 5.6, lineHeight: 7, fontWeight: '800' },
  noPartner: { height: 31, paddingHorizontal: 9, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#edd9d3', borderWidth: 1, borderColor: '#c99a91' },
  noPartnerText: { flex: 1, color: '#875e57', fontFamily: 'Delius', fontSize: 5.8, fontWeight: '800' },
  frameSample: { width: 68, height: 66, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  frameOuter: { width: 55, height: 55, padding: 4, borderRadius: 19, borderWidth: 1.3, borderColor: '#8b4054', shadowColor: '#6a3445', shadowOpacity: 0.35, shadowRadius: 3, elevation: 3 },
  frameInner: { flex: 1, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: '#fff0c3' },
  frameAvatar: { width: '100%', height: '100%' },
  frameGem: { position: 'absolute', bottom: 1, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c85f76', borderWidth: 1, borderColor: '#fff0c1' },
  frameMiniStack: { position: 'absolute', right: -1, bottom: 3, flexDirection: 'row', gap: 1 },
  miniFrame: { width: 8, height: 8, borderRadius: 3, borderWidth: 0.7, borderColor: '#fff2ce' },
  badgeSample: { width: '100%', height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 },
  badgeMedal: { width: 31, height: 31, borderRadius: 16, padding: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#efd58a', shadowColor: '#78502e', shadowOpacity: 0.28, shadowRadius: 2, elevation: 3 },
  badgeRing: { width: '100%', height: '100%', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,244,202,0.7)' },
  badgeTail: { position: 'absolute', bottom: -5, width: 10, height: 8, backgroundColor: '#e4bd69', transform: [{ rotate: '45deg' }], zIndex: -1 },
  cornerSample: { width: '100%', height: '100%', minHeight: 55, position: 'relative', overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: '#7d6942' },
  cornerAnimal: { position: 'absolute', alignSelf: 'center', bottom: -2, width: 64, height: 58 },
  cornerFlower: { position: 'absolute', left: 4, bottom: 4, width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c8787d', borderWidth: 1, borderColor: '#fff0bf' },
  collectionSample: { width: '100%', height: '100%', minHeight: 55, position: 'relative' },
  animalCard: { position: 'absolute', width: 53, height: 55, overflow: 'hidden', borderRadius: 8, backgroundColor: '#f5e8c9', borderWidth: 1.2, borderColor: '#b99160', shadowColor: '#68452f', shadowOpacity: 0.25, shadowRadius: 2, elevation: 2 },
  animalCardBack: { right: 2, top: 1, transform: [{ rotate: '8deg' }], backgroundColor: '#eee0f4' },
  animalCardFront: { left: 2, bottom: 0, transform: [{ rotate: '-4deg' }] },
  collectionAnimal: { width: '100%', height: '100%' },
  collectionCheck: { position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#69945a' },
  collectionCount: { position: 'absolute', right: 0, bottom: 0, minWidth: 28, height: 14, paddingHorizontal: 5, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7864a5', borderWidth: 1, borderColor: '#eee1ff' },
  collectionCountText: { color: '#fff7e3', fontSize: 5.5, fontWeight: '900' },
});
