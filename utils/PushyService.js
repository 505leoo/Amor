import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
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
  /** Evitar enviar la misma notificación (title+body) más de una vez cada 10 min */
  static _lastSentByKey = {};

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

  static manageNotificationQueue(title, body) {
    const notification = { title, body, timestamp: Date.now() };
    
    // Si ya hay 2 notificaciones, eliminar la más antigua
    if (this.notificationQueue.length >= this.MAX_NOTIFICATIONS) {
      this.notificationQueue.shift();
    }
    
    this.notificationQueue.push(notification);
    
  }

  static async sendCustomNotification(tokens, title, body, imageUrl = null, sound = true) {
    try {
      if (!this._canSendDedupe(title, body)) {
        console.log('[PUSHY] Notificación duplicada omitida (mismo title+body en 10 min)');
        return { success: true, sent: 0, dedupe: true };
      }

      this.manageNotificationQueue(title, body);

      if (!tokens || tokens.length === 0) {
        
        return { success: true, sent: 0 };
      }

      
      
      const sendNotification = httpsCallable(functions, 'sendPushyNotification');
      
      const results = await Promise.allSettled(
        tokens.map(token => sendNotification({ token, title, body }).then(res => {
          return res;
        }).catch(err => {
          console.error('[PUSHY] sendPushyNotification error for token:', token, err);
          return { error: err.message || err, token };
        }))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value && !r.value.error).length;
      const errors = results
        .filter(r => r.status === 'rejected' || (r.value && r.value.error))
        .map(r => r.status === 'rejected' ? r.reason : r.value.error);

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
