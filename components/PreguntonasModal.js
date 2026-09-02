import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { deleteDoc, doc, getDoc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import PushyService from '../utils/PushyService';

const CATEGORIAS = {
  fidelidad: {
    nombre: 'Fidelidad', icono: 'verified-user', color: '#7c9d73',
    preguntas: [
      { id: 'fidelidad_1', texto: '¿Es infidelidad si sigo siendo amigo/a de mi ex?', opciones: ['Es infidelidad', 'No es infidelidad'] },
      { id: 'fidelidad_2', texto: '¿Dar “me gusta” seguido a fotos provocativas cuenta como una falta de respeto?', opciones: ['Sí, es una falta de respeto', 'No, es solo un “me gusta”'] },
      { id: 'fidelidad_3', texto: '¿Ocultar una conversación para evitar una pelea cuenta como traición?', opciones: ['Sí, ocultarlo es traicionar', 'No, si no pasó nada'] },
      { id: 'fidelidad_4', texto: '¿Besar a alguien en un juego sigue siendo infidelidad?', opciones: ['Sí, sigue siendo infidelidad', 'No, porque era un juego'] },
      { id: 'fidelidad_5', texto: '¿Tener una conexión emocional secreta puede ser peor que un beso?', opciones: ['Sí, puede ser peor', 'No, lo físico es peor'] },
      { id: 'fidelidad_6', texto: 'Si alguien coquetea conmigo, ¿debería contártelo aunque lo haya rechazado?', opciones: ['Sí, prefiero saberlo', 'No, no hace falta'] },
    ],
  },
  amor: {
    nombre: 'Amor', icono: 'favorite', color: '#d9789a',
    preguntas: [
      { id: 'amor_1', texto: '¿Preferís casarte conmigo mañana o esperar 10 años para estar seguro?', opciones: ['Casarme contigo mañana', 'Esperar 10 años para estar seguro'] },
      { id: 'amor_2', texto: 'Si solo pudieras recibir una cosa durante un mes, ¿qué elegirías?', opciones: ['Muchos abrazos y cariño', 'Palabras lindas todos los días'] },
      { id: 'amor_3', texto: '¿Qué vale más para vos en una relación?', opciones: ['Sentir mucha pasión', 'Sentir mucha tranquilidad'] },
      { id: 'amor_4', texto: '¿Preferís una cita espectacular una vez al mes o pequeños gestos todos los días?', opciones: ['Una cita espectacular', 'Pequeños gestos diarios'] },
      { id: 'amor_5', texto: 'Cuando estás triste, ¿cómo preferís que te ame?', opciones: ['Abrazándome sin preguntar', 'Escuchándome y hablando'] },
      { id: 'amor_6', texto: '¿Qué te dolería más perder entre nosotros?', opciones: ['La complicidad', 'El romanticismo'] },
    ],
  },
  toxicidad: {
    nombre: 'Toxicidad', icono: 'warning-amber', color: '#8c79ba',
    preguntas: [
      { id: 'toxicidad_1', texto: 'Tu pareja te pide dejar de seguir a alguien que le da inseguridad. ¿Es tóxico o sano?', opciones: ['Es tóxico', 'Es sano'] },
      { id: 'toxicidad_2', texto: '¿Compartir las contraseñas del celular es confianza o control?', opciones: ['Es confianza', 'Es control'] },
      { id: 'toxicidad_3', texto: '¿Pedir ubicación en tiempo real cuando uno sale es cuidado o toxicidad?', opciones: ['Es cuidado', 'Es toxicidad'] },
      { id: 'toxicidad_4', texto: '¿Está bien enojarse si tu pareja quiere salir sin vos?', opciones: ['Sí, es entendible', 'No, es posesivo'] },
      { id: 'toxicidad_5', texto: '¿Revisar el celular después de una mentira está justificado?', opciones: ['Sí, está justificado', 'No, sigue estando mal'] },
      { id: 'toxicidad_6', texto: '¿Pedir que tu pareja evite a alguien que te incomoda es poner un límite o controlar?', opciones: ['Es poner un límite', 'Es controlar'] },
    ],
  },
  nosotros: {
    nombre: 'Nosotros', icono: 'diversity-1', color: '#d5965f',
    preguntas: [
      { id: 'nosotros_1', texto: 'Después de una discusión, ¿qué necesitás primero?', opciones: ['Un abrazo y sentirnos cerca', 'Espacio para pensar'] },
      { id: 'nosotros_2', texto: 'Si tenemos un fin de semana libre, ¿qué plan nos representa más?', opciones: ['Improvisar sobre la marcha', 'Planear algo especial'] },
      { id: 'nosotros_3', texto: 'Si pudiéramos repetir un momento, ¿cuál elegirías?', opciones: ['Cuando empezó lo nuestro', 'Un día común siendo felices'] },
      { id: 'nosotros_4', texto: 'Cuando no estamos de acuerdo, ¿qué debería importar más?', opciones: ['Resolverlo en el momento', 'Cuidar cómo nos hablamos'] },
      { id: 'nosotros_5', texto: '¿Qué nos mantiene más unidos?', opciones: ['Todo lo que compartimos', 'Cómo superamos lo difícil'] },
      { id: 'nosotros_6', texto: '¿Cuál de los dos conoce mejor al otro?', opciones: ['Yo te conozco más', 'Vos me conocés más'] },
    ],
  },
};

const PASOS = [
  { nombre: 'Introducción', icono: 'favorite-border' },
  { nombre: 'Temática', icono: 'palette' },
  { nombre: 'Sesión', icono: 'question-answer' },
];

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
  const [paso, setPaso] = useState(0);
  const [categoriaElegida, setCategoriaElegida] = useState(null);
  const [enviandoApuro, setEnviandoApuro] = useState(false);
  const entrada = useRef(new Animated.Value(0)).current;

  const primerUid = participantes[0];
  const colores = useMemo(() => ({
    [primerUid]: { principal: '#e47d9e', suave: '#f8c8d7', texto: '#7d3d56' },
    [participantes[1]]: { principal: '#8b7bc3', suave: '#d9cff1', texto: '#4c3d79' },
  }), [participantes, primerUid]);
  const miColor = colores[uid] || { principal: '#e47d9e', suave: '#f8c8d7', texto: '#7d3d56' };
  const colorPareja = colores[parejaUid] || { principal: '#8b7bc3', suave: '#d9cff1', texto: '#4c3d79' };

  useEffect(() => {
    if (!visible) return;
    setPaso(0);
    setCategoriaElegida(null);
    setErrorSesion('');
    setCuenta(null);
    setRevelado(false);
  }, [visible]);

  useEffect(() => {
    if (!visible || paso < 1 || !sesionRef || !uid || !parejaUid) return undefined;
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
        || !existente.fase
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
        tematicas: {},
        apuros: {},
        fase: 'tematica',
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
      const data = snap.exists() ? snap.data() : null;
      setSesion(data);
      if (data?.fase === 'sesion') setPaso(2);
      setCargando(false);
    }, error => {
      if (!activo) return;
      setErrorSesion(error?.code === 'permission-denied' ? 'Firestore todavía no permite acceder a Preguntonas.' : 'Se perdió la conexión con la sesión.');
      setCargando(false);
    });
    return () => { activo = false; unsubscribe(); };
  }, [parejaUid, participantes, paso, sesionRef, uid, visible]);

  const respuestas = sesion?.respuestas || {};
  const miRespuesta = respuestas[uid];
  const respuestaPareja = respuestas[parejaUid];
  const ambosRespondieron = Boolean(miRespuesta && respuestaPareja);
  const pregunta = buscarPregunta(sesion?.categoria, sesion?.preguntaId);
  const tematicas = sesion?.tematicas || {};
  const miTematica = tematicas[uid];
  const tematicaPareja = tematicas[parejaUid];
  const ambosEligieronTematica = Boolean(miTematica && tematicaPareja);
  const confirmacionTematicaEnMs = aMillis(sesion?.confirmacionTematicaEn);
  const transcurridoTematica = confirmacionTematicaEnMs ? Math.max(0, ahora - confirmacionTematicaEnMs) : 0;
  const coincidenTematica = ambosEligieronTematica && miTematica.categoria === tematicaPareja.categoria;
  const cuentaTematica = sesion?.fase === 'confirmando' && transcurridoTematica < 3000 ? 3 - Math.floor(transcurridoTematica / 1000) : null;
  const categoriasEnDisputa = participantes.map(participante => tematicas[participante]?.categoria).filter(Boolean);
  const desempateActivo = sesion?.tipoResolucion === 'desempate' && transcurridoTematica >= 3000 && transcurridoTematica < 5200;
  const periodoDesempate = Math.max(85, 330 - Math.floor(Math.max(0, transcurridoTematica - 3000) / 9));
  const categoriaIluminada = desempateActivo ? categoriasEnDisputa[Math.floor((transcurridoTematica - 3000) / periodoDesempate) % 2] : null;
  const mostrandoGanadora = sesion?.tipoResolucion === 'desempate' && transcurridoTematica >= 5200 && transcurridoTematica < 6400 && Math.floor((transcurridoTematica - 5200) / 300) % 2 === 0;
  const puedeApurar = Boolean(miTematica && !tematicaPareja && !sesion?.apuros?.[uid] && aMillis(miTematica.elegidaEn) && ahora - aMillis(miTematica.elegidaEn) >= 3000);

  useEffect(() => {
    if (!visible) return;
    entrada.setValue(0);
    Animated.spring(entrada, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrada, visible]);

  useEffect(() => {
    if (!visible || paso !== 1) return undefined;
    setAhora(Date.now());
    const interval = setInterval(() => setAhora(Date.now()), 120);
    return () => clearInterval(interval);
  }, [paso, visible]);

  const elegirTematica = async categoria => {
    if (!sesionRef || guardando || sesion?.fase !== 'tematica') return;
    setCategoriaElegida(categoria);
    setGuardando(true);
    try {
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(sesionRef);
        if (!snap.exists()) throw new Error('sesion_finalizada');
        const data = snap.data() || {};
        if (data.fase !== 'tematica') return;
        const elecciones = { ...(data.tematicas || {}), [uid]: { categoria, elegidaEn: serverTimestamp() } };
        const eleccionPareja = elecciones[parejaUid];
        const ambos = Boolean(elecciones[uid] && eleccionPareja);
        const update = { tematicas: elecciones, actualizadaEn: serverTimestamp() };
        if (ambos) {
          const iguales = categoria === eleccionPareja.categoria;
          update.fase = 'confirmando';
          update.categoriaGanadora = iguales ? categoria : (Math.random() < 0.5 ? categoria : eleccionPareja.categoria);
          update.tipoResolucion = iguales ? 'acuerdo' : 'desempate';
          update.confirmacionTematicaEn = serverTimestamp();
        }
        transaction.set(sesionRef, update, { merge: true });
      });
    } catch (error) {
      const mensaje = error?.code === 'permission-denied' ? 'Firestore rechazó la temática.' : 'No pudimos guardar tu temática.';
      global.showToast?.({ type: 'error', text1: mensaje });
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    if (!sesionRef || sesion?.fase !== 'confirmando' || !confirmacionTematicaEnMs) return undefined;
    const duracion = sesion.tipoResolucion === 'desempate' ? 6400 : 3000;
    const espera = Math.max(0, duracion - (Date.now() - confirmacionTematicaEnMs));
    const timeout = setTimeout(() => {
      runTransaction(db, async transaction => {
        const snap = await transaction.get(sesionRef);
        if (!snap.exists()) return;
        const data = snap.data() || {};
        if (data.fase !== 'confirmando' || !data.categoriaGanadora) return;
        const categoria = data.categoriaGanadora;
        transaction.set(sesionRef, {
          fase: 'sesion',
          categoria,
          preguntaId: CATEGORIAS[categoria].preguntas[0].id,
          respuestas: {},
          solicitudCambio: null,
          version: (Number(data.version) || 0) + 1,
          actualizadaEn: serverTimestamp(),
        }, { merge: true });
      }).catch(() => {});
    }, espera);
    return () => clearTimeout(timeout);
  }, [confirmacionTematicaEnMs, sesion?.fase, sesion?.tipoResolucion, sesionRef]);

  const apurarPareja = async () => {
    if (!sesionRef || !puedeApurar || enviandoApuro) return;
    setEnviandoApuro(true);
    try {
      const autorizado = await runTransaction(db, async transaction => {
        const snap = await transaction.get(sesionRef);
        if (!snap.exists()) return false;
        const data = snap.data() || {};
        if (data.apuros?.[uid] || data.tematicas?.[parejaUid] || !data.tematicas?.[uid]) return false;
        transaction.set(sesionRef, { apuros: { ...(data.apuros || {}), [uid]: true }, actualizadaEn: serverTimestamp() }, { merge: true });
        return true;
      });
      if (!autorizado) return;
      const parejaSnap = await getDoc(doc(db, 'usuarios', parejaUid));
      const parejaData = parejaSnap.data() || {};
      const token = parejaData.MyPushyToken || parejaData.pushyToken;
      if (!token) throw new Error('sin_token');
      const resultado = await PushyService.sendCustomNotification([token], 'Una Preguntona te espera 💞', 'Tu pareja ya eligió una temática. Cuando quieras, te toca elegir a vos.', { tipo: 'preguntonas', collapseKey: `preguntonas-${sesionId}` });
      if (!resultado?.success) throw new Error(resultado?.error || 'push_fallido');
      global.showToast?.({ type: 'success', text1: 'Le enviamos un recordatorio suave' });
    } catch {
      global.showToast?.({ type: 'info', text1: 'La elección quedó esperando, pero no pudimos notificar' });
    } finally {
      setEnviandoApuro(false);
    }
  };

  const limpiarMiTematica = async () => {
    if (!sesionRef || !uid) return;
    await runTransaction(db, async transaction => {
      const snap = await transaction.get(sesionRef);
      if (!snap.exists()) return;
      const data = snap.data() || {};
      const tematicas = { ...(data.tematicas || {}) };
      const apuros = { ...(data.apuros || {}) };
      delete tematicas[uid];
      delete apuros[uid];

      if (Object.keys(tematicas).length === 0) {
        transaction.delete(sesionRef);
        return;
      }

      transaction.set(sesionRef, {
        tematicas,
        apuros,
        fase: 'tematica',
        categoriaGanadora: null,
        tipoResolucion: null,
        confirmacionTematicaEn: null,
        actualizadaEn: serverTimestamp(),
      }, { merge: true });
    }).catch(() => {});
  };

  const volverAIntroduccion = async () => {
    await limpiarMiTematica();
    setSesion(null);
    setCategoriaElegida(null);
    setPaso(0);
  };

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
    if (paso === 1) await limpiarMiTematica();
    if (paso === 2 && sesionRef && sesion) await deleteDoc(sesionRef).catch(() => {});
    setSesion(null);
    setCategoriaElegida(null);
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
      <Animated.View style={[s.card, { opacity: entrada, transform: [{ scale: entrada }] }]}>
        <View style={s.header}>
          <View style={s.headerIcon}><MaterialIcons name="question-answer" size={22} color="#fff8e8" /></View>
          <View style={s.headerCopy}><Text style={s.eyebrow}>UN JUEGO PARA DOS</Text><Text style={s.title}>Preguntonas</Text><Text style={s.subtitle}>{paso === 0 ? 'Primero, conozcan la dinámica' : paso === 1 ? 'Elijan de qué quieren hablar' : 'Elijan en secreto · descubran juntos'}</Text></View>
          <View style={s.personas}><View style={[s.personaPunto, { backgroundColor: miColor.principal }]} /><MaterialIcons name="favorite" size={9} color="#c56d86" /><View style={[s.personaPunto, { backgroundColor: colorPareja.principal }]} /></View>
          <TouchableOpacity style={s.cerrar} onPress={cerrar}><MaterialIcons name="close" size={17} color="#73516a" /></TouchableOpacity>
        </View>

        <View style={s.pasos}>{PASOS.map((item, index) => <React.Fragment key={item.nombre}>
          <View style={[s.paso, index <= paso && s.pasoActivo]}><View style={[s.pasoIcono, index <= paso && s.pasoIconoActivo]}>{index < paso ? <MaterialIcons name="check" size={9} color="#fff" /> : <MaterialIcons name={item.icono} size={9} color={index === paso ? '#fff' : '#a78991'} />}</View><Text style={[s.pasoTexto, index === paso && s.pasoTextoActivo]}>{item.nombre}</Text></View>
          {index < PASOS.length - 1 && <View style={[s.pasoLinea, index < paso && s.pasoLineaActiva]} />}
        </React.Fragment>)}</View>

        {!parejaUid ? <View style={s.vacio}><MaterialIcons name="favorite-border" size={38} color="#d69aae" /><Text style={s.vacioTitulo}>Preguntonas es para dos</Text><Text style={s.vacioTexto}>Conectá una pareja para empezar una sesión compartida.</Text></View> : paso === 0 ? <View style={s.intro}>
          <View style={s.introHero}><View style={[s.introBurbuja, s.introBurbujaUno]}><MaterialIcons name="favorite" size={20} color={miColor.principal} /></View><View style={s.introCentro}><Text style={s.introCorazon}>♥</Text><Text style={s.introHeroTexto}>Una pregunta.{`\n`}Dos miradas.</Text></View><View style={[s.introBurbuja, s.introBurbujaDos]}><MaterialIcons name="question-mark" size={20} color={colorPareja.principal} /></View></View>
          <Text style={s.introTitulo}>Respondan sin influirse</Text>
          <Text style={s.introTexto}>Cada uno elige en secreto. Cuando ambos respondan, descubrirán juntos sus elecciones y tendrán un momento tranquilo para contar el porqué.</Text>
          <View style={s.introReglas}><View style={s.introRegla}><MaterialIcons name="lock-outline" size={12} color="#bd6988" /><Text style={s.introReglaTexto}>Elección secreta</Text></View><View style={s.introRegla}><MaterialIcons name="groups" size={12} color="#8873b2" /><Text style={s.introReglaTexto}>Revelación juntos</Text></View><View style={s.introRegla}><MaterialIcons name="forum" size={12} color="#76936c" /><Text style={s.introReglaTexto}>Charla sin apuro</Text></View></View>
          <TouchableOpacity style={s.principalBtn} onPress={() => setPaso(1)} activeOpacity={0.84}><Text style={s.principalBtnTexto}>ENTENDIDO, ELEGIR TEMÁTICA</Text><MaterialIcons name="arrow-forward" size={13} color="#fff8ed" /></TouchableOpacity>
        </View> : paso === 1 ? <View style={s.tematica}>
          <View style={s.tematicaEncabezado}><Text style={s.tematicaTitulo}>¿De qué quieren hablar hoy?</Text><Text style={s.tematicaSub}>Elegí una temática para comenzar. Después podrán proponer otra entre los dos.</Text></View>
          <View style={s.tematicaGrid}>{Object.entries(CATEGORIAS).map(([id, categoria]) => {
            const elegidaPorMi = miTematica?.categoria === id;
            const elegidaPorPareja = tematicaPareja?.categoria === id;
            const elegidaPorAmbos = elegidaPorMi && elegidaPorPareja;
            const activa = elegidaPorMi || (!miTematica && categoriaElegida === id);
            const iluminada = categoriaIluminada === id;
            const ganadora = mostrandoGanadora && sesion?.categoriaGanadora === id;
            const detalle = id === 'amor' ? 'Gestos y sentimientos' : id === 'fidelidad' ? 'Confianza y acuerdos' : id === 'toxicidad' ? 'Límites o control' : 'Su forma de compartir';
            return <TouchableOpacity key={id} style={[s.tematicaCard, activa && { borderColor: categoria.color, backgroundColor: `${categoria.color}22` }, elegidaPorPareja && s.tematicaParejaElegida, iluminada && s.tematicaIluminada, ganadora && s.tematicaGanadora]} onPress={() => elegirTematica(id)} disabled={guardando || sesion?.fase !== 'tematica'} activeOpacity={0.82}><View style={[s.tematicaIcono, { backgroundColor: categoria.color }]}><MaterialIcons name={categoria.icono} size={15} color="#fff" /></View><View style={s.tematicaCopy}><Text style={[s.tematicaNombre, activa && { color: categoria.color }, ganadora && s.tematicaNombreGanadora]}>{categoria.nombre}</Text><Text style={s.tematicaDetalle}>{detalle}</Text></View><View style={s.tematicaMarcas}>{elegidaPorAmbos ? <View style={s.ambosPill}><Text style={s.ambosTexto}>AMBOS</Text></View> : <>{elegidaPorMi && <View style={[s.eleccionPunto, { backgroundColor: miColor.principal }]} />}{elegidaPorPareja && <View style={[s.eleccionPunto, { backgroundColor: colorPareja.principal }]} />}</>}{ganadora && <MaterialIcons name="check-circle" size={14} color="#4f9b62" />}</View></TouchableOpacity>;
          })}</View>
          <View style={s.tematicaAcciones}><TouchableOpacity style={s.volverBtn} onPress={volverAIntroduccion} disabled={sesion?.fase === 'confirmando'} activeOpacity={0.8}><MaterialIcons name="arrow-back" size={12} color="#8d6978" /><Text style={s.volverBtnTexto}>VOLVER</Text></TouchableOpacity><View style={s.tematicaEstado}>{cuentaTematica != null ? <><Text style={s.tematicaCuentaNumero}>{cuentaTematica}</Text><Text style={s.tematicaEstadoTexto}>{coincidenTematica ? 'Coincidieron · confirmando' : 'Preparando desempate 50/50'}</Text></> : desempateActivo ? <Text style={s.tematicaEstadoTexto}>La suerte está eligiendo entre las dos…</Text> : mostrandoGanadora ? <Text style={s.tematicaGanadoraTexto}>¡TEMÁTICA ELEGIDA!</Text> : miTematica && !tematicaPareja ? <Text style={s.tematicaEstadoTexto}>Tu elección está lista · esperando a {nombrePareja}</Text> : !miTematica ? <Text style={s.tematicaEstadoTexto}>Elegí la que más ganas te dé conversar</Text> : null}</View>{puedeApurar && <TouchableOpacity style={s.apurarBtn} onPress={apurarPareja} disabled={enviandoApuro} activeOpacity={0.82}><MaterialIcons name="notifications-none" size={11} color="#fff8ed" /><Text style={s.apurarTexto}>{enviandoApuro ? 'ENVIANDO…' : 'APURAR SUAVE'}</Text></TouchableOpacity>}</View>
        </View> : cargando ? <View style={s.vacio}><Text style={s.cargandoCorazon}>♥</Text><Text style={s.vacioTexto}>Preparando una pregunta para ustedes…</Text></View> : errorSesion ? <View style={s.vacio}><MaterialIcons name="cloud-off" size={34} color="#bd7891" /><Text style={s.vacioTitulo}>No pudimos conectar</Text><Text style={s.vacioTexto}>{errorSesion}</Text></View> : !sesion ? <View style={s.vacio}><MaterialIcons name="door-front" size={34} color="#ae8bb5" /><Text style={s.vacioTitulo}>La sesión terminó</Text><Text style={s.vacioTexto}>Pueden cerrar y volver a entrar cuando quieran jugar otra vez.</Text></View> : <>
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
  card: { width: 530, height: 326, overflow: 'hidden', borderRadius: 23, backgroundColor: '#fff3df', borderWidth: 2, borderColor: '#c889a5', elevation: 24 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: '#f3d2dc', borderBottomWidth: 1, borderBottomColor: '#d8a0b2' },
  headerIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#c76f91', borderWidth: 1, borderColor: '#fff0db' },
  headerCopy: { flex: 1, marginLeft: 9 }, eyebrow: { color: '#a6627d', fontSize: 5.4, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#6f3f59', fontFamily: 'Delius', fontSize: 16, lineHeight: 18, fontWeight: '900' }, subtitle: { color: '#936b7c', fontSize: 6.2, fontWeight: '700' },
  personas: { height: 23, paddingHorizontal: 7, flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: 9, backgroundColor: 'rgba(255,249,235,0.65)', borderWidth: 1, borderColor: '#d7a7b7' }, personaPunto: { width: 8, height: 8, borderRadius: 4 },
  cerrar: { marginLeft: 8, width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(255,249,235,0.72)', borderWidth: 1, borderColor: '#d7a7b7' },
  pasos: { height: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 68, backgroundColor: '#fae7e7', borderBottomWidth: 1, borderBottomColor: '#e1c4bd' },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 4 }, pasoActivo: { opacity: 1 }, pasoIcono: { width: 15, height: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#e1d4d1', borderWidth: 1, borderColor: '#cbb9b5' }, pasoIconoActivo: { backgroundColor: '#c87593', borderColor: '#a95775' }, pasoTexto: { color: '#a48c8c', fontSize: 5.7, fontWeight: '800' }, pasoTextoActivo: { color: '#805165', fontWeight: '900' }, pasoLinea: { flex: 1, maxWidth: 47, height: 1, marginHorizontal: 7, backgroundColor: '#d9c5c0' }, pasoLineaActiva: { backgroundColor: '#cf819c' },
  intro: { flex: 1, alignItems: 'center', paddingHorizontal: 30, paddingTop: 9 },
  introHero: { width: 240, height: 63, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, introBurbuja: { width: 43, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#fff9ed', borderWidth: 1.5, shadowColor: '#8b6172', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 3, elevation: 3 }, introBurbujaUno: { borderColor: '#e7a5bc', transform: [{ rotate: '-7deg' }] }, introBurbujaDos: { borderColor: '#b7a9d7', transform: [{ rotate: '7deg' }] }, introCentro: { width: 118, alignItems: 'center' }, introCorazon: { color: '#df799a', fontSize: 18, lineHeight: 18 }, introHeroTexto: { color: '#70475a', fontFamily: 'Delius', fontSize: 9, lineHeight: 10, fontWeight: '900', textAlign: 'center' },
  introTitulo: { color: '#653f52', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' }, introTexto: { width: 390, marginTop: 3, color: '#8d6c78', fontSize: 6.4, lineHeight: 8.6, fontWeight: '700', textAlign: 'center' }, introReglas: { height: 34, marginTop: 7, flexDirection: 'row', gap: 6 }, introRegla: { width: 112, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#fff9ed', borderWidth: 1, borderColor: '#e0c9bd' }, introReglaTexto: { color: '#80666c', fontSize: 5.6, fontWeight: '900' },
  principalBtn: { height: 30, minWidth: 187, marginTop: 7, paddingHorizontal: 14, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#c96f91', borderWidth: 1, borderColor: '#964d6a', shadowColor: '#70384f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 3, elevation: 4 }, principalBtnTexto: { color: '#fff8ed', fontSize: 6.3, fontWeight: '900', letterSpacing: 0.45 },
  tematica: { flex: 1, paddingHorizontal: 25, paddingTop: 7 }, tematicaEncabezado: { height: 35, alignItems: 'center' }, tematicaTitulo: { color: '#653f52', fontFamily: 'Delius', fontSize: 10.5, fontWeight: '900' }, tematicaSub: { marginTop: 2, color: '#92717d', fontSize: 5.8, fontWeight: '700' }, tematicaGrid: { height: 119, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' }, tematicaCard: { width: '49%', height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderRadius: 11, backgroundColor: '#fff9ed', borderWidth: 1.2, borderColor: '#ddc9bb' }, tematicaParejaElegida: { borderWidth: 2 }, tematicaIluminada: { transform: [{ scale: 1.025 }], backgroundColor: '#fff0bd', borderColor: '#e4b84f', shadowColor: '#f1bf4f', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 7, elevation: 8 }, tematicaGanadora: { transform: [{ scale: 1.035 }], backgroundColor: '#d9f1d4', borderColor: '#58a669', borderWidth: 2, shadowColor: '#52a864', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 8, elevation: 9 }, tematicaIcono: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' }, tematicaCopy: { flex: 1, marginLeft: 7 }, tematicaNombre: { color: '#725563', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900' }, tematicaNombreGanadora: { color: '#397948' }, tematicaDetalle: { marginTop: 1, color: '#9a7f82', fontSize: 5.4, fontWeight: '700' }, tematicaMarcas: { minWidth: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }, eleccionPunto: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: '#fff' }, ambosPill: { height: 17, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#b56f95', borderWidth: 1, borderColor: '#fff' }, ambosTexto: { color: '#fff', fontSize: 5.2, fontWeight: '900', letterSpacing: 0.4 }, tematicaAcciones: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, volverBtn: { height: 30, minWidth: 76, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#fff8ea', borderWidth: 1, borderColor: '#d7bfc0' }, volverBtnTexto: { color: '#8d6978', fontSize: 6.2, fontWeight: '900' }, tematicaEstado: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' }, tematicaCuentaNumero: { color: '#bd6687', fontFamily: 'Delius', fontSize: 17, lineHeight: 18, fontWeight: '900' }, tematicaEstadoTexto: { color: '#8b6977', fontSize: 5.5, lineHeight: 7, fontWeight: '800', textAlign: 'center' }, tematicaGanadoraTexto: { color: '#438554', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.6 }, apurarBtn: { height: 28, minWidth: 92, paddingHorizontal: 8, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#c47a97', borderWidth: 1, borderColor: '#914f6a' }, apurarTexto: { color: '#fff8ed', fontSize: 5.4, fontWeight: '900', letterSpacing: 0.3 },
  categorias: { height: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 4 }, categoria: { height: 21, paddingHorizontal: 8, flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: 8, backgroundColor: '#fff9eb', borderWidth: 1, borderColor: '#dbc6ad' }, categoriaTexto: { color: '#896f69', fontSize: 6.2, fontWeight: '900' }, categoriaTextoActiva: { color: '#fff' },
  preguntaWrap: { height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }, preguntaNumero: { color: '#bd7992', fontSize: 5.2, fontWeight: '900', letterSpacing: 1.2 }, pregunta: { marginTop: 3, color: '#603d4d', fontFamily: 'Delius', fontSize: 11, lineHeight: 14, fontWeight: '900', textAlign: 'center' },
  opciones: { height: 94, paddingHorizontal: 15, gap: 6 }, opcion: { flex: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderRadius: 11, backgroundColor: '#fffaf0', borderWidth: 1.2, borderColor: '#dcc6ad' }, relleno: { position: 'absolute', top: 0, bottom: 0, opacity: 0.82 }, opcionLetra: { zIndex: 2, width: 23, height: 23, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#c8a27b', borderWidth: 1, borderColor: '#fff1d9' }, opcionLetraTexto: { color: '#fff', fontSize: 8, fontWeight: '900' }, opcionTexto: { zIndex: 2, flex: 1, marginLeft: 8, color: '#765848', fontFamily: 'Delius', fontSize: 7.7, lineHeight: 9.5, fontWeight: '900' }, opcionTextoRevelado: { color: '#fff', textShadowColor: 'rgba(65,34,50,0.35)', textShadowRadius: 2 }, guardada: { zIndex: 3, height: 18, paddingHorizontal: 6, flexDirection: 'row', gap: 3, alignItems: 'center', borderRadius: 7 }, guardadaTexto: { fontSize: 5.2, fontWeight: '900' }, turnoPill: { zIndex: 4, height: 18, paddingHorizontal: 6, justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' }, turnoTexto: { fontSize: 5.4, fontWeight: '900' },
  estadoFila: { height: 43, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 }, estadosPareja: { flex: 1, gap: 3 }, estadoPersona: { flexDirection: 'row', alignItems: 'center' }, estadoPunto: { width: 6, height: 6, marginRight: 5, borderRadius: 3 }, estadoTexto: { color: '#8a6c65', fontSize: 5.8, fontWeight: '700' }, cambiar: { height: 27, minWidth: 124, paddingHorizontal: 9, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#a77bb2', borderWidth: 1, borderColor: '#765481' }, cambiarPendiente: { backgroundColor: '#c77b91', borderColor: '#914e65' }, cambiarTexto: { color: '#fff9ed', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.35 }, solicitudTexto: { position: 'absolute', bottom: 3, left: 15, right: 15, color: '#a16c7c', fontSize: 5.2, fontWeight: '700', textAlign: 'center' },
  cuentaOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(77,47,69,0.72)' }, cuentaCirculo: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 35, backgroundColor: '#fff3df', borderWidth: 3, borderColor: '#e6a4ba', elevation: 10 }, cuentaNumero: { color: '#a85d7b', fontFamily: 'Delius', fontSize: 34, fontWeight: '900' }, cuentaTexto: { marginTop: 8, color: '#fff4e5', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center' }, vacioTitulo: { marginTop: 5, color: '#70495d', fontFamily: 'Delius', fontSize: 13, fontWeight: '900' }, vacioTexto: { marginTop: 3, color: '#987382', fontSize: 7, fontWeight: '700', textAlign: 'center' }, cargandoCorazon: { color: '#d7819f', fontSize: 31 },
});
