import React, { useEffect, useRef, useState, memo } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Path, Rect, Defs, ClipPath, LinearGradient, Stop, G, Text as SvgText, Ellipse, Filter, FeGaussianBlur } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, query, where, deleteDoc } from 'firebase/firestore';
import { getCachedUserData, useUserDocument } from '../hooks/useUserDocument';

let usuariosCache = null;
let usuariosRequest = null;
const getUsuariosCacheados = async () => {
  if (usuariosCache) return usuariosCache;
  if (!usuariosRequest) {
    usuariosRequest = getDocs(collection(db, 'usuarios')).then(snap => {
      usuariosCache = snap.docs.map(item => ({ id: item.id, ...item.data() }));
      return usuariosCache;
    }).finally(() => { usuariosRequest = null; });
  }
  return usuariosRequest;
};
const PAREJA_BACKGROUND = require('../assets/inicio/pareja.png');
const ICONO_DEFAULT = require('../assets/inicio/iconos/icono1.jpg');
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const fechaActividad = valor => {
  if (!valor) return null;
  if (typeof valor?.toDate === 'function') return valor.toDate();
  const valorNormalizado = typeof valor === 'number' && valor > 0 && valor < 1e12 ? valor * 1000 : valor;
  const fecha = new Date(valorNormalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const diferenciaActividad = (usuario, ahora) => {
  const fecha = fechaActividad(usuario?.ultimaActividad);
  if (!fecha) return null;
  const diferencia = ahora - fecha.getTime();
  // Se tolera un pequeño desfase entre relojes, pero no fechas futuras absurdas.
  if (diferencia < -(5 * 60 * 1000)) return null;
  return Math.max(0, diferencia);
};

const estaConectado = (usuario, ahora) => {
  const diferencia = diferenciaActividad(usuario, ahora);
  return diferencia !== null && diferencia <= ONLINE_WINDOW_MS;
};

const textoUltimaActividad = (usuario, ahora) => {
  const diferencia = diferenciaActividad(usuario, ahora);
  if (diferencia === null) return 'Sin actividad reciente';
  if (diferencia <= ONLINE_WINDOW_MS) return 'Conectado/a';

  const minutos = Math.floor(diferencia / (60 * 1000));
  if (minutos < 2) return 'Hace un momento';
  if (minutos < 60) return `Hace ${minutos} minutos`;

  const horas = Math.floor(minutos / 60);
  if (horas === 1) return 'Hace 1 hora';
  if (horas < 24) return `Hace ${horas} horas`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Hace 1 día';
  if (dias < 30) return `Hace ${dias} días`;

  const meses = Math.floor(dias / 30);
  if (meses === 1) return 'Hace 1 mes';
  if (dias < 365) return `Hace ${meses} meses`;

  const anios = Math.floor(dias / 365);
  return anios === 1 ? 'Hace 1 año' : `Hace ${anios} años`;
};

const IndicadorOnline = ({ usuario, ahora }) => {
  const visible = estaConectado(usuario, ahora);
  return (
  <View style={[styles.onlineIndicator, !visible && styles.onlineIndicatorOffline]}>
    <View style={[styles.onlineDot, !visible && styles.onlineDotOffline]} />
    <Text style={[styles.onlineText, !visible && styles.onlineTextOffline]}>{textoUltimaActividad(usuario, ahora)}</Text>
  </View>
  );
};

const Avatar = memo(({ uri, size = 48 }) => {
  return (
    <View style={{ width: size, height: size, borderRadius: 7, overflow: 'hidden', backgroundColor: '#fff7e6', borderWidth: 1, borderColor: '#d5b475' }}>
      <ExpoImage
        source={uri ? { uri } : ICONO_DEFAULT}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
    </View>
  );
});

export default memo(function Pareja({ navigation, isPaused, onTutorialSolicitud, tutorialSolicitudEnviada = false }) {
  const uidInicial = auth.currentUser?.uid;
  const datosIniciales = getCachedUserData(uidInicial);
  const parejaInicial = datosIniciales ? datosIniciales.pareja || null : undefined;
  const datosParejaIniciales = parejaInicial ? getCachedUserData(parejaInicial) : null;
  const contenidoEnCache = Boolean(parejaInicial ? datosParejaIniciales : usuariosCache);
  const { data: parejaActual, loaded: userLoaded, uid } = useUserDocument(data => data?.pareja || null);
  const { data: tutorialSolicitudGuardada } = useUserDocument(data => Boolean(data?.tutorialSolicitudEnviada));
  const [pareja, setPareja] = useState(parejaInicial); // undefined = cargando
  const [usuarios, setUsuarios] = useState(() => usuariosCache?.filter(user => user.id !== uidInicial && !user.pareja) || []);
  const [loading, setLoading] = useState(() => !usuariosCache);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const contentReveal = useRef(new Animated.Value(contenidoEnCache ? 1 : 0)).current;
  const contenidoYaVisible = useRef(contenidoEnCache);
  // Una cadena vacía evita que el hook use por error el documento del usuario
  // actual mientras todavía no existe una pareja seleccionada.
  const { data: parejaDocumento } = useUserDocument(data => data, pareja || '');
  const parejaDataActual = pareja && parejaDocumento ? { id: pareja, ...parejaDocumento } : null;
  // Firestore puede tardar un instante al reconectar el listener. Conservamos
  // el último perfil válido para que la tarjeta no quede vacía entre snapshots.
  const ultimaParejaData = useRef(datosParejaIniciales ? { id: parejaInicial, ...datosParejaIniciales } : null);
  if (parejaDataActual) ultimaParejaData.current = parejaDataActual;
  const parejaData = parejaDataActual || (ultimaParejaData.current?.id === pareja ? ultimaParejaData.current : null);
  const progresoNivelPareja = Math.max(0, Math.min(100, Math.round(((Number(parejaData?.exp) || 0) % 100))));

  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isPaused || !uid || !userLoaded) return;
    setPareja(parejaActual);
  }, [uid, isPaused, userLoaded, parejaActual]);

  const contentLoaded = pareja === null ? !loading : Boolean(parejaData);
  useEffect(() => {
    if (!contentLoaded) return;
    if (contenidoYaVisible.current) return;
    contenidoYaVisible.current = true;
    Animated.timing(contentReveal, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [contentLoaded, contentReveal]);

  // Si no tiene pareja, cargar lista de usuarios
  useEffect(() => {
    if (pareja !== null) return;
    setLoading(true);
    getUsuariosCacheados().then(lista => {
      // Una persona que ya está en pareja no puede recibir nuevas
      // invitaciones ni aparecer como opción disponible.
      const disponibles = lista.filter(user => user.id !== uid && !user.pareja);
      setUsuarios(disponibles);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pareja]);

  const [enviados, setEnviados] = useState({});

  const enviarSolicitudGeneral = async () => {
    try {
      // Enviar solicitud general a todos los usuarios disponibles
      const usuariosSnap = await getDocs(collection(db, 'usuarios'));
      const promesas = usuariosSnap.docs.map(doc => {
        if (doc.id !== uid && !doc.data()?.pareja) {
          return addDoc(collection(db, 'invitaciones_pareja'), {
            de: uid,
            para: doc.id,
            timestamp: serverTimestamp(),
            estado: 'pendiente',
          });
        }
      }).filter(Boolean);
      
      await Promise.all(promesas);
      setSolicitudEnviada(true);
      onTutorialSolicitud?.();
      global.showToast?.({ text1: 'Solicitud enviada ✓', type: 'success' });
    } catch (e) {
      console.error('Error al enviar solicitud:', e);
      global.showToast?.({ text1: 'Error al enviar solicitud', type: 'error' });
    }
  };

  const enviarInvitacion = async (destinatario) => {
    try {
      // Verificar si el destinatario ya tiene pareja
      const destSnap = await getDoc(doc(db, 'usuarios', destinatario.id));
      const tienePareja = !!destSnap.data()?.pareja;

      if (tienePareja) {
        // Avisar que tiene pareja pero igual preguntar — usamos global.showToast como confirmación simple
        // Como no hay Alert nativo aquí, enviamos igual con flag
        global.showToast?.({ text1: `${destinatario.nombre} ya tiene pareja. Invitación enviada igual.`, type: 'info' });
      }

      await addDoc(collection(db, 'invitaciones_pareja'), {
        de: uid,
        para: destinatario.id,
        timestamp: serverTimestamp(),
        estado: 'pendiente',
      });
      setEnviados(prev => ({ ...prev, [destinatario.id]: true }));
      onTutorialSolicitud?.();
      global.showToast?.({ text1: 'Invitación enviada ✓', type: 'success' });
    } catch (e) {
      console.error('Error al enviar invitación:', e);
    }
  };

  // Mostrar el marco inmediatamente mientras Firestore resuelve la pareja.
  // Antes devolvíamos null y el menú parecía no cargar cuando la red tardaba.
  if (pareja === undefined) {
    return (
      <View style={styles.wrap}>
        <ExpoImage
          source={PAREJA_BACKGROUND}
          style={StyleSheet.absoluteFill}
          contentFit="fill"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
        <ActivityIndicator size="small" color="#d9577f" style={styles.menuCargando} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ExpoImage
        source={PAREJA_BACKGROUND}
        style={StyleSheet.absoluteFill}
        contentFit="fill"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />

      {pareja && parejaData ? (
        // Tiene pareja — mostrar solo ella en la lista
        <Animated.View style={[styles.listaWrap, { opacity: contentReveal }]}>
          <View style={styles.usuarioRow}>
            <Avatar uri={parejaData.iconoUrl || parejaData.photoURL} size={32} />
            <TouchableOpacity onPress={() => navigation?.navigate('perfil', { uid: parejaData.id })} activeOpacity={0.7} style={styles.parejaInfoContainer}>
              <Text style={[styles.usuarioNombre, styles.parejaNameStyle]}>{parejaData.nombre}</Text>
              <IndicadorOnline usuario={parejaData} ahora={ahora} />
            </TouchableOpacity>
          </View>
          <Text style={styles.partnerLoveTitle}>Nivel de pareja</Text>
          <View style={styles.partnerLoveBar}>
            <Svg width="120" height="24" viewBox="0 0 140 28">
              <Defs><LinearGradient id="partnerGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#e8dcc8" /><Stop offset="100%" stopColor="#dcd0bb" /></LinearGradient><LinearGradient id="partnerHeart" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#ff5a8f" /><Stop offset="50%" stopColor="#ff6b9d" /><Stop offset="100%" stopColor="#d9577f" /></LinearGradient><ClipPath id="partnerTrackClip"><Path d="M 20 4 L 135 4 Q 138 4 138 14 Q 138 24 135 24 L 20 24 Q 17 24 17 14 Q 17 4 20 4 Z" /></ClipPath></Defs>
              <Path d="M 20 4 L 135 4 Q 138 4 138 14 Q 138 24 135 24 L 20 24 Q 17 24 17 14 Q 17 4 20 4 Z" fill="url(#partnerGrad)" stroke="#c9b8a0" strokeWidth="1.5" />
              <Rect x="17" y="4" width={121 * (progresoNivelPareja / 100)} height="20" fill="#df477e" clipPath="url(#partnerTrackClip)" />
              <G transform="translate(-2, -2)"><Path d="M 18 30 C 8 22 2 15 2 10 C 2 5 5 2 9 2 C 12 2 14.5 3.5 18 7 C 21.5 3.5 24 2 27 2 C 31 2 34 5 34 10 C 34 15 28 22 18 30 Z" fill="url(#partnerHeart)" /><Path d="M 9 4 Q 11 2 13 5 Q 11.5 1 9 2 C 5 2 3 4.5 3 8" fill="#ffffff" opacity="0.5" /><Ellipse cx="11" cy="7" rx="3" ry="3.5" fill="#ffffff" opacity="0.35" /><SvgText x="18" y="20" fontSize="12" fontWeight="bold" fill="#ffffff" textAnchor="middle" dominantBaseline="middle">{String(1 + Math.floor((parejaData.exp || 0) / 100))}</SvgText></G>
            </Svg>
          </View>
          <TouchableOpacity style={styles.verPerfilBtn} onPress={() => navigation?.navigate('perfil', { uid: parejaData.id })} activeOpacity={0.8}>
            <View style={styles.verPerfilInner}>
              <Text style={styles.verPerfilText}>Ver perfil</Text>
              <View style={styles.verPerfilDot} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        // Sin pareja — lista de usuarios
        <Animated.View style={[styles.listaWrap, { opacity: contentReveal }]}>
          <FlatList
            data={usuarios}
            keyExtractor={i => i.id}
            style={styles.lista}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.usuarioRow}>
                <Avatar uri={item.iconoUrl || item.photoURL} size={32} />
                <TouchableOpacity onPress={() => navigation?.navigate('perfil', { uid: item.id })} activeOpacity={0.7} style={styles.parejaInfoContainer}>
                  <Text style={[styles.usuarioNombre, styles.parejaNameStyle]}>{item.nombre}</Text>
                  <IndicadorOnline usuario={item} ahora={ahora} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, styles.addBtnHidden, enviados[item.id] && styles.addBtnSent]} onPress={() => !enviados[item.id] && enviarInvitacion(item)} disabled={!!enviados[item.id]}>
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={loading ? <ActivityIndicator size="small" color="#d9577f" style={styles.listaCargando} /> : <Text style={styles.vacio}>No hay parejas disponibles</Text>}
          />
          <Text style={styles.nivelAmor}>Nivel de amor</Text>
          <View style={styles.capsulaContainer}>
            <Svg width="120" height="24" viewBox="0 0 140 28">
              <Defs>
                <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#e8dcc8" stopOpacity="0.95" />
                  <Stop offset="100%" stopColor="#dcd0bb" stopOpacity="1" />
                </LinearGradient>
                <LinearGradient id="heartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#ff5a8f" stopOpacity="1" />
                  <Stop offset="50%" stopColor="#ff6b9d" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#d9577f" stopOpacity="1" />
                </LinearGradient>
                <Filter id="shadow">
                  <FeGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
                </Filter>
              </Defs>
              {/* Cápsula marrón gris amarillento pastel */}
              <Path d="M 20 4 L 135 4 Q 138 4 138 14 Q 138 24 135 24 L 20 24 Q 17 24 17 14 Q 17 4 20 4 Z" fill="url(#grad)" stroke="#c9b8a0" strokeWidth="1.5" />
              {/* Corazón más grande pero equilibrado */}
              <G transform="translate(-2, -2)">
                {/* Sombra del corazón */}
                <Path d="M 18 30 C 8 22 2 15 2 10 C 2 5 5 2 9 2 C 12 2 14.5 3.5 18 7 C 21.5 3.5 24 2 27 2 C 31 2 34 5 34 10 C 34 15 28 22 18 30 Z" fill="#000000" opacity="0.08" filter="url(#shadow)" />
                {/* Corazón principal */}
                <Path d="M 18 30 C 8 22 2 15 2 10 C 2 5 5 2 9 2 C 12 2 14.5 3.5 18 7 C 21.5 3.5 24 2 27 2 C 31 2 34 5 34 10 C 34 15 28 22 18 30 Z" fill="url(#heartGrad)" />
                {/* Brillo superior izquierdo */}
                <Path d="M 9 4 Q 11 2 13 5 Q 11.5 1 9 2 C 5 2 3 4.5 3 8" fill="#ffffff" opacity="0.5" />
                {/* Brillo central */}
                <Ellipse cx="11" cy="7" rx="3" ry="3.5" fill="#ffffff" opacity="0.35" />
                {/* Número "3" centrado */}
                <SvgText x="18" y="20" fontSize="12" fontWeight="bold" fill="#ffffff" textAnchor="middle" dominantBaseline="middle">3</SvgText>
              </G>
            </Svg>
          </View>
          <TouchableOpacity 
            style={[styles.enviarSolicitudBtn, (solicitudEnviada || tutorialSolicitudEnviada || tutorialSolicitudGuardada) && styles.enviarSolicitudBtnEnviado]}
            onPress={enviarSolicitudGeneral}
            disabled={solicitudEnviada || tutorialSolicitudEnviada || tutorialSolicitudGuardada}
          >
            <Text style={[styles.enviarSolicitudText, (solicitudEnviada || tutorialSolicitudEnviada || tutorialSolicitudGuardada) && styles.enviarSolicitudTextEnviado]}>
              {solicitudEnviada || tutorialSolicitudEnviada || tutorialSolicitudGuardada ? 'Enviado' : 'Enviar solicitud'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: -5,
    top: '15%',
    transform: [{ translateY: -2 }],
    width: 230,
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  // Con pareja
  parejaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  parejaTextos: { flex: 1 },
  parejaLabel: { fontSize: 9, color: '#c9748f', fontFamily: 'Globo' },
  parejaNombre: { fontSize: 13, color: '#5a2a3a', fontFamily: 'Globo', fontWeight: '700' },

  // Sin pareja
  listaWrap: { width: '100%', paddingHorizontal: 6, paddingTop: 50, justifyContent: 'flex-start', flexDirection: 'column' },
  lista: { height: 'auto' },
  usuarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingLeft: 48,
    marginTop: 12,
  },
  usuarioNombre: { width: 49.5, fontSize: 8, fontFamily: 'Globo', color: '#5a2a3a', marginLeft: 2, marginRight: 4 },
  usuarioNombreLink: { textDecorationLine: 'underline', color: '#c9748f' },
  parejaNameStyle: { width: 'auto', fontSize: 9, fontFamily: 'Globo', color: '#d9577f', fontWeight: '700', letterSpacing: 0.3 },
  parejaInfoContainer: { flex: 1, marginLeft: 2 },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2, gap: 4 },
  onlineIndicatorOffline: { opacity: 0.72 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  onlineDotOffline: { backgroundColor: '#aaa49a' },
  onlineText: { fontSize: 9, color: '#4CAF50', fontFamily: 'Globo', fontWeight: '500' },
  onlineTextOffline: { color: '#aaa49a' },
  addBtnHidden: { display: 'none' },
  addBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(201,116,143,0.2)',
    borderWidth: 1,
    borderColor: '#c9748f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnSent: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderColor: '#4CAF50',
  },
  addBtnText: { fontSize: 14, color: '#c9748f', fontWeight: 'bold' },
  nivelAmor: { position: 'absolute', left: 0, right: 0, bottom: -20, fontSize: 8, color: '#795a37', fontFamily: 'Globo', textAlign: 'center', marginBottom: 1, fontWeight: '700' },
  capsulaContainer: { position: 'absolute', left: 0, right: 0, bottom: -48, width: '100%', alignItems: 'center' },
  enviarSolicitudBtn: {
    position: 'absolute',
    left: 87,
    bottom: -75,
    marginRight: 60,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '50%',
    backgroundColor: '#d9577f',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enviarSolicitudBtnEnviado: {
    backgroundColor: '#4CAF50',
  },
  enviarSolicitudText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Globo',
    letterSpacing: 0.1,
  },
  enviarSolicitudTextEnviado: {
    color: '#ffffff',
  },
  partnerLoveBar: { alignSelf: 'center', width: 120, height: 24, marginTop: 2, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: 2 }] },
  partnerLoveTitle: { alignSelf: 'center', color: '#795a37', fontSize: 8, fontFamily: 'Globo', textAlign: 'center', marginTop: 3, marginBottom: 1, fontWeight: '700', transform: [{ translateY: 2 }] },
  verPerfilBtn: { alignSelf: 'center', marginTop: 9, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 7, backgroundColor: 'rgba(201,116,143,0.18)', borderWidth: 1, borderColor: '#c9748f', transform: [{ translateY: 2 }] },
  verPerfilInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verPerfilDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d94b4b', borderWidth: 1, borderColor: 'rgba(201,116,143,0.3)' },
  verPerfilText: { color: '#c05d7d', fontSize: 10, fontFamily: 'Globo', fontWeight: '700' },
  vacio: { fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 20 },
  listaCargando: { marginTop: 34 },
  menuCargando: { marginTop: 56 },
});
