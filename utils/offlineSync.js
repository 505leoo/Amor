import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  arrayRemove,
  arrayUnion,
  deleteField,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebaseConfig';

const VERSION = 'v1';
const QUEUE_PREFIX = `@amor/offline-sync/${VERSION}/queue/`;
const CACHE_PREFIX = `@amor/offline-sync/${VERSION}/cache/`;
const MODE_KEY = `@amor/offline-sync/${VERSION}/mode`;
const STATUS_PREFIX = `@amor/offline-sync/${VERSION}/status/`;
const DEAD_LETTER_PREFIX = `@amor/offline-sync/${VERSION}/dead-letter/`;
const MAX_RETRIES_BEFORE_ATTENTION = 8;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

let online = true;
let modeEnabled = false;
let netInfoUnsubscribe = null;
let statusLoaded = false;
const statusByUid = new Map();
const statusListeners = new Set();
const cacheListeners = new Map();
const flushLocks = new Map();
const enqueueLocks = new Map();
const retryTimers = new Map();

const uidFor = uid => uid || auth.currentUser?.uid || null;
const pathFor = reference => {
  if (Array.isArray(reference)) return reference;
  if (typeof reference === 'string') return reference.split('/').filter(Boolean);
  return String(reference?.path || '').split('/').filter(Boolean);
};
const pathKey = path => pathFor(path).join('/');
const queueKey = uid => `${QUEUE_PREFIX}${uid}`;
const cacheKey = (uid, path) => `${CACHE_PREFIX}${uid}/${pathKey(path)}`;
const statusKey = uid => `${STATUS_PREFIX}${uid}`;
const deadLetterKey = uid => `${DEAD_LETTER_PREFIX}${uid}`;
const isOffline = () => modeEnabled || !online;
const estadoTieneInternet = state => state?.isConnected !== false && state?.isInternetReachable !== false;

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const isSentinel = value => value && typeof value === 'object' && typeof value._methodName === 'string';

// Firestore FieldValue objects are not JSON serializable. We preserve their
// intent and rebuild them only when the pending operation is replayed.
const encodeValue = value => {
  if (value instanceof Date) return { __offlineDate: value.toISOString() };
  if (isSentinel(value)) {
    const method = value._methodName;
    if (method === 'serverTimestamp') return { __offlineFieldValue: 'serverTimestamp' };
    if (method === 'increment') return { __offlineFieldValue: 'increment', value: value._operand };
    if (method === 'arrayUnion') return { __offlineFieldValue: 'arrayUnion', value: (value._elements || []).map(encodeValue) };
    if (method === 'arrayRemove') return { __offlineFieldValue: 'arrayRemove', value: (value._elements || []).map(encodeValue) };
    if (method === 'deleteField') return { __offlineFieldValue: 'deleteField' };
  }
  if (value instanceof Timestamp || (value && value.constructor?.name === 'Timestamp' && typeof value.toMillis === 'function')) {
    return { __offlineTimestamp: { seconds: Number(value.seconds) || 0, nanoseconds: Number(value.nanoseconds) || 0 } };
  }
  if (Array.isArray(value)) return value.map(encodeValue);
  if (value && typeof value === 'object') {
    if (value.__offlineDate) return new Date(value.__offlineDate);
    if (value.__offlineTimestamp) return new Timestamp(Number(value.__offlineTimestamp.seconds) || 0, Number(value.__offlineTimestamp.nanoseconds) || 0);
    return Object.entries(value).reduce((result, [key, child]) => {
      if (child !== undefined) result[key] = encodeValue(child);
      return result;
    }, {});
  }
  return value;
};

const decodeValue = value => {
  if (Array.isArray(value)) return value.map(decodeValue);
  if (value && typeof value === 'object') {
    if (value.__offlineFieldValue === 'serverTimestamp') return serverTimestamp();
    if (value.__offlineFieldValue === 'increment') return increment(Number(value.value) || 0);
    if (value.__offlineFieldValue === 'arrayUnion') return arrayUnion(...(value.value || []).map(decodeValue));
    if (value.__offlineFieldValue === 'arrayRemove') return arrayRemove(...(value.value || []).map(decodeValue));
    if (value.__offlineFieldValue === 'deleteField') return deleteField();
    return Object.entries(value).reduce((result, [key, child]) => {
      result[key] = decodeValue(child);
      return result;
    }, {});
  }
  return value;
};

const notifyStatus = uid => {
  const current = getSyncStatus(uid);
  statusListeners.forEach(listener => listener(current));
};

const notifyCache = (uid, path, data) => {
  const key = `${uid}/${pathKey(path)}`;
  cacheListeners.get(key)?.forEach(listener => listener(data));
};

const readJson = async key => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const writeJson = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[OfflineSync] No se pudo guardar el estado local', error?.message || error);
  }
};

export const cacheDocument = async (uid, path, data) => {
  const currentUid = uidFor(uid);
  if (!currentUid || !path) return;
  const encoded = encodeValue(data || {});
  await writeJson(cacheKey(currentUid, path), encoded);
  notifyCache(currentUid, path, data || {});
};

export const getCachedDocument = async (uid, path) => {
  const currentUid = uidFor(uid);
  if (!currentUid || !path) return null;
  const data = await readJson(cacheKey(currentUid, path));
  return data ? decodeValue(data) : null;
};

export const subscribeCachedDocument = (uid, path, listener) => {
  const currentUid = uidFor(uid);
  if (!currentUid || !path || typeof listener !== 'function') return () => {};
  const key = `${currentUid}/${pathKey(path)}`;
  if (!cacheListeners.has(key)) cacheListeners.set(key, new Set());
  cacheListeners.get(key).add(listener);
  return () => {
    const listeners = cacheListeners.get(key);
    listeners?.delete(listener);
    if (listeners?.size === 0) cacheListeners.delete(key);
  };
};

const isNetworkError = error => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return !code || code.includes('unavailable') || code.includes('deadline') || code.includes('network')
    || code.includes('functions/internal') || code.includes('functions/unknown') || code.includes('functions/cancelled')
    || code === 'internal' || code === 'unknown' || code === 'cancelled'
    || code.includes('failed-precondition') || message.includes('network') || message.includes('offline')
    || message.includes('timeout') || message.includes('client is offline');
};

const getQueue = async uid => (await readJson(queueKey(uid))) || [];
const saveQueue = async (uid, queue) => writeJson(queueKey(uid), queue);

const projectOperation = (existing, operation) => {
  const data = decodeValue(operation.data || {});
  let next = operation.kind === 'delete' ? null : { ...(operation.merge === false ? {} : existing), ...data };
  if (operation.kind === 'update' || operation.kind === 'set') {
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === 'object' && value._methodName === 'increment') {
        next[key] = (Number(existing[key]) || 0) + (Number(value._operand) || 0);
      } else if (value && typeof value === 'object' && value._methodName === 'arrayUnion') {
        next[key] = [...new Set([...(Array.isArray(existing[key]) ? existing[key] : []), ...(value._elements || [])])];
      } else if (value && typeof value === 'object' && value._methodName === 'arrayRemove') {
        next[key] = (Array.isArray(existing[key]) ? existing[key] : []).filter(item => !(value._elements || []).includes(item));
      } else if (value && typeof value === 'object' && value._methodName === 'deleteField') {
        delete next[key];
      }
    });
  }
  return next;
};

export const getProjectedDocument = async (uid, path, serverData = {}) => {
  const currentUid = uidFor(uid);
  if (!currentUid) return serverData || {};
  const queue = await getQueue(currentUid);
  return queue
    .filter(operation => pathKey(operation.path) === pathKey(path))
    .reduce((data, operation) => projectOperation(data || {}, operation), serverData || {});
};

const applyLocalOperation = async operation => {
  const existing = (await getCachedDocument(operation.uid, operation.path)) || {};
  const next = projectOperation(existing, operation);
  await cacheDocument(operation.uid, operation.path, next || {});
};

const enqueue = async operation => {
  if (enqueueLocks.has(operation.uid)) await enqueueLocks.get(operation.uid);
  const promise = (async () => {
    const queue = await getQueue(operation.uid);
    // set/update operations are idempotent and stay ordered. Keeping every
    // intent is safer than merging fields and accidentally losing a change.
    queue.push({ ...operation, createdAt: Date.now(), attempts: 0, nextAttemptAt: 0 });
    await saveQueue(operation.uid, queue);
    if (operation.kind !== 'callable') await applyLocalOperation(operation);
    await updateStatus(operation.uid, { pending: queue.length });
    return { pending: true, operationId: operation.id };
  })().finally(() => enqueueLocks.delete(operation.uid));
  enqueueLocks.set(operation.uid, promise);
  return promise;
};

const execute = async operation => {
  if (operation.kind === 'callable') {
    const callable = httpsCallable(functions, operation.name);
    try {
      // Mantiene el mismo comportamiento que los envíos directos: Firebase
      // puede necesitar renovar el token antes de aceptar una callable.
      await auth.currentUser?.getIdToken();
      return callable(decodeValue(operation.data || {}));
    } catch (error) {
      const unauthenticated = error?.code === 'functions/unauthenticated';
      if (!unauthenticated || !auth.currentUser) throw error;
      await auth.currentUser.getIdToken(true);
      return callable(decodeValue(operation.data || {}));
    }
  }
  const reference = doc(db, ...operation.path);
  if (operation.kind === 'delete') return deleteDoc(reference);
  const data = decodeValue(operation.data || {});
  if (operation.kind === 'update') return updateDoc(reference, data);
  return setDoc(reference, data, { merge: operation.merge !== false });
};

const operationFrom = (kind, reference, data, options = {}) => {
  const uid = uidFor(options.uid);
  const path = pathFor(reference);
  if (!uid || !path.length) throw new Error('No hay una sesión para guardar este cambio.');
  return { id: options.operationId || makeId(), uid, kind, path, data: encodeValue(data || {}), merge: options.merge !== false };
};

const write = async (kind, reference, data, options = {}) => {
  const operation = operationFrom(kind, reference, data, options);
  if (!isOffline()) {
    try {
      await execute(operation);
      // Las escrituras parciales deben conservar el resto del documento local.
      // Esto permite que el perfil siga completo aunque Firestore entregue un
      // update pequeño como { notificaciones: false }.
      await applyLocalOperation(operation);
      await updateStatus(operation.uid, { pending: (await getQueue(operation.uid)).length, lastSyncAt: Date.now(), lastError: null });
      return { pending: false, operationId: operation.id };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }
  return enqueue(operation);
};

export const syncSetDoc = (reference, data, options = {}) => write('set', reference, data, options);
export const syncUpdateDoc = (reference, data, options = {}) => write('update', reference, data, options);
export const syncDeleteDoc = (reference, options = {}) => write('delete', reference, {}, options);

// addDoc también puede ser offline: el ID se genera localmente una sola vez,
// queda guardado en la cola y es el mismo ID que se usa al reintentar.
export const syncAddDoc = async (collectionReference, data, options = {}) => {
  const reference = doc(collectionReference);
  const result = await write('set', reference, data, { ...options, merge: false });
  return { id: reference.id, path: reference.path, pending: result.pending };
};

export const syncCallable = async (name, data = {}, options = {}) => {
  const uid = uidFor(options.uid);
  if (!uid) throw new Error('No hay una sesión para guardar este cambio.');
  const operation = { id: options.operationId || makeId(), uid, kind: 'callable', name, data: encodeValue(data), createdAt: Date.now(), attempts: 0, nextAttemptAt: 0 };
  if (!isOffline()) {
    try {
      const response = await execute(operation);
      await updateStatus(uid, { pending: (await getQueue(uid)).length, lastSyncAt: Date.now(), lastError: null });
      return response;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }
  return enqueue(operation);
};

export const getSyncStatus = uid => {
  const currentUid = uidFor(uid);
  const status = currentUid ? statusByUid.get(currentUid) : null;
  return {
    online,
    modeEnabled: modeEnabled || !online,
    pending: Number(status?.pending) || 0,
    failed: Number(status?.failed) || 0,
    lastSyncAt: status?.lastSyncAt || null,
    lastError: status?.lastError || null,
    syncing: Boolean(status?.syncing),
  };
};

const updateStatus = async (uid, patch) => {
  if (!uid) return;
  const next = { ...(statusByUid.get(uid) || {}), ...patch };
  statusByUid.set(uid, next);
  await writeJson(statusKey(uid), next);
  notifyStatus(uid);
};

export const subscribeSyncStatus = listener => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

export const useOfflineSyncStatus = uid => {
  const [status, setStatus] = useState(() => getSyncStatus(uid));
  useEffect(() => {
    let active = true;
    const refresh = next => { if (active) setStatus(next || getSyncStatus(uid)); };
    const unsubscribe = subscribeSyncStatus(refresh);
    loadOfflineState(uid).then(() => refresh()).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, [uid]);
  return status;
};

export const loadOfflineState = async uid => {
  // El modo no se activa manualmente: representa únicamente el estado real
  // de la red. Limpiamos el valor antiguo de versiones anteriores.
  modeEnabled = false;
  await AsyncStorage.removeItem(MODE_KEY).catch(() => {});
  await NetInfo.fetch()
    .then(state => { online = estadoTieneInternet(state); })
    .catch(() => { online = false; });
  const currentUid = uidFor(uid);
  if (currentUid) {
    const savedStatus = await readJson(statusKey(currentUid));
    if (savedStatus) statusByUid.set(currentUid, savedStatus);
    const queue = await getQueue(currentUid);
    await updateStatus(currentUid, { pending: queue.length });
  }
  statusLoaded = true;
  notifyStatus(currentUid);
  return { modeEnabled, online, statusLoaded };
};

// Compatibilidad con instalaciones anteriores. El modo actual es automático.
export const setOfflineModeEnabled = async () => {
  modeEnabled = false;
  await AsyncStorage.removeItem(MODE_KEY).catch(() => {});
  notifyStatus(auth.currentUser?.uid);
  return false;
};

export const isOfflineModeEnabled = () => modeEnabled || !online;

export const flushPendingWrites = async uid => {
  const currentUid = uidFor(uid);
  if (!currentUid || isOffline()) return { pending: 0, synced: 0 };
  if (flushLocks.has(currentUid)) return flushLocks.get(currentUid);
  const promise = (async () => {
    if (enqueueLocks.has(currentUid)) await enqueueLocks.get(currentUid);
    let queue = await getQueue(currentUid);
    let synced = 0;
    await updateStatus(currentUid, { pending: queue.length, syncing: queue.length > 0 });
    while (queue.length && online && !modeEnabled) {
      const operation = queue[0];
      if (operation.nextAttemptAt && operation.nextAttemptAt > Date.now()) break;
      try {
        await execute(operation);
        queue.shift();
        synced += 1;
        await saveQueue(currentUid, queue);
        await updateStatus(currentUid, { pending: queue.length, failed: 0, lastSyncAt: Date.now(), lastError: null });
      } catch (error) {
        const attempts = (Number(operation.attempts) || 0) + 1;
        if (!isNetworkError(error) && attempts >= MAX_RETRIES_BEFORE_ATTENTION) {
          queue.shift();
          const deadLetters = (await readJson(deadLetterKey(currentUid))) || [];
          deadLetters.push({ ...operation, attempts, lastError: error?.message || 'Cambio rechazado por Firestore', failedAt: Date.now() });
          await writeJson(deadLetterKey(currentUid), deadLetters.slice(-50));
          await saveQueue(currentUid, queue);
          await updateStatus(currentUid, { pending: queue.length, failed: (getSyncStatus(currentUid).failed || 0) + 1, lastError: error?.message || 'Cambio rechazado por Firestore' });
          continue;
        }
        operation.attempts = attempts;
        const retryDelay = Math.min(MAX_BACKOFF_MS, 2000 * (2 ** Math.min(attempts - 1, 8)));
        operation.nextAttemptAt = Date.now() + retryDelay;
        operation.lastError = error?.message || 'No se pudo sincronizar';
        queue[0] = operation;
        await saveQueue(currentUid, queue);
        await updateStatus(currentUid, { pending: queue.length, syncing: false, lastError: operation.lastError });
        if (online && !modeEnabled) {
          clearTimeout(retryTimers.get(currentUid));
          retryTimers.set(currentUid, setTimeout(() => {
            retryTimers.delete(currentUid);
            flushPendingWrites(currentUid).catch(() => {});
          }, retryDelay));
        }
        break;
      }
    }
    await updateStatus(currentUid, { pending: queue.length, syncing: false });
    return { pending: queue.length, synced };
  })().finally(() => flushLocks.delete(currentUid));
  flushLocks.set(currentUid, promise);
  return promise;
};

export const startOfflineSync = uid => {
  if (!netInfoUnsubscribe) {
    netInfoUnsubscribe = NetInfo.addEventListener(state => {
      online = estadoTieneInternet(state);
      const currentUid = auth.currentUser?.uid;
      notifyStatus(currentUid);
      if (online && currentUid && !modeEnabled) flushPendingWrites(currentUid).catch(() => {});
    });
  }
  loadOfflineState(uid).then(() => {
    if (online && !modeEnabled) flushPendingWrites(uid).catch(() => {});
  }).catch(() => {});
  return () => {
    if (netInfoUnsubscribe) {
      netInfoUnsubscribe();
      netInfoUnsubscribe = null;
    }
  };
};
