import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Path, Defs, LinearGradient, Stop, G, Text as SvgText, Ellipse, Filter, FeGaussianBlur } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Avatar = memo(({ uri, nombre, size = 48 }) => {
  if (uri) return (
    <ExpoImage source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" cachePolicy="memory" />
  );
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarLetter}>{(nombre || '?')[0].toUpperCase()}</Text>
    </View>
  );
});

export default memo(function Pareja({ navigation, isPaused }) {
  const uid = auth.currentUser?.uid;
  const [pareja, setPareja] = useState(undefined); // undefined = cargando
  const [parejaData, setParejaData] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  useEffect(() => {
    if (isPaused || !uid) return;
    AsyncStorage.getItem(`pareja_cache_${uid}`).then(value => {
      if (!value) return;
      const cached = JSON.parse(value);
      if (cached?.id) { setPareja(cached.id); setParejaData(cached); }
    }).catch(() => {});
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      const partnerId = snap.data()?.pareja || null;
      setPareja(partnerId);
      if (!partnerId) { setParejaData(null); AsyncStorage.removeItem(`pareja_cache_${uid}`).catch(() => {}); }
    });
    return unsub;
  }, [uid, isPaused]);

  // Si tiene pareja, cargar sus datos
  useEffect(() => {
    if (!pareja) { setParejaData(null); return; }
    getDoc(doc(db, 'usuarios', pareja)).then(snap => {
      if (snap.exists()) {
        const fresh = { id: snap.id, ...snap.data() };
        setParejaData(fresh);
        AsyncStorage.setItem(`pareja_cache_${uid}`, JSON.stringify(fresh)).catch(() => {});
      }
    }).catch(() => {});
  }, [pareja]);

  // Si no tiene pareja, cargar lista de usuarios
  useEffect(() => {
    if (pareja !== null) return;
    setLoading(true);
    getDocs(collection(db, 'usuarios')).then(snap => {
      const lista = snap.docs
        .filter(d => d.id !== uid)
        .map(d => ({ id: d.id, ...d.data() }));
      setUsuarios(lista);
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
      global.showToast?.({ text1: 'Invitación enviada ✓', type: 'success' });
    } catch (e) {
      console.error('Error al enviar invitación:', e);
    }
  };

  if (pareja === undefined) return null;

  return (
    <View style={styles.wrap}>
      <ExpoImage
        source={require('../assets/inicio/pareja.png')}
        style={StyleSheet.absoluteFill}
        contentFit="fill"
        cachePolicy="memory-disk"
      />

      {pareja && parejaData ? (
        // Tiene pareja — mostrar solo ella en la lista
        <View style={styles.listaWrap}>
          <View style={styles.usuarioRow}>
            <Avatar uri={parejaData.photoURL} nombre={parejaData.nombre} size={32} />
            <TouchableOpacity onPress={() => navigation?.navigate('perfil', { uid: parejaData.id })} activeOpacity={0.7} style={styles.parejaInfoContainer}>
              <Text style={[styles.usuarioNombre, styles.parejaNameStyle]}>{parejaData.nombre}</Text>
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Conectado/a</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.partnerLoveTitle}>Nivel de pareja</Text>
          <View style={styles.partnerLoveBar}>
            <Svg width="120" height="24" viewBox="0 0 140 28">
              <Defs><LinearGradient id="partnerGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#e8dcc8" /><Stop offset="100%" stopColor="#dcd0bb" /></LinearGradient><LinearGradient id="partnerHeart" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#ff5a8f" /><Stop offset="50%" stopColor="#ff6b9d" /><Stop offset="100%" stopColor="#d9577f" /></LinearGradient></Defs>
              <Path d="M 20 4 L 135 4 Q 138 4 138 14 Q 138 24 135 24 L 20 24 Q 17 24 17 14 Q 17 4 20 4 Z" fill="url(#partnerGrad)" stroke="#c9b8a0" strokeWidth="1.5" />
              <G transform="translate(-2, -2)"><Path d="M 18 30 C 8 22 2 15 2 10 C 2 5 5 2 9 2 C 12 2 14.5 3.5 18 7 C 21.5 3.5 24 2 27 2 C 31 2 34 5 34 10 C 34 15 28 22 18 30 Z" fill="url(#partnerHeart)" /><Path d="M 9 4 Q 11 2 13 5 Q 11.5 1 9 2 C 5 2 3 4.5 3 8" fill="#ffffff" opacity="0.5" /><Ellipse cx="11" cy="7" rx="3" ry="3.5" fill="#ffffff" opacity="0.35" /><SvgText x="18" y="20" fontSize="12" fontWeight="bold" fill="#ffffff" textAnchor="middle" dominantBaseline="middle">{String(parejaData.nivelAmor || 3)}</SvgText></G>
            </Svg>
          </View>
          <TouchableOpacity style={styles.verPerfilBtn} onPress={() => navigation?.navigate('perfil', { uid: parejaData.id })} activeOpacity={0.8}>
            <Text style={styles.verPerfilText}>Ver perfil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Sin pareja — lista de usuarios
        <View style={styles.listaWrap}>
          <FlatList
            data={usuarios}
            keyExtractor={i => i.id}
            style={styles.lista}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.usuarioRow}>
                <Avatar uri={item.photoURL} nombre={item.nombre} size={32} />
                <TouchableOpacity onPress={() => navigation?.navigate('perfil', { uid: item.id })} activeOpacity={0.7} style={styles.parejaInfoContainer}>
                  <Text style={[styles.usuarioNombre, styles.parejaNameStyle]}>{item.nombre}</Text>
                  <View style={styles.onlineIndicator}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Conectado/a</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, styles.addBtnHidden, enviados[item.id] && styles.addBtnSent]} onPress={() => !enviados[item.id] && enviarInvitacion(item)} disabled={!!enviados[item.id]}>
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={loading ? <ActivityIndicator size="small" color="#d9577f" style={styles.listaCargando} /> : <Text style={styles.vacio}>No hay usuarios</Text>}
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
            style={[styles.enviarSolicitudBtn, solicitudEnviada && styles.enviarSolicitudBtnEnviado]}
            onPress={enviarSolicitudGeneral}
            disabled={solicitudEnviada}
          >
            <Text style={[styles.enviarSolicitudText, solicitudEnviada && styles.enviarSolicitudTextEnviado]}>
              {solicitudEnviada ? 'Enviado' : 'Enviar solicitud'}
            </Text>
          </TouchableOpacity>
        </View>
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
  avatarFallback: {
    backgroundColor: 'rgba(201,116,143,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: '#fff', fontWeight: '700', fontSize: 14 },

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
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  onlineText: { fontSize: 9, color: '#4CAF50', fontFamily: 'Globo', fontWeight: '500' },
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
  nivelAmor: { fontSize: 8, color: '#795a37', fontFamily: 'Globo', textAlign: 'center', marginTop: 2, marginBottom: 1, fontWeight: '700' },
  capsulaContainer: { width: '100%', alignItems: 'center', marginTop: 1, marginBottom: 2 },
  enviarSolicitudBtn: {
    marginTop: 9,
    marginLeft: 'auto',
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
  partnerLoveBar: { alignSelf: 'center', width: 120, height: 24, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  partnerLoveTitle: { alignSelf: 'center', color: '#795a37', fontSize: 8, fontFamily: 'Globo', textAlign: 'center', marginTop: 9, marginBottom: 1, fontWeight: '700' },
  verPerfilBtn: { alignSelf: 'center', marginTop: 9, paddingHorizontal: 22, paddingVertical: 6, borderRadius: 7, backgroundColor: 'rgba(201,116,143,0.18)', borderWidth: 1, borderColor: '#c9748f' },
  verPerfilText: { color: '#c05d7d', fontSize: 10, fontFamily: 'Globo', fontWeight: '700' },
  vacio: { fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 40 },
  listaCargando: { marginTop: 34 },
});
