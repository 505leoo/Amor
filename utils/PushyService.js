import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebaseConfig';
import RNPushy from 'pushy-react-native';

/** API del paquete oficial pushy-react-native (NativeModules.PushyModule). */
function getPushyApi() {
  if (RNPushy && typeof RNPushy.register === 'function') return RNPushy;
  const nm = NativeModules.PushyModule;
  if (nm) return nm;
  try {
    const turbo = TurboModuleRegistry?.get?.('PushyModule');
    if (turbo) return turbo;
  } catch (_) {}
  return null;
}

const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const DEDUPE_CLEAN_AFTER_MS = 60 * 60 * 1000; // limpiar entradas antiguas cada 1 h

class PushyService {
  static notificationQueue = [];
  static MAX_NOTIFICATIONS = 2;
  static QUEUE_CLEANUP_MS = 15 * 1000; // mantener entradas pendientes 15 s
  static RECENT_SEND_WINDOW_MS = 15 * 1000; // 15 segundos
  /** Evitar enviar la misma notificación (title+body) más de una vez cada 10 min */
  static _lastSentByKey = {};
  static _recentSends = [];

  static _dedupeKey(title, body) {
    return `${String(title)}|${String(body)}`;
  }

  static _canSendDedupe(title, body) {
    const key = this._dedupeKey(title, body);
    const now = Date.now();
    const last = this._lastSentByKey[key];
    if (last != null && (now - last) < DEDUPE_WINDOW_MS) return false;
    return true;
  }

  static _markSent(title, body) {
    const key = this._dedupeKey(title, body);
    this._lastSentByKey[key] = Date.now();
    Object.keys(this._lastSentByKey).forEach(k => {
      if (Date.now() - this._lastSentByKey[k] > DEDUPE_CLEAN_AFTER_MS) delete this._lastSentByKey[k];
    });
  }

  static _cleanupQueue() {
    const now = Date.now();
    this.notificationQueue = this.notificationQueue.filter(entry => (now - entry.timestamp) < this.QUEUE_CLEANUP_MS);
    this._recentSends = this._recentSends.filter(entry => (now - entry.timestamp) < this.RECENT_SEND_WINDOW_MS);
  }

  static _removeQueueEntry(token, collapseKey) {
    this.notificationQueue = this.notificationQueue.filter(entry => {
      if (entry.token !== token) return true;
      if (collapseKey && entry.collapseKey === collapseKey) return false;
      if (!collapseKey && !entry.collapseKey) return false;
      return true;
    });
  }

  static _addRecentSend(token, collapseKey) {
    this._recentSends.push({ token, collapseKey, timestamp: Date.now() });
  }

  static _isRecentSend(token, collapseKey) {
    return this._recentSends.some(entry => entry.token === token && entry.collapseKey === collapseKey);
  }

  static _canQueueNotification(token, collapseKey) {
    this._cleanupQueue();
    const tokenQueue = this.notificationQueue.filter(entry => entry.token === token);
    if (tokenQueue.length < this.MAX_NOTIFICATIONS) return true;
    if (collapseKey) {
      return tokenQueue.some(entry => entry.collapseKey === collapseKey);
    }
    return false;
  }

  static manageNotificationQueue(token, title, body, collapseKey) {
    if (!token) return false;
    this._cleanupQueue();
    const existingIndex = this.notificationQueue.findIndex(entry => entry.token === token && entry.collapseKey && collapseKey && entry.collapseKey === collapseKey);
    if (existingIndex !== -1) {
      this.notificationQueue[existingIndex].timestamp = Date.now();
      this.notificationQueue[existingIndex].title = title;
      this.notificationQueue[existingIndex].body = body;
      return 'merged';
    }

    if (collapseKey && this._isRecentSend(token, collapseKey)) {
      return 'skipped_recently';
    }

    // Aggressive replacement: if token already has MAX_PENDING entries, replace the oldest
    const tokenQueue = this.notificationQueue.filter(entry => entry.token === token);
    if (tokenQueue.length >= this.MAX_NOTIFICATIONS) {
      // try to replace an entry that doesn't have the same collapseKey
      let replaceIndex = -1;
      let oldestTs = Infinity;
      for (let i = 0; i < this.notificationQueue.length; i++) {
        const e = this.notificationQueue[i];
        if (e.token !== token) continue;
        // prefer replacing entries with different collapseKey
        if (collapseKey && (!e.collapseKey || e.collapseKey !== collapseKey)) {
          if (e.timestamp < oldestTs) {
            oldestTs = e.timestamp;
            replaceIndex = i;
          }
        }
      }
      // if not found, just replace the absolute oldest for this token
      if (replaceIndex === -1) {
        for (let i = 0; i < this.notificationQueue.length; i++) {
          const e = this.notificationQueue[i];
          if (e.token !== token) continue;
          if (e.timestamp < oldestTs) {
            oldestTs = e.timestamp;
            replaceIndex = i;
          }
        }
      }

      if (replaceIndex !== -1) {
        this.notificationQueue[replaceIndex] = { token, title, body, collapseKey, timestamp: Date.now() };
        this._addRecentSend(token, collapseKey);
        return 'replaced';
      }
      return false;
    }

    this.notificationQueue.push({ token, title, body, collapseKey, timestamp: Date.now() });
    this._addRecentSend(token, collapseKey);
    return 'queued';
  }

  static async register() {
    if (Platform.OS !== 'android') {
      return null;
    }

    const pushy = getPushyApi();
    if (!pushy) {
      return null;
    }

    try {
      const token = await pushy.register();
      return token;
    } catch (error) {
      console.error('Error registrando con Pushy:', error);
      return null;
    }
  }

  static async isRegistered() {
    const pushy = getPushyApi();
    if (Platform.OS !== 'android' || !pushy || typeof pushy.isRegistered !== 'function') {
      return false;
    }

    try {
      return await pushy.isRegistered();
    } catch (error) {
      console.error('Error verificando registro de Pushy:', error);
      return false;
    }
  }

static async sendCustomNotification(tokens, title, body, data = {}, imageUrl = null, sound = true) {
    try {
      // Las callable functions exigen un ID token. Durante el inicio/cierre de
      // sesión puede dispararse una notificación antes de que Auth lo restaure.
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, sent: 0, error: 'auth_not_ready' };
      }
      try {
        await currentUser.getIdToken();
      } catch (_) {
        return { success: false, sent: 0, error: 'auth_token_unavailable' };
      }

      if (!this._canSendDedupe(title, body)) {
        return { success: true, sent: 0, dedupe: true };
      }

      const collapseKey = data && data.collapseKey ? data.collapseKey : undefined;
      const queueResults = tokens.map(token => ({ token, status: this.manageNotificationQueue(token, title, body, collapseKey) }));
      if (queueResults.some(r => r.status === false)) {
        return { success: false, sent: 0, error: 'queue_limit_reached' };
      }
      const tokensToSend = queueResults.filter(r => r.status === 'queued' || r.status === 'replaced' || r.status === 'merged').map(r => r.token);
      if (tokensToSend.length === 0) {
        return { success: true, sent: 0, dedupe: true };
      }

      if (!tokensToSend || tokensToSend.length === 0) {
        return { success: true, sent: 0 };
      }

      const sendNotification = httpsCallable(functions, 'sendPushyNotification');
      const payloadData = { ...data, title, message: body };

      const enviarConSesionRenovada = async token => {
        try {
          return await sendNotification({ token, title, body, data: payloadData, collapseKey });
        } catch (error) {
          const sinSesion = error?.code === 'functions/unauthenticated' || error?.message?.includes('Authentication is required');
          if (!sinSesion || !auth.currentUser) throw error;
          // Un único reintento evita fallos transitorios al refrescar el token,
          // sin convertir una sesión cerrada en un bucle de solicitudes.
          await auth.currentUser.getIdToken(true);
          return sendNotification({ token, title, body, data: payloadData, collapseKey });
        }
      };

      const results = await Promise.allSettled(
        tokensToSend.map(token => enviarConSesionRenovada(token).then(res => {
          return res;
        }).catch(err => {
          this._removeQueueEntry(token, collapseKey);
          const sinSesion = err?.code === 'functions/unauthenticated' || err?.message?.includes('Authentication is required');
          if (!sinSesion) console.error('[PUSHY] sendPushyNotification error for token:', token, err);
          return { error: err.message || err, token };
        }))
      );
      
      const successfulResults = results.map((r, i) => ({ result: r, token: tokensToSend[i] }));
      const successful = successfulResults.filter(r => r.result && r.result.status === 'fulfilled' && r.result.value && !r.result.value.error).length;
      const errors = results
        .filter(r => r.status === 'rejected' || (r.value && r.value.error))
        .map(r => r.status === 'rejected' ? r.reason : r.value.error);
      // For each successful send, remove the pending queue entry and mark sent
      successfulResults.forEach(r => {
        try {
          if (r.result && r.result.status === 'fulfilled' && r.result.value && !r.result.value.error) {
            this._removeQueueEntry(r.token, collapseKey);
            this._addRecentSend(r.token, collapseKey);
          }
        } catch (_) {}
      });

      if (successful > 0) this._markSent(title, body);
      
      return { success: successful > 0, sent: successful, errors };
    } catch (error) {
      // Silenciar errores de API key inválida
      if (error.message && !error.message.includes('INVALID_API_KEY')) {
        console.error('[PUSHY] Error enviando notificaciones:', error.message);
      }
      return { success: true, method: 'fallback' };
    }
  }

  static async broadcastToAllExcept(db, excludeUid, title, body, batchSize = 100) {
    try {
      const { collection, getDocs } = require('firebase/firestore');
      const usuariosRef = collection(db, 'usuarios');
      const usersSnapshot = await getDocs(usuariosRef);

      const tokens = [];
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (doc.id === excludeUid) return;
        const email = (data.email || data.correo || '').toString().trim().toLowerCase();
        if (email === 'admin@gmail.com') return;
        const t = data.MyPushyToken || data.pushyToken;
        if (t) tokens.push(t);
      });

      if (tokens.length > 0) {
        await this.sendCustomNotification(tokens, title, body);
      }

      return { sent: tokens.length };
    } catch (error) {
      console.error('Error in broadcastToAllExcept:', error);
      return { error: error.message };
    }
  }
}

export default PushyService;
