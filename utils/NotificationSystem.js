import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Configurar comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
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
      console.log('[NotificationSystem] sendPushNotification start', { token: pushyToken && pushyToken.substring ? pushyToken.substring(0,10)+'...' : pushyToken, title, data });
      const PushyService = require('./PushyService').default;
      const res = await PushyService.sendCustomNotification([pushyToken], title, body, data);
      console.log('[NotificationSystem] sendPushNotification result', { token: pushyToken && pushyToken.substring ? pushyToken.substring(0,10)+'...' : pushyToken, result: res });
      return res;
    } catch (error) {
      console.error('[NotificationSystem] sendPushNotification error', error);
      return { success: false, provider: 'pushy', error: error.message || error };
    }
  }

  _getSenderDisplayName(userData, forcedName) {
    if (!userData) return forcedName || 'Tu pareja';
    return forcedName || userData.datosCompletos?.nombre || userData.nombre || userData.displayName || 'Tu pareja';
  }

  // Helper: obtener token de Pushy del documento de usuario
  _getPreferredToken(userData) {
    if (!userData) return { token: null, provider: null };
    // Solo usar tokens de Pushy
    if (userData.MyPushyToken) return { token: userData.MyPushyToken, provider: 'pushy' };
    if (userData.pushyToken) return { token: userData.pushyToken, provider: 'pushy' };
    return { token: null, provider: null };
  }

  // Notificar a la pareja que el usuario acaba de entrar (throttle de 5 min persistido en Firestore)
  async notifyPartnerUserEntered(userId, userName) {
    try {
      const userRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      const partnerId = userData.pareja;
      if (!partnerId || partnerId === userId) return;

      const partnerRef = doc(db, 'usuarios', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      if (!partnerSnap.exists()) return;
      const partnerData = partnerSnap.data();
      const preferred = this._getPreferredToken(partnerData);
      if (!preferred.token) return;

      // Throttle persistido: no enviar si ya se notificó en los últimos 5 minutos
      const THROTTLE_MS = 5 * 60 * 1000;
      const lastNotif = partnerData.lastEntradaNotif;
      if (lastNotif) {
        const lastMs = lastNotif.toMillis ? lastNotif.toMillis() : Number(lastNotif);
        if (Date.now() - lastMs < THROTTLE_MS) {
          console.log('[NotificationSystem] notifyPartnerUserEntered throttled, skipping');
          return;
        }
      }

      // Marcar timestamp ANTES de enviar para evitar race conditions
      await setDoc(partnerRef, { lastEntradaNotif: serverTimestamp() }, { merge: true });

      const title = '💕 Tu amor está aquí';
      const body = 'Tu amor acaba de entrar a la app ❤️';
      const pairKey = [String(userId), String(partnerId)].sort().join('_');
      const collapseKey = `user_pair_entered_${pairKey}`;
      await this.sendPushNotification(preferred.token, title, body, { type: 'user_pair_entered', userId, partnerId, collapseKey });

      try {
        await fetch('https://us-central1-amor-9df0d.cloudfunctions.net/userEntered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: 'Tu pareja', partnerId })
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

      const parejaRef = doc(db, 'usuarios', parejaId);
      const parejaSnap = await getDoc(parejaRef);
      if (!parejaSnap.exists()) return null;
      const parejaData = parejaSnap.data();
      const preferred = this._getPreferredToken(parejaData);
      if (!preferred.token) {
        
        return null;
      }

      // Enriquecer datos con remitente
      const enriched = { ...data, fromUserId, fromName: this._getSenderDisplayName(fromData) };

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

  async notifyNewQuote(quoteText) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await this.sendToPartner(user.uid,
        '\u{1F48C} Nueva frase de amor',
        `"${quoteText.substring(0, 50)}${quoteText.length > 50 ? '...' : ''}"`,
        { type: 'new_quote', userId: user.uid }
      );
    } catch (error) {
      console.error('Error notificando nueva frase:', error);
    }
  }

  async notifyNewPhoto(photoTitle) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await this.sendToPartner(user.uid,
        '\u{1F4F8} Nuevo recuerdo',
        `${user.displayName || 'Tu pareja'} agreg\u00f3: "${photoTitle}"`,
        { type: 'new_photo', userId: user.uid }
      );
    } catch (error) {
      console.error('Error notificando nueva foto:', error);
    }
  }

  async notifyNewMood(mood, note = '') {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
      if (!userSnap.exists()) return;
      const partnerId = userSnap.data().pareja;
      if (!partnerId || partnerId === user.uid) return;

      const partnerSnap = await getDoc(doc(db, 'usuarios', partnerId));
      if (!partnerSnap.exists()) return;
      const partnerData = partnerSnap.data();
      const preferred = this._getPreferredToken(partnerData);
      if (!preferred.token) return;

      const senderName = user.displayName || 'Tu pareja';
      const message = note
        ? `${senderName} se siente ${mood.toLowerCase()}: "${note}"`
        : `${senderName} se siente ${mood.toLowerCase()}`;

      await this.sendPushNotification(
        preferred.token,
        '\u{1F4AD} Nuevo estado emocional',
        message,
        { type: 'new_mood', userId: user.uid, mood }
      );
    } catch (error) {
      console.error('Error notificando nuevo estado:', error);
    }
  }

  async notifyNewTestamento(titulo) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await this.sendToPartner(user.uid,
        '\u{1F495} Nuevo testamento de amor',
        `${user.displayName || 'Tu pareja'} escribi\u00f3: "${titulo}"`,
        { type: 'new_testamento', userId: user.uid }
      );
    } catch (error) {
      console.error('Error notificando nuevo testamento:', error);
    }
  }

  // Configurar listener de notificaciones
  setupNotificationListeners() {
    if (this._notifListener) return;
    this._notifListener = Notifications.addNotificationReceivedListener(() => {});
  }
}

export default new NotificationSystem();
