import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Text, Dimensions, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import { useTheme } from '../ThemeContext';
import { useSeason } from '../SeasonContext';
import { LinearGradient } from 'expo-linear-gradient';
import TabButtons from './TabButtons';
import ThemeParticles from './ThemeParticles';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width: screenWidth } = Dimensions.get('window');

const CARD_W = screenWidth * 0.88;
const CARD_H = CARD_W * (150 / 250);
const STICKER_SIZE = CARD_W * 0.35;
const SCALE = CARD_W / 250;
const TEXT_LEFT = 99 * SCALE;
const TEXT_TOP = 48 * SCALE;
const TEXT_W = 55 * SCALE;
const TEXT_H = 49 * SCALE;

const CartaExpandida = ({ navigation, message = '' }) => {
  const [fontsLoaded] = useFonts({ Omori: require('../fonts/Omori.ttf') });
  const { currentTheme, themes } = useTheme();
  const { getDisplaySeason } = useSeason();
  const theme = themes[currentTheme];
  const displaySeason = getDisplaySeason();

  const [currentMessage, setCurrentMessage] = useState(message);
  const [stickerOptions, setStickerOptions] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(null);

  const handleExit = () => navigation.navigate('main', { message: currentMessage });

  useEffect(() => {
    const loadStickerCards = async () => {
      try {
        const stickersRef = collection(db, 'stickers');
        const q = query(stickersRef, where('category', '==', 'StickerCarta'));
        const snapshot = await getDocs(q);
        const stickerData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => item.imageUrl);
        setStickerOptions(stickerData);
      } catch (error) {
        console.error('Error loading card stickers:', error);
      }
    };

    loadStickerCards();
  }, []);

  if (!fontsLoaded) return null;

  const charCount = currentMessage.trim().replace(/\s+/g, '').length;
  let fontSize = 18;
  if (charCount > 20) fontSize = 10;
  else if (charCount > 14) fontSize = 12;
  else if (charCount > 10) fontSize = 13;
  else if (charCount > 6) fontSize = 15;

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <LinearGradient
        colors={displaySeason ? displaySeason.gradient : theme.gradient}
        style={StyleSheet.absoluteFill}
      >
        <ThemeParticles particleType={displaySeason ? displaySeason.particles : theme.particles} />
      </LinearGradient>

      <TabButtons onExit={handleExit} />

      <View style={styles.cardArea}>
        <View style={{ width: CARD_W, height: CARD_H, position: 'relative' }}>
          <Image
            source={require('../assets/menu/mensajes.png')}
            style={{ position: 'absolute', width: CARD_W, height: CARD_H }}
            resizeMode="stretch"
          />
          {selectedSticker?.imageUrl && (
            <Image
              source={{ uri: selectedSticker.imageUrl }}
              style={styles.stickerOverlay}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.text, { top: TEXT_TOP, left: TEXT_LEFT, width: TEXT_W, height: TEXT_H, fontSize }]}
            numberOfLines={4}
          >
            {currentMessage}
          </Text>
        </View>
      </View>

      <View style={styles.stickerPicker}>
        <Text style={styles.pickerLabel}>Stickers para carta</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stickerPickerContent}
        >
          <TouchableOpacity
            style={[styles.stickerOption, !selectedSticker && styles.stickerOptionActive]}
            onPress={() => setSelectedSticker(null)}
          >
            <Text style={styles.stickerOptionText}>Ninguno</Text>
          </TouchableOpacity>
          {stickerOptions.map((sticker) => (
            <TouchableOpacity
              key={sticker.id}
              style={[styles.stickerOption, selectedSticker?.id === sticker.id && styles.stickerOptionActive]}
              onPress={() => setSelectedSticker(sticker)}
            >
              <Image
                source={{ uri: sticker.imageUrl }}
                style={styles.stickerThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  stickerPicker: {
    paddingVertical: 10,
  },
  pickerLabel: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 20,
  },
  stickerPickerContent: {
    paddingLeft: 20,
    paddingRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerOption: {
    width: 70,
    height: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  stickerOptionActive: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stickerOptionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  stickerThumbnail: {
    width: '100%',
    height: '100%',
  },
  stickerOverlay: {
    position: 'absolute',
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    top: '50%',
    left: '50%',
    transform: [{ translateX: -STICKER_SIZE / 2 }, { translateY: -STICKER_SIZE / 2 }],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  text: {
    position: 'absolute',
    fontFamily: 'Omori',
    color: 'black',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

export default CartaExpandida;
