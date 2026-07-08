import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, getDoc, setDoc, runTransaction } from 'firebase/firestore';

// Configurar comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Configurar canal de notificaciones para Android
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('amor-notifications', {
    name: 'Amor Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B6B',
  });
}

class NotificationSystem {
  constructor() {
    this.expoPushToken = null;
  }

  // Registrar dispositivo para notificaciones
  async registerForPushNotifications() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        
        return null;
      }

      // Obtener token real de Pushy usando el módulo nativo
      const PushyService = require('./PushyService').default;
      const isRegistered = await PushyService.isRegistered();
      let token = null;

      if (!isRegistered) {
        token = await PushyService.register();
        this.expoPushToken = token;
        if (token) {
          console.log('Token de Pushy obtenido:', token.substring(0, 20) + '...');
        }
      }

      // Guardar token en Firebase si se generó uno nuevo
      const user = auth.currentUser;
      if (user && token) {
        try {
          const userDocRef = doc(db, 'usuarios', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            await updateDoc(userDocRef, {
              MyPushyToken: token,
              pushyToken: token,
              lastTokenUpdate: new Date()
            });
          } else {
            await setDoc(userDocRef, {
              uid: user.uid,
              MyPushyToken: token,
              pushyToken: token,
              lastTokenUpdate: new Date(),
              displayName: user.displayName || 'Usuario',
              email: user.email
            });
          }
        } catch (firebaseError) {
          console.error('Error guardando token de Pushy en Firestore:', firebaseError);
        }
      }

      return token;
    } catch (error) {
      console.error('Error registrando notificaciones:', error);
      return null;
    }
  }

  // Limpiar token de push del usuario al cerrar sesión (para que no reciba notificaciones de esa cuenta en este dispositivo)
  async clearPushTokenForUser(uid) {
    try {
      if (!uid) return;
      const userRef = doc(db, 'usuarios', uid);
      await setDoc(userRef, {
        pushyToken: null,
        MyPushyToken: null,
        lastTokenUpdate: new Date()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error limpiando token al cerrar sesión:', error);
    }
  }

  // Notificar conexión del usuario (throttled: máx 1 vez cada 10 min por usuario)
  async notifyUserOnline() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const now = Date.now();
      if (now - NotificationSystem._lastUserOnlineSent < NotificationSystem._MEMORY_THROTTLE_MS) {
        console.log('[NotificationSystem] user_online throttled en memoria (10 min)');
        return;
      }
      const allowed = await this._canSendLimitedNotificationMinutes(user.uid, 'broadcast', 'user_online', 10, 1);
      if (!allowed) {
        console.log('[NotificationSystem] user_online throttled en Firestore (10 min)');
        return;
      }
      NotificationSystem._lastUserOnlineSent = Date.now();

      // Obtener todos los usuarios excepto el actual
      const usersQuery = query(
        collection(db, 'usuarios'),
        where('uid', '!=', user.uid)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const offlineUsers = [];

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const preferred = this._getPreferredToken(userData);
        if (preferred.token && userData.isOnline !== true) {
          offlineUsers.push({
            token: preferred.token,
            name: userData.displayName || 'Tu pareja'
          });
        }
      });

      // Enviar notificaciones
      for (const offlineUser of offlineUsers) {
        await this.sendPushNotification(
          offlineUser.token,
          '💕 ¡Tu pareja se conectó!',
          `${user.displayName || 'Tu amor'} acaba de conectarse`,
          { type: 'user_online', userId: user.uid }
        );
      }

      // Actualizar estado online
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await updateDoc(userDocRef, {
          isOnline: true,
          lastSeen: new Date()
        });
      } else {
        // Crear documento si no existe
        await setDoc(userDocRef, {
          uid: user.uid,
          isOnline: true,
          lastSeen: new Date(),
          displayName: user.displayName || 'Usuario',
          email: user.email
        });
      }

    } catch (error) {
      console.error('Error notificando conexión:', error);
    }
  }

  // Notificar desconexión del usuario
  async notifyUserOffline() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await updateDoc(userDocRef, {
          isOnline: false,
          lastSeen: new Date()
        });
      }
    } catch (error) {
      console.error('Error notificando desconexión:', error);
    }
  }

  // Enviar notificación push usando PushyService
  async sendPushNotification(pushyToken, title, body, data = {}) {
    try {
      const PushyService = require('./PushyService').default;
      const result = await PushyService.sendCustomNotification([pushyToken], title, body, data);
      console.log('PushyService.sendCustomNotification result:', result);
      return result;
    } catch (error) {
      console.error('Error enviando notificación:', error);
      return { success: false, provider: 'pushy', error: error.message || error };
    }
  }

  // Helper: obtener token de Pushy del documento de usuario
  _getPreferredToken(userData) {
    if (!userData) return { token: null, provider: null };
    // Solo usar tokens de Pushy
    if (userData.MyPushyToken) return { token: userData.MyPushyToken, provider: 'pushy' };
    if (userData.pushyToken) return { token: userData.pushyToken, provider: 'pushy' };
    return { token: null, provider: null };
  }

  // Throttle en memoria como respaldo (evita doble envío en la misma sesión al recargar)
  static _lastEntradaSentByUser = {};
  static _lastUserOnlineSent = 0;
  static _MEMORY_THROTTLE_MS = 10 * 60 * 1000; // 10 min

  // --- Rate limiting con transacción atómica (evita condición de carrera al recargar) ---
  async _canSendLimitedNotificationMinutes(fromId, toId, type = 'generic', windowMinutes = 10, maxCount = 1) {
    try {
      const limitDocId = `${fromId}_${toId}_${type}`;
      const limitRef = doc(db, 'notification_limits', limitDocId);
      const now = new Date();
      const windowStartIso = now.toISOString();

      const allowed = await runTransaction(db, async (transaction) => {
        const limitSnap = await transaction.get(limitRef);
        if (!limitSnap.exists()) {
          transaction.set(limitRef, { windowStart: windowStartIso, count: 1 });
          return true;
        }
        const data = limitSnap.data();
        const windowStart = data.windowStart ? new Date(data.windowStart) : null;
        const count = data.count || 0;
        const elapsedMinutes = windowStart ? (now - windowStart) / (1000 * 60) : windowMinutes + 1;

        if (!windowStart || elapsedMinutes > windowMinutes) {
          transaction.set(limitRef, { windowStart: windowStartIso, count: 1 });
          return true;
        }
        if (count >= maxCount) return false;
        transaction.update(limitRef, { count: count + 1 });
        return true;
      });
      return allowed;
    } catch (error) {
      console.error('Error en limitador (minutos):', error);
      return false; // en error no enviar, para evitar spam
    }
  }

  // Usa colección 'notification_limits' para controlar envíos repetidos (ventana en horas)
  async _canSendLimitedNotification(fromId, toId, type = 'generic', windowHours = 24, maxCount = 1) {
    try {
      const limitDocId = `${fromId}_${toId}_${type}`;
      const limitRef = doc(db, 'notification_limits', limitDocId);
      const limitSnap = await getDoc(limitRef);
      const now = new Date();

      if (!limitSnap.exists()) {
        // Crear registro inicial
        await setDoc(limitRef, {
          windowStart: now.toISOString(),
          count: 1
        });
        return true;
      }

      const data = limitSnap.data();
      const windowStart = data.windowStart ? new Date(data.windowStart) : null;
      const count = data.count || 0;

      if (!windowStart || (now - windowStart) / (1000 * 60 * 60) > windowHours) {
        // Reiniciar ventana
        await updateDoc(limitRef, {
          windowStart: now.toISOString(),
          count: 1
        }).catch(async () => {
          await setDoc(limitRef, { windowStart: now.toISOString(), count: 1 });
        });
        return true;
      }

      if (count >= maxCount) return false;

      // Incrementar contador
      await updateDoc(limitRef, { count: count + 1 }).catch(async () => {
        await setDoc(limitRef, { windowStart: windowStart ? windowStart.toISOString() : now.toISOString(), count: count + 1 });
      });
      return true;
    } catch (error) {
      console.error('Error en limitador de notificaciones:', error);
      // En caso de error, permitir envío para evitar bloquear funcionalidad
      return true;
    }
  }

  // Notificar a la pareja que el usuario acaba de entrar (1 vez cada 10 min como mínimo)
  async notifyPartnerUserEntered(userId, userName) {
    try {
      // Respaldo en memoria: no enviar si ya enviamos en los últimos 10 min (misma sesión/recarga)
      const now = Date.now();
      const last = NotificationSystem._lastEntradaSentByUser[userId];
      if (last != null && (now - last) < NotificationSystem._MEMORY_THROTTLE_MS) {
        console.log('[NotificationSystem] Notificación "tu amor está aquí" throttled en memoria (10 min)');
        return;
      }

      const userRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      const partnerId = userData.pareja;
      if (!partnerId) return;

      const allowed = await this._canSendLimitedNotificationMinutes(userId, partnerId, 'user_entered', 10, 1);
      if (!allowed) {
        console.log('[NotificationSystem] Notificación "tu amor está aquí" throttled en Firestore (10 min)');
        return;
      }
      NotificationSystem._lastEntradaSentByUser[userId] = Date.now();

      const partnerRef = doc(db, 'usuarios', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      if (!partnerSnap.exists()) return;
      const partnerData = partnerSnap.data();
      const preferred = this._getPreferredToken(partnerData);
      if (!preferred.token) return;

      const displayName = userName || userData.datosCompletos?.nombre || userData.nombre || 'Tu pareja';
      const title = '💕 Tu amor está aquí';
      const body = `${displayName} acaba de entrar a la app ❤️`;

      await this.sendPushNotification(preferred.token, title, body, { type: 'user_entered', userId, partnerId });

      // Llamar cloud function userEntered si existe (lógica adicional en backend)
      try {
        await fetch('https://us-central1-amor-9df0d.cloudfunctions.net/userEntered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: displayName, partnerId })
        });
      } catch (_) {}
    } catch (error) {
      console.error('Error en notifyPartnerUserEntered:', error);
    }
  }

  // Enviar notificación al/ a la pareja del usuario (con limitador opcional)
  async sendToPartner(fromUserId, title, body, data = {}, options = { windowHours: 6, maxCount: 1, type: 'partner_alert' }) {
    try {
      if (!fromUserId) {
        const user = auth.currentUser;
        if (!user) return null;
        fromUserId = user.uid;
      }

      // Obtener doc del remitente para encontrar pareja
      const fromRef = doc(db, 'usuarios', fromUserId);
      const fromSnap = await getDoc(fromRef);
      if (!fromSnap.exists()) return null;
      const fromData = fromSnap.data();
      const parejaId = fromData.pareja;
      if (!parejaId) return null;

      // Verificar limitador
      const allowed = await this._canSendLimitedNotification(fromUserId, parejaId, options.type || 'partner_alert', options.windowHours || 6, options.maxCount || 1);
      if (!allowed) {
        
        return null;
      }

      const parejaRef = doc(db, 'usuarios', parejaId);
      const parejaSnap = await getDoc(parejaRef);
      if (!parejaSnap.exists()) return null;
      const parejaData = parejaSnap.data();
      const preferred = this._getPreferredToken(parejaData);
      if (!preferred.token) {
        
        return null;
      }

      // Enriquecer datos con remitente
      const enriched = { ...data, fromUserId, fromName: fromData.displayName || fromData.nombre || 'Tu pareja' };

      // Si el proveedor es pushy, sendPushNotification decidirá usar PushyService
      return await this.sendPushNotification(preferred.token, title, body, enriched);
    } catch (error) {
      console.error('Error enviando notificación a la pareja:', error);
      return null;
    }
  }

  // Notificar nuevo estado SOLO a la pareja, con limitador por defecto
  async notifyNewMoodToPartner(mood, note = '', options = { windowHours: 6, maxCount: 1 }) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const senderName = user.displayName || user.email || 'Tu pareja';
      const shortNote = note ? `: "${note.substring(0, 120)}"` : '';
      const title = '💬 Nuevo estado emocional';
      const body = `${senderName} acaba de compartir cómo se siente — ${mood}${shortNote}`;

      return await this.sendToPartner(user.uid, title, body, { type: 'new_mood', mood, moodNote: note }, { windowHours: options.windowHours || 6, maxCount: options.maxCount || 1, type: 'new_mood' });
    } catch (error) {
      console.error('Error en notifyNewMoodToPartner:', error);
    }
  }

  // Notificar nueva frase
  async notifyNewQuote(quoteText) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const usersQuery = query(
        collection(db, 'usuarios'),
        where('uid', '!=', user.uid)
      );
      
      const usersSnapshot = await getDocs(usersQuery);

      usersSnapshot.forEach(async (doc) => {
        const userData = doc.data();
        const preferred = this._getPreferredToken(userData);
        if (preferred.token) {
          await this.sendPushNotification(
            preferred.token,
            '💌 Nueva frase de amor',
            `"${quoteText.substring(0, 50)}${quoteText.length > 50 ? '...' : ''}"`,
            { type: 'new_quote', userId: user.uid }
          );
        }
      });
    } catch (error) {
      console.error('Error notificando nueva frase:', error);
    }
  }

  // Notificar nueva foto
  async notifyNewPhoto(photoTitle) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const usersQuery = query(
        collection(db, 'usuarios'),
        where('uid', '!=', user.uid)
      );
      
      const usersSnapshot = await getDocs(usersQuery);

      usersSnapshot.forEach(async (doc) => {
        const userData = doc.data();
        const preferred = this._getPreferredToken(userData);
        if (preferred.token) {
          await this.sendPushNotification(
            preferred.token,
            '📸 Nuevo recuerdo',
            `${user.displayName || 'Tu pareja'} agregó: "${photoTitle}"`,
            { type: 'new_photo', userId: user.uid }
          );
        }
      });
    } catch (error) {
      console.error('Error notificando nueva foto:', error);
    }
  }

  // Notificar nuevo estado de ánimo
  async notifyNewMood(mood, note = '') {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const usersQuery = query(collection(db, 'usuarios'));
      
      const usersSnapshot = await getDocs(usersQuery);
      

      // Usar Promise.all para enviar notificaciones en paralelo
      const notifications = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const docId = doc.id;
        const preferred = this._getPreferredToken(userData);
        

        // Solo enviar a usuarios que no sean el actual
        if (docId !== user.uid && preferred.token) {
          // Obtener el nombre del usuario actual (quien envía), no del que recibe
          const senderName = user.displayName || 'Tu pareja';
          const message = note ? `${senderName} se siente ${mood.toLowerCase()}: "${note}"` : `${senderName} se siente ${mood.toLowerCase()}`;
          
          console.log('Enviando notificación de estado a:', preferred.token.toString().substring(0, 20) + '...');
          
          notifications.push(
            this.sendPushNotification(
              preferred.token,
              '💭 Nuevo estado emocional',
              message,
              { type: 'new_mood', userId: user.uid, mood }
            )
          );
        }
      });
      
      if (notifications.length === 0) {
        
      } else {
        
        await Promise.all(notifications);
      }
    } catch (error) {
      console.error('Error notificando nuevo estado:', error);
    }
  }

  // Notificar nuevo testamento
  async notifyNewTestamento(titulo) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const usersQuery = query(
        collection(db, 'usuarios'),
        where('uid', '!=', user.uid)
      );
      
      const usersSnapshot = await getDocs(usersQuery);

      usersSnapshot.forEach(async (doc) => {
        const userData = doc.data();
        const preferred = this._getPreferredToken(userData);
        if (preferred.token) {
          await this.sendPushNotification(
            preferred.token,
            '💕 Nuevo testamento de amor',
            `${user.displayName || 'Tu pareja'} escribió: "${titulo}"`,
            { type: 'new_testamento', userId: user.uid }
          );
        }
      });
    } catch (error) {
      console.error('Error notificando nuevo testamento:', error);
    }
  }

  // Configurar listener de notificaciones
  setupNotificationListeners() {
    // El analizador de datos ya maneja los listeners
    // Solo agregamos logs adicionales aquí
    Notifications.addNotificationReceivedListener(notification => {
      
    });
  }
}

export default new NotificationSystem();
