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

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
