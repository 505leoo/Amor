import { registerRootComponent } from 'expo';
import RNPushy from 'pushy-react-native';

import App from './App';

RNPushy.setNotificationListener(async (data) => {
  try {
    // Este listener está registrado a nivel de entrada, por lo que Pushy
    // también puede ejecutarlo mediante Headless JS con la app cerrada.
    // Pushy.notify es el mecanismo oficial para publicar la notificación en
    // Android; no dependemos de que React haya montado la interfaz.
    const title = data?.title || '💕 Amor';
    const message = data?.message || data?.body || '';
    if (typeof RNPushy.notify === 'function') {
      RNPushy.notify(title, message, data || {});
    } else {
      console.warn('[Pushy] notify no está disponible en este build');
    }
  } catch (e) {
    console.error('[Pushy] No se pudo mostrar la notificación', e);
  }
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
