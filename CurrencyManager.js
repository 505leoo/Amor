import AsyncStorage from '@react-native-async-storage/async-storage';

export const CurrencyManager = {
  // Obtener monedas actuales
  async getCoins() {
    try {
      const coins = await AsyncStorage.getItem('playerCoins');
      return coins ? parseInt(coins) : 100; // 100 monedas iniciales
    } catch (error) {
      console.error('Error getting coins:', error);
      return 100;
    }
  },

  // Establecer monedas
  async setCoins(amount) {
    try {
      await AsyncStorage.setItem('playerCoins', amount.toString());
      return true;
    } catch (error) {
      console.error('Error setting coins:', error);
      return false;
    }
  },

  // Añadir monedas
  async addCoins(amount) {
    try {
      const currentCoins = await this.getCoins();
      const newAmount = currentCoins + amount;
      await this.setCoins(newAmount);
      return newAmount;
    } catch (error) {
      console.error('Error adding coins:', error);
      return false;
    }
  },

  // Gastar monedas
  async spendCoins(amount) {
    try {
      const currentCoins = await this.getCoins();
      if (currentCoins >= amount) {
        const newAmount = currentCoins - amount;
        await this.setCoins(newAmount);
        return { success: true, newAmount };
      } else {
        return { success: false, error: 'Monedas insuficientes' };
      }
    } catch (error) {
      console.error('Error spending coins:', error);
      return { success: false, error: 'Error al procesar la compra' };
    }
  },

  // Obtener stickers poseídos
  async getOwnedStickers() {
    try {
      const owned = await AsyncStorage.getItem('ownedStickers');
      return owned ? JSON.parse(owned) : ['kitty']; // Kitty viene por defecto
    } catch (error) {
      console.error('Error getting owned stickers:', error);
      return ['kitty'];
    }
  },

  // Añadir sticker a la colección
  async addSticker(stickerId) {
    try {
      const ownedStickers = await this.getOwnedStickers();
      if (!ownedStickers.includes(stickerId)) {
        ownedStickers.push(stickerId);
        await AsyncStorage.setItem('ownedStickers', JSON.stringify(ownedStickers));
      }
      return true;
    } catch (error) {
      console.error('Error adding sticker:', error);
      return false;
    }
  },

  // Establecer sticker actual
  async setCurrentSticker(stickerId) {
    try {
      await AsyncStorage.setItem('currentSticker', stickerId);
      return true;
    } catch (error) {
      console.error('Error setting current sticker:', error);
      return false;
    }
  },

  // Obtener sticker actual
  async getCurrentSticker() {
    try {
      const current = await AsyncStorage.getItem('currentSticker');
      return current || 'kitty';
    } catch (error) {
      console.error('Error getting current sticker:', error);
      return 'kitty';
    }
  }
};