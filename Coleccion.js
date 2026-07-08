import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

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

const Coleccion = ({ onClose, navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('Personajes');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStickerId, setSelectedStickerId] = useState(null);

  useEffect(() => {
    loadData();
    loadSelectedSticker();
  }, []);

  const loadSelectedSticker = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
      if (userDoc.exists()) {
        setSelectedStickerId(userDoc.data().selectedSticker?.id || null);
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

  const filteredItems = items.filter(item => {
    if (selectedCategory === 'Personajes') return item.category === 'Personajes' || item.category === 'Stickers';
    if (selectedCategory === 'Stickers') return item.category === 'StickerCarta';
    return item.category === selectedCategory;
  });

  const currentCat = CATEGORIES.find(c => c.id === selectedCategory);

  const renderItem = ({ item }) => {
    const isSelected = selectedCategory === 'Personajes' && item.id === selectedStickerId;
    const templates = getSeasonTemplates(item.season);
    const gradColors = templates?.gradients[item.rarity] || ['#0f0c29', '#302b63'];
    const borderColor = isSelected ? '#22c55e' : 'transparent';

    return (
      <TouchableOpacity onPress={() => handleStickerSelect(item)} activeOpacity={0.75} style={[styles.card, { borderColor }]}>
        <LinearGradient colors={gradColors} style={StyleSheet.absoluteFill} />
        {selectedCategory === 'Otros' ? (
          <MaterialCommunityIcons name="music-note" size={18} color={currentCat?.color} />
        ) : (
          <Image source={{ uri: item.imageUrl }} style={styles.img} contentFit="contain" />
        )}
        {isSelected && <View style={styles.selectedDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <View style={styles.sheet}>
      {/* Fila de categorías + cerrar */}
      <View style={styles.topRow} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent} pointerEvents="box-none">
          {CATEGORIES.map(cat => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={styles.iconTab}>
                <MaterialCommunityIcons name={cat.icon} size={16} color={active ? cat.color : 'rgba(255,255,255,0.35)'} />
                <Text style={[styles.catName, active && { color: cat.color }]}>{cat.name}</Text>
                {active && <View style={[styles.activeDot, { backgroundColor: cat.color }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.topRight}>
          {selectedCategory === 'Personajes' && selectedStickerId && (
            <TouchableOpacity onPress={handleUnequip}>
              <Ionicons name="close-circle" size={18} color="rgba(239,68,68,0.9)" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items */}
      {!loading && (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name={currentCat?.icon} size={22} color="rgba(255,255,255,0.3)" />
            </View>
          }
        />
      )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  sheet: {
    backgroundColor: 'rgba(8,6,18,0.96)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(120,80,255,0.25)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  tabsContent: { flexGrow: 1, gap: 2, alignItems: 'center', paddingRight: 6 },
  iconTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    height: 28,
    gap: 4,
  },
  catName: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  activeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: 1,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listContent: { paddingHorizontal: 10, gap: 6, alignItems: 'center' },
  card: {
    width: 46,
    height: 46,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  img: { width: 46, height: 46 },
  selectedDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  empty: { width: 80, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
});

export default Coleccion;
