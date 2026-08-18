import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export const useRecompensaDiaria = ({ paused = false } = {}) => {
  const [diaActual, setDiaActual] = useState(1);
  const [ultimoReclamo, setUltimoReclamo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (paused) return; // No iniciar listeners si está pausado
    
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const ref = doc(db, 'usuarios', uid, 'recompensaDiaria', 'estado');
    const userRef = doc(db, 'usuarios', uid);
    
    // Combinar listeners en uno solo para evitar múltiples re-renders
    let unsub1, unsub2;
    
    unsub1 = onSnapshot(ref, snap => {
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
        } else {
          setDiaActual(diaGuardado);
          setUltimoReclamo(timestampGuardado);
        }
      } else {
        setDoc(ref, { diaActual: 1, ultimoReclamo: null });
        setDiaActual(1);
        setUltimoReclamo(null);
      }
      setLoading(false);
    });
    
    // Listener para userData (solo para halconDesbloqueado)
    unsub2 = onSnapshot(userRef, snap => {
      if (snap.exists()) {
        setUserData(snap.data());
      }
    });

    return () => {
      unsub1?.();
      unsub2?.();
    };
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
    
    if (diaActual === 1) {
      if (!userData?.halconDesbloqueado) {
        await setDoc(userRef, { halconDesbloqueado: true }, { merge: true });
      }
    } else {
      const dineroActual = userData?.dinero ?? 0;
      await setDoc(userRef, { dinero: dineroActual + 250 }, { merge: true });
    }
    
    await setDoc(ref, { ultimoReclamo: serverTimestamp() }, { merge: true });
  };

  return { diaActual, ultimoReclamo, puedeReclamar, loading, reclamar, userData };
};
