import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Text, Dimensions, StatusBar, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import TabButtons from './TabButtons';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CARD_W = screenWidth * 0.98;
const CARD_H = CARD_W * (195 / 250);
const STICKER_SIZE = CARD_W * 0.23;
const SCALE = CARD_W / 250;
const TEXT_LEFT = 99 * SCALE;
const TEXT_TOP = 48 * SCALE;
const TEXT_W = 55 * SCALE;
const TEXT_H = 49 * SCALE;

const CartaExpandida = ({ navigation, message = '', selectedSticker: initialSticker }) => {
  const [fontsLoaded] = useFonts({ Omori: require('../fonts/Omori.ttf') });

  const [currentMessage, setCurrentMessage] = useState(message);
  const [stickerOptions, setStickerOptions] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(initialSticker || null);

  const saveCartaSticker = async (sticker) => {
    try {
      const user = auth.currentUser;
      if (!user || !sticker) return;
      await setDoc(doc(db, 'cartaStickers', user.uid), {
        imageUrl: sticker.imageUrl,
        selectedAt: serverTimestamp(),
      });
    } catch (e) {}
  };

  const handleExit = () => navigation.navigate('main', {
    message: currentMessage,
    selectedSticker: selectedSticker
  });

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
      } catch (e) {}
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

  const noneOption = { id: '__none__', imageUrl: null };
  const gridData = [noneOption, ...stickerOptions];

  const renderGridItem = ({ item }) => {
    const isNone = item.id === '__none__';
    const isActive = isNone ? !selectedSticker : selectedSticker?.id === item.id;
    const rColor = item.rarity === 'Legendario' ? '#f59e0b' : item.rarity === 'Épico' ? '#a78bfa' : '#ffffff';
    const borderColor = isActive ? '#22c55e' : 'rgba(255,255,255,0.08)';

    return (
      <TouchableOpacity
        style={[
          styles.gridItem,
          { borderColor },
          isActive && { shadowColor: isNone ? '#22c55e' : rColor, shadowOpacity: 0.9, shadowRadius: 10, elevation: 14 },
        ]}
        activeOpacity={0.85}
        onPress={async () => {
          if (isNone) {
            setSelectedSticker(null);
            try { const user = auth.currentUser; if (user) await deleteDoc(doc(db, 'cartaStickers', user.uid)); } catch (e) {}
          } else {
            setSelectedSticker(item);
            saveCartaSticker(item);
          }
        }}
      >
        {/* Header rareza */}
        <View style={[styles.gridItemHeader, { backgroundColor: isNone ? 'rgba(255,255,255,0.2)' : rColor }]} />

        {/* Imagen */}
        <View style={styles.gridItemImageWrap}>
          {isNone
            ? <Text style={styles.noneText}>✕</Text>
            : <ExpoImage source={{ uri: item.imageUrl }} style={styles.gridImg} contentFit="contain" cachePolicy="memory-disk" />}
        </View>

        {/* Footer */}
        <View style={styles.gridItemFooter}>
          <View style={[styles.rarityDot, { backgroundColor: isNone ? 'rgba(255,255,255,0.3)' : rColor }]} />
          {isActive && !isNone && <Text style={styles.checkDot}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <LinearGradient
        colors={['#071029', '#0b1b2b']}
        style={StyleSheet.absoluteFill}
      >
      </LinearGradient>

      <TabButtons onExit={handleExit} />

      <View style={styles.body}>
        {/* Izquierda: carta */}
        <View style={styles.leftCol}>
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
            <Text
              style={[styles.text, { top: TEXT_TOP, left: TEXT_LEFT, width: TEXT_W, height: TEXT_H, fontSize }]}
              numberOfLines={4}
            >
              {currentMessage}
            </Text>
          </View>
        </View>

        {/* Derecha: grid */}
        <View style={styles.rightCol}>
          <FlatList
            data={gridData}
            renderItem={renderGridItem}
            keyExtractor={i => i.id}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    marginTop: 55,
  },
  leftCol: {
    position: 'absolute',
    left: -200,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightCol: {
    position: 'absolute',
    right: 105,
    top: -10,
    bottom: 0,
  },
  gridContent: {
    paddingVertical: 8,
    gap: 2,
  },
  gridItem: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    margin: 4,
    backgroundColor: 'rgba(15,15,15,0.75)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: 'column',
  },
  gridItemHeader: {
    height: 4,
    width: '100%',
  },
  gridItemImageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridImg: { width: 62, height: 62, backgroundColor: 'transparent' },
  gridItemFooter: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  rarityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.9,
  },
  checkDot: {
    color: '#22c55e',
    fontSize: 9,
  },
  noneText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
  },
  stickerOverlay: {
    position: 'absolute',
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    top: '48.8%',
    left: '50.6%',
    transform: [{ translateX: -STICKER_SIZE / 2 }, { translateY: -STICKER_SIZE / 2 }],
    borderRadius: 12,
    backgroundColor: 'transparent',
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
