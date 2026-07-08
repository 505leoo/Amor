import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

const DNI_PATTERN = /^\d{2}-\d{3}-\d{3}$/;

export function dniEsValido(dni) {
  return typeof dni === 'string' && DNI_PATTERN.test(dni.trim());
}

export function generarDniCandidato() {
  const a = Math.floor(10 + Math.random() * 90);
  const b = Math.floor(100 + Math.random() * 900);
  const c = Math.floor(100 + Math.random() * 900);
  return `${a}-${b}-${c}`;
}

function dniDeterministicoDesdeUid(uid) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = Math.imul(31, h) + uid.charCodeAt(i) | 0;
  }
  const u = h >>> 0;
  const a = (u % 90) + 10;
  const b = ((u >>> 7) % 900) + 100;
  const c = ((u >>> 15) % 900) + 100;
  return `${a}-${b}-${c}`;
}

async function existeDniEnUsuarios(db, dni) {
  const q = query(collection(db, 'usuarios'), where('dni', '==', dni), limit(1));
  const res = await getDocs(q);
  return !res.empty;
}

/**
 * Garantiza que el documento usuarios/{userId} tenga un campo `dni` único (formato NN-NNN-NNN).
 */
export async function asegurarDniUsuario(db, userId) {
  const ref = doc(db, 'usuarios', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data();
  const actual = data.dni;
  if (dniEsValido(actual)) return actual.trim();

  for (let i = 0; i < 24; i++) {
    const candidato = generarDniCandidato();
    const ocupado = await existeDniEnUsuarios(db, candidato);
    if (!ocupado) {
      await updateDoc(ref, { dni: candidato });
      return candidato;
    }
  }

  let fallback = dniDeterministicoDesdeUid(userId);
  let intentos = 0;
  while ((await existeDniEnUsuarios(db, fallback)) && intentos < 20) {
    fallback = dniDeterministicoDesdeUid(`${userId}:${intentos}`);
    intentos += 1;
  }
  await updateDoc(ref, { dni: fallback });
  return fallback;
}
