import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Animated } from 'react-native';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSeason } from './SeasonContext';


// Template functions
export const getSeasonTemplates = (seasonId) => {
  const seasonMap = {
    'goldenDawn': 'Amanecer Dorado',
    'nightSpace': 'Espacio Nocturno'
  };
  
  const seasonName = seasonMap[seasonId];
  
  if (seasonName === 'Amanecer Dorado') {
    return {
      gradients: {
        'Común': ['rgba(139, 69, 19, 0.9)', 'rgba(160, 82, 45, 0.8)', 'rgba(205, 133, 63, 0.7)'],
        'Épico': ['rgba(255, 140, 0, 0.95)', 'rgba(255, 165, 0, 0.9)', 'rgba(255, 215, 0, 0.8)'],
        'Legendario': ['rgba(255, 215, 0, 1)', 'rgba(255, 140, 0, 0.95)', 'rgba(184, 134, 11, 0.9)']
      },
      borders: {
        'Común': { color: 'rgba(139, 69, 19, 0.6)', shadow: '#8B4513' },
        'Épico': { color: 'rgba(255, 140, 0, 0.7)', shadow: '#FF8C00' },
        'Legendario': { color: 'rgba(255, 215, 0, 0.8)', shadow: '#FFD700' }
      },
      backgrounds: {
        'Común': 'rgba(139, 69, 19, 0.15)',
        'Épico': 'rgba(255, 140, 0, 0.2)',
        'Legendario': 'rgba(255, 215, 0, 0.25)'
      },
      imageBackgrounds: {
        'Común': 'rgba(160, 82, 45, 0.8)',
        'Épico': 'rgba(255, 165, 0, 0.8)',
        'Legendario': 'rgba(184, 134, 11, 0.9)'
      },
      textColors: {
        'Común': '#654321',
        'Épico': '#B8860B',
        'Legendario': '#DAA520'
      },
      iconColors: {
        'Común': '#8B4513',
        'Épico': '#FF4500',
        'Legendario': '#B8860B'
      },
      icons: {
        'Común': 'seedling',
        'Épico': 'fire',
        'Legendario': 'crown'
      },
      dotColors: {
        'Común': '#8B4513',
        'Épico': '#FF8C00',
        'Legendario': '#FFD700'
      }
    };
  }
  
  if (seasonName === 'Espacio Nocturno') {
    return {
      gradients: {
        'Común': ['rgba(15, 12, 41, 0.9)', 'rgba(48, 43, 99, 0.8)', 'rgba(36, 36, 62, 0.7)'],
        'Épico': ['rgba(72, 61, 139, 0.95)', 'rgba(106, 90, 205, 0.9)', 'rgba(138, 43, 226, 0.8)'],
        'Legendario': ['rgba(138, 43, 226, 1)', 'rgba(72, 61, 139, 0.95)', 'rgba(25, 25, 112, 0.9)']
      },
      borders: {
        'Común': { color: 'rgba(72, 61, 139, 0.6)', shadow: '#483D8B' },
        'Épico': { color: 'rgba(138, 43, 226, 0.7)', shadow: '#8A2BE2' },
        'Legendario': { color: 'rgba(106, 90, 205, 0.8)', shadow: '#6A5ACD' }
      },
      backgrounds: {
        'Común': 'rgba(72, 61, 139, 0.15)',
        'Épico': 'rgba(138, 43, 226, 0.2)',
        'Legendario': 'rgba(106, 90, 205, 0.25)'
      },
      imageBackgrounds: {
        'Común': 'rgba(72, 61, 139, 0.8)',
        'Épico': 'rgba(138, 43, 226, 0.8)',
        'Legendario': 'rgba(106, 90, 205, 0.9)'
      },
      textColors: {
        'Común': '#E6E6FA',
        'Épico': '#DDA0DD',
        'Legendario': '#DA70D6'
      },
      iconColors: {
        'Común': '#483D8B',
        'Épico': '#8A2BE2',
        'Legendario': '#6A5ACD'
      },
      icons: {
        'Común': 'moon',
        'Épico': 'rocket',
        'Legendario': 'star'
      },
      dotColors: {
        'Común': '#483D8B',
        'Épico': '#8A2BE2',
        'Legendario': '#6A5ACD'
      }
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

const Coleccion = ({ onClose, navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('Personajes');
  const [items, setItems] = useState([]);
  const [seasons, setSeasons] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const fadeAnims = useRef([]).current;
  const { getDisplaySeason } = useSeason();

  const categories = [
    { id: 'Personajes', name: 'Personajes', icon: 'sticker-emoji', color: '#8B9DC3', gradient: ['#8B9DC3', '#A8B5D1'] },
    { id: 'Stickers', name: 'Stickers', icon: 'cards-heart', color: '#E8A0BF', gradient: ['#E8A0BF', '#F0B8D0'] },
    { id: 'Emoticonos', name: 'Emoticonos', icon: 'emoticon-happy', color: '#A8C8B8', gradient: ['#A8C8B8', '#B8D4C6'] },
    { id: 'Marcos', name: 'Marcos', icon: 'image-frame', color: '#C8A8B8', gradient: ['#C8A8B8', '#D4B8C6'] },
    { id: 'Insignias', name: 'Insignias', icon: 'medal', color: '#D4B896', gradient: ['#D4B896', '#E0C4A4'] },
    { id: 'Otros', name: 'Audio', icon: 'music-note', color: '#96C4B8', gradient: ['#96C4B8', '#A4D0C6'] }
  ];

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
        const data = userDoc.data();
        setSelectedStickerId(data.selectedSticker?.id || null);
      }
    } catch (error) {
      console.error('Error loading selected sticker:', error);
    }
  };

  const handleStickerSelect = async (sticker) => {
    if (selectedCategory !== 'Personajes') return;
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await updateDoc(doc(db, 'usuarios', user.uid), {
        selectedSticker: {
          id: sticker.id,
          name: sticker.name,
          imageUrl: sticker.imageUrl,
          rarity: sticker.rarity,
          season: sticker.season
        }
      });
      
      setSelectedStickerId(sticker.id);
    } catch (error) {
      console.error('Error selecting sticker:', error);
    }
  };

  const handleUnequipSticker = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await updateDoc(doc(db, 'usuarios', user.uid), {
        selectedSticker: null
      });
      
      setSelectedStickerId(null);
    } catch (error) {
      console.error('Error unequipping sticker:', error);
    }
  };

  const loadData = async () => {
    try {
      const [seasonsSnapshot, itemsSnapshot] = await Promise.all([
        getDocs(collection(db, 'season')),
        getDocs(collection(db, 'stickers'))
      ]);
      
      const seasonsData = {};
      seasonsSnapshot.docs.forEach(doc => {
        seasonsData[doc.id] = doc.data();
      });
      
      const itemsData = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSeasons(seasonsData);
      setItems(itemsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const getCardGradient = (rarity, seasonId) => {
    const templates = getSeasonTemplates(seasonId);
    if (templates) {
      return templates.gradients[rarity] || templates.gradients['Común'];
    }
    
    const baseGradients = {
      'Común': ['#2C3E50', '#34495E', '#5D6D7E'],
      'Épico': ['#8E44AD', '#9B59B6', '#BB8FCE'],
      'Legendario': ['#F39C12', '#E67E22', '#F7DC6F']
    };
    
    return baseGradients[rarity] || baseGradients['Común'];
  };



  const renderCategoryTab = (category) => {
    const isActive = selectedCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryTab,
          isActive && styles.categoryTabActive
        ]}
        onPress={() => setSelectedCategory(category.id)}
      >
        <LinearGradient
          colors={isActive ? category.gradient : ['transparent', 'transparent']}
          style={styles.tabGradient}
        >
          <MaterialCommunityIcons 
            name={category.icon} 
            size={18} 
            color={isActive ? '#FFFFFF' : '#7F8C8D'} 
          />
          <Text style={[
            styles.categoryName,
            isActive && styles.categoryNameActive
          ]}>
            {category.name}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }) => {
    const isSelected = selectedCategory === 'Personajes' && item.id === selectedStickerId;
    const seasonInfo = getSeasonInfo(item.season);
    const currentCategory = categories.find(cat => cat.id === selectedCategory);
    const templates = getSeasonTemplates(item.season);
    
    return (
      <TouchableOpacity 
        style={[styles.itemCard, isSelected && styles.itemCardSelected]} 
        activeOpacity={0.95}
        onPress={() => selectedCategory === 'Personajes' && handleStickerSelect(item)}
      >
        <LinearGradient
          colors={item.rarity ? getCardGradient(item.rarity, item.season) : ['#FFFFFF', '#FAFBFC']}
          style={[
            styles.cardGradient,
            templates && item.rarity && {
              borderWidth: item.rarity === 'Común' ? 1 : item.rarity === 'Épico' ? 2 : 3,
              borderColor: templates.borders[item.rarity]?.color,
              shadowColor: templates.borders[item.rarity]?.shadow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            },
            isSelected && styles.selectedGradient
          ]}
        >
          <View style={[
            styles.cardHeader,
            templates && item.rarity && {
              backgroundColor: templates.backgrounds[item.rarity],
              borderRadius: 4,
              marginBottom: 2,
            }
          ]}>
            <View style={styles.itemInfo}>
              <Text style={[
                styles.itemName,
                templates && item.rarity && {
                  color: templates.textColors[item.rarity]
                }
              ]} numberOfLines={1}>{item.name}</Text>
              <View style={styles.metaRow}>
                <FontAwesome5 
                  name={templates && item.rarity ? templates.icons[item.rarity] : currentCategory?.icon} 
                  size={8} 
                  color={templates && item.rarity ? templates.iconColors[item.rarity] : currentCategory?.color} 
                />
                <Text style={[
                  styles.categoryLabel, 
                  { color: templates && item.rarity ? templates.iconColors[item.rarity] : currentCategory?.color }
                ]}>
                  {item.rarity || currentCategory?.name.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={[styles.seasonBadge, { backgroundColor: seasonInfo.color }]}>
              <MaterialCommunityIcons 
                name={seasonInfo.icon} 
                size={12} 
                color="#fff" 
              />
            </View>
          </View>
          
          <View style={styles.imageSection}>
            <View style={[
              styles.imageContainer, 
              { borderColor: currentCategory?.color + '20' },
              templates && item.rarity && {
                backgroundColor: templates.imageBackgrounds[item.rarity],
                borderColor: templates.borders[item.rarity]?.shadow,
                borderWidth: 1,
              }
            ]}>
              {selectedCategory === 'Otros' ? (
                <View style={styles.audioIcon}>
                  <MaterialIcons name="music-note" size={28} color={currentCategory?.color} />
                  <View style={[styles.audioIndicator, { backgroundColor: currentCategory?.color }]} />
                </View>
              ) : (
                <Image 
                  source={{ uri: item.imageUrl }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              )}
            </View>
          </View>
          
          <View style={[
            styles.cardFooter,
            templates && item.rarity && {
              backgroundColor: templates.backgrounds[item.rarity],
              borderRadius: 4,
            }
          ]}>
            <Text style={[
              styles.seasonName,
              templates && item.rarity && {
                color: templates.textColors[item.rarity]
              }
            ]} numberOfLines={1}>{seasonInfo.name}</Text>
            <View style={[
              styles.statusDot,
              templates && item.rarity && {
                backgroundColor: templates.dotColors[item.rarity]
              }
            ]} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const filteredItems = items.filter(item => {
    if (selectedCategory === 'Personajes') return item.category === 'Personajes' || item.category === 'Stickers';
    if (selectedCategory === 'Stickers') return item.category === 'StickerCarta';
    return item.category === selectedCategory;
  });
  const currentCategory = categories.find(cat => cat.id === selectedCategory);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar hidden={true} />
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loadingGradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner}>
                <MaterialCommunityIcons name="loading" size={32} color="#fff" />
              </View>
              <Text style={styles.loadingText}>Loading Collection</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.mainGradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="view-grid" size={20} color="#fff" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Collection</Text>
                <Text style={styles.headerSubtitle}>{filteredItems.length} items</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {selectedCategory === 'Personajes' && selectedStickerId && (
                <TouchableOpacity 
                  onPress={handleUnequipSticker}
                  style={styles.unequipButton}
                >
                  <MaterialIcons name="close" size={14} color="#fff" />
                  <Text style={styles.unequipText}>Desequipar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={() => {
                  if (navigation) {
                    navigation.navigate('main');
                  } else if (typeof onClose === 'function') {
                    onClose();
                  }
                }} 
                style={styles.closeButton}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.sidebar}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
                {categories.map(renderCategoryTab)}
              </ScrollView>
            </View>

            <View style={styles.mainContent}>
              <View style={styles.categoryHeader}>
                <LinearGradient
                  colors={currentCategory?.gradient || ['#95A5A6', '#BDC3C7']}
                  style={styles.categoryHeaderGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons 
                    name={currentCategory?.icon} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.categoryHeaderTitle}>{currentCategory?.name}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filteredItems.length}</Text>
                  </View>
                </LinearGradient>
              </View>
              
              <FlatList
                key="collection-grid-4cols"
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={4}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.itemsList}
                columnWrapperStyle={styles.row}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons 
                      name={currentCategory?.icon} 
                      size={48} 
                      color="#E0E0E0" 
                    />
                    <Text style={styles.emptyText}>No {currentCategory?.name.toLowerCase()} found</Text>
                  </View>
                }
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
  },
  mainGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unequipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  unequipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 10,
  },
  sidebarContent: {
    paddingVertical: 8,
  },
  categoryTab: {
    marginVertical: 2,
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabGradient: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  categoryNameActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  categoryHeader: {
    overflow: 'hidden',
    borderTopLeftRadius: 16,
  },
  categoryHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  itemsList: {
    padding: 8,
  },
  row: {
    justifyContent: 'flex-start',
  },
  itemCard: {
    width: '23%',
    marginRight: '2%',
    marginBottom: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  itemCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  selectedGradient: {
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.5)',
    shadowColor: 'rgba(76, 175, 80, 0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  cardGradient: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 6,
    paddingBottom: 3,
  },
  itemInfo: {
    flex: 1,
    marginRight: 6,
  },
  itemName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 7,
    fontWeight: '700',
    marginLeft: 3,
    letterSpacing: 0.5,
  },
  seasonBadge: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  audioIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  audioIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#F8F9FA',
  },
  seasonName: {
    fontSize: 9,
    color: '#7F8C8D',
    fontWeight: '500',
    flex: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#2ECC71',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    marginBottom: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#95A5A6',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default Coleccion;