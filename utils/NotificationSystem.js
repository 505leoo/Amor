import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, functions } from '../firebaseConfig';

const BUZON_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const FCM_TOKEN_STORAGE_KEY = '@amor/fcm-device-token';
const ANDROID_CHANNEL_ID = 'amor-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Amor',
    description: 'Avisos de tu pareja y novedades importantes de Amor.',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 220, 140, 220],
    enableVibrate: true,
    lightColor: '#FF6B8A',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

const normalizeToken = value => {
  const token = typeof value === 'string' ? value.trim() : '';
  return token.length >= 20 ? token : null;
};

class NotificationSystem {
  constructor() {
    this.fcmToken = null;
    this._registrationPromise = null;
    this._notifListener = null;
    this._responseListener = null;
    this._tokenListener = null;
  }

  async _callFunction(name, payload) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'auth_not_ready' };
    const callable = httpsCallable(functions, name);
    try {
      await user.getIdToken();
      const response = await callable(payload);
      return response?.data ?? response;
    } catch (error) {
      const unauthenticated = error?.code === 'functions/unauthenticated';
      if (!unauthenticated || !auth.currentUser) throw error;
      await auth.currentUser.getIdToken(true);
      const response = await callable(payload);
      return response?.data ?? response;
    }
  }

  async _persistFcmToken(rawToken) {
    const token = normalizeToken(rawToken);
    if (!token) return null;

    this.fcmToken = token;
    await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token).catch(() => {});
    if (!auth.currentUser) return token;

    const result = await this._callFunction('registerFcmToken', {
      token,
      platform: Platform.OS,
    });
    if (result?.success === false) throw new Error(result.error || 'fcm_registration_failed');
    console.log('[FCM] Token registrado', {
      uid: auth.currentUser?.uid,
      tokenLength: token.length,
      tokenPreview: `${token.slice(0, 8)}…`,
    });
    return token;
  }

  async registerForPushNotifications() {
    if (Platform.OS !== 'android') {
      console.warn('[FCM] El registro directo está habilitado únicamente para Android');
      return null;
    }
    if (this._registrationPromise) return this._registrationPromise;

    this._registrationPromise = (async () => {
      try {
        await ensureAndroidNotificationChannel();
        const currentPermission = await Notifications.getPermissionsAsync();
        const permission = currentPermission.granted
          ? currentPermission
          : await Notifications.requestPermissionsAsync();
        if (!permission.granted) {
          console.warn('[FCM] Permiso de notificaciones no concedido', { status: permission.status });
          return null;
        }

        const deviceToken = await Notifications.getDevicePushTokenAsync();
        const token = await this._persistFcmToken(deviceToken?.data);
        if (!token) throw new Error('FCM no devolvió un token válido');
        this.setupNotificationListeners();
        return token;
      } catch (error) {
        console.error('[FCM] No se pudo registrar el dispositivo', error?.message || error);
        return null;
      } finally {
        this._registrationPromise = null;
      }
    })();
    return this._registrationPromise;
  }

  async clearDeviceTokenForUser(uid) {
    const token = normalizeToken(this.fcmToken)
      || normalizeToken(await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY).catch(() => null));
    try {
      if (uid && token && auth.currentUser?.uid === uid) {
        await this._callFunction('unregisterFcmToken', { token });
      }
    } catch (error) {
      console.warn('[FCM] No se pudo desvincular el token remoto', error?.message || error);
    } finally {
      this.fcmToken = null;
      await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY).catch(() => {});
    }
  }

  clearNotificationListeners() {
    this._notifListener?.remove?.();
    this._responseListener?.remove?.();
    this._tokenListener?.remove?.();
    this._notifListener = null;
    this._responseListener = null;
    this._tokenListener = null;
  }

  async notifyUserOffline() {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        await updateDoc(userDocRef, { isOnline: false, lastSeen: new Date() });
      }
    } catch (error) {
      console.error('Error notificando desconexión:', error);
    }
  }

  async sendFcmToPartner(title, body, data = {}) {
    try {
      return await this._callFunction('sendFcmNotification', { title, body, data });
    } catch (error) {
      console.error('[FCM] Error enviando la notificación', error?.message || error);
      return { success: false, error: error?.code || error?.message || 'fcm_send_failed' };
    }
  }

  _getSenderDisplayName(userData, forcedName) {
    if (!userData) return forcedName || 'Tu pareja';
    return forcedName || userData.datosCompletos?.nombre || userData.nombre || userData.displayName || 'Tu pareja';
  }

  async notifyPartnerUserEntered(userId, userName) {
    try {
      if (!userId || auth.currentUser?.uid !== userId) return;
      const userRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists() || auth.currentUser?.uid !== userId) return;
      const userData = userSnap.data();
      const partnerId = userData.pareja;
      if (!partnerId || partnerId === userId) return;

      const partnerRef = doc(db, 'usuarios', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      if (!partnerSnap.exists() || auth.currentUser?.uid !== userId) return;
      const partnerData = partnerSnap.data();
      const throttleMs = 2 * 60 * 1000;
      const lastNotif = partnerData.lastEntradaNotif;
      if (lastNotif) {
        const lastMs = lastNotif.toMillis ? lastNotif.toMillis() : Number(lastNotif);
        if (Date.now() - lastMs < throttleMs) return;
      }

      await setDoc(partnerRef, { lastEntradaNotif: serverTimestamp() }, { merge: true });
      if (auth.currentUser?.uid !== userId) return;

      await addDoc(collection(db, 'buzon'), {
        para: partnerId,
        tipo: 'pareja_conectada',
        creadoEn: serverTimestamp(),
        expiraEn: new Date(Date.now() + BUZON_RETENTION_MS),
        leido: false,
        de: userId,
        texto: `${userName || 'Tu pareja'} acaba de conectarse, que pesad@...`,
      });

      const hoy = (() => {
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      })();
      const flagKey = `pareja_entro_hoy_${partnerId}_${hoy}`;
      if (!global[flagKey]) {
        global[flagKey] = true;
        setDoc(doc(db, 'usuarios', partnerId, 'misiones', hoy), {
          progreso: { pareja_entro_hoy: 1 },
        }, { merge: true }).catch(() => {});
      }

      const pairKey = [String(userId), String(partnerId)].sort().join('_');
      await this.sendFcmToPartner(
        '💕 Tu amor está aquí',
        `${userName || 'Tu pareja'} acaba de conectarse, que pesad@...`,
        { type: 'user_pair_entered', userId, partnerId, collapseKey: `user_pair_entered_${pairKey}` },
      );
    } catch (error) {
      console.error('Error en notifyPartnerUserEntered:', error);
    }
  }

  async sendToPartner(fromUserId, title, body, data = {}) {
    try {
      const currentUser = auth.currentUser;
      const senderId = fromUserId || currentUser?.uid;
      if (!senderId || currentUser?.uid !== senderId) return null;
      const fromSnap = await getDoc(doc(db, 'usuarios', senderId));
      if (!fromSnap.exists() || !fromSnap.data().pareja) return null;
      const enriched = {
        ...data,
        fromUserId: senderId,
        fromName: this._getSenderDisplayName(fromSnap.data()),
      };
      return await this.sendFcmToPartner(title, body, enriched);
    } catch (error) {
      console.error('Error enviando notificación a la pareja:', error);
      return null;
    }
  }

  async notifyNewMoodToPartner(mood, note = '') {
    const user = auth.currentUser;
    if (!user) return;
    const shortNote = note ? `: "${note.substring(0, 120)}"` : '';
    return this.sendToPartner(
      user.uid,
      '💬 Nuevo estado emocional',
      `${user.displayName || user.email || 'Tu pareja'} acaba de compartir cómo se siente — ${mood}${shortNote}`,
      { type: 'new_mood', mood, moodNote: note },
    );
  }

  async notifyNewQuote(quoteText) {
    const user = auth.currentUser;
    if (!user) return;
    return this.sendToPartner(
      user.uid,
      '💌 Nueva frase de amor',
      `"${quoteText.substring(0, 50)}${quoteText.length > 50 ? '...' : ''}"`,
      { type: 'new_quote', userId: user.uid },
    );
  }

  async notifyNewPhoto(photoTitle) {
    const user = auth.currentUser;
    if (!user) return;
    return this.sendToPartner(
      user.uid,
      '📸 Nuevo recuerdo',
      `${user.displayName || 'Tu pareja'} agregó: "${photoTitle}"`,
      { type: 'new_photo', userId: user.uid },
    );
  }

  async notifyNewMood(mood, note = '') {
    const user = auth.currentUser;
    if (!user) return;
    const message = note
      ? `${user.displayName || 'Tu pareja'} se siente ${mood.toLowerCase()}: "${note}"`
      : `${user.displayName || 'Tu pareja'} se siente ${mood.toLowerCase()}`;
    return this.sendToPartner(
      user.uid,
      '💭 Nuevo estado emocional',
      message,
      { type: 'new_mood', userId: user.uid, mood },
    );
  }

  async notifyNewTestamento(titulo) {
    const user = auth.currentUser;
    if (!user) return;
    return this.sendToPartner(
      user.uid,
      '💕 Nuevo testamento de amor',
      `${user.displayName || 'Tu pareja'} escribió: "${titulo}"`,
      { type: 'new_testamento', userId: user.uid },
    );
  }

  setupNotificationListeners() {
    if (!this._notifListener) {
      this._notifListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('[FCM] Notificación recibida en primer plano', {
          id: notification?.request?.identifier,
          type: notification?.request?.content?.data?.type,
        });
      });
    }
    if (!this._responseListener) {
      this._responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('[FCM] Notificación abierta', {
          id: response?.notification?.request?.identifier,
          type: response?.notification?.request?.content?.data?.type,
        });
      });
    }
    if (!this._tokenListener) {
      this._tokenListener = Notifications.addPushTokenListener(deviceToken => {
        if (Platform.OS !== 'android') return;
        this._persistFcmToken(deviceToken?.data).catch(error => {
          console.error('[FCM] No se pudo actualizar el token renovado', error?.message || error);
        });
      });
    }
  }
}

export default new NotificationSystem();
