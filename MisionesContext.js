import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, auth } from './firebaseConfig';
import { doc, setDoc, onSnapshot, updateDoc, increment, deleteDoc, getDoc } from 'firebase/firestore';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getDiaKey = () => {
  const h = new Date();
  return `${h.getFullYear()}-${h.getMonth() + 1}-${h.getDate()}`;
};

// Cada usuario guarda su progreso por día en su propio subárbol:
// usuarios/{uid}/misiones/{yyyy-m-d}
// Así una limpieza diaria nunca puede borrar las misiones de otra persona.
const getMisionDiaRef = (uid, diaKey) => doc(db, 'usuarios', uid, 'misiones', diaKey);
const getMisionLegacyDiaRef = (diaKey) => doc(db, 'misiones_diarias', diaKey);

// ── Misión login progresiva ───────────────────────────────────────────────────
const LOGIN_FASES = [
  { id: 'login_f1', titulo: 'Bienvenida',  desc: 'Inicia sesión una vez',     meta: 1,  monedas: 250 },
  { id: 'login_f2', titulo: 'Constancia',  desc: 'Inicia sesión tres veces',  meta: 3,  chicles: 1   },
  { id: 'login_f3', titulo: 'Dedicación',  desc: 'Inicia sesión siete veces', meta: 7,  chicles: 2   },
];
const getMisionLogin = (fase) => {
  const f = LOGIN_FASES[(fase ?? 1) - 1] ?? LOGIN_FASES[0];
  return { ...f, campo: 'login_conteo', recompensa: f.monedas ? 'monedas' : 'chicle',
    icono: '🍬', _fase: fase ?? 1, _chicles: f.chicles ?? 0, _monedas: f.monedas ?? 0 };
};

const getFaseLoginReclamada = (reclamados) => {
  let index = -1;
  LOGIN_FASES.forEach((fase, i) => {
    if (reclamados.includes(fase.id)) index = i;
  });
  return index === -1 ? null : index + 1;
};

// ── Banco de misiones ─────────────────────────────────────────────────────────
export const BANCO = [
  { id: 'juego_60',    titulo: 'Maratonista',      desc: 'Juega durante 60 minutos',             meta: 60, icono: '⏱️', campo: 'minutos_hoy',    recompensa: 'chicle', _chicles: 1 },
  { id: 'juego_30',    titulo: 'Jugadora',         desc: 'Juega durante 30 minutos',             meta: 30, icono: '🎮', campo: 'minutos_hoy',    recompensa: 'globo', _globos: 1 },
  { id: 'juego_partida', titulo: 'Conexiones',      desc: 'Completa una partida de Hilito',       meta: 1,  icono: '🧩', campo: 'partidas_hoy', recompensa: 'chicle', _chicles: 1 },
  { id: 'mision_1',    titulo: 'Primer paso',      desc: 'Completa 1 misión diaria',             meta: 1,  icono: '✅', campo: 'misiones_hoy',   recompensa: 'chicle', _chicles: 1 },
  { id: 'mision_3',    titulo: 'Triatleta',        desc: 'Completa 3 misiones en un día',        meta: 3,  icono: '🏅', campo: 'misiones_hoy',   recompensa: 'globo', _globos: 1 },
  { id: 'visita_menu', titulo: 'Explorador',       desc: 'Visita 3 secciones distintas hoy',     meta: 3,  icono: '🗺️', campo: 'secciones_hoy',  _distintas: true, recompensa: 'chicle', _chicles: 1 },
  { id: 'pareja_on',   titulo: 'Conectados',       desc: 'Haz que tu pareja se conecte.',        meta: 1,  icono: '💕', campo: 'pareja_entro_hoy', recompensa: 'globo', _globos: 1 },
  { id: 'regalo_1',    titulo: 'Generoso',         desc: 'Envía 1 regalo hoy',                   meta: 1,  icono: '🎁', campo: 'regalos_hoy',    recompensa: 'chicle', _chicles: 1 },
  { id: 'comercio_1',  titulo: 'Comprita de Mentita', desc: 'Compra al menos una cosa en el Comerciante', meta: 1, icono: '🛍️', campo: 'compras_hoy', recompensa: 'globo', _globos: 1 },
];

const getMisionesBase = (salt = 0) => {
  const seed = parseInt(getDiaKey().replace(/-/g, ''), 10) + salt;
  // Hash que mezcla seed con todos los caracteres del ID para mejor dispersión
  const hashId = (id) => {
    let h = seed;
    for (let i = 0; i < id.length; i++) {
      h = Math.imul(h ^ id.charCodeAt(i), 0x9e3779b9) >>> 0;
    }
    return h;
  };
  const shuffled = [...BANCO].sort((a, b) => hashId(a.id) - hashId(b.id));
  return shuffled.slice(0, 4); // 4 base + 1 login = 5 total
};

const RECOMPENSA_MONEDAS = 10;

// ── Contexto ──────────────────────────────────────────────────────────────────
const MisionesContext = createContext(null);
export const useMisiones = () => useContext(MisionesContext);

export function MisionesProvider({ children }) {
  const [progreso, setProgreso]     = useState({});
  const [reclamados, setReclamados] = useState([]);
  const [loginData, setLoginData]   = useState(null);
  const [faseMisionDia, setFaseMisionDia] = useState(null);
  const [misiones, setMisiones]     = useState(null); // fijadas al montar
  const [reward, setReward]         = useState(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const uid    = auth.currentUser?.uid;
  const diaKey = getDiaKey();
  const minTimerRef = useRef(null);

  // ── Escuchar progreso del día ─────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const ref = getMisionDiaRef(uid, diaKey);

    // Conserva el progreso del día actual creado antes de esta migración.
    // Nunca se elimina el documento antiguo, porque contiene datos de más usuarios.
    Promise.all([getDoc(ref), getDoc(getMisionLegacyDiaRef(diaKey))])
      .then(([actual, legacy]) => {
        const legacyData = legacy.data()?.[uid];
        if (!actual.exists() && legacyData) {
          return setDoc(ref, legacyData);
        }
      })
      .catch(() => {});

    const unsub = onSnapshot(ref, snap => {
      const data = snap.exists() ? snap.data() : {};
      setProgreso(data.progreso || {});
      setReclamados(data.reclamados || []);
      setFaseMisionDia(data.loginMisionFase ?? null);
    });
    return () => unsub();
  }, [uid, diaKey]);

  // ── Escuchar loginData y fijar misiones — se recalculan si cambia el día ──
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const ld = {
        fase:          d.login_fase          ?? 1,
        conteo:        d.login_conteo        ?? 0,
        ultimoReclamo: d.login_ultimo_reclamo ?? null,
      };
      setLoginData(ld);
      const fase = faseMisionDia ?? getFaseLoginReclamada(reclamados) ?? ld.fase;
      setMisiones([getMisionLogin(fase), ...getMisionesBase(shuffleSeed)]);
    });
    return () => unsub();
  }, [uid, diaKey, faseMisionDia, reclamados, shuffleSeed]);

  // Fija la fase de login elegida para el día. Cambiar login_fase al reclamar
  // prepara el día siguiente, pero no reemplaza la misión mostrada hoy.
  useEffect(() => {
    if (!uid || !loginData || faseMisionDia != null) return;
    const fase = getFaseLoginReclamada(reclamados) ?? loginData.fase;
    setDoc(getMisionDiaRef(uid, diaKey), { loginMisionFase: fase }, { merge: true }).catch(() => {});
  }, [uid, diaKey, loginData, faseMisionDia, reclamados]);

  // ── Contador de tiempo de juego — corre siempre que el usuario esté logueado
  useEffect(() => {
    if (!uid) return;
    const diaKey_ = getDiaKey();
    const refDia  = getMisionDiaRef(uid, diaKey_);
    minTimerRef.current = setInterval(() => {
      updateDoc(refDia, { 'progreso.minutos_hoy': increment(1) })
        .catch(() =>
          setDoc(refDia, { progreso: { minutos_hoy: 1 } }, { merge: true }).catch(() => {})
        );
    }, 60000);
    return () => clearInterval(minTimerRef.current);
  }, [uid]);

  // ── Registrar login del día (una vez por día) ─────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const hoy = getDiaKey();
    // Borra únicamente el documento de ayer de este usuario.
    const ayer = (() => {
      const h = new Date(); h.setDate(h.getDate() - 1);
      return `${h.getFullYear()}-${h.getMonth() + 1}-${h.getDate()}`;
    })();
    deleteDoc(getMisionDiaRef(uid, ayer)).catch(() => {});
    // Incrementa login_conteo solo una vez por día
    getDoc(doc(db, 'usuarios', uid)).then(snap => {
      const d = snap.data() || {};
      if (d.login_ultimo_conteo !== hoy) {
        updateDoc(doc(db, 'usuarios', uid), {
          login_conteo:        increment(1),
          login_ultimo_conteo: hoy,
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [uid]);

  // ── Reclamar misión ───────────────────────────────────────────────────────
  // recompensaOverride: 'globo' | 'chicle' | 'monedas' | null — reemplaza la recompensa del BANCO
  const reclamar = async (mision, recompensaOverride = null) => {
    if (!uid || reclamados.includes(mision.id)) return;
    const nuevos = [...reclamados, mision.id];
    setReclamados(nuevos);
    const refDia = getMisionDiaRef(uid, diaKey);
    await setDoc(refDia, {
      progreso,
      reclamados: nuevos,
      ...(mision.campo === 'login_conteo' ? { loginMisionFase: mision._fase } : {}),
    }, { merge: true }).catch(() => {});

    const tipoRecompensa = recompensaOverride ?? mision.recompensa ?? 'monedas';

    if (tipoRecompensa === 'exp') {
      const expGanada = mision._exp ?? 5;
      await updateDoc(doc(db, 'usuarios', uid), { exp: increment(expGanada) }).catch(() => {});
      setReward({ titulo: mision.titulo, exp: expGanada });
    } else if (tipoRecompensa === 'cartasAnimalitos') {
      const cartasGanadas = mision._cartas ?? 1;
      await updateDoc(doc(db, 'usuarios', uid), { cartasAnimalitos: increment(cartasGanadas) }).catch(() => {});
      setReward({ titulo: mision.titulo, cartas: cartasGanadas });
    } else if (tipoRecompensa === 'globo') {
      const globosGanados = mision._globos ?? 1;
      await updateDoc(doc(db, 'usuarios', uid), { globos: increment(globosGanados) }).catch(() => {});
      setReward({ titulo: mision.titulo, globos: globosGanados });
    } else if (tipoRecompensa === 'chicle') {
      const chiclesGanados = mision._chicles > 0 ? mision._chicles : 1;
      await updateDoc(doc(db, 'usuarios', uid), { chicles: increment(chiclesGanados) }).catch(() => {});
      if (mision.campo === 'login_conteo') {
        const faseActual = loginData?.fase ?? 1;
        if (faseActual < 3) {
          // El contador es acumulativo: la siguiente fase debe continuar desde
          // el total real de inicios de sesión, no volver a empezar en 1.
          await updateDoc(doc(db, 'usuarios', uid), { login_fase: faseActual + 1 }).catch(() => {});
        } else {
          await updateDoc(doc(db, 'usuarios', uid), { login_fase: 1, login_ultimo_reclamo: diaKey }).catch(() => {});
        }
      }
      setReward({ titulo: mision.titulo, chicles: chiclesGanados });
    } else {
      const monedasGanadas = mision._monedas ?? RECOMPENSA_MONEDAS;
      await updateDoc(doc(db, 'usuarios', uid), { dinero: increment(monedasGanadas) }).catch(() => {});
      if (mision.campo === 'login_conteo') {
        await updateDoc(doc(db, 'usuarios', uid), { login_fase: 2 }).catch(() => {});
      }
      setReward({
        titulo: mision.titulo,
        monedas: monedasGanadas,
        ...(mision.id === 'login_f1' ? { tutorialPaso: 3 } : {}),
      });
    }
  };

  // Registra acciones de otras pantallas en el progreso diario de forma atómica.
  const registrarProgreso = async (campo, cantidad = 1) => {
    if (!uid || !campo) return;
    const refDia = getMisionDiaRef(uid, diaKey);
    await updateDoc(refDia, { [`progreso.${campo}`]: increment(cantidad) }).catch(() =>
      setDoc(refDia, { progreso: { [campo]: cantidad } }, { merge: true }).catch(() => {})
    );
  };

  // ── Reset DEV ─────────────────────────────────────────────────────────────
  const resetDev = async () => {
    if (!uid) return;
    await updateDoc(doc(db, 'usuarios', uid), {
      login_fase: 1, login_conteo: 0,
      login_ultimo_conteo: null, login_ultimo_reclamo: null,
    }).catch(() => {});
    await setDoc(getMisionDiaRef(uid, diaKey), {
      progreso: {}, reclamados: [], loginMisionFase: 1,
    }, { merge: true }).catch(() => {});
    setShuffleSeed(Date.now());
    setMisiones(null); // se re-fijan con el próximo snapshot
  };

  const getEstado = (mision) => {
    const actual = mision.campo === 'login_conteo'
      // Corrige datos antiguos donde al reclamar una fase el contador se
      // reiniciaba. La fase desbloqueada garantiza como mínimo su hito previo.
      ? Math.max(loginData?.conteo ?? 0, mision._fase > 1 ? LOGIN_FASES[mision._fase - 2].meta : 0)
      : mision._subCampos
        ? mision._subCampos.filter(c => progreso[c]).length
        : mision._distintas
          ? Object.keys(progreso[mision.campo] || {}).length
        : (progreso[mision.campo] ?? 0);
    if (reclamados.includes(mision.id)) return 'reclamado';
    if (actual >= mision.meta)          return 'reclamar';
    return 'pendiente';
  };

  const listaMisiones = misiones ?? [getMisionLogin(1), ...getMisionesBase(shuffleSeed)];
  const completadas   = listaMisiones.filter(m => reclamados.includes(m.id)).length;
  const pendientesReclamar = listaMisiones.filter(m => getEstado(m) === 'reclamar').length;

  return (
    <MisionesContext.Provider value={{
      misiones: listaMisiones,
      progreso,
      loginData,
      reclamados,
      completadas,
      pendientesReclamar,
      reward,
      setReward,
      reclamar,
      registrarProgreso,
      getEstado,
      resetDev,
      RECOMPENSA_MONEDAS,
    }}>
      {children}
    </MisionesContext.Provider>
  );
}
