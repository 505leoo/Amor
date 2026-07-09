import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TabButtons from './components/TabButtons';
import ThemeParticles from './components/ThemeParticles';
import { useTheme } from './ThemeContext';
import { useSeason } from './SeasonContext';

export const getSeasonTemplates = (seasonId) => {
  const seasonMap = {
    'goldenDawn': 'Amanecer Dorado',
    'nightSpace': 'Espacio Nocturno'
  };
  const seasonName = seasonMap[seasonId];

  if (seasonName === 'Amanecer Dorado') {
    return {
      gradients: {
        'Común': ['#1a0a00', '#3d1a00'],
        'Épico': ['#7c2d00', '#c45000'],
        'Legendario': ['#b8860b', '#ffd700']
      },
      borders: {
        'Común': { color: 'rgba(139,69,19,0.6)', shadow: '#8B4513' },
        'Épico': { color: 'rgba(255,140,0,0.7)', shadow: '#FF8C00' },
        'Legendario': { color: 'rgba(255,215,0,0.8)', shadow: '#FFD700' }
      },
      imageBackgrounds: {
        'Común': 'rgba(160,82,45,0.8)',
        'Épico': 'rgba(255,165,0,0.8)',
        'Legendario': 'rgba(184,134,11,0.9)'
      },
      textColors: { 'Común': '#654321', 'Épico': '#B8860B', 'Legendario': '#DAA520' },
      iconColors: { 'Común': '#8B4513', 'Épico': '#FF4500', 'Legendario': '#B8860B' },
      icons: { 'Común': 'seedling', 'Épico': 'fire', 'Legendario': 'crown' },
      dotColors: { 'Común': '#8B4513', 'Épico': '#FF8C00', 'Legendario': '#FFD700' }
    };
  }

  if (seasonName === 'Espacio Nocturno') {
    return {
      gradients: {
        'Común': ['#0a0a1a', '#1a1a3d'],
        'Épico': ['#2d0060', '#7b00d4'],
        'Legendario': ['#4b0082', '#9400d3']
      },
      borders: {
        'Común': { color: 'rgba(72,61,139,0.6)', shadow: '#483D8B' },
        'Épico': { color: 'rgba(138,43,226,0.7)', shadow: '#8A2BE2' },
        'Legendario': { color: 'rgba(106,90,205,0.8)', shadow: '#6A5ACD' }
      },
      imageBackgrounds: {
        'Común': 'rgba(72,61,139,0.8)',
        'Épico': 'rgba(138,43,226,0.8)',
        'Legendario': 'rgba(106,90,205,0.9)'
      },
      textColors: { 'Común': '#E6E6FA', 'Épico': '#DDA0DD', 'Legendario': '#DA70D6' },
      iconColors: { 'Común': '#483D8B', 'Épico': '#8A2BE2', 'Legendario': '#6A5ACD' },
      icons: { 'Común': 'moon', 'Épico': 'rocket', 'Legendario': 'star' },
      dotColors: { 'Común': '#483D8B', 'Épico': '#8A2BE2', 'Legendario': '#6A5ACD' }
    };
  }

  return null;
};

export const getSeasonInfo = (seasonId) => {
  const seasonMap = {
    'goldenDawn': { name: 'Amanecer Dorado', color: '#f1d76b', icon: 'white-balance-sunny' },
    'nightSpace': { name: 'Espacio Nocturno', color: '#0f0c29', icon: 'star' }
  };
  return seasonMap[seasonId] || { name: 'Season', color: '#95A5A6', icon: 'circle' };
};

const CATEGORIES = [
  { id: 'Personajes', name: 'Personajes', icon: 'sticker-emoji', color: '#8B9DC3' },
  { id: 'Stickers', name: 'Stickers', icon: 'cards-heart', color: '#E8A0BF' },
  { id: 'Emoticonos', name: 'Emoticonos', icon: 'emoticon-happy', color: '#A8C8B8' },
  { id: 'Marcos', name: 'Marcos', icon: 'image-frame', color: '#C8A8B8' },
  { id: 'Insignias', name: 'Insignias', icon: 'medal', color: '#D4B896' },
  { id: 'Otros', name: 'Audio', icon: 'music-note', color: '#96C4B8' },
];

const rarityLabel = { 'Común': 'COMÚN', 'Épico': 'ÉPICO', 'Legendario': 'LEGENDARIO' };
const rarityColor = { 'Común': '#ffffff', 'Épico': '#a78bfa', 'Legendario': '#f59e0b' };

const Coleccion = ({ onClose, navigation }) => {
  const { currentTheme, themes } = useTheme();
  const { getDisplaySeason } = useSeason();
  const theme = themes[currentTheme];
  const displaySeason = getDisplaySeason();

  const [selectedCategory, setSelectedCategory] = useState('Personajes');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [cartaSticker, setCartaSticker] = useState(null);

  useEffect(() => {
    loadData();
    loadSelectedSticker();
    loadCartaSticker();
  }, []);

  const loadCartaSticker = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, 'cartaStickers', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const { imageUrl, selectedAt } = snap.data();
      const elapsed = Date.now() - selectedAt.toMillis();
      if (elapsed > 24 * 60 * 60 * 1000) {
        await deleteDoc(ref);
      } else {
        setCartaSticker({ imageUrl });
      }
    } catch (e) {}
  };

  const loadSelectedSticker = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
      if (userDoc.exists()) {
        const sticker = userDoc.data().selectedSticker || null;
        setSelectedStickerId(sticker?.id || null);
        if (sticker) setPreviewItem(sticker);
      }
    } catch (e) {}
  };

  const loadData = async () => {
    try {
      const itemsSnapshot = await getDocs(collection(db, 'stickers'));
      setItems(itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {}
    setLoading(false);
  };

  const handleStickerSelect = async (sticker) => {
    if (selectedCategory !== 'Personajes') return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, 'usuarios', user.uid), {
        selectedSticker: { id: sticker.id, name: sticker.name, imageUrl: sticker.imageUrl, rarity: sticker.rarity, season: sticker.season }
      });
      setSelectedStickerId(sticker.id);
    } catch (e) {}
  };

  const handleUnequip = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, 'usuarios', user.uid), { selectedSticker: null });
      setSelectedStickerId(null);
    } catch (e) {}
  };

  const handleClose = () => {
    if (navigation) navigation.navigate('main');
    else if (typeof onClose === 'function') onClose();
  };

  const rarityOrder = { 'Común': 0, 'Épico': 1, 'Legendario': 2 };
  const filteredItems = items
    .filter(item => {
      if (selectedCategory === 'Personajes') return item.category === 'Personajes' || item.category === 'Stickers';
      if (selectedCategory === 'Stickers') return item.category === 'StickerCarta';
      return item.category === selectedCategory;
    })
    .sort((a, b) => (rarityOrder[a.rarity] ?? 0) - (rarityOrder[b.rarity] ?? 0));

  const currentCat = CATEGORIES.find(c => c.id === selectedCategory);
  const activePreview = selectedCategory === 'Stickers'
    ? (previewItem && filteredItems.some(i => i.id === previewItem.id) ? previewItem : cartaSticker)
    : (previewItem && filteredItems.some(i => i.id === previewItem.id) ? previewItem : null);

  const handleCardPress = (item) => {
    if (selectedCategory === 'Personajes') {
      setPreviewItem(item);
      handleStickerSelect(item);
    } else if (selectedCategory === 'Stickers') {
      // Solo visual, sin cambiar Firestore
      setPreviewItem(item);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedCategory === 'Personajes' && item.id === selectedStickerId;
    const isPreviewing = previewItem?.id === item.id;
    const rColor = rarityColor[item.rarity] || '#9ca3af';
    const borderColor = isSelected ? '#22c55e' : isPreviewing ? rColor : 'rgba(255,255,255,0.08)';

    return (
      <TouchableOpacity onPress={() => handleCardPress(item)} activeOpacity={0.85}
        style={[
          styles.card,
          { borderColor },
          (isPreviewing || isSelected) && { shadowColor: isSelected ? '#22c55e' : rColor, shadowOpacity: 0.9, shadowRadius: 10, elevation: 14 },
        ]}
      >
        {/* Header de rareza */}
        <View style={[styles.cardHeader, { backgroundColor: rColor }]} />

        {/* Imagen */}
        <View style={styles.cardImageWrap}>
          {selectedCategory === 'Otros' ? (
            <MaterialCommunityIcons name="music-note" size={26} color={currentCat?.color} />
          ) : (
            <Image source={{ uri: item.imageUrl }} style={styles.img} contentFit="contain" transition={0} cachePolicy="memory-disk" />
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={[styles.rarityDot, { backgroundColor: rColor }]} />
          {isSelected && <MaterialCommunityIcons name="check" size={9} color="#22c55e" style={styles.checkIcon} />}
        </View>
      </TouchableOpacity>
    );
  };

  const gradientColors = displaySeason ? displaySeason.gradient : theme?.gradient;
  const particlesType = displaySeason ? displaySeason.particles : theme?.particles;

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <ThemeParticles particleType={particlesType} />
        <TabButtons onExit={handleClose} />
        <View style={styles.body}>
          {/* Sidebar categorías */}
          <View style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
              {CATEGORIES.map(cat => {
                const active = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[styles.sideTab, active && styles.sideTabActive]}
                  >
                    {active && <View style={[styles.sideActiveLine, { backgroundColor: cat.color }]} />}
                    <MaterialCommunityIcons name={cat.icon} size={16} color={active ? cat.color : 'rgba(0,0,0,0.35)'} />
                    <Text style={[styles.sideTabText, active && { color: '#222' }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Grid central */}
          <View style={styles.gridArea}>
            {!loading && (
              <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={i => i.id}
                numColumns={4}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gridContent}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <MaterialCommunityIcons name={currentCat?.icon} size={28} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyText}>Vacío</Text>
                  </View>
                }
              />
            )}
          </View>

          {/* Preview derecha */}
          <View style={styles.previewArea}>
            {activePreview ? (
              <View style={styles.previewCard}>
                <Image source={{ uri: activePreview.imageUrl }} style={styles.previewImage} contentFit="contain" />
                {selectedCategory === 'Personajes' && (
                  <TouchableOpacity
                    style={[styles.equipBtn, activePreview.id === selectedStickerId && styles.equipBtnActive]}
                    onPress={() => activePreview.id === selectedStickerId ? handleUnequip() : handleStickerSelect(activePreview)}
                  >
                    <LinearGradient
                      colors={activePreview.id === selectedStickerId ? ['#dc2626','#991b1b'] : ['#d97706','#b45309']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.equipBtnGradient}
                    >
                      <Text style={styles.equipBtnText}>
                        {activePreview.id === selectedStickerId ? 'DESEQUIPAR' : 'EQUIPAR'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {selectedCategory === 'Stickers' && (
                  <TouchableOpacity
                    style={styles.equipBtn}
                    onPress={() => navigation.navigate('carta')}
                  >
                    <LinearGradient
                      colors={['#d97706','#b45309']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.equipBtnGradient}
                    >
                      <Text style={styles.equipBtnText}>CAMBIAR</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  body: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 55,
  },
  // Sidebar
  sidebar: {
    width: 120,
    marginLeft: 47,
    backgroundColor: 'transparent',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0)',
  },
  sidebarContent: {
    paddingVertical: 8,
  },
  sideTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    position: 'relative',
  },
  sideTabActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sideTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.55)',
    letterSpacing: 0.2,
  },
  sideActiveLine: {
    position: 'absolute',
    left: 0,
    top: '20%',
    width: 3,
    height: '60%',
    borderRadius: 2,
  },
  // Grid
  gridArea: {
    flex: 1,
    right: -5,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  gridContent: {
    padding: 12,
    gap: 2,
  },
  card: {
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
  cardHeader: {
    height: 4,
    width: '100%',
  },
  cardImageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: 62, height: 62, backgroundColor: 'transparent' },
  cardFooter: {
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
  checkIcon: {
    opacity: 0.95,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 13,
    fontWeight: '500',
  },
  // Preview
  previewArea: {
    width: 190,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
    paddingHorizontal: 18,
  },
  previewImage: {
    width: 150,
    height: 150,
  },
  equipBtn: {
    width: '80%',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  equipBtnActive: {},
  equipBtnGradient: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default Coleccion;
