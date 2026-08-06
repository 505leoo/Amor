import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'auth_session';

export const saveAuthSession = async (user) => {
  if (!user) return false;
  try {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({
      email: user.email,
      uid: user.uid,
      lastLogin: Date.now(),
    }));
    return true;
  } catch (error) {
    console.error('Error guardando sesión:', error);
    return false;
  }
};

export const getStoredAuth = async () => {
  try {
    const data = await AsyncStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error recuperando sesión:', error);
    return null;
  }
};

export const clearStoredAuth = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_KEY);
    return true;
  } catch (error) {
    console.error('Error limpiando sesión:', error);
    return false;
  }
};
