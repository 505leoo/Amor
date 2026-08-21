import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Un único listener por usuario para toda la app. El caché se conserva mientras
// la aplicación está abierta, incluso si una pantalla se desmonta y vuelve.
const stores = new Map();

const getStore = uid => {
  if (!stores.has(uid)) {
    stores.set(uid, { data: null, loaded: false, listeners: new Set(), unsubscribe: null });
  }
  return stores.get(uid);
};

const startStore = uid => {
  const store = getStore(uid);
  if (store.unsubscribe) return store;
  store.unsubscribe = onSnapshot(doc(db, 'usuarios', uid), snapshot => {
    const nextData = snapshot.data() || {};
    // Firestore puede emitir actualizaciones de metadatos sin cambios de datos.
    // Evitamos notificar a la interfaz en ese caso.
    const nextKey = JSON.stringify(nextData);
    if (store.snapshotKey === nextKey && store.loaded) return;
    store.snapshotKey = nextKey;
    store.data = nextData;
    store.loaded = true;
    store.listeners.forEach(listener => listener(store));
  }, () => {
    store.loaded = true;
    store.listeners.forEach(listener => listener(store));
  });
  return store;
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
    return () => currentStore.listeners.delete(listener);
  }, [uid]);

  return { data: state.selected, loaded: Boolean(state.store?.loaded), uid };
};
