import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Configuración global editable desde Firestore:
// colección: Temporada · documento: actual · campo: Temporada = "t1" | "t2" | ...
let temporada = 't1';
let iniciada = false;
const listeners = new Set();

const ADMINS_DEBUG = new Set(['admin@gmail.com', 'admin1@gmail.com']);
export const temporadaParaUsuario = (datos = {}, email = auth.currentUser?.email) => {
  const esAdminDebug = ADMINS_DEBUG.has(String(email || '').trim().toLowerCase());
  const valor = esAdminDebug
    ? (datos.DebugTemporada || datos.Temporada || datos.temporadaActual || 't1')
    : (datos.Temporada || datos.temporadaActual || 't1');
  return typeof valor === 'string' ? valor.toLowerCase() : 't1';
};

const iniciar = () => {
  if (iniciada) return;
  iniciada = true;
  console.log('[Temporada] Escuchando Temporada/actual');
  onSnapshot(doc(db, 'Temporada', 'actual'), snap => {
    const datos = snap.data() || {};
    temporada = temporadaParaUsuario(datos);
    console.log('[Temporada] Firestore respondió', { existe: snap.exists(), datos, temporada });
    listeners.forEach(listener => listener(temporada));
  }, error => {
    console.warn('[Temporada] Error leyendo Temporada/actual, usando t1', error?.message || error);
  });
};

export const numeroTemporada = valor => Number(String(valor || 't1').replace(/[^0-9]/g, '')) || 1;
export const contenidoDisponible = (temporadaContenido, temporadaActual) => numeroTemporada(temporadaContenido) <= numeroTemporada(temporadaActual);

export const useTemporadaActual = () => {
  const [actual, setActual] = useState(() => { iniciar(); return temporada; });
  useEffect(() => {
    const listener = siguiente => setActual(siguiente);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);
  return actual;
};
