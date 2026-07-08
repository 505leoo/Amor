import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

class PushNotificationService {
  static async sendNewMissionNotification(userId) {
    try {
      // Obtener el token de Pushy del usuario desde Firestore
      const userRef = doc(db, 'usuarios', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        
        return false;
      }
      
      const userData = userDoc.data();
      const pushyToken = userData.pushyToken;
      
      if (!pushyToken) {
        
        return false;
      }
      
      // Enviar notificación usando la API de Pushy
      const response = await fetch('https://api.pushy.me/push?api_key=YOUR_API_KEY', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [pushyToken],
          data: {
            title: '¡Nueva Misión Disponible!',
            message: '¡Tienes una misión nueva disponible!',
            type: 'new_mission'
          },
          notification: {
            title: '¡Nueva Misión Disponible!',
            body: '¡Tienes una misión nueva disponible!',
            badge: 1
          }
        })
      });
      
      if (response.ok) {
        
        return true;
      } else {
        console.error('Error enviando notificación:', await response.text());
        return false;
      }
      
    } catch (error) {
      console.error('Error en sendNewMissionNotification:', error);
      return false;
    }
  }
}

export default PushNotificationService;
