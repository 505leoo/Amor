import { registerRootComponent } from 'expo';
import RNPushy from 'pushy-react-native';

import App from './App';

RNPushy.setNotificationListener(async (data) => {
  try {
    const Notifications = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title || '💕',
        body: data.message || '',
      },
      trigger: null,
    });
  } catch (e) {}
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
