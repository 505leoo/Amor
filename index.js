import { registerRootComponent } from 'expo';
import RNPushy from 'pushy-react-native';
import { Vibration } from 'react-native';

import App from './App';

RNPushy.setNotificationListener(async (data) => {
  try {
    const Notifications = require('expo-notifications');
    await Notifications.setNotificationChannelAsync('amor-notifications', {
      name: 'Notificaciones de Amor',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 220, 120, 280],
      lightColor: '#D9577F',
      sound: 'default',
    });
    if (data.vibrate !== false && data.vibrate !== 'false') Vibration.vibrate([0, 220, 120, 280]);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title || '💕',
        body: data.message || '',
        data,
        sound: 'default',
      },
      trigger: { channelId: 'amor-notifications' },
    });
  } catch (e) {}
});

// El token por sí solo no mantiene conectado al dispositivo. Pushy exige
// iniciar su servicio al cargar la aplicación; la bandera evita duplicarlo
// durante Fast Refresh. Una vez iniciado, Android puede conservarlo aunque
// la aplicación salga de la lista de recientes.
if (!global.__amorPushyListening) {
  global.__amorPushyListening = true;
  try {
    Promise.resolve(RNPushy.listen()).catch(() => {
      global.__amorPushyListening = false;
    });
  } catch (_) {
    global.__amorPushyListening = false;
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
