import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FirebaseService {
  // Guardar datos con sincronización Firebase + AsyncStorage
  static async saveData(collection, docId, data, useCache = true) {
    try {
      // Guardar en Firebase
      await firestore().collection(collection).doc(docId).set(data, { merge: true });
      
      // Guardar en cache local si se requiere
      if (useCache) {
        const cacheKey = `${collection}_${docId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving data:', error);
      return { success: false, error: error.message };
    }
  }

  // Cargar datos con fallback a cache local
  static async loadData(collection, docId, useCache = true) {
    try {
      // Intentar cargar desde Firebase
      const doc = await firestore().collection(collection).doc(docId).get();
      
      if (doc.exists) {
        const data = doc.data();
        
        // Actualizar cache local
        if (useCache) {
          const cacheKey = `${collection}_${docId}`;
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        }
        
        return data;
      }
      
      // Si no existe en Firebase, intentar cargar desde cache
      if (useCache) {
        const cacheKey = `${collection}_${docId}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Fallback a cache local en caso de error
      if (useCache) {
        try {
          const cacheKey = `${collection}_${docId}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            return JSON.parse(cachedData);
          }
        } catch (cacheError) {
          console.error('Error loading cached data:', cacheError);
        }
      }
      
      return null;
    }
  }

  // Obtener colección con listener en tiempo real
  static subscribeToCollection(collection, callback, query = null) {
    let ref = firestore().collection(collection);
    
    if (query) {
      ref = query(ref);
    }
    
    return ref.onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(data);
      },
      (error) => {
        console.error('Error in collection subscription:', error);
        callback([]);
      }
    );
  }

  // Agregar documento a colección
  static async addToCollection(collection, data) {
    try {
      const docRef = await firestore().collection(collection).add({
        ...data,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding to collection:', error);
      return { success: false, error: error.message };
    }
  }

  // Actualizar documento
  static async updateDocument(collection, docId, data) {
    try {
      await firestore().collection(collection).doc(docId).update({
        ...data,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating document:', error);
      return { success: false, error: error.message };
    }
  }

  // Eliminar documento
  static async deleteDocument(collection, docId) {
    try {
      await firestore().collection(collection).doc(docId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return { success: false, error: error.message };
    }
  }
}

export default FirebaseService;