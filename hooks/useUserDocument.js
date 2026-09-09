import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { cacheDocument, getCachedDocument, getProjectedDocument, isOfflineModeEnabled, subscribeCachedDocument } from '../utils/offlineSync';

// Un único listener por usuario para toda la app. El caché se conserva mientras
// la aplicación está abierta, incluso si una pantalla se desmonta y vuelve.
const stores = new Map();

const getStore = uid => {
  if (!stores.has(uid)) {
    stores.set(uid, { data: null, loaded: false, error: null, listeners: new Set(), unsubscribe: null, stopTimer: null });
  }
  return stores.get(uid);
};

const startStore = uid => {
  const store = getStore(uid);
  if (store.stopTimer) {
    clearTimeout(store.stopTimer);
    store.stopTimer = null;
  }
  if (store.unsubscribe) return store;
  // Hidratar primero desde AsyncStorage. El listener de Firestore puede tardar
  // o fallar por completo cuando la app se abre sin red.
  getCachedDocument(uid, ['usuarios', uid]).then(cached => {
    if (!cached) return;
    if (store.data && !isOfflineModeEnabled()) return;
    store.data = store.data ? { ...cached, ...store.data } : cached;
    store.loaded = true;
    store.error = null;
    store.listeners.forEach(listener => listener(store));
  }).catch(() => {});
  store.unsubscribe = onSnapshot(doc(db, 'usuarios', uid), snapshot => {
    const nextData = snapshot.data() || {};
    // Cuando no hay red, Firestore puede entregar un snapshot local vacío o
    // incompleto. En ese caso la caché propia es la fuente completa y no se
    // debe reemplazar por un objeto parcial que haga parecer que el usuario
    // perdió su animalito, monedas o inventario.
    const aplicarSnapshot = async () => {
      const cached = await getCachedDocument(uid, ['usuarios', uid]).catch(() => null);
      const baseData = isOfflineModeEnabled() && cached ? { ...cached, ...nextData } : nextData;
      return getProjectedDocument(uid, ['usuarios', uid], baseData);
    };
    // Un snapshot del servidor puede llegar después de una acción offline.
    // Reaplicamos la cola pendiente para que la UI no retroceda visualmente.
    aplicarSnapshot().then(projected => {
      store.data = projected;
      store.loaded = true;
      store.error = null;
      cacheDocument(uid, ['usuarios', uid], projected).catch(() => {});
      store.listeners.forEach(listener => listener(store));
    }).catch(() => {
      store.data = nextData;
      store.loaded = true;
      store.error = null;
      store.listeners.forEach(listener => listener(store));
    });
  }, error => {
    store.loaded = true;
    store.error = error;
    store.listeners.forEach(listener => listener(store));
  });
  store.cacheUnsubscribe = subscribeCachedDocument(uid, ['usuarios', uid], nextData => {
    if (!nextData) return;
    store.data = nextData;
    store.loaded = true;
    store.error = null;
    store.listeners.forEach(listener => listener(store));
  });
  return store;
};

const releaseStore = store => {
  if (!store?.unsubscribe || store.listeners.size > 0 || store.stopTimer) return;
  // Conservamos los datos para una reapertura rápida, pero cerramos listeners
  // de perfiles que ya no están visibles para no acumular conexiones.
  store.stopTimer = setTimeout(() => {
    store.stopTimer = null;
    if (store.listeners.size > 0 || !store.unsubscribe) return;
    store.unsubscribe();
    store.unsubscribe = null;
    store.cacheUnsubscribe?.();
    store.cacheUnsubscribe = null;
  }, 30000);
};

export const getCachedUserData = uid => {
  if (!uid) return null;
  return getStore(uid).data;
};

export const useUserDocument = (selector = data => data, uidOverride, isEqual = Object.is) => {
  const uid = uidOverride ?? auth.currentUser?.uid;
  const [state, setState] = useState(() => {
    const store = uid ? startStore(uid) : null;
    return { store, selected: selector(store?.data || null) };
  });

  useEffect(() => {
    if (!uid) {
      setState({ store: null, selected: selector(null) });
      return undefined;
    }
    const currentStore = startStore(uid);
    setState({ store: currentStore, selected: selector(currentStore.data || null) });
    const listener = nextStore => {
      const nextSelected = selector(nextStore.data || null);
      setState(previous => isEqual(previous.selected, nextSelected) ? previous : {
        store: nextStore,
        selected: nextSelected,
      });
    };
    currentStore.listeners.add(listener);
    return () => {
      currentStore.listeners.delete(listener);
      releaseStore(currentStore);
    };
  }, [uid]);

  return { data: state.selected, loaded: Boolean(state.store?.loaded), error: state.store?.error || null, uid };
};
