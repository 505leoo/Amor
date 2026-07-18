import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import TabButtons from '../components/TabButtons';
import StickerUploader from '../components/StickerUploader';
import { useAudioPlayer } from 'expo-audio';
import { getSeasonTemplates } from '../Coleccion';

const Tienda = ({ navigation }) => {
  const [stickers, setStickers] = useState([]);
  const [allStickers, setAllStickers] = useState([]);
  const [userMoney, setUserMoney] = useState(0);
  const [ownedStickers, setOwnedStickers] = useState([]);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Personajes');
  const [playingMusic, setPlayingMusic] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const player = useAudioPlayer(currentAudioUrl);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      try {
        if (playingMusic && player) {
          player.pause();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
      setPlayingMusic(null);
    };
  }, []);

  const playMusic = async (item) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      if (playingMusic) {
        player.pause();
      }
      
      setCurrentAudioUrl(item.audioUrl);
      player.play();
      setPlayingMusic(item);
    } catch (error) {
      console.error('Error playing music:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopMusic = () => {
    try {
      if (playingMusic && player) {
        player.pause();
      }
      setPlayingMusic(null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error stopping music:', error);
    }
  };

const AnimatedCard = ({ item, index, ownedStickers, buySticker, getCardGradient, getDescription, selectedTab, playingMusic, onPlayMusic, onStopMusic, isLoading, displaySeason, totalStickers }) => {
  const isMusic = selectedTab === 'Otros';
  const isOwned = ownedStickers.includes(item.id);
  const isPlaying = playingMusic?.id === item.id;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (isPlaying) {
      const rotation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      rotation.start();
      return () => rotation.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isPlaying]);
  
  const handleMusicPress = () => {
    if (isMusic && !isLoading) {
      if (isPlaying) {
        onStopMusic();
      } else {
        onPlayMusic(item);
      }
    }
  };
  
  const handleCardPress = () => {
    if (isMusic) {
      handleMusicPress();
    }
  };
  
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <View style={[
      styles.card,
      totalStickers === 1 && styles.cardExpanded
    ]}>
      <TouchableOpacity activeOpacity={0.8} onPress={handleCardPress}>
        <LinearGradient
          colors={getCardGradient(item.rarity, item.season)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.stickerCard,
            displaySeason?.name === 'Amanecer Dorado' && {
              borderWidth: item.rarity === 'Común' ? 2 : item.rarity === 'Épico' ? 3 : 4,
              borderColor: item.rarity === 'Común' ? 'rgba(139, 69, 19, 0.8)' : 
                           item.rarity === 'Épico' ? 'rgba(255, 140, 0, 0.9)' : 
                           'rgba(255, 215, 0, 1)',
              shadowColor: item.rarity === 'Común' ? '#8B4513' : item.rarity === 'Épico' ? '#FF8C00' : '#FFD700',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: item.rarity === 'Común' ? 0.6 : item.rarity === 'Épico' ? 0.8 : 1,
              shadowRadius: item.rarity === 'Común' ? 8 : item.rarity === 'Épico' ? 12 : 16,
              elevation: item.rarity === 'Común' ? 8 : item.rarity === 'Épico' ? 15 : 20,
            }
          ]}
        >
          <View style={[
            styles.headerSection,
            displaySeason?.name === 'Amanecer Dorado' && {
              backgroundColor: item.rarity === 'Común' ? 'rgba(139, 69, 19, 0.2)' : 
                               item.rarity === 'Épico' ? 'rgba(255, 140, 0, 0.25)' : 
                               'rgba(255, 215, 0, 0.3)',
              borderRadius: 8,
              marginBottom: 5,
              borderWidth: 1,
              borderColor: item.rarity === 'Común' ? 'rgba(139, 69, 19, 0.5)' : 
                           item.rarity === 'Épico' ? 'rgba(255, 140, 0, 0.6)' : 
                           'rgba(255, 215, 0, 0.7)',
            }
          ]}>
            <View style={styles.titleRow}>
              <Text style={[
                styles.stickerName,
                { fontSize: item.name.length > 12 ? 10 : item.name.length > 8 ? 12 : 14 }
              ]}>{item.name}</Text>
              <View style={[
                styles.rarityContainer,
                displaySeason?.name === 'Amanecer Dorado' && {
                  backgroundColor: item.rarity === 'Común' ? 'rgba(139, 69, 19, 0.3)' : 
                                   item.rarity === 'Épico' ? 'rgba(255, 140, 0, 0.4)' : 
                                   'rgba(255, 215, 0, 0.5)',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: item.rarity === 'Común' ? '#8B4513' : item.rarity === 'Épico' ? '#FF8C00' : '#FFD700',
                }
              ]}>
                <FontAwesome5 
                  name={displaySeason?.name === 'Amanecer Dorado' ? 
                    (item.rarity === 'Común' ? 'seedling' : item.rarity === 'Épico' ? 'fire' : 'crown') : 
                    'star'
                  } 
                  size={item.rarity === 'Común' ? 10 : item.rarity === 'Épico' ? 13 : 14} 
                  color={item.rarity === 'Común' ? '#8B4513' : item.rarity === 'Épico' ? '#FF4500' : '#B8860B'} 
                />
                <Text style={styles.rarityText}>{item.rarity}</Text>
              </View>
            </View>
            <Text style={styles.description}>{getDescription(item.rarity)}</Text>
          </View>
          
          <View style={styles.imageSection}>
            <TouchableOpacity 
              style={[
                styles.imageContainer,
                displaySeason?.name === 'Amanecer Dorado' && {
                  backgroundColor: item.rarity === 'Común' ? 'rgba(160, 82, 45, 0.9)' : 
                                   item.rarity === 'Épico' ? 'rgba(255, 165, 0, 0.9)' : 
                                   'rgba(184, 134, 11, 0.95)',
                  borderWidth: item.rarity === 'Común' ? 2 : item.rarity === 'Épico' ? 3 : 4,
                  borderColor: item.rarity === 'Común' ? '#8B4513' : item.rarity === 'Épico' ? '#FF8C00' : '#FFD700',
                  shadowColor: item.rarity === 'Común' ? '#8B4513' : item.rarity === 'Épico' ? '#FF8C00' : '#FFD700',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: item.rarity === 'Común' ? 4 : item.rarity === 'Épico' ? 6 : 8,
                  elevation: item.rarity === 'Común' ? 6 : item.rarity === 'Épico' ? 10 : 12,
                }
              ]}
              onPress={handleMusicPress}
              disabled={!isMusic || isLoading}
            >
              {isMusic ? (
                <Animated.View style={[styles.musicIconContainer, { transform: [{ rotate: spin }] }]}>
                  <MaterialIcons name="music-note" size={40} color="#8E44AD" />
                  <View style={styles.playOverlay}>
                    <MaterialIcons 
                      name={isLoading ? "hourglass-empty" : (isPlaying ? "pause" : "play-arrow")} 
                      size={20} 
                      color="#fff" 
                    />
                  </View>
                </Animated.View>
              ) : (
                <Image 
                  source={{ uri: item.imageUrl || item.audioUrl }}
                  style={styles.stickerImage}
                  contentFit="cover"
                />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.footerSection,
            displaySeason?.name === 'Amanecer Dorado' && {
              backgroundColor: item.rarity === 'Común' ? 'rgba(139, 69, 19, 0.2)' : 
                               item.rarity === 'Épico' ? 'rgba(255, 140, 0, 0.25)' : 
                               'rgba(255, 215, 0, 0.3)',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: item.rarity === 'Común' ? '#8B4513' : item.rarity === 'Épico' ? '#FF8C00' : '#FFD700',
            }
          ]}>
            <View style={styles.priceRow}>
              <MaterialIcons name="diamond" size={14} color="#FFD700" />
              <Text style={styles.priceText}>{item.price}</Text>
              <Text style={styles.priceLabel}>DIAMANTES</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.buyButton,
                ownedStickers.includes(item.id) && styles.ownedButton,
                isLoading && styles.disabledButton
              ]}
              onPress={() => isMusic ? handleMusicPress() : buySticker(item)}
              disabled={isLoading}
            >
              <Ionicons 
                name={ownedStickers.includes(item.id) ? (isMusic ? (isPlaying ? "pause" : "play") : "checkmark-circle") : "add-circle"} 
                size={13} 
                color="#fff" 
              />
              <Text style={styles.buyButtonText}>
                {isLoading ? 'CARGANDO...' :
                  ownedStickers.includes(item.id) ? 
                    (isMusic ? (isPlaying ? 'PAUSAR' : 'REPRODUCIR') : 'EN COLECCIÓN') : 
                    'ADQUIRIR'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};



  useEffect(() => {
    loadAllStickers();
    loadUserData();
  }, []);

  useEffect(() => {
    filterStickers();
  }, [selectedTab, allStickers]);

  const loadAllStickers = async () => {
    try {
      const stickersSnapshot = await getDocs(collection(db, 'stickers'));
      const stickersData = stickersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllStickers(stickersData);
    } catch (error) {
      console.error('Error loading stickers:', error);
    }
  };

  const filterStickers = () => {
    const firestoreTab = selectedTab === 'Personajes'
      ? ['Personajes', 'Stickers']
      : selectedTab === 'Stickers'
        ? ['StickerCarta']
        : [selectedTab];
    const filtered = allStickers.filter(s => firestoreTab.includes(s.category));
    setStickers(filtered);
  };

  const handleTabChange = async (tab) => {
    await stopMusic();
    setSelectedTab(tab);
  };

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserMoney(data.dinero || 0);
          setOwnedStickers(data.ownedStickers || []);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const buySticker = async (sticker) => {
    if (ownedStickers.includes(sticker.id)) {
      Alert.alert('Ya tienes este personaje', 'Este personaje ya está en tu colección');
      return;
    }

    if (userMoney < sticker.price) {
      Alert.alert('Dinero insuficiente', `Necesitas ${sticker.price} monedas`);
      return;
    }

    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, 'usuarios', user.uid), {
        dinero: userMoney - sticker.price,
        ownedStickers: arrayUnion(sticker.id)
      });

      setUserMoney(userMoney - sticker.price);
      setOwnedStickers([...ownedStickers, sticker.id]);
      Alert.alert('¡Compra exitosa!', `Has comprado ${sticker.name}`);
    } catch (error) {
      console.error('Error buying sticker:', error);
      Alert.alert('Error', 'No se pudo completar la compra');
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

  const getDescription = (rarity) => {
    if (selectedTab === 'Otros') {
      switch (rarity) {
        case 'Común': return 'Música ambiente relajante';
        case 'Épico': return 'Melodías épicas y envolventes';
        case 'Legendario': return 'Composiciones maestras únicas';
        default: return 'Sonidos perfectos para tu experiencia';
      }
    }
    
    switch (rarity) {
      case 'Común': return 'Personaje clásico y confiable';
      case 'Épico': return 'Criatura mágica con poderes especiales';
      case 'Legendario': return 'Ser único de poder extraordinario';
      default: return 'Compañero perfecto para tu aventura';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      
      <TabButtons 
        onExit={() => navigation?.navigate('main')}
        userMoney={userMoney}
        onAddSticker={() => setShowUploader(true)}
        onStopMusic={stopMusic}
      />
      
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['#071029', '#0b1b2b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={[
            styles.contentContainer,
            stickers.length === 4 && styles.contentContainerShifted
          ]}>
            <View style={[
              styles.gridContainer,
              stickers.length <= 3 && styles.gridContainerCentered
            ]}>
              {stickers.map((item, index) => (
                <AnimatedCard
                  key={item.id}
                  item={item}
                  index={index}
                  ownedStickers={ownedStickers}
                  buySticker={buySticker}
                  getCardGradient={(rarity) => getCardGradient(rarity, item.season)}
                  getDescription={getDescription}
                  selectedTab={selectedTab}
                  onPlayMusic={playMusic}
                  onStopMusic={stopMusic}
                  playingMusic={playingMusic}
                  isLoading={isLoading}
                  displaySeason={null}
                  totalStickers={stickers.length}
                />
              ))}
            </View>
          </View>

          <View style={styles.subTabContainer}>
            {['Personajes', 'Stickers', 'Emoticonos', 'Marcos', 'Insignias', 'Otros'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => handleTabChange(tab)}
                activeOpacity={0.7}
                style={styles.subTabButton}
              >
                <Text style={[styles.subTabText, selectedTab === tab && styles.subTabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>

      <StickerUploader
        visible={showUploader}
        onClose={() => setShowUploader(false)}
        onSuccess={loadAllStickers}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  subTabContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  subTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  subTabTextActive: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  contentContainer: {
    flex: 1,
    paddingLeft: 80,
    paddingRight: 15,
    paddingTop: 70,
  },
  contentContainerShifted: {
    paddingLeft: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  gridContainerCentered: {
    justifyContent: 'center',
  },
  card: {
    width: 170,
    marginBottom: 12,
  },
  cardExpanded: {
    width: 180,
    marginBottom: 16,
  },
  stickerCard: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerSection: {
    padding: 10,
    paddingBottom: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    minHeight: 18,
  },
  stickerName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: 80,
    numberOfLines: 2,
  },
  rarityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    width: 75,
    justifyContent: 'center',
  },
  rarityText: {
    color: '#FFD700',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  description: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 8,
    fontStyle: 'italic',
    marginBottom: 3,
    lineHeight: 11,
  },
  imageSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  imageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerImage: {
    width: 55,
    height: 55,
  },
  footerSection: {
    padding: 9,
    paddingTop: 7,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 2,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 6,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFD700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buyButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ownedButton: {
    backgroundColor: 'rgba(46,204,113,0.2)',
    borderColor: 'rgba(46,204,113,0.4)',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  musicIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  goldenCard: {
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.6)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 15,
  },
  goldenImageContainer: {
    backgroundColor: 'rgba(255, 248, 220, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  noSeasonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noSeasonCard: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  noSeasonTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  noSeasonSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default Tienda;
