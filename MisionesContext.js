import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, auth } from './firebaseConfig';
import { doc, setDoc, onSnapshot, updateDoc, increment, deleteDoc, getDoc } from 'firebase/firestore';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getDiaKey = () => {
  const h = new Date();
  return `${h.getFullYear()}-${h.getMonth() + 1}-${h.getDate()}`;
};

// ── Misión login progresiva ───────────────────────────────────────────────────
const LOGIN_FASES = [
  { id: 'login_f1', titulo: 'Bienvenida',  desc: 'Inicia sesión una vez',     meta: 1,  monedas: 250 },
  { id: 'login_f2', titulo: 'Constancia',  desc: 'Inicia sesión tres veces',  meta: 3,  chicles: 1   },
  { id: 'login_f3', titulo: 'Dedicación',  desc: 'Inicia sesión siete veces', meta: 7,  chicles: 2   },
];
const getMisionLogin = (fase) => {
  const f = LOGIN_FASES[(fase ?? 1) - 1] ?? LOGIN_FASES[0];
  return { ...f, campo: 'login_conteo', recompensa: f.monedas ? 'monedas' : 'chicle',
    icono: '🍬', _chicles: f.chicles ?? 0, _monedas: f.monedas ?? 0 };
};

// ── Banco de misiones ─────────────────────────────────────────────────────────
export const BANCO = [
  { id: 'explorar_t1', titulo: 'Exploradora',     desc: 'Explora toda la temporada.',           meta: 2,  icono: '🗺️', campo: 'explorar_t1_hoy',  _subCampos: ['explorar_t1_librotemp1','explorar_t1_historia1'] },
  { id: 'juego_60',    titulo: 'Maratonista',      desc: 'Juega durante 60 minutos',             meta: 60, icono: '⏱️', campo: 'minutos_hoy'   },
  { id: 'login_3',     titulo: 'Constancia',       desc: 'Inicia sesión durante 3 días',         meta: 3,  icono: '📅', campo: 'login_streak'  },
  { id: 'login_7',     titulo: 'Semana completa',  desc: 'Inicia sesión durante 7 días',         meta: 7,  icono: '🔥', campo: 'login_streak'  },
  { id: 'mensaje_5',   titulo: 'Conversador',      desc: 'Envía 5 mensajes hoy',                 meta: 5,  icono: '💬', campo: 'mensajes_hoy'  },
  { id: 'mensaje_10',  titulo: 'Charlatán',        desc: 'Envía 10 mensajes hoy',                meta: 10, icono: '🗣️', campo: 'mensajes_hoy'  },
  { id: 'mision_1',    titulo: 'Primer paso',      desc: 'Completa 1 misión diaria',             meta: 1,  icono: '✅', campo: 'misiones_hoy'  },
  { id: 'mision_3',    titulo: 'Triatleta',        desc: 'Completa 3 misiones en un día',        meta: 3,  icono: '🏅', campo: 'misiones_hoy'  },
  { id: 'visita_menu', titulo: 'Explorador',       desc: 'Visita 3 secciones distintas hoy',     meta: 3,  icono: '🗺️', campo: 'secciones_hoy' },
  { id: 'pareja_on',   titulo: 'Conectados',       desc: 'Haz que tu pareja se conecte.',        meta: 1,  icono: '💕', campo: 'pareja_entro_hoy' },
  { id: 'perfil_edit', titulo: 'Identidad',        desc: 'Edita tu perfil 1 vez',                meta: 1,  icono: '✏️', campo: 'perfil_editado'},
  { id: 'sticker_1',   titulo: 'Coleccionista',    desc: 'Usa 1 sticker hoy',                    meta: 1,  icono: '🎨', campo: 'stickers_hoy'  },
  { id: 'regalo_1',    titulo: 'Generoso',         desc: 'Envía 1 regalo hoy',                   meta: 1,  icono: '🎁', campo: 'regalos_hoy'   },
  { id: 'trofeo_1',    titulo: 'Cazador',          desc: 'Reclama 1 trofeo',                     meta: 1,  icono: '🏆', campo: 'trofeos_hoy'   },
  { id: 'foto_1',      titulo: 'Fotógrafo',        desc: 'Sube 1 foto hoy',                      meta: 1,  icono: '📷', campo: 'fotos_hoy'     },
  { id: 'cancion_1',   titulo: 'DJ',               desc: 'Escucha 1 canción en la app',          meta: 1,  icono: '🎵', campo: 'canciones_hoy' },
];

const getMisionesBase = () => {
  const seed = parseInt(getDiaKey().replace(/-/g, ''), 10);
  const shuffled = [...BANCO].sort((a, b) =>
    ((seed * 31 + a.id.charCodeAt(0)) % 97) - ((seed * 31 + b.id.charCodeAt(0)) % 97)
  );
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
  const [misiones, setMisiones]     = useState(null); // fijadas al montar
  const [reward, setReward]         = useState(null);

  const uid    = auth.currentUser?.uid;
  const diaKey = getDiaKey();
  const minTimerRef = useRef(null);

  // ── Escuchar progreso del día ─────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'misiones_diarias', diaKey);
    const unsub = onSnapshot(ref, snap => {
      const data = snap.exists() ? (snap.data()[uid] || {}) : {};
      setProgreso(data.progreso || {});
      setReclamados(data.reclamados || []);
    });
    return () => unsub();
  }, [uid, diaKey]);

  // ── Escuchar loginData y fijar misiones una sola vez ──────────────────────
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
      setMisiones(prev => {
        if (prev !== null) return prev;
        return [getMisionLogin(ld.fase), ...getMisionesBase()];
      });
    });
    return () => unsub();
  }, [uid]);

  // ── Contador de tiempo de juego — corre siempre que el usuario esté logueado
  useEffect(() => {
    if (!uid) return;
    const diaKey_ = getDiaKey();
    const refDia  = doc(db, 'misiones_diarias', diaKey_);
    minTimerRef.current = setInterval(() => {
      updateDoc(refDia, { [`${uid}.progreso.minutos_hoy`]: increment(1) })
        .catch(() =>
          setDoc(refDia, { [uid]: { progreso: { minutos_hoy: 1 } } }, { merge: true }).catch(() => {})
        );
    }, 60000);
    return () => clearInterval(minTimerRef.current);
  }, [uid]);

  // ── Registrar login del día (una vez por día) ─────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const hoy = getDiaKey();
    // Borra doc de ayer
    const ayer = (() => {
      const h = new Date(); h.setDate(h.getDate() - 1);
      return `${h.getFullYear()}-${h.getMonth() + 1}-${h.getDate()}`;
    })();
    deleteDoc(doc(db, 'misiones_diarias', ayer)).catch(() => {});
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
  const reclamar = async (mision) => {
    if (!uid || reclamados.includes(mision.id)) return;
    const nuevos = [...reclamados, mision.id];
    setReclamados(nuevos);
    const refDia = doc(db, 'misiones_diarias', diaKey);
    await setDoc(refDia, { [uid]: { progreso, reclamados: nuevos } }, { merge: true }).catch(() => {});

    if (mision.recompensa === 'chicle') {
      const chiclesGanados = mision._chicles ?? 1;
      await updateDoc(doc(db, 'usuarios', uid), { chicles: increment(chiclesGanados) }).catch(() => {});
      const faseActual = loginData?.fase ?? 1;
      if (faseActual < 3) {
        await updateDoc(doc(db, 'usuarios', uid), { login_fase: faseActual + 1, login_conteo: 1 }).catch(() => {});
      } else {
        await updateDoc(doc(db, 'usuarios', uid), { login_fase: 1, login_conteo: 1, login_ultimo_reclamo: diaKey }).catch(() => {});
      }
      setReward({ titulo: mision.titulo, chicles: chiclesGanados });
    } else {
      const monedasGanadas = mision._monedas ?? RECOMPENSA_MONEDAS;
      await updateDoc(doc(db, 'usuarios', uid), { dinero: increment(monedasGanadas) }).catch(() => {});
      if (mision.campo === 'login_conteo') {
        await updateDoc(doc(db, 'usuarios', uid), { login_fase: 2, login_conteo: 1 }).catch(() => {});
      }
      setReward({ titulo: mision.titulo, monedas: monedasGanadas });
    }
  };

  // ── Reset DEV ─────────────────────────────────────────────────────────────
  const resetDev = async () => {
    if (!uid) return;
    await updateDoc(doc(db, 'usuarios', uid), {
      login_fase: 1, login_conteo: 0,
      login_ultimo_conteo: null, login_ultimo_reclamo: null,
    }).catch(() => {});
    await setDoc(doc(db, 'misiones_diarias', diaKey), {
      [uid]: { progreso: {}, reclamados: [] },
    }, { merge: true }).catch(() => {});
    setMisiones(null); // se re-fijan con el próximo snapshot
  };

  const getEstado = (mision) => {
    const actual = mision.campo === 'login_conteo'
      ? (loginData?.conteo ?? 0)
      : mision._subCampos
        ? mision._subCampos.filter(c => progreso[c]).length
        : (progreso[mision.campo] ?? 0);
    if (reclamados.includes(mision.id)) return 'reclamado';
    if (actual >= mision.meta)          return 'reclamar';
    return 'pendiente';
  };

  const listaMisiones = misiones ?? [getMisionLogin(1), ...getMisionesBase()];
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
      getEstado,
      resetDev,
      RECOMPENSA_MONEDAS,
    }}>
      {children}
    </MisionesContext.Provider>
  );
}
