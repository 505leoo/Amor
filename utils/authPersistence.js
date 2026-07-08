import { Platform } from 'react-native';
import { legacyAsync as FileSystem } from 'expo-file-system/legacy';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

const AUTH_FILE = `${FileSystem.documentDirectory}/auth.dat`;
const ENCRYPTION_KEY = 'your-secret-key'; // Deberías mover esto a una variable de entorno

// Función auxiliar para encriptar/desencriptar datos
const encryptData = (data) => {
  // Aquí podrías implementar tu propia lógica de encriptación
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

const decryptData = (encrypted) => {
  // Aquí podrías implementar tu propia lógica de desencriptación
  try {
    return JSON.parse(Buffer.from(encrypted, 'base64').toString());
  } catch {
    return null;
  }
};

export const saveAuthSession = async (user) => {
  if (!user) return false;
  
  try {
    const authData = {
      email: user.email,
      uid: user.uid,
      refreshToken: await user.getIdToken(true),
      lastLogin: Date.now()
    };
    
    const encryptedData = encryptData(authData);
    await FileSystem.writeAsStringAsync(AUTH_FILE, encryptedData);
    
    return true;
  } catch (error) {
    console.error('Error guardando sesión:', error);
    return false;
  }
};

export const getStoredAuth = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(AUTH_FILE);
    if (!fileInfo.exists) return null;

    const encryptedData = await FileSystem.readAsStringAsync(AUTH_FILE);
    const authData = decryptData(encryptedData);
    if (!authData) return null;

    // Verificar si el token aún es válido
    try {
      await signInWithEmailAndPassword(auth, authData.email, authData.refreshToken);
      return authData;
    } catch (error) {
      console.error('Token expirado o inválido:', error);
      await clearStoredAuth();
      return null;
    }
  } catch (error) {
    console.error('Error recuperando sesión:', error);
    return null;
  }
};

export const clearStoredAuth = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(AUTH_FILE);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(AUTH_FILE);
    }
    return true;
  } catch (error) {
    console.error('Error limpiando sesión:', error);
    return false;
  }
};