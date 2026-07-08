import { legacyAsync as FileSystem } from 'expo-file-system/legacy';

const AUTH_FILE = `${FileSystem.documentDirectory}auth.dat`;

const serializeData = (data) => JSON.stringify(data);
const deserializeData = (text) => {
  try {
    return JSON.parse(text);
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
      lastLogin: Date.now()
    };

    const text = serializeData(authData);
    await FileSystem.writeAsStringAsync(AUTH_FILE, text);

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

    const storedText = await FileSystem.readAsStringAsync(AUTH_FILE);
    const authData = deserializeData(storedText);
    return authData;
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