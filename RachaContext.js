import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebaseConfig';

// Umbral visual para entrar en AVANZA; no es un límite diario.
export const META_RACHA_DIARIA = 10;
// 100 es una referencia visual (día 10), no un límite de puntos.
export const META_RACHA_TOTAL = 100;
export const PUNTOS_POR_DIA_RACHA = 10;
export const BONUS_DIA_RACHA = 5;
export const PENALIZACION_DIA_SIN_AVANCE = 3;
export const PENALIZACION_AVANCE_ESTANCADO = 5;
export const MAX_CONDUCTA_EVENTOS = 24;
export const BITACORA_INTERVALO_MS = 10 * 60 * 1000;
export const OBJETIVOS_RACHA = {
  inicio: { id: 'inicio', titulo: 'Volver cada día', detalle: 'Una presencia que cuida la racha', puntos: 2 },
  nivel: { id: 'nivel', titulo: 'Cuidar tu progreso', detalle: '7 niveles suman 1 punto; 12 niveles suman 2', puntos: 0, meta: 12, hitos: { 7: 1, 12: 2 } },
  alimentar: { id: 'alimentar', titulo: 'Cuidar al Animalito', detalle: 'Dos comidas cuidadas suman 1 punto', puntos: 0, meta: 2, hitos: { 2: 1 } },
  comerciante: { id: 'comerciante', titulo: 'Comprar en Comerciante', detalle: 'La primera, segunda y tercera compra del día suman pocos puntos', puntos: 0, meta: 3, hitos: { 1: 1, 2: 1, 3: 2 } },
};

const RachaContext = createContext(null);
const RACHA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const dayKeyFor = (date = new Date()) => {
  // La jornada de racha termina a las 20:00 (cuatro horas antes del cambio
  // de fecha) para dejar una ventana tranquila para el Ritual.
  const rachaDate = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RACHA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(rachaDate).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const previousDay = key => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
};
const nextDay = key => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
};
const puntosConductaSeguro = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const puntosAcumulados = value => Math.max(0, Number(value) || 0);
const conductaEvent = (id, delta, texto, tipo = delta < 0 ? 'negativa' : 'positiva') => ({ id, delta, texto, tipo, creadoEnMs: Date.now() });
const appendConductaEvent = (events, event) => [...(Array.isArray(events) ? events : []), event].slice(-MAX_CONDUCTA_EVENTOS);
const toMillis = value => {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (Number.isFinite(Number(value))) return Number(value);
  if (Number.isFinite(Number(value?.seconds))) return Number(value.seconds) * 1000;
  return 0;
};
const lastConductaMs = events => (Array.isArray(events) ? events : [])
  .reduce((last, event) => Math.max(last, toMillis(event?.creadoEnMs || event?.creadoEn)), 0);
const appendConductaEventThrottled = (events, event, ultimaBitacoraEnMs = 0, now = Date.now()) => {
  const last = Math.max(Number(ultimaBitacoraEnMs) || 0, lastConductaMs(events));
  if (last && now - last < BITACORA_INTERVALO_MS) {
    return { events: Array.isArray(events) ? events : [], ultimaBitacoraEnMs: last, registrada: false };
  }
  return { events: appendConductaEvent(events, event), ultimaBitacoraEnMs: now, registrada: true };
};
const hitosObjetivo = (objetivo = {}) => Object.entries(objetivo.hitos || {})
  .map(([cantidad, puntos]) => [Number(cantidad), Number(puntos)])
  .filter(([cantidad, puntos]) => cantidad > 0 && puntos > 0)
  .sort(([a], [b]) => a - b);
const recompensaVariable = (uid, dayKey, conducta, opciones) => {
  const seed = `${uid}|${dayKey}|${conducta}`;
  const hash = [...seed].reduce((total, caracter) => ((total * 31) + caracter.charCodeAt(0)) >>> 0, 7);
  return opciones[hash % opciones.length];
};
const detalleHito = (uid, dayKey, objectiveId, cantidad, puntos) => {
  const opciones = objectiveId === 'nivel' ? [
    `+${puntos} punto${puntos === 1 ? '' : 's'} por completar ${cantidad} niveles`,
    `La constancia rindió: +${puntos} punto${puntos === 1 ? '' : 's'} al llegar a ${cantidad} niveles`,
    `Hito de niveles alcanzado (${cantidad}): +${puntos}`,
  ] : objectiveId === 'alimentar' ? [
    `+${puntos} punto${puntos === 1 ? '' : 's'} por alimentar al Animalito ${cantidad} veces`,
    `El cuidado se notó: +${puntos} punto${puntos === 1 ? '' : 's'} por ${cantidad} comidas`,
    `Hito de alimentación alcanzado (${cantidad} comidas): +${puntos}`,
  ] : [
    `+${puntos} punto${puntos === 1 ? '' : 's'} por comprar ${cantidad} vez${cantidad === 1 ? '' : 'ces'} en Comerciante`,
    `Compra ${cantidad} registrada: +${puntos} punto${puntos === 1 ? '' : 's'} para tu racha`,
    `Hito de Comerciante alcanzado (${cantidad} compras): +${puntos}`,
  ];
  return recompensaVariable(uid, dayKey, `${objectiveId}-hito-${cantidad}`, opciones);
};
const emptyDay = fecha => ({ fecha, meta: META_RACHA_DIARIA, puntos: 0, puntosDia: 0, puntosTotales: 0, objetivos: {}, eventos: [], ultimaBitacoraEnMs: 0, bonoDiaAplicado: false, completado: false });

const resolverRachaLocal = async uid => {
  const currentDayKey = dayKeyFor();
  const hastaDia = previousDay(currentDayKey);
  const userRef = doc(db, 'usuarios', uid);
  return runTransaction(db, async transaction => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) return null;
    const user = userSnap.data() || {};
    const rachaAnterior = user.rachaDiaria || {};
    const streakBefore = Math.max(0, Number(rachaAnterior.diasConsecutivos) || 0);
    let puntosTotales = puntosAcumulados(rachaAnterior.puntosTotales || streakBefore * PUNTOS_POR_DIA_RACHA);
    const puntosTotalesAntesProceso = puntosTotales;
    const diasConsecutivosAntesProceso = Math.floor(puntosTotales / PUNTOS_POR_DIA_RACHA);
    const ultimaEvaluada = String(rachaAnterior.ultimaFechaEvaluada || '');
    const ultimaCompleta = String(rachaAnterior.ultimaFechaCompleta || '');
    const tieneHistorial = Boolean(ultimaEvaluada || ultimaCompleta || rachaAnterior.puntosTotales !== undefined || rachaAnterior.puntosConducta !== undefined || streakBefore > 0);
    let inicio = ultimaEvaluada ? nextDay(ultimaEvaluada) : (ultimaCompleta && ultimaCompleta < hastaDia ? nextDay(ultimaCompleta) : hastaDia);
    const limite = previousDay(hastaDia);
    if (inicio < limite) {
      const [year, month, day] = hastaDia.split('-').map(Number);
      const limiteDate = new Date(Date.UTC(year, month - 1, day - 30));
      inicio = limiteDate.toISOString().slice(0, 10);
    }
    const dias = [];
    let cursor = inicio;
    while (cursor && cursor <= hastaDia && dias.length < 31) {
      dias.push(cursor);
      cursor = nextDay(cursor);
    }
    const referencias = dias.map(dia => doc(db, 'usuarios', uid, 'racha_diaria', dia));
    const snapshots = await Promise.all(referencias.map(referencia => transaction.get(referencia)));
    let puntosConducta = puntosConductaSeguro(rachaAnterior.puntosConducta);
    let ultimoDiaCerrado = null;
    let huboDiaCompletado = false;
    snapshots.forEach((snapshot, index) => {
      const tieneDatos = snapshot.exists();
      const datos = tieneDatos ? snapshot.data() || {} : {};
      if (!tieneDatos && !tieneHistorial && puntosConducta === 0) return;
      ultimoDiaCerrado = dias[index];
      huboDiaCompletado = huboDiaCompletado || Boolean(datos.completado || dias[index] === ultimaCompleta);
      const tienePuntosGuardados = datos.puntosDia !== undefined || datos.puntos !== undefined;
      const puntos = tienePuntosGuardados ? puntosConductaSeguro(datos.puntosDia ?? datos.puntos) : puntosConducta;
      const inicioDia = datos.puntosDiaInicio !== undefined ? puntosConductaSeguro(datos.puntosDiaInicio) : puntos;
      const incremento = puntos - inicioDia;
      const tuvoDescuidado = Boolean(datos.penalizacionesHambre && Object.keys(datos.penalizacionesHambre).length);
      const debePenalizar = incremento <= 0 && !tuvoDescuidado;
      const penalizacion = debePenalizar ? (puntos >= META_RACHA_DIARIA ? PENALIZACION_AVANCE_ESTANCADO : PENALIZACION_DIA_SIN_AVANCE) : 0;
      puntosConducta = puntos - penalizacion;
      if (!penalizacion) return;
      puntosTotales = Math.max(0, puntosTotales - penalizacion);
      const bitacora = appendConductaEventThrottled(
        datos.eventos,
        conductaEvent(`cierre-${dias[index]}`, -penalizacion, `-${penalizacion} puntos por cerrar el día sin avanzar`, 'negativa'),
        datos.ultimaBitacoraEnMs,
      );
      transaction.set(referencias[index], {
        fecha: dias[index],
        puntos: puntosConducta,
        puntosDia: puntosConducta,
        puntosDiaInicio: inicioDia,
        puntosTotales,
        eventos: bitacora.events,
        ultimaBitacoraEnMs: bitacora.ultimaBitacoraEnMs,
        penalizacionCierre: penalizacion,
        actualizadoEn: serverTimestamp(),
      }, { merge: true });
    });
    const diasConsecutivos = Math.floor(puntosTotales / PUNTOS_POR_DIA_RACHA);
    transaction.set(userRef, {
      rachaDiaria: {
        ...rachaAnterior,
        puntosTotales,
        diasConsecutivos,
        puntosConducta,
        ultimaFechaEvaluada: hastaDia,
      },
    }, { merge: true });
    if (!ultimoDiaCerrado) return null;
    const bajo = diasConsecutivos < diasConsecutivosAntesProceso;
    const subio = diasConsecutivos > diasConsecutivosAntesProceso || (!bajo && huboDiaCompletado && ultimoDiaCerrado === ultimaCompleta);
    return {
      dayKey: ultimoDiaCerrado,
      fromPoints: puntosTotalesAntesProceso,
      toPoints: puntosTotales,
      previousStreakDays: diasConsecutivosAntesProceso,
      streakDays: diasConsecutivos,
      outcome: bajo ? 'bajo' : subio ? 'subio' : 'igual',
      dayCompleted: huboDiaCompletado,
    };
  });
};

export const useRacha = () => useContext(RachaContext) || {
  day: emptyDay(dayKeyFor()),
  streakDays: 0,
  racha: { diasConsecutivos: 0, puntosTotales: 0 },
  loading: false,
  toast: null,
  ocultarToast: () => {},
  ritual: null,
  cerrarRitual: () => {},
  registrarObjetivo: async () => null,
};

export function RachaProvider({ children }) {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [dayKey, setDayKey] = useState(dayKeyFor());
  const [day, setDay] = useState(emptyDay(dayKeyFor()));
  const [streakDays, setStreakDays] = useState(0);
  const [racha, setRacha] = useState({ diasConsecutivos: 0 });
  const puntosConductaRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [ritual, setRitual] = useState(null);

  useEffect(() => onAuthStateChanged(auth, user => setUid(user?.uid || null)), []);
  useEffect(() => {
    const timer = setInterval(() => {
      const next = dayKeyFor();
      setDayKey(current => current === next ? current : next);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!uid) {
      setDay(emptyDay(dayKey));
      setStreakDays(0);
      setRacha({ diasConsecutivos: 0 });
      puntosConductaRef.current = 0;
      setToast(null);
      setRitual(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const dayRef = doc(db, 'usuarios', uid, 'racha_diaria', dayKey);
    const userRef = doc(db, 'usuarios', uid);
    const unsubscribeDay = onSnapshot(dayRef, snapshot => {
      const datos = snapshot.data() || {};
      const documentoTienePuntos = datos.puntosDia !== undefined || datos.puntos !== undefined;
      // `puntos` era el campo diario de la primera versión. Lo conservamos
      // como alias, pero el total de la racha vive en `puntosTotales`.
      const puntosDia = documentoTienePuntos ? puntosConductaSeguro(datos.puntosDia ?? datos.puntos) : puntosConductaRef.current;
      const puntosTotales = puntosAcumulados(datos.puntosTotales);
      setDay({
        ...emptyDay(dayKey),
        ...datos,
        _documentoTienePuntos: documentoTienePuntos,
        puntos: puntosDia,
        puntosDia,
        puntosTotales,
        completado: Boolean(datos.completado || puntosDia >= META_RACHA_DIARIA),
      });
      setLoading(false);
    }, () => setLoading(false));
    const unsubscribeUser = onSnapshot(userRef, snapshot => {
      const nextRacha = snapshot.data()?.rachaDiaria || {};
      const puntosTotales = puntosAcumulados(nextRacha.puntosTotales || ((Number(nextRacha.diasConsecutivos) || 0) * PUNTOS_POR_DIA_RACHA));
      const puntosConducta = puntosConductaSeguro(nextRacha.puntosConducta);
      const diasDerivados = Math.floor(puntosTotales / PUNTOS_POR_DIA_RACHA);
      puntosConductaRef.current = puntosConducta;
      setDay(current => current.fecha === dayKey && !current._documentoTienePuntos ? {
        ...current,
        puntos: puntosConducta,
        puntosDia: puntosConducta,
        completado: puntosConducta >= META_RACHA_DIARIA,
      } : current);
      setRacha({ ...nextRacha, puntosTotales, puntosConducta });
      setStreakDays(Math.max(0, Number(nextRacha.diasConsecutivos) || diasDerivados));
    }, () => { setRacha({ diasConsecutivos: 0 }); puntosConductaRef.current = 0; setStreakDays(0); });
    return () => { unsubscribeDay(); unsubscribeUser(); };
  }, [dayKey, uid]);

  useEffect(() => {
    if (!uid) return undefined;
    const resolver = httpsCallable(functions, 'resolverRachaDiaria');
    resolver({}).then(response => {
      const ajuste = response?.data?.ajuste;
      if (ajuste && Number(ajuste.puntosTotalesAntes) > Number(ajuste.puntosTotales)) {
        setToast({ fromPoints: ajuste.puntosTotalesAntes, toPoints: ajuste.puntosTotales, penalty: true });
      }
      const cierre = response?.data?.cierre;
      if (cierre?.dayKey) setRitual(cierre);
    }).catch(error => {
      // Mientras la nueva Function se despliega, la callable de objetivos
      // mantiene un fallback compatible con los documentos existentes.
      if (['functions/not-found', 'functions/unimplemented'].includes(error?.code)) {
        resolverRachaLocal(uid).then(cierre => {
          if (cierre?.dayKey) setRitual(cierre);
          if (cierre && Number(cierre.fromPoints) > Number(cierre.toPoints)) {
            setToast({ fromPoints: cierre.fromPoints, toPoints: cierre.toPoints, penalty: true });
          }
        }).catch(localError => console.warn('[Racha] No se pudo resolver el cierre local', localError?.message || localError));
      } else {
        console.warn('[Racha] No se pudo resolver el día anterior', error?.message || error);
      }
    });
    return undefined;
  }, [dayKey, uid]);

  const registrarObjetivo = useCallback(async objectiveId => {
    const objective = OBJETIVOS_RACHA[objectiveId];
    const currentUid = auth.currentUser?.uid;
    if (!objective || !currentUid) return null;
    const currentDayKey = dayKeyFor();
    const userRef = doc(db, 'usuarios', currentUid);
    const dayRef = doc(db, 'usuarios', currentUid, 'racha_diaria', currentDayKey);
    // El camino normal usa la callable para que el servidor sea la autoridad.
    // El fallback mantiene la app funcional durante el despliegue inicial de
    // Functions y solo se activa cuando la callable todavía no existe.
    let result;
    try {
      const callable = httpsCallable(functions, 'registrarObjetivoRacha');
      const response = await callable({ objectiveId });
      result = response?.data || null;
    } catch (error) {
      const functionMissing = ['functions/not-found', 'functions/unimplemented'].includes(error?.code);
      if (!functionMissing) throw error;
      result = await runTransaction(db, async transaction => {
        const [userSnap, daySnap] = await Promise.all([transaction.get(userRef), transaction.get(dayRef)]);
        const user = userSnap.data() || {};
        const currentStreak = user.rachaDiaria || {};
        const puntosConductaInicial = puntosConductaSeguro(currentStreak.puntosConducta);
        const persistedDay = daySnap.data() || {};
        const currentDayRaw = { ...emptyDay(currentDayKey), ...persistedDay };
        const dayHasPersistedPoints = persistedDay.puntosDia !== undefined || persistedDay.puntos !== undefined;
        if (!dayHasPersistedPoints) {
          currentDayRaw.puntos = puntosConductaInicial;
          currentDayRaw.puntosDia = puntosConductaInicial;
          currentDayRaw.puntosDiaInicio = puntosConductaInicial;
        }
        if (persistedDay.bonoDiaAplicado === undefined) {
          currentDayRaw.bonoDiaAplicado = Boolean(currentDayRaw.completado && currentDayRaw.puntosDiaInicio === undefined);
        }
        const currentDay = {
          ...currentDayRaw,
          puntosDia: puntosConductaSeguro(currentDayRaw.puntosDia ?? puntosConductaInicial),
          puntosDiaInicio: puntosConductaSeguro(currentDayRaw.puntosDiaInicio ?? currentDayRaw.puntosDia ?? puntosConductaInicial),
          puntosTotales: puntosAcumulados(currentDayRaw.puntosTotales),
          bonoDiaAplicado: Boolean(currentDayRaw.bonoDiaAplicado),
        };
        currentDay.completado = Boolean(currentDayRaw.completado || currentDay.puntosDia >= META_RACHA_DIARIA);
        const currentObjectives = { ...(currentDay.objetivos || {}) };
        const puntosDiaAntes = currentDay.puntosDia;
        const puntosTotalesAntes = puntosAcumulados(currentStreak.puntosTotales || currentDay.puntosTotales || ((Number(currentStreak.diasConsecutivos) || 0) * PUNTOS_POR_DIA_RACHA));
        const objetivoRepetible = objectiveId === 'nivel' || objectiveId === 'alimentar' || objectiveId === 'comerciante';
        if (!objetivoRepetible && currentObjectives[objectiveId]?.completado) {
          if (puntosDiaAntes !== Number(currentDayRaw.puntosDia ?? currentDayRaw.puntos) || puntosTotalesAntes !== Number(currentDayRaw.puntosTotales) || (puntosDiaAntes >= META_RACHA_DIARIA && !currentDay.completado)) {
            transaction.set(dayRef, {
              meta: META_RACHA_DIARIA,
              puntos: puntosDiaAntes,
              puntosDia: puntosDiaAntes,
              puntosTotales: puntosTotalesAntes,
              completado: puntosDiaAntes >= META_RACHA_DIARIA,
              actualizadoEn: serverTimestamp(),
            }, { merge: true });
          }
          return { aplicado: false, day: { ...currentDay, puntos: puntosDiaAntes, puntosDia: puntosDiaAntes, puntosTotales: puntosTotalesAntes, completado: Boolean(currentDay.completado || puntosDiaAntes >= META_RACHA_DIARIA) }, streakDays: Number(user.rachaDiaria?.diasConsecutivos) || 0 };
        }
        const registroAnterior = currentObjectives[objectiveId] || {};
        const objetivoCuentaAcciones = objectiveId === 'nivel' || objectiveId === 'alimentar' || objectiveId === 'comerciante';
        const cantidadAnterior = objetivoCuentaAcciones ? Math.max(
          0,
          Number(registroAnterior.cantidad) || (registroAnterior.completado ? 1 : 0),
        ) : 0;
        const cantidadNueva = objetivoCuentaAcciones ? cantidadAnterior + 1 : 1;
        const hitos = hitosObjetivo(objective);
        const hitosAplicados = { ...(registroAnterior.hitosAplicados || {}) };
        if (!registroAnterior.hitosAplicados && cantidadAnterior > 0) {
          hitos.forEach(([cantidad]) => {
            if (cantidad <= cantidadAnterior) hitosAplicados[cantidad] = true;
          });
        }
        const hitosGanados = hitos.filter(([cantidad]) => cantidadNueva >= cantidad && !hitosAplicados[cantidad]);
        hitosGanados.forEach(([cantidad]) => {
          hitosAplicados[cantidad] = true;
        });
        const puntosConducta = objectiveId === 'inicio' ? 2 : hitosGanados.reduce((total, [, puntos]) => total + puntos, 0);
        const objetivoCompletado = objetivoCuentaAcciones
          ? cantidadNueva >= (objective.meta || 1) : true;
        currentObjectives[objectiveId] = {
          completado: objetivoCompletado,
          ...(objetivoCuentaAcciones ? { cantidad: cantidadNueva, meta: objective.meta, hitosAplicados } : {}),
          puntos: puntosConducta,
          completadoEn: serverTimestamp(),
        };
        const puntosDia = puntosDiaAntes + puntosConducta;
        const puntosAplicados = Math.max(0, puntosConducta);
        let puntosTotales = puntosTotalesAntes + puntosConducta;
        const completado = puntosDia >= META_RACHA_DIARIA;
        const diasAntes = Math.max(Math.max(0, Number(currentStreak.diasConsecutivos) || 0), Math.floor(puntosTotalesAntes / PUNTOS_POR_DIA_RACHA));
        const completadoAhora = completado && !currentDay.bonoDiaAplicado;
        if (completadoAhora) puntosTotales += BONUS_DIA_RACHA;
        const diasConsecutivos = Math.floor(puntosTotales / PUNTOS_POR_DIA_RACHA);
        let ultimaFechaCompleta = currentStreak.ultimaFechaCompleta || null;
        if (completadoAhora) ultimaFechaCompleta = currentDayKey;
        const conductaTexto = objectiveId === 'inicio'
          ? 'por volver a Amor hoy'
          : objectiveId === 'alimentar'
          ? 'por alimentar al Animalito'
          : objectiveId === 'nivel' ? `por completar niveles (${cantidadNueva}/${objective.meta || 12})` : `por comprar en Comerciante (${cantidadNueva}/${objective.meta || 3})`;
        let detalleBitacora;
        if (puntosAplicados > 0 && hitosGanados.length) {
          detalleBitacora = hitosGanados.map(([cantidad, puntos]) => detalleHito(currentUid, currentDayKey, objectiveId, cantidad, puntos)).join(' · ');
        } else if (puntosAplicados > 0) {
          detalleBitacora = `+${puntosAplicados} puntos ${conductaTexto}`;
        } else if (objectiveId === 'nivel') {
          const siguienteHito = hitos.find(([cantidad]) => cantidad > cantidadNueva);
          detalleBitacora = recompensaVariable(currentUid, currentDayKey, `nivel-seguimiento-${cantidadNueva}`, [
            `Completaste ${cantidadNueva} niveles; la bitácora sigue observando tu constancia`,
            `Nivel ${cantidadNueva} registrado. El próximo hito espera en ${siguienteHito ? siguienteHito[0] : 'más niveles'}`,
            `Tu progreso de niveles quedó guardado (${cantidadNueva}/${objective.meta || 12})`,
          ]);
        } else if (objectiveId === 'alimentar') {
          detalleBitacora = recompensaVariable(currentUid, currentDayKey, `alimentar-seguimiento-${cantidadNueva}`, [
            `Alimentaste al Animalito (${cantidadNueva}/${objective.meta || 2}); seguí cuidándolo`,
            'Comida registrada. Dos cuidados en el día forman el próximo hito',
            `El cuidado quedó anotado (${cantidadNueva}/${objective.meta || 2} comidas)`,
          ]);
        } else if (objectiveId === 'comerciante') {
          detalleBitacora = recompensaVariable(currentUid, currentDayKey, `comerciante-seguimiento-${cantidadNueva}`, [
            `Compra registrada (${cantidadNueva}/${objective.meta || 3}); todavía quedan hitos del Comerciante`,
            `Pasaste por Comerciante ${cantidadNueva} vez${cantidadNueva === 1 ? '' : 'ces'} hoy`,
            `Tu recorrido de compras quedó guardado (${cantidadNueva}/${objective.meta || 3})`,
          ]);
        } else {
          detalleBitacora = 'Conducta registrada; la bitácora sigue observando tu constancia';
        }
        const deltaBitacora = puntosAplicados + (completadoAhora ? BONUS_DIA_RACHA : 0);
        if (completadoAhora) detalleBitacora += ` · +${BONUS_DIA_RACHA} puntos por completar la conducta del día`;
        const bitacora = appendConductaEventThrottled(
          currentDay.eventos,
          conductaEvent(
            `objetivo-${objectiveId}-${currentDayKey}-${cantidadNueva}`,
            deltaBitacora,
            detalleBitacora,
            deltaBitacora < 0 ? 'negativa' : puntosAplicados > 0 || completadoAhora ? 'positiva' : 'neutral',
          ),
          currentDay.ultimaBitacoraEnMs,
        );
        transaction.set(dayRef, {
          ...currentDay,
          fecha: currentDayKey,
          meta: META_RACHA_DIARIA,
          puntos: puntosDia,
          puntosDia,
          puntosDiaInicio: currentDay.puntosDiaInicio,
          puntosTotales,
          objetivos: currentObjectives,
          eventos: bitacora.events,
          ultimaBitacoraEnMs: bitacora.ultimaBitacoraEnMs,
          bonoDiaAplicado: currentDay.bonoDiaAplicado || completadoAhora,
          completado,
          actualizadoEn: serverTimestamp(),
          ...(completado && !currentDay.completado ? { completadoEn: serverTimestamp() } : {}),
        }, { merge: true });
        transaction.set(userRef, { rachaDiaria: { ...currentStreak, puntosTotales, puntosConducta: puntosDia, diasConsecutivos, ultimaFechaCompleta, ultimoDia: currentDayKey } }, { merge: true });
        return { aplicado: true, fromPoints: puntosTotalesAntes, toPoints: puntosTotales, fromDailyPoints: puntosDiaAntes, toDailyPoints: puntosDia, streakDays: diasConsecutivos, nuevoDiaCompletado: completadoAhora, nuevaRacha: diasConsecutivos > diasAntes, dayKey: currentDayKey, hitosGanados: hitosGanados.map(([cantidad, puntos]) => ({ cantidad, puntos })), bitacoraRegistrada: bitacora.registrada };
      });
    }
    if (result?.aplicado && auth.currentUser?.uid === currentUid) {
      if (Number(result.toPoints) !== Number(result.fromPoints)) {
        setToast({ fromPoints: result.fromPoints, toPoints: result.toPoints, objectiveId });
      }
    }
    return result;
  }, []);

  const ocultarToast = useCallback(() => setToast(null), []);
  const cerrarRitual = useCallback(() => setRitual(null), []);
  const value = useMemo(() => ({ day, streakDays, racha, loading, toast, ocultarToast, ritual, cerrarRitual, registrarObjetivo }), [cerrarRitual, day, loading, ocultarToast, racha, registrarObjetivo, ritual, streakDays, toast]);
  return <RachaContext.Provider value={value}>{children}</RachaContext.Provider>;
}
