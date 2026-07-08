import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { doc, getDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import Player from '../Player';
import { useSeason } from '../SeasonContext';
import { useTheme } from '../ThemeContext';
import ThemeParticles from '../components/ThemeParticles';
import TabButtons from '../components/TabButtons';

const Stickers = ({ navigation }) => {
  const [currentStickerId, setCurrentStickerId] = useState(null);
  const [ownedStickers, setOwnedStickers] = useState([]);
  const [filteredStickers, setFilteredStickers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [loading, setLoading] = useState(true);
  const { getDisplaySeason, isLoading: seasonLoading } = useSeason();
  const { currentTheme, themes } = useTheme();
  const theme = themes[currentTheme] || themes.nightSpace;
  const displaySeason = getDisplaySeason();
  const gridRef = useRef(null);

  // Avoid background flash while season loads (same approach as Inicio.js)
  const gradientColors = seasonLoading
    ? null
    : (displaySeason ? displaySeason.gradient : theme?.gradient);
  const particlesType = seasonLoading
    ? null
    : (displaySeason ? displaySeason.particles : theme?.particles);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'usuarios', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const ownedIds = data.ownedStickers || [];
        
        setCurrentStickerId(data.currentStickerId || null);
        
        if (ownedIds.length > 0) {
          const stickersSnapshot = await getDocs(collection(db, 'stickers'));
          const allStickers = stickersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          const owned = allStickers.filter(s => ownedIds.includes(s.id));
          
          setOwnedStickers(owned);
          filterStickers(owned);
        } else {
          setOwnedStickers([]);
          setFilteredStickers([]);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const selectSticker = async (sticker) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'usuarios', user.uid), {
          currentStickerId: sticker.id,
          currentStickerUrl: sticker.imageUrl,
          currentStickerName: sticker.name,
          selectedSticker: {
            id: sticker.id,
            name: sticker.name,
            imageUrl: sticker.imageUrl,
            rarity: sticker.rarity || null,
            season: sticker.season || null
          }
        });
        setCurrentStickerId(sticker.id);
        Alert.alert('¡Éxito!', 'Personaje cambiado correctamente');
      }
    } catch (error) {
      console.error('Error changing sticker:', error);
      Alert.alert('Error', 'No se pudo cambiar el personaje');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <TabButtons onExit={() => navigation?.navigate('main')} userMoney={0} onAddSticker={() => {}} onStopMusic={null} />
      {gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.background}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.neutralBackground]} />
      )}

      {particlesType ? <ThemeParticles particleType={particlesType} /> : null}

      <ScrollView ref={gridRef} style={styles.scrollView} contentContainerStyle={styles.gridContainer}>
        {filteredStickers.map((sticker) => (
          <TouchableOpacity
            key={sticker.id}
            style={[
              styles.stickerItem,
              currentStickerId === sticker.id && styles.selectedSticker
            ]}
            onPress={() => selectSticker(sticker)}
          >
            <Image 
              source={{ uri: sticker.imageUrl }}
              style={styles.stickerImage}
              contentFit="contain"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.playerWrap} pointerEvents="box-none">
        <Player centered showNameTag={false} onSelectSticker={() => navigation?.navigate('coleccion')} />
      </View>
    </View>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf7fc',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  neutralBackground: {
    backgroundColor: '#f8f6f4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d1b2e',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 90, 131, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#8b5a83',
    fontSize: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  stickerItem: {
    width: 110,
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedSticker: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  stickerImage: {
    width: 70,
    height: 70,
  },
  stickerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d1b2e',
    marginTop: 5,
    textAlign: 'center',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 5,
  },
  rarityText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  selectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  categoryContainer: {
    maxHeight: 50,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 131, 0.2)',
  },
  selectedCategory: {
    backgroundColor: '#8b5a83',
    borderColor: '#8b5a83',
  },
  categoryText: {
    color: '#8b5a83',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCategoryText: {
    color: 'white',
  },
  playerWrap: {
    position: 'absolute',
    top: '26%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
    zIndex: 1000,
    elevation: 10,
  },
});

export default Stickers;
