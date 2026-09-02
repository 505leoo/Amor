import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { deleteDoc, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const CATEGORIAS = {
  fidelidad: {
    nombre: 'Fidelidad', icono: 'verified-user', color: '#7c9d73',
    preguntas: [
      { id: 'fidelidad_1', texto: '¿Qué te hace sentir más seguridad en nuestra relación?', opciones: ['Que me cuentes todo con sinceridad', 'Sentir que me elegís incluso en los días difíciles'] },
      { id: 'fidelidad_2', texto: 'Si alguien coquetea con vos, ¿qué preferís hacer?', opciones: ['Contártelo enseguida', 'Marcar distancia y después hablarlo juntos'] },
      { id: 'fidelidad_3', texto: '¿Qué promesa cuidarías más entre nosotros?', opciones: ['Nunca ocultarnos algo importante', 'Nunca dejar de elegirnos con acciones'] },
    ],
  },
  amor: {
    nombre: 'Amor', icono: 'favorite', color: '#d9789a',
    preguntas: [
      { id: 'amor_1', texto: '¿Preferís casarte conmigo mañana o esperar 10 años para estar seguro?', opciones: ['Casarme contigo mañana', 'Esperar 10 años para estar seguro'] },
      { id: 'amor_2', texto: '¿Qué momento romántico elegirías ahora mismo?', opciones: ['Una noche sencilla, abrazados en casa', 'Una cita sorpresa que recordemos siempre'] },
      { id: 'amor_3', texto: '¿Cómo sentís más fuerte mi amor?', opciones: ['Cuando me lo decís con palabras', 'Cuando lo demostrás con pequeños gestos'] },
    ],
  },
  futuro: {
    nombre: 'Futuro', icono: 'auto-awesome', color: '#8c79ba',
    preguntas: [
      { id: 'futuro_1', texto: 'Si pudiéramos empezar una aventura mañana, ¿cuál elegirías?', opciones: ['Mudarnos juntos a un lugar nuevo', 'Viajar sin planes y descubrir el camino'] },
      { id: 'futuro_2', texto: '¿Qué sueño te emociona más construir conmigo?', opciones: ['Un hogar lleno de nuestras costumbres', 'Una vida llena de experiencias nuevas'] },
      { id: 'futuro_3', texto: '¿Cómo imaginás nuestro mejor futuro?', opciones: ['Tranquilo, estable y muy nuestro', 'Cambiante, aventurero y siempre juntos'] },
    ],
  },
  nosotros: {
    nombre: 'Nosotros', icono: 'diversity-1', color: '#d5965f',
    preguntas: [
      { id: 'nosotros_1', texto: 'Después de una discusión, ¿qué necesitás primero?', opciones: ['Un abrazo que diga que seguimos juntos', 'Un rato para pensar y después hablar bien'] },
      { id: 'nosotros_2', texto: '¿Qué plan nos representa mejor?', opciones: ['Improvisar algo pequeño y divertido', 'Preparar juntos un día muy especial'] },
      { id: 'nosotros_3', texto: 'Si hoy pudiéramos repetir un momento, ¿cuál elegirías?', opciones: ['El día en que empezó lo nuestro', 'Un día común en el que fuimos muy felices'] },
    ],
  },
};

const buscarPregunta = (categoriaId, preguntaId) => {
  const categoria = CATEGORIAS[categoriaId] || CATEGORIAS.amor;
  return categoria.preguntas.find(item => item.id === preguntaId) || categoria.preguntas[0];
};

const INACTIVIDAD_MAXIMA_MS = 2 * 60 * 60 * 1000;
const aMillis = valor => valor?.toMillis?.() ?? Math.max(0, Number(valor) || 0);
const horaCorta = valor => {
  const millis = aMillis(valor);
  return millis ? new Date(millis).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
};

export default function PreguntonasModal({ visible, onClose, parejaUid, nombrePareja = 'Tu pareja' }) {
  const uid = auth.currentUser?.uid;
  const participantes = useMemo(() => uid && parejaUid ? [uid, parejaUid].sort() : [], [uid, parejaUid]);
  const sesionId = participantes.join('_');
  const sesionRef = useMemo(() => sesionId ? doc(db, 'preguntonas_sesiones', sesionId) : null, [sesionId]);
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cuenta, setCuenta] = useState(null);
  const [revelado, setRevelado] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const [errorSesion, setErrorSesion] = useState('');
  const entrada = useRef(new Animated.Value(0)).current;

  const primerUid = participantes[0];
  const colores = useMemo(() => ({
    [primerUid]: { principal: '#e47d9e', suave: '#f8c8d7', texto: '#7d3d56' },
    [participantes[1]]: { principal: '#8b7bc3', suave: '#d9cff1', texto: '#4c3d79' },
  }), [participantes, primerUid]);
  const miColor = colores[uid] || { principal: '#e47d9e', suave: '#f8c8d7', texto: '#7d3d56' };
  const colorPareja = colores[parejaUid] || { principal: '#8b7bc3', suave: '#d9cff1', texto: '#4c3d79' };

  useEffect(() => {
    if (!visible || !sesionRef || !uid || !parejaUid) return undefined;
    let activo = true;
    setCargando(true);
    setErrorSesion('');
    runTransaction(db, async transaction => {
      const snap = await transaction.get(sesionRef);
      const existente = snap.data() || {};
      const ultimaActividad = aMillis(existente.actualizadaEn) || aMillis(existente.actualizadaEnMs);
      const participantesValidos = Array.isArray(existente.participantes)
        && existente.participantes.length === 2
        && participantes.every(participante => existente.participantes.includes(participante));
      const sesionTerminada = snap.exists() && (
        existente.estado === 'finalizada'
        || !participantesValidos
        || (ultimaActividad > 0 && Date.now() - ultimaActividad >= INACTIVIDAD_MAXIMA_MS)
      );
      if (snap.exists() && !sesionTerminada) return;
      const categoria = 'amor';
      transaction.set(sesionRef, {
        participantes,
        categoria,
        preguntaId: CATEGORIAS[categoria].preguntas[0].id,
        respuestas: {},
        solicitudCambio: null,
        version: 1,
        estado: 'activa',
        creadaEn: serverTimestamp(),
        actualizadaEn: serverTimestamp(),
      });
    }).catch(error => {
      if (activo) setErrorSesion(error?.code === 'permission-denied' ? 'Firestore todavía no permite acceder a Preguntonas.' : 'No pudimos preparar la sesión compartida.');
    }).finally(() => { if (activo) setCargando(false); });
    const unsubscribe = onSnapshot(sesionRef, snap => {
      if (!activo) return;
      setSesion(snap.exists() ? snap.data() : null);
      setCargando(false);
    }, error => {
      if (!activo) return;
      setErrorSesion(error?.code === 'permission-denied' ? 'Firestore todavía no permite acceder a Preguntonas.' : 'Se perdió la conexión con la sesión.');
      setCargando(false);
    });
    return () => { activo = false; unsubscribe(); };
  }, [parejaUid, participantes, sesionRef, uid, visible]);

  const respuestas = sesion?.respuestas || {};
  const miRespuesta = respuestas[uid];
  const respuestaPareja = respuestas[parejaUid];
  const ambosRespondieron = Boolean(miRespuesta && respuestaPareja);
  const pregunta = buscarPregunta(sesion?.categoria, sesion?.preguntaId);

  useEffect(() => {
    if (!visible) return;
    entrada.setValue(0);
    Animated.spring(entrada, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrada, visible]);

  useEffect(() => {
    const reveladoEnMs = aMillis(sesion?.reveladoEn);
    if (!ambosRespondieron || !reveladoEnMs) {
      setCuenta(null);
      setRevelado(false);
      return undefined;
    }
    const actualizarRevelacion = () => {
      const transcurrido = Math.max(0, Date.now() - reveladoEnMs);
      if (transcurrido >= 3000) {
        setCuenta(null);
        setRevelado(true);
        return true;
      }
      setCuenta(3 - Math.floor(transcurrido / 1000));
      setRevelado(false);
      return false;
    };
    if (actualizarRevelacion()) return undefined;
    const interval = setInterval(() => {
      if (actualizarRevelacion()) clearInterval(interval);
    }, 150);
    return () => clearInterval(interval);
  }, [ambosRespondieron, sesion?.reveladoEn]);

  useEffect(() => {
    if (!revelado) return undefined;
    setAhora(Date.now());
    const interval = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [revelado]);

  const elegir = async opcion => {
    if (!sesionRef || miRespuesta || guardando) return;
    setGuardando(true);
    try {
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(sesionRef);
        if (!snap.exists()) throw new Error('sesion_finalizada');
        const data = snap.data() || {};
        const actuales = data.respuestas || {};
        if (actuales[uid]) return;
        const nuevas = { ...actuales, [uid]: { opcion, respondidoEn: serverTimestamp() } };
        transaction.set(sesionRef, {
          respuestas: nuevas,
          reveladoEn: nuevas[parejaUid] ? serverTimestamp() : null,
          actualizadaEn: serverTimestamp(),
        }, { merge: true });
      });
    } catch (error) {
      const mensaje = error?.code === 'permission-denied' ? 'Firestore rechazó la respuesta.' : 'No pudimos guardar tu elección.';
      setErrorSesion(mensaje);
      global.showToast?.({ type: 'error', text1: mensaje });
    } finally {
      setGuardando(false);
    }
  };

  const siguientePregunta = categoriaId => {
    const categoria = CATEGORIAS[categoriaId] || CATEGORIAS[sesion?.categoria] || CATEGORIAS.amor;
    if (categoriaId !== sesion?.categoria) return categoria.preguntas[0];
    const actual = categoria.preguntas.findIndex(item => item.id === sesion?.preguntaId);
    return categoria.preguntas[(actual + 1) % categoria.preguntas.length];
  };

  const solicitarCambio = async categoriaId => {
    if (!sesionRef || guardando) return;
    setGuardando(true);
    try {
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(sesionRef);
        if (!snap.exists()) throw new Error('sesion_finalizada');
        const data = snap.data() || {};
        const solicitud = data.solicitudCambio;
        if (solicitud) {
          if (solicitud.confirmaciones?.[uid]) return;
          transaction.set(sesionRef, {
            categoria: solicitud.categoria,
            preguntaId: solicitud.preguntaId,
            respuestas: {},
            reveladoEn: null,
            solicitudCambio: null,
            version: (Number(data.version) || 0) + 1,
            estado: 'activa',
            actualizadaEn: serverTimestamp(),
          }, { merge: true });
          return;
        }
        const nueva = siguientePregunta(categoriaId || data.categoria);
        transaction.set(sesionRef, {
          solicitudCambio: {
            categoria: categoriaId || data.categoria,
            preguntaId: nueva.id,
            solicitadaPor: uid,
            confirmaciones: { [uid]: true },
            creadaEn: serverTimestamp(),
          },
          actualizadaEn: serverTimestamp(),
        }, { merge: true });
      });
    } catch (error) {
      const mensaje = error?.code === 'permission-denied' ? 'Firestore rechazó el cambio.' : 'No pudimos proponer otra pregunta.';
      setErrorSesion(mensaje);
      global.showToast?.({ type: 'error', text1: mensaje });
    } finally {
      setGuardando(false);
    }
  };

  const cerrar = async () => {
    if (sesionRef) await deleteDoc(sesionRef).catch(() => {});
    setSesion(null);
    onClose?.();
  };

  const primeraRespuesta = ambosRespondieron
    ? (aMillis(miRespuesta.respondidoEn) <= aMillis(respuestaPareja.respondidoEn) ? uid : parejaUid)
    : null;
  const reveladoEnMs = aMillis(sesion?.reveladoEn);
  const transcurridoTurno = reveladoEnMs ? Math.max(0, Math.floor((ahora - reveladoEnMs) / 1000) - 3) : 0;
  const turnoUid = transcurridoTurno < 30 ? primeraRespuesta : transcurridoTurno < 60 ? (primeraRespuesta === uid ? parejaUid : uid) : null;
  const turnoRestante = turnoUid ? 30 - (transcurridoTurno % 30) : 0;
  const solicitud = sesion?.solicitudCambio;
  const yoConfirmeCambio = Boolean(solicitud?.confirmaciones?.[uid]);

  const rellenosOpcion = opcion => {
    if (!revelado) return [];
    const mia = miRespuesta?.opcion === opcion;
    const suya = respuestaPareja?.opcion === opcion;
    if (mia && suya) return participantes.map((participante, index) => ({ uid: participante, color: colores[participante].principal, style: { [index === 0 ? 'left' : 'right']: 0, width: '50%' } }));
    if (mia) return [{ uid, color: miColor.principal, style: { left: 0, width: '100%' } }];
    if (suya) return [{ uid: parejaUid, color: colorPareja.principal, style: { left: 0, width: '100%' } }];
    return [];
  };

  return <Modal visible={Boolean(visible)} transparent animationType="fade" statusBarTranslucent onRequestClose={cerrar}>
    <View style={s.fondo}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={cerrar} />
      <Animated.View style={[s.card, { opacity: entrada, transform: [{ scale: entrada }] }]}>
        <View style={s.header}>
          <View style={s.headerIcon}><MaterialIcons name="question-answer" size={22} color="#fff8e8" /></View>
          <View style={s.headerCopy}><Text style={s.eyebrow}>UN JUEGO PARA DOS</Text><Text style={s.title}>Preguntonas</Text><Text style={s.subtitle}>Elijan en secreto · descubran juntos</Text></View>
          <View style={s.personas}><View style={[s.personaPunto, { backgroundColor: miColor.principal }]} /><MaterialIcons name="favorite" size={9} color="#c56d86" /><View style={[s.personaPunto, { backgroundColor: colorPareja.principal }]} /></View>
          <TouchableOpacity style={s.cerrar} onPress={cerrar}><MaterialIcons name="close" size={17} color="#73516a" /></TouchableOpacity>
        </View>

        {!parejaUid ? <View style={s.vacio}><MaterialIcons name="favorite-border" size={38} color="#d69aae" /><Text style={s.vacioTitulo}>Preguntonas es para dos</Text><Text style={s.vacioTexto}>Conectá una pareja para empezar una sesión compartida.</Text></View> : cargando ? <View style={s.vacio}><Text style={s.cargandoCorazon}>♥</Text><Text style={s.vacioTexto}>Preparando una pregunta para ustedes…</Text></View> : errorSesion ? <View style={s.vacio}><MaterialIcons name="cloud-off" size={34} color="#bd7891" /><Text style={s.vacioTitulo}>No pudimos conectar</Text><Text style={s.vacioTexto}>{errorSesion}</Text></View> : !sesion ? <View style={s.vacio}><MaterialIcons name="door-front" size={34} color="#ae8bb5" /><Text style={s.vacioTitulo}>La sesión terminó</Text><Text style={s.vacioTexto}>Pueden cerrar y volver a entrar cuando quieran jugar otra vez.</Text></View> : <>
          <View style={s.categorias}>{Object.entries(CATEGORIAS).map(([id, categoria]) => {
            const activa = sesion.categoria === id;
            return <TouchableOpacity key={id} onPress={() => !activa && solicitarCambio(id)} disabled={guardando || Boolean(solicitud)} style={[s.categoria, activa && { backgroundColor: categoria.color, borderColor: categoria.color }]} activeOpacity={0.8}><MaterialIcons name={categoria.icono} size={10} color={activa ? '#fff' : categoria.color} /><Text style={[s.categoriaTexto, activa && s.categoriaTextoActiva]}>{categoria.nombre}</Text></TouchableOpacity>;
          })}</View>

          <View style={s.preguntaWrap}><Text style={s.preguntaNumero}>{CATEGORIAS[sesion.categoria]?.nombre?.toUpperCase()} · PREGUNTA</Text><Text style={s.pregunta}>{pregunta.texto}</Text></View>

          <View style={s.opciones}>{pregunta.opciones.map((texto, opcion) => {
            const rellenos = rellenosOpcion(opcion);
            const elegidaMia = miRespuesta?.opcion === opcion;
            const turnoEnOpcion = turnoUid && respuestas[turnoUid]?.opcion === opcion;
            return <TouchableOpacity key={texto} style={[s.opcion, elegidaMia && !revelado && { borderColor: miColor.principal }]} onPress={() => elegir(opcion)} disabled={Boolean(miRespuesta) || guardando || ambosRespondieron} activeOpacity={0.84}>
              {rellenos.map(relleno => <View key={relleno.uid} style={[s.relleno, relleno.style, { backgroundColor: relleno.color }]} />)}
              <View style={[s.opcionLetra, elegidaMia && !revelado && { backgroundColor: miColor.principal }]}><Text style={s.opcionLetraTexto}>{opcion === 0 ? 'A' : 'B'}</Text></View>
              <Text style={[s.opcionTexto, rellenos.length > 0 && s.opcionTextoRevelado]} numberOfLines={2}>{texto}</Text>
              {elegidaMia && !revelado && <View style={[s.guardada, { backgroundColor: miColor.suave }]}><MaterialIcons name="lock" size={8} color={miColor.texto} /><Text style={[s.guardadaTexto, { color: miColor.texto }]}>TU ELECCIÓN</Text></View>}
              {turnoEnOpcion && <View style={[s.turnoPill, { backgroundColor: colores[turnoUid]?.suave }]}><Text style={[s.turnoTexto, { color: colores[turnoUid]?.texto }]}>{turnoUid === uid ? 'Te toca a vos' : `${nombrePareja} cuenta`} · {turnoRestante}s</Text></View>}
            </TouchableOpacity>;
          })}</View>

          <View style={s.estadoFila}>
            <View style={s.estadosPareja}>
              <View style={s.estadoPersona}><View style={[s.estadoPunto, { backgroundColor: miColor.principal }]} /><Text style={s.estadoTexto}>{miRespuesta ? `Elegiste · ${horaCorta(miRespuesta.respondidoEn)}` : 'Todavía no elegiste'}</Text></View>
              <View style={s.estadoPersona}><View style={[s.estadoPunto, { backgroundColor: colorPareja.principal }]} /><Text style={s.estadoTexto}>{respuestaPareja ? `${nombrePareja} respondió · ${horaCorta(respuestaPareja.respondidoEn)}` : `Esperando a ${nombrePareja}`}</Text></View>
            </View>
            <TouchableOpacity style={[s.cambiar, solicitud && s.cambiarPendiente]} onPress={() => solicitarCambio(solicitud?.categoria || sesion.categoria)} disabled={guardando || yoConfirmeCambio} activeOpacity={0.82}><MaterialIcons name={solicitud && !yoConfirmeCambio ? 'how-to-reg' : 'shuffle'} size={12} color="#fff9ed" /><Text style={s.cambiarTexto}>{solicitud ? (yoConfirmeCambio ? 'ESPERANDO AL OTRO' : 'CONFIRMAR CAMBIO') : 'CAMBIAR PREGUNTA'}</Text></TouchableOpacity>
          </View>
          {solicitud && <Text style={s.solicitudTexto}>{yoConfirmeCambio ? 'Tu propuesta quedó enviada con calma.' : `${nombrePareja} propone otra pregunta. Solo cambia si vos también querés.`}</Text>}
        </>}

        {cuenta != null && <View style={s.cuentaOverlay}><View style={s.cuentaCirculo}><Text style={s.cuentaNumero}>{cuenta}</Text></View><Text style={s.cuentaTexto}>Descubriendo sus respuestas…</Text></View>}
      </Animated.View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  fondo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(42,25,43,0.76)' },
  card: { width: 530, height: 300, overflow: 'hidden', borderRadius: 23, backgroundColor: '#fff3df', borderWidth: 2, borderColor: '#c889a5', elevation: 24 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: '#f3d2dc', borderBottomWidth: 1, borderBottomColor: '#d8a0b2' },
  headerIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#c76f91', borderWidth: 1, borderColor: '#fff0db' },
  headerCopy: { flex: 1, marginLeft: 9 }, eyebrow: { color: '#a6627d', fontSize: 5.4, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#6f3f59', fontFamily: 'Delius', fontSize: 16, lineHeight: 18, fontWeight: '900' }, subtitle: { color: '#936b7c', fontSize: 6.2, fontWeight: '700' },
  personas: { height: 23, paddingHorizontal: 7, flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: 9, backgroundColor: 'rgba(255,249,235,0.65)', borderWidth: 1, borderColor: '#d7a7b7' }, personaPunto: { width: 8, height: 8, borderRadius: 4 },
  cerrar: { marginLeft: 8, width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(255,249,235,0.72)', borderWidth: 1, borderColor: '#d7a7b7' },
  categorias: { height: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 4 }, categoria: { height: 21, paddingHorizontal: 8, flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: 8, backgroundColor: '#fff9eb', borderWidth: 1, borderColor: '#dbc6ad' }, categoriaTexto: { color: '#896f69', fontSize: 6.2, fontWeight: '900' }, categoriaTextoActiva: { color: '#fff' },
  preguntaWrap: { height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }, preguntaNumero: { color: '#bd7992', fontSize: 5.2, fontWeight: '900', letterSpacing: 1.2 }, pregunta: { marginTop: 3, color: '#603d4d', fontFamily: 'Delius', fontSize: 11, lineHeight: 14, fontWeight: '900', textAlign: 'center' },
  opciones: { height: 94, paddingHorizontal: 15, gap: 6 }, opcion: { flex: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderRadius: 11, backgroundColor: '#fffaf0', borderWidth: 1.2, borderColor: '#dcc6ad' }, relleno: { position: 'absolute', top: 0, bottom: 0, opacity: 0.82 }, opcionLetra: { zIndex: 2, width: 23, height: 23, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#c8a27b', borderWidth: 1, borderColor: '#fff1d9' }, opcionLetraTexto: { color: '#fff', fontSize: 8, fontWeight: '900' }, opcionTexto: { zIndex: 2, flex: 1, marginLeft: 8, color: '#765848', fontFamily: 'Delius', fontSize: 7.7, lineHeight: 9.5, fontWeight: '900' }, opcionTextoRevelado: { color: '#fff', textShadowColor: 'rgba(65,34,50,0.35)', textShadowRadius: 2 }, guardada: { zIndex: 3, height: 18, paddingHorizontal: 6, flexDirection: 'row', gap: 3, alignItems: 'center', borderRadius: 7 }, guardadaTexto: { fontSize: 5.2, fontWeight: '900' }, turnoPill: { zIndex: 4, height: 18, paddingHorizontal: 6, justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' }, turnoTexto: { fontSize: 5.4, fontWeight: '900' },
  estadoFila: { height: 43, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 }, estadosPareja: { flex: 1, gap: 3 }, estadoPersona: { flexDirection: 'row', alignItems: 'center' }, estadoPunto: { width: 6, height: 6, marginRight: 5, borderRadius: 3 }, estadoTexto: { color: '#8a6c65', fontSize: 5.8, fontWeight: '700' }, cambiar: { height: 27, minWidth: 124, paddingHorizontal: 9, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#a77bb2', borderWidth: 1, borderColor: '#765481' }, cambiarPendiente: { backgroundColor: '#c77b91', borderColor: '#914e65' }, cambiarTexto: { color: '#fff9ed', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.35 }, solicitudTexto: { position: 'absolute', bottom: 3, left: 15, right: 15, color: '#a16c7c', fontSize: 5.2, fontWeight: '700', textAlign: 'center' },
  cuentaOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(77,47,69,0.72)' }, cuentaCirculo: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 35, backgroundColor: '#fff3df', borderWidth: 3, borderColor: '#e6a4ba', elevation: 10 }, cuentaNumero: { color: '#a85d7b', fontFamily: 'Delius', fontSize: 34, fontWeight: '900' }, cuentaTexto: { marginTop: 8, color: '#fff4e5', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center' }, vacioTitulo: { marginTop: 5, color: '#70495d', fontFamily: 'Delius', fontSize: 13, fontWeight: '900' }, vacioTexto: { marginTop: 3, color: '#987382', fontSize: 7, fontWeight: '700', textAlign: 'center' }, cargandoCorazon: { color: '#d7819f', fontSize: 31 },
});
