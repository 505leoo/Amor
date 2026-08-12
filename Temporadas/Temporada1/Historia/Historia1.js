import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Modal, Animated } from 'react-native';
import { Image } from 'expo-image';
import TabButtons from '../../../components/TabButtons';
import RecompensaOverlay from '../../../components/RecompensaOverlay';
import { db, auth } from '../../../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const NODOS = [
  { id: 1, titulo: 'El Primer Encuentro', descripcion: 'El comienzo de todo.', imagen: require('../../../assets/temporadas/libro/Temporada1/Historia/historia1.png'), recompensa: '✨ Recuerdo desbloqueado', mision: '¿En qué lugar se conocieron por primera vez?', respuesta: 'parque', completado: true },
  { id: 2, titulo: 'La Primera Sonrisa',  descripcion: 'Ese momento que lo cambió todo.', imagen: require('../../../assets/temporadas/libro/Temporada1/Historia/historia2.png'), recompensa: '💌 Carta especial', mision: '¿Cuál fue la primera canción que escucharon juntos?', respuesta: 'amor', completado: false },
  { id: 3, titulo: 'Noches de Lluvia',    descripcion: 'Cuando el mundo se detuvo.', imagen: require('../../../assets/temporadas/libro/Temporada1/Historia/historia3.png'), recompensa: '🌙 Momento secreto', mision: '¿Qué película vieron esa noche?', respuesta: 'titanic', completado: false },
  { id: 4, titulo: 'El Regalo',           descripcion: 'Algo que nunca olvidarás.', imagen: require('../../../assets/temporadas/libro/Temporada1/Historia/historia4.png'), recompensa: '🎁 Sorpresa desbloqueada', mision: '¿Qué color tenía el lazo del regalo?', respuesta: 'rojo', completado: false },
  { id: 5, titulo: 'Bajo las Estrellas',  descripcion: 'Una noche para siempre.', imagen: require('../../../assets/temporadas/libro/Temporada1/Historia/historia5.png'), recompensa: '⭐ Constelación especial', mision: '¿Cuántas estrellas contaron esa noche?', respuesta: 'tres', completado: false },
  { id: 6, titulo: 'Para Siempre',        descripcion: 'El final que es un comienzo.', imagen: require('../../../assets/temporadas/libro/Temporada1/Historia/historia6.png'), recompensa: '💖 Final desbloqueado', mision: '¿Qué palabra dijeron al mismo tiempo?', respuesta: 'siempre', completado: false },
];

function CuadritoActual({ style, children }) {
  const glow = useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[style, { opacity: glow }]}>{children}</Animated.View>;
}

export default function Historia1({ navigation }) {
  const [nodos, setNodos] = useState(NODOS);
  const [modalNodo, setModalNodo] = useState(null);
  const [fase, setFase] = useState('detalle');
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    // Registrar visita para misión explorar_t1 (una sola escritura por día)
    const hoy = (() => { const h = new Date(); return `${h.getFullYear()}-${h.getMonth()+1}-${h.getDate()}`; })();
    const visitaKey = `explorar_t1_historia1_${hoy}`;
    if (!global[visitaKey]) { global[visitaKey] = true; setDoc(doc(db, 'misiones_diarias', hoy), { [uid]: { progreso: { explorar_t1_historia1: true } } }, { merge: true }).catch(() => {}); }
    getDoc(doc(db, 'Historias', uid)).then(snap => {
      if (!snap.exists()) return;
      const t1 = snap.data().temporada1 || {};
      setNodos(prev => prev.map(n => ({ ...n, completado: !!t1[`nodo${n.id}`] })));
    }).catch(() => {});
    setDoc(doc(db, 'usuarios', uid), { historia1Visto: serverTimestamp() }, { merge: true }).catch(() => {});
  }, []);

  const completados = nodos.filter(n => n.completado).length;

  const abrirNodo = (nodo, idx) => {
    if (nodo.completado) return;
    if (idx > 0 && !nodos[idx - 1].completado) return;
    setModalNodo(nodo);
    setFase('detalle');
    setRespuesta('');
    setError(false);
    scaleAnim.setValue(0.9);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const verificar = () => {
    if (respuesta.trim().toLowerCase() === modalNodo.respuesta.toLowerCase()) {
      setNodos(prev => prev.map(n => n.id === modalNodo.id ? { ...n, completado: true } : n));
      setModalNodo(prev => ({ ...prev, completado: true }));
      setFase('recompensa');
      const uid = auth.currentUser?.uid;
      if (uid) setDoc(doc(db, 'Historias', uid), { temporada1: { [`nodo${modalNodo.id}`]: true } }, { merge: true }).catch(() => {});
      setError(false);
    } else {
      setError(true);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
    }
  };

  const cerrar = () => {
    Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setModalNodo(null); setFase('detalle'); setRespuesta(''); setError(false);
    });
  };

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <Image source={require('../../../assets/temporadas/libro/Temporada1/fondo1.png')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} contentFit="cover" cachePolicy="memory" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      <TabButtons onExit={() => navigation?.navigate?.('temporada1')} customAddButton={<View />} />
      <TouchableOpacity style={s.libroBtn} onPress={() => navigation?.navigate?.('librotemp1')}>
        <Text style={s.libroBtnText}>📖</Text>
      </TouchableOpacity>

      <View style={[s.header, fase === 'recompensa' && { opacity: 0 }]}>
        <Text style={s.headerSub}>Temporada 1</Text>
        <Text style={s.headerTitle}>Historia</Text>
      </View>

      <View style={[s.capsulaWrap, fase === 'recompensa' && { opacity: 0 }]}>
        <View style={s.capsula}>
          {nodos.map((nodo, idx) => {
            const bloqueado = idx > 0 && !nodos[idx - 1].completado;
            const esActual = !nodo.completado && (idx === 0 || nodos[idx - 1].completado);
            const esPrimero = idx === 0;
            const esUltimo = idx === nodos.length - 1;
            const esquinas = {
              borderTopLeftRadius: esPrimero ? 7 : 0,
              borderBottomLeftRadius: esPrimero ? 7 : 0,
              borderTopRightRadius: esUltimo ? 7 : 0,
              borderBottomRightRadius: esUltimo ? 7 : 0,
            };
            if (esActual) return (
              <CuadritoActual key={nodo.id} style={[s.cuadrito, s.cuadritoNaranja, esquinas]}>
                <TouchableOpacity onPress={() => abrirNodo(nodo, idx)} activeOpacity={0.75} style={StyleSheet.absoluteFill} />
                <Text style={s.cuadritoNum}>{idx + 1}</Text>
              </CuadritoActual>
            );
            return (
              <TouchableOpacity key={nodo.id} onPress={() => abrirNodo(nodo, idx)} activeOpacity={bloqueado ? 1 : 0.75} style={[s.cuadrito, nodo.completado && s.cuadritoVerde, bloqueado && s.cuadritoBloqueado, esquinas]}>
                <Text style={s.cuadritoNum}>{idx + 1}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.progressText}>{completados} / {nodos.length}</Text>
      </View>

      <RecompensaOverlay
        visible={fase === 'recompensa'}
        imagen={modalNodo?.imagen}
        texto={modalNodo?.recompensa}
        onClose={cerrar}
      />

      <Modal visible={!!modalNodo && fase !== 'recompensa'} transparent animationType="none" onRequestClose={cerrar}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={cerrar}>
          <Animated.View style={[s.modalCard, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>

              {fase === 'detalle' && modalNodo && (
                <View style={s.modalRow}>
                  <View style={s.modalLeft}>
                    <Text style={s.modalCap}>Capítulo {modalNodo.id}</Text>
                    <Text style={s.modalTitulo}>{modalNodo.titulo}</Text>
                    <Text style={s.modalDesc}>{modalNodo.descripcion}</Text>
                    {modalNodo.completado
                      ? <View style={s.recompensaBox}><Text style={s.recompensaBoxText}>{modalNodo.recompensa}</Text></View>
                      : <TouchableOpacity style={s.btnMision} onPress={() => setFase('mision')}><Text style={s.btnMisionText}>⚔ Completar misión</Text></TouchableOpacity>
                    }
                  </View>
                  <View style={s.modalRight}>
                    {modalNodo.completado
                      ? <Image source={modalNodo.imagen} style={s.modalImg} contentFit="cover" cachePolicy="memory" />
                      : <View style={s.imgOculta}><Text style={s.imgOcultaIcon}>🔮</Text><Text style={s.imgOcultaText}>Completa la misión{'\n'}para revelar</Text></View>
                    }
                  </View>
                </View>
              )}

              {fase === 'mision' && modalNodo && (
                <View style={s.modalRow}>
                  <View style={s.modalLeft}>
                    <Text style={s.misionLabel}>✦ Misión</Text>
                    <Text style={s.misionPregunta}>{modalNodo.mision}</Text>
                    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                      <View style={[s.inputWrap, error && s.inputError]}>
                        <Text style={s.inputText}>{respuesta || '...'}</Text>
                      </View>
                    </Animated.View>
                    {error && <Text style={s.errorText}>Respuesta incorrecta ✗</Text>}
                    <TouchableOpacity style={s.btnVerificar} onPress={verificar}>
                      <Text style={s.btnVerificarText}>Confirmar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.modalRight}>
                    <View style={s.teclado}>
                      {'abcdefghijklmnopqrstuvwxyz'.split('').map(l => (
                        <TouchableOpacity key={l} style={s.tecla} onPress={() => { setError(false); setRespuesta(r => r + l); }}>
                          <Text style={s.teclaText}>{l}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity style={[s.tecla, s.teclaEsp]} onPress={() => setRespuesta(r => r.slice(0, -1))}>
                        <Text style={s.teclaText}>⌫</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  libroBtn: {
    position: 'absolute',
    bottom: '10%',
    right: '7%',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  libroBtnText: { fontSize: 28 },

  container: { flex: 1 },

  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 6 },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Delius' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', fontFamily: 'Omori', marginTop: 2 },

  capsulaWrap: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  capsula: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cuadrito: { width: 56, height: 28, backgroundColor: 'rgba(255,255,255,0.07)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  cuadritoVerde: { backgroundColor: 'rgba(76,175,80,0.65)' },
  cuadritoNaranja: { backgroundColor: 'rgba(255,165,0,0.75)' },
  cuadritoBloqueado: { opacity: 0.3 },
  cuadritoNum: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Delius' },
  progressText: { color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 8, fontFamily: 'Delius' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: 520, backgroundColor: '#fcf7d0', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 },
  modalRow: { flexDirection: 'row', minHeight: 180 },
  modalLeft: { flex: 1, padding: 20 },
  modalRight: { width: 180 },
  modalImg: { width: '100%', height: '100%' },
  imgOculta: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(90,62,43,0.08)' },
  imgOcultaIcon: { fontSize: 32, marginBottom: 8 },
  imgOcultaText: { color: '#aaa', fontSize: 10, textAlign: 'center', fontFamily: 'Delius', lineHeight: 15 },

  modalCap: { color: '#bbb', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'Delius' },
  modalTitulo: { color: '#333', fontSize: 16, fontWeight: '700', fontFamily: 'Omori', marginTop: 3 },
  modalDesc: { color: '#888', fontSize: 11, marginTop: 5, lineHeight: 16, fontFamily: 'Delius' },
  recompensaBox: { marginTop: 12, backgroundColor: 'rgba(255,105,180,0.1)', borderRadius: 8, padding: 8 },
  recompensaBoxText: { color: '#FF69B4', fontWeight: '700', fontSize: 11, fontFamily: 'Delius' },
  btnMision: { marginTop: 14, backgroundColor: '#5a3e2b', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  btnMisionText: { color: '#fcf7d0', fontWeight: '700', fontSize: 11, fontFamily: 'Delius' },

  misionLabel: { color: '#FF69B4', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Delius', marginBottom: 6 },
  misionPregunta: { color: '#333', fontSize: 13, fontWeight: '700', fontFamily: 'Omori', marginBottom: 10, lineHeight: 18 },
  inputWrap: { backgroundColor: 'rgba(90,62,43,0.08)', borderRadius: 8, padding: 10, borderWidth: 1.5, borderColor: 'rgba(90,62,43,0.15)', marginBottom: 8 },
  inputError: { borderColor: '#F44336', backgroundColor: 'rgba(244,67,54,0.05)' },
  inputText: { color: '#5a3e2b', fontSize: 13, fontFamily: 'Delius' },
  errorText: { color: '#F44336', fontSize: 10, marginBottom: 6, fontFamily: 'Delius' },
  btnVerificar: { backgroundColor: '#FF69B4', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  btnVerificarText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Delius' },

  teclado: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 14, justifyContent: 'center', alignContent: 'center' },
  tecla: { width: 26, height: 26, backgroundColor: 'rgba(90,62,43,0.1)', borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  teclaEsp: { width: 42, backgroundColor: 'rgba(90,62,43,0.18)' },
  teclaText: { fontSize: 10, color: '#5a3e2b', fontWeight: '600' },
});
