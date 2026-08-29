import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp, increment } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useUserDocument } from './useUserDocument';

const recompensaCache = new Map();

// El primer día entrega el Halcón. Después alterna recursos, cartas y tickets
// para que la ruleta también tenga una forma especial de conseguir más giros.
export const getRecompensaDiariaDelDia = (dia, userData) => {
  // Día 1 siempre representa el Halcón, incluso en el historial de un usuario
  // que ya lo desbloqueó.
  if (dia === 1) return { tipo: 'halcon', cantidad: 1, etiqueta: 'x1' };
  const ciclo = (dia - 2) % 5;
  if (ciclo === 0) return { tipo: 'dinero', cantidad: 250, emoji: '🪙', etiqueta: '+250' };
  if (ciclo === 1) return { tipo: 'exp', cantidad: 125, emoji: '⏏️', etiqueta: '+125' };
  if (ciclo === 2) return { tipo: 'ticketRuleta', cantidad: 1, etiqueta: 'x1' };
  if (ciclo === 3) return { tipo: 'cartasAnimalitos', cantidad: 3, emoji: '✦', etiqueta: 'x3' };
  return { tipo: 'diamantes', cantidad: 25, emoji: '💎', etiqueta: 'x25' };
};

export const useRecompensaDiaria = ({ paused = false } = {}) => {
  const uidInicial = auth.currentUser?.uid;
  const estadoInicial = uidInicial ? recompensaCache.get(uidInicial) : null;
  const [diaActual, setDiaActual] = useState(() => estadoInicial?.diaActual ?? 1);
  const [ultimoReclamo, setUltimoReclamo] = useState(() => estadoInicial?.ultimoReclamo ?? null);
  const [loading, setLoading] = useState(() => !estadoInicial);
  const { data: userData } = useUserDocument(
    data => ({ halconDesbloqueado: data?.halconDesbloqueado, animalito: data?.animalito, dinero: data?.dinero, exp: data?.exp }),
    undefined,
    (a, b) => a?.halconDesbloqueado === b?.halconDesbloqueado && a?.animalito === b?.animalito && a?.dinero === b?.dinero && a?.exp === b?.exp,
  );

  useEffect(() => {
    if (paused) return; // No iniciar listeners si está pausado
    
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const ref = doc(db, 'usuarios', uid, 'recompensaDiaria', 'estado');
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        const timestampGuardado = data.ultimoReclamo;
        const diaGuardado = data.diaActual ?? 1;
        
        const haPasado24Horas = (timestamp) => {
          if (!timestamp) return true;
          const ahora = new Date();
          const fechaReclamo = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
          const diferenciaMs = ahora.getTime() - fechaReclamo.getTime();
          return diferenciaMs / (1000 * 60 * 60) >= 24;
        };
        
        if (timestampGuardado && haPasado24Horas(timestampGuardado)) {
          const nuevodia = diaGuardado + 1;
          setDoc(ref, { diaActual: nuevodia, ultimoReclamo: null }, { merge: true });
          setDiaActual(nuevodia);
          setUltimoReclamo(null);
          recompensaCache.set(uid, { diaActual: nuevodia, ultimoReclamo: null });
        } else {
          setDiaActual(diaGuardado);
          setUltimoReclamo(timestampGuardado);
          recompensaCache.set(uid, { diaActual: diaGuardado, ultimoReclamo: timestampGuardado });
        }
      } else {
        setDoc(ref, { diaActual: 1, ultimoReclamo: null });
        setDiaActual(1);
        setUltimoReclamo(null);
        recompensaCache.set(uid, { diaActual: 1, ultimoReclamo: null });
      }
      setLoading(false);
    });
    
    return unsub;
  }, [paused]);

  const haPasado24Horas = (timestamp) => {
    if (!timestamp) return true;
    const ahora = new Date();
    const fechaReclamo = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diferenciaMs = ahora.getTime() - fechaReclamo.getTime();
    return diferenciaMs / (1000 * 60 * 60) >= 24;
  };

  const puedeReclamar = ultimoReclamo === null || haPasado24Horas(ultimoReclamo);

  const reclamar = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !puedeReclamar) return;
    
    const ref = doc(db, 'usuarios', uid, 'recompensaDiaria', 'estado');
    const userRef = doc(db, 'usuarios', uid);
    
    const recompensa = getRecompensaDiariaDelDia(diaActual, userData);
    if (recompensa.tipo === 'halcon') {
      await setDoc(userRef, {
        halconDesbloqueado: true,
      }, { merge: true });
      await setDoc(doc(db, 'usuarios', uid, 'animalitos', 'halcon'), {
        desbloqueado: true,
        nivel: 1,
        copias: 3,
        skin: 'default',
        skinsDesbloqueadas: {},
        desbloqueadoAt: serverTimestamp(),
      }, { merge: true });
    } else if (recompensa.tipo === 'ticketRuleta') {
      await setDoc(doc(db, 'usuarios', uid, 'inventario', 'ticket_ruleta'), {
        tipo: 'ticket_ruleta',
        nombre: 'Ticket de Ruleta',
        cantidad: increment(recompensa.cantidad),
      }, { merge: true });
    } else {
      await setDoc(userRef, { [recompensa.tipo]: increment(recompensa.cantidad) }, { merge: true });
    }
    
    await setDoc(ref, { ultimoReclamo: serverTimestamp() }, { merge: true });
  };

  return { diaActual, ultimoReclamo, puedeReclamar, loading, reclamar, userData };
};
