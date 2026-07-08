import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useSeason } from '../SeasonContext';
import { useTheme } from '../ThemeContext';
import ThemeParticles from '../components/ThemeParticles';
import { getSeasonTemplates } from '../Coleccion';

const SeasonInfo = ({ navigation }) => {
  const { currentSeason, devSeason, scheduledSeason, isDevMode, seasons, changeSeason, changeDevSeason, toggleDevMode, getDaysSinceScheduled, getDisplaySeason } = useSeason();
  const { currentTheme, themes } = useTheme();
  const [seasonStickers, setSeasonStickers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [cardView, setCardView] = useState('templates');
  const [actionsView, setActionsView] = useState('stats');
  const [cardPage, setCardPage] = useState(0);
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const [selectorPage, setSelectorPage] = useState(0);
  const [selectorType, setSelectorType] = useState('public'); // 'public' o 'dev'
  const theme = themes[currentTheme];

  useEffect(() => {
    fetchSeasonStickers();
  }, [getDisplaySeason()]);

  const fetchSeasonStickers = async () => {
    try {
      const stickersSnapshot = await getDocs(collection(db, 'stickers'));
      const stickers = stickersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const filtered = stickers.filter(sticker => 
        sticker.season === getDisplaySeason()?.id
      );
      setSeasonStickers(filtered);
    } catch (error) {
      console.error('Error fetching season stickers:', error);
    }
  };

  const checkSeasonRequirements = () => {
    const categories = ['Stickers', 'Emoticonos', 'Marcos', 'Insignias'];
    const availableCategories = categories.filter(category => 
      seasonStickers.some(sticker => sticker.category === category)
    );
    return availableCategories.length >= 2;
  };

  const getDaysRemaining = () => {
    if (!currentSeason) return 0;
    const now = new Date();
    const end = new Date(currentSeason.endDate);
    const diffTime = end - now;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getCardGradient = (rarity) => {
    const displaySeason = getDisplaySeason();
    const templates = getSeasonTemplates(displaySeason?.id);
    
    if (templates) {
      return templates.gradients[rarity] || templates.gradients['Común'];
    }
    
    const baseGradients = {
      'Común': ['#2C3E50', '#34495E', '#5D6D7E'],
      'Épico': ['#8E44AD', '#9B59B6', '#BB8FCE'],
      'Legendario': ['#F39C12', '#E67E22', '#F7DC6F']
    };
    
    if (displaySeason) {
      const seasonColor = displaySeason.gradient[0];
      const rarityGradient = baseGradients[rarity] || baseGradients['Común'];
      return [seasonColor, ...rarityGradient.slice(1)];
    }
    
    return baseGradients[rarity] || baseGradients['Común'];
  };

  const renderAdminPage = () => (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      {/* Información Pública */}
      <View style={styles.compactSection}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="public" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Temporada Pública</Text>
        </View>
        <View style={styles.compactHeader}>
          <Text style={styles.seasonIcon}>{currentSeason?.icon || '🌅'}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.seasonName}>{currentSeason?.name || 'Sin temporada'} (T{currentSeason?.number})</Text>
            <View style={styles.quickStats}>
              <Text style={styles.quickStat}>📅 {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</Text>
              <Text style={styles.quickStat}>⏰ {getDaysRemaining()}d</Text>
              <Text style={styles.quickStat}>📦 {seasonStickers.length}</Text>
            </View>
            {scheduledSeason && (
              <View style={styles.scheduledInfo}>
                <Text style={styles.scheduledText}>✅ Activa: {scheduledSeason.name}</Text>
                <Text style={styles.scheduledDays}>📊 {getDaysSinceScheduled()} días</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={styles.programButton} 
          onPress={() => {
            setSelectorType('public');
            setShowSeasonSelector(true);
          }}
        >
          <MaterialIcons name="schedule" size={16} color="#fff" />
          <Text style={styles.programButtonText}>Programar para Todos</Text>
        </TouchableOpacity>
      </View>

      {/* Información de Desarrollo */}
      <View style={styles.compactSection}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="code" size={20} color="#FF9800" />
          <Text style={styles.sectionTitle}>Modo Desarrollo</Text>
          <TouchableOpacity style={styles.devToggle} onPress={toggleDevMode}>
            <MaterialIcons 
              name={isDevMode ? "visibility" : "visibility-off"} 
              size={16} 
              color={isDevMode ? "#4CAF50" : "rgba(255,255,255,0.5)"} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.compactHeader}>
          <Text style={styles.seasonIcon}>{devSeason?.icon || '🌅'}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.seasonName}>{devSeason?.name || 'Sin temporada'} (T{devSeason?.number})</Text>
            <View style={styles.quickStats}>
              <Text style={styles.quickStat}>🔧 Solo para ti</Text>
              <Text style={styles.quickStat}>👁️ {isDevMode ? 'Activo' : 'Inactivo'}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.devButton} 
          onPress={() => {
            setSelectorType('dev');
            setShowSeasonSelector(true);
          }}
        >
          <MaterialIcons name="build" size={16} color="#fff" />
          <Text style={styles.devButtonText}>Cambiar Vista Dev</Text>
        </TouchableOpacity>
      </View>

      {/* Información General */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <MaterialIcons name="category" size={18} color="#FF9800" />
            <Text style={styles.infoLabel}>Categorías</Text>
            <Text style={styles.infoValue}>{['Stickers', 'Emoticonos', 'Marcos', 'Insignias'].filter(cat => 
              seasonStickers.some(s => s.category === cat)
            ).length}/4</Text>
          </View>
          <View style={styles.infoCard}>
            <MaterialIcons name="music-note" size={18} color="#9C27B0" />
            <Text style={styles.infoLabel}>Música</Text>
            <Text style={styles.infoValue}>{seasonStickers.filter(s => s.category === 'Otros').length}</Text>
          </View>
          <View style={styles.infoCard}>
            <MaterialIcons name="star" size={18} color="#FFD700" />
            <Text style={styles.infoLabel}>Legendarios</Text>
            <Text style={styles.infoValue}>{seasonStickers.filter(s => s.rarity === 'Legendario').length}</Text>
          </View>
          <View style={styles.infoCard}>
            <MaterialIcons name="inventory" size={18} color="#2196F3" />
            <Text style={styles.infoLabel}>Total Items</Text>
            <Text style={styles.infoValue}>{seasonStickers.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('tienda')}>
          <MaterialIcons name="shopping-cart" size={18} color="#fff" />
          <Text style={styles.quickActionText}>Tienda</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderCardsPage = () => (
    <View style={styles.page}>
      <View style={styles.cardToggle}>
        <TouchableOpacity 
          style={[styles.toggleButton, cardView === 'templates' && styles.activeToggle]}
          onPress={() => setCardView('templates')}
        >
          <Text style={[styles.toggleText, cardView === 'templates' && styles.activeToggleText]}>Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, cardView === 'real' && styles.activeToggle]}
          onPress={() => setCardView('real')}
        >
          <Text style={[styles.toggleText, cardView === 'real' && styles.activeToggleText]}>Reales ({seasonStickers.length})</Text>
        </TouchableOpacity>
      </View>
      
      {cardView === 'templates' ? (
        <View style={styles.fullSection}>
          <View style={styles.templatesContainer}>
            <View style={styles.templatesGrid}>
              {['Común', 'Épico', 'Legendario'].slice(cardPage * 3, (cardPage * 3) + 3).map(rarity => (
                <View key={rarity} style={styles.templateCardLarge}>
                  <LinearGradient
                    colors={getCardGradient(rarity)}
                    style={[
                      styles.cardTemplateLarge,
                        getDisplaySeason()?.name === 'Amanecer Dorado' && (() => {
                          const templates = getSeasonTemplates(getDisplaySeason()?.id);
                          return templates ? {
                            borderWidth: rarity === 'Común' ? 2 : rarity === 'Épico' ? 3 : 4,
                            borderColor: templates.borders[rarity]?.color,
                            shadowColor: templates.borders[rarity]?.shadow,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: rarity === 'Común' ? 0.6 : rarity === 'Épico' ? 0.8 : 1,
                            shadowRadius: rarity === 'Común' ? 8 : rarity === 'Épico' ? 12 : 16,
                            elevation: rarity === 'Común' ? 8 : rarity === 'Épico' ? 15 : 20,
                          } : {};
                        })(),
                      getDisplaySeason()?.name === 'Espacio Nocturno' && {
                        borderWidth: rarity === 'Común' ? 2 : rarity === 'Épico' ? 3 : 4,
                        borderColor: rarity === 'Común' ? 'rgba(72, 61, 139, 0.8)' : 
                                     rarity === 'Épico' ? 'rgba(138, 43, 226, 0.9)' : 
                                     'rgba(106, 90, 205, 1)',
                        shadowColor: rarity === 'Común' ? '#483D8B' : rarity === 'Épico' ? '#8A2BE2' : '#6A5ACD',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: rarity === 'Común' ? 0.6 : rarity === 'Épico' ? 0.8 : 1,
                        shadowRadius: rarity === 'Común' ? 8 : rarity === 'Épico' ? 12 : 16,
                        elevation: rarity === 'Común' ? 8 : rarity === 'Épico' ? 15 : 20,
                      }
                    ]}
                  >
                    <View style={[
                      styles.templateHeaderLarge,
                      (() => {
                        const templates = getSeasonTemplates(getDisplaySeason()?.id);
                        return templates ? {
                          backgroundColor: templates.backgrounds[rarity],
                          borderRadius: 8,
                          marginBottom: 5,
                          borderWidth: 1,
                          borderColor: templates.borders[rarity]?.color,
                        } : {};
                      })(),
                    ]}>
                      <Text style={[
                        styles.templateNameLarge,
                        { fontSize: rarity.length > 8 ? 11 : 14 }
                      ]}>{rarity}</Text>
                      <View style={[
                        styles.rarityBadgeLarge,
                        (() => {
                          const templates = getSeasonTemplates(getDisplaySeason()?.id);
                          return templates ? {
                            backgroundColor: templates.backgrounds[rarity],
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: templates.borders[rarity]?.color,
                          } : {};
                        })(),
                      ]}>
                        <FontAwesome5 
                          name={(() => {
                            const templates = getSeasonTemplates(getDisplaySeason()?.id);
                            return templates ? templates.icons[rarity] : 'star';
                          })()} 
                          size={rarity === 'Común' ? 10 : rarity === 'Épico' ? 13 : 14} 
                          color={(() => {
                            const templates = getSeasonTemplates(getDisplaySeason()?.id);
                            return templates ? templates.iconColors[rarity] : '#FFD700';
                          })()} 
                        />
                      </View>
                    </View>
                    
                    <View style={[
                      styles.templateImageContainerLarge,
                      (() => {
                        const templates = getSeasonTemplates(getDisplaySeason()?.id);
                        return templates ? {
                          backgroundColor: templates.imageBackgrounds[rarity],
                          borderWidth: rarity === 'Común' ? 2 : rarity === 'Épico' ? 3 : 4,
                          borderColor: templates.borders[rarity]?.shadow,
                          shadowColor: templates.borders[rarity]?.shadow,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.6,
                          shadowRadius: rarity === 'Común' ? 4 : rarity === 'Épico' ? 6 : 8,
                          elevation: rarity === 'Común' ? 6 : rarity === 'Épico' ? 10 : 12,
                        } : {};
                      })(),
                    ]}>
                      <MaterialIcons 
                        name="image" 
                        size={rarity === 'Común' ? 35 : rarity === 'Épico' ? 40 : 45} 
                        color={(() => {
                          const templates = getSeasonTemplates(getDisplaySeason()?.id);
                          return templates ? templates.textColors[rarity] : '#ccc';
                        })()} 
                      />
                    </View>
                    
                    <View style={[
                      styles.templateFooterLarge,
                      (() => {
                        const templates = getSeasonTemplates(getDisplaySeason()?.id);
                        return templates ? {
                          backgroundColor: templates.backgrounds[rarity],
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: templates.borders[rarity]?.shadow,
                        } : {};
                      })(),
                    ]}>
                      <MaterialIcons name="diamond" size={14} color="#FFD700" />
                      <Text style={styles.templatePriceLarge}>{rarity === 'Común' ? '5' : rarity === 'Épico' ? '15' : '30'}</Text>
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </View>
            <View style={styles.navigationControls}>
              <TouchableOpacity 
                style={[styles.navArrow, cardPage === 0 && styles.disabledArrow]}
                onPress={() => setCardPage(Math.max(0, cardPage - 1))}
                disabled={cardPage === 0}
              >
                <MaterialIcons name="chevron-left" size={24} color={cardPage === 0 ? "rgba(255,255,255,0.3)" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navArrow, cardPage >= Math.ceil(['Común', 'Épico', 'Legendario'].length / 3) - 1 && styles.disabledArrow]}
                onPress={() => setCardPage(Math.min(Math.ceil(['Común', 'Épico', 'Legendario'].length / 3) - 1, cardPage + 1))}
                disabled={cardPage >= Math.ceil(['Común', 'Épico', 'Legendario'].length / 3) - 1}
              >
                <MaterialIcons name="chevron-right" size={24} color={cardPage >= Math.ceil(['Común', 'Épico', 'Legendario'].length / 3) - 1 ? "rgba(255,255,255,0.3)" : "#fff"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.fullSection}>
          {seasonStickers.length > 0 ? (
            <View style={styles.realCardsGridLarge}>
              {seasonStickers.map(sticker => (
                <View key={sticker.id} style={styles.realCardLarge}>
                  <LinearGradient
                    colors={getCardGradient(sticker.rarity)}
                    style={styles.cardTemplateLarge}
                  >
                    <View style={styles.templateHeaderLarge}>
                      <Text style={styles.templateNameLarge}>{sticker.name}</Text>
                      <View style={styles.rarityBadgeLarge}>
                        <FontAwesome5 name="star" size={8} color="#FFD700" />
                      </View>
                    </View>
                    
                    <View style={styles.templateImageContainerLarge}>
                      <Image 
                        source={{ uri: sticker.imageUrl }}
                        style={styles.realImageLarge}
                        contentFit="cover"
                      />
                    </View>
                    
                    <View style={styles.templateFooterLarge}>
                      <MaterialIcons name="diamond" size={14} color="#FFD700" />
                      <Text style={styles.templatePriceLarge}>{sticker.price}</Text>
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="inventory" size={60} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyStateText}>No hay stickers en esta temporada</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderActionsPage = () => (
    <View style={styles.page}>
      <View style={styles.cardToggle}>
        <TouchableOpacity 
          style={[styles.toggleButton, actionsView === 'stats' && styles.activeToggle]}
          onPress={() => setActionsView('stats')}
        >
          <Text style={[styles.toggleText, actionsView === 'stats' && styles.activeToggleText]}>Estadísticas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, actionsView === 'chart' && styles.activeToggle]}
          onPress={() => setActionsView('chart')}
        >
          <Text style={[styles.toggleText, actionsView === 'chart' && styles.activeToggleText]}>Distribución</Text>
        </TouchableOpacity>
      </View>
      
      {actionsView === 'stats' ? (
        <View style={styles.fullSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{seasonStickers.length}</Text>
              <Text style={styles.statLabel}>Stickers Totales</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="star" size={24} color="#FFD700" />
              <Text style={styles.statNumber}>{seasonStickers.filter(s => s.rarity === 'Legendario').length}</Text>
              <Text style={styles.statLabel}>Legendarios</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="schedule" size={24} color="#FF9800" />
              <Text style={styles.statNumber}>{getDaysRemaining()}</Text>
              <Text style={styles.statLabel}>Días Restantes</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="attach-money" size={24} color="#2196F3" />
              <Text style={styles.statNumber}>{seasonStickers.reduce((sum, s) => sum + (s.price || 0), 0)}</Text>
              <Text style={styles.statLabel}>Valor Total</Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.exportButton} onPress={() => Alert.alert('📊 Exportar', 'Datos exportados exitosamente')}>
              <MaterialIcons name="file-download" size={18} color="#fff" />
              <Text style={styles.exportText}>Exportar Datos</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.fullSection}>
          <View style={styles.rarityChartLarge}>
            <Text style={styles.chartTitleLarge}>Distribución por Rareza</Text>
            <View style={styles.chartBarsLarge}>
              {['Común', 'Épico', 'Legendario'].map(rarity => {
                const count = seasonStickers.filter(s => s.rarity === rarity).length;
                const percentage = seasonStickers.length > 0 ? (count / seasonStickers.length) * 100 : 0;
                return (
                  <View key={rarity} style={styles.chartItemLarge}>
                    <View style={styles.barContainerLarge}>
                      <View style={[styles.barLarge, { height: `${Math.max(percentage, 5)}%`, backgroundColor: rarity === 'Común' ? '#95a5a6' : rarity === 'Épico' ? '#9b59b6' : '#f39c12' }]} />
                    </View>
                    <Text style={styles.barLabelLarge}>{rarity}</Text>
                    <Text style={styles.barValueLarge}>{count} stickers</Text>
                    <Text style={styles.barPercentage}>{percentage.toFixed(1)}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderCurrentPage = () => {
    switch(currentPage) {
      case 0: return renderAdminPage();
      case 1: return renderCardsPage();
      case 2: return renderActionsPage();
      default: return renderAdminPage();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getDisplaySeason() ? getDisplaySeason().gradient : theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <ThemeParticles particleType={getDisplaySeason() ? getDisplaySeason().particles : theme.particles} />
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('main')}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.content}>
          {renderCurrentPage()}
        </View>
        
        <View style={styles.navigation}>
          <TouchableOpacity 
            style={[styles.navButton, currentPage === 0 && styles.activeNavButton]}
            onPress={() => setCurrentPage(0)}
          >
            <MaterialIcons name="settings" size={20} color={currentPage === 0 ? "#fff" : "rgba(255,255,255,0.6)"} />
            <Text style={[styles.navText, currentPage === 0 && styles.activeNavText]}>Admin</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, currentPage === 1 && styles.activeNavButton]}
            onPress={() => setCurrentPage(1)}
          >
            <MaterialIcons name="style" size={20} color={currentPage === 1 ? "#fff" : "rgba(255,255,255,0.6)"} />
            <Text style={[styles.navText, currentPage === 1 && styles.activeNavText]}>Cartas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, currentPage === 2 && styles.activeNavButton]}
            onPress={() => setCurrentPage(2)}
          >
            <MaterialIcons name="launch" size={20} color={currentPage === 2 ? "#fff" : "rgba(255,255,255,0.6)"} />
            <Text style={[styles.navText, currentPage === 2 && styles.activeNavText]}>Acciones</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      {showSeasonSelector && (
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorModal}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>
                {selectorType === 'public' ? '📅 Programar Temporada Pública' : '🔧 Cambiar Vista Desarrollo'}
              </Text>
              <TouchableOpacity onPress={() => setShowSeasonSelector(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.selectorContent}>
              {Object.entries(seasons).slice(selectorPage * 4, (selectorPage * 4) + 4).map(([key, season]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.seasonOption}
                  onPress={() => {
                    if (selectorType === 'public') {
                      changeSeason(key);
                      Alert.alert('✅ Temporada Programada', `Activa para todos: ${season.name}`);
                    } else {
                      changeDevSeason(key);
                      Alert.alert('🔧 Vista Desarrollo', `Solo tú ves: ${season.name}`);
                    }
                    setShowSeasonSelector(false);
                  }}
                >
                  <LinearGradient
                    colors={season.gradient}
                    style={styles.seasonOptionGradient}
                  >
                    <Text style={styles.seasonOptionIcon}>{season.icon}</Text>
                    <View style={styles.seasonOptionInfo}>
                      <Text style={styles.seasonOptionName}>{season.name}</Text>
                      <Text style={styles.seasonOptionNumber}>Temporada {season.number}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
            
            {Object.keys(seasons).length > 4 && (
              <View style={styles.selectorNavigation}>
                <TouchableOpacity 
                  style={[styles.selectorNavButton, selectorPage === 0 && styles.disabledNavButton]}
                  onPress={() => setSelectorPage(Math.max(0, selectorPage - 1))}
                  disabled={selectorPage === 0}
                >
                  <MaterialIcons name="chevron-left" size={20} color={selectorPage === 0 ? "rgba(255,255,255,0.3)" : "#fff"} />
                  <Text style={[styles.selectorNavText, selectorPage === 0 && styles.disabledNavText]}>Anterior</Text>
                </TouchableOpacity>
                
                <Text style={styles.selectorPageInfo}>{selectorPage + 1} / {Math.ceil(Object.keys(seasons).length / 4)}</Text>
                
                <TouchableOpacity 
                  style={[styles.selectorNavButton, selectorPage >= Math.ceil(Object.keys(seasons).length / 4) - 1 && styles.disabledNavButton]}
                  onPress={() => setSelectorPage(Math.min(Math.ceil(Object.keys(seasons).length / 4) - 1, selectorPage + 1))}
                  disabled={selectorPage >= Math.ceil(Object.keys(seasons).length / 4) - 1}
                >
                  <Text style={[styles.selectorNavText, selectorPage >= Math.ceil(Object.keys(seasons).length / 4) - 1 && styles.disabledNavText]}>Siguiente</Text>
                  <MaterialIcons name="chevron-right" size={20} color={selectorPage >= Math.ceil(Object.keys(seasons).length / 4) - 1 ? "rgba(255,255,255,0.3)" : "#fff"} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 45,
  },
  page: {
    flex: 1,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 5,
  },
  quickStat: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  seasonsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  seasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: '#fff',
  },
  chipIcon: {
    fontSize: 16,
  },
  chipName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  rarityChart: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chartTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 70,
  },
  chartItem: {
    alignItems: 'center',
    gap: 4,
  },
  barContainer: {
    height: 50,
    width: 18,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 18,
    borderRadius: 2,
  },
  barLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  barValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtons: {
    alignItems: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  exportText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  rarityChartLarge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flex: 1,
    justifyContent: 'center',
  },
  chartTitleLarge: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 30,
  },
  chartBarsLarge: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  chartItemLarge: {
    alignItems: 'center',
    gap: 8,
  },
  barContainerLarge: {
    height: 100,
    width: 30,
    justifyContent: 'flex-end',
  },
  barLarge: {
    width: 30,
    borderRadius: 4,
  },
  barLabelLarge: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  barValueLarge: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  barPercentage: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  cardToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  activeToggleText: {
    color: '#fff',
  },
  fullSection: {
    flex: 1,
  },
  templatesGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 10,
    marginLeft: 20,
  },
  templateCardLarge: {
    flex: 1,
  },
  cardTemplateLarge: {
    height: 200,
    borderRadius: 15,
    padding: 12,
    justifyContent: 'space-between',
  },
  templateHeaderLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 25,
  },
  templateNameLarge: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: 65,
    numberOfLines: 1,
  },
  rarityBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 55,
    justifyContent: 'center',
  },
  templateImageContainerLarge: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    backgroundColor: '#f8f9fa',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateFooterLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  templatePriceLarge: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  realCardsGridLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  realCardLarge: {
    width: '31%',
  },
  realImageLarge: {
    width: 45,
    height: 45,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  actionCard: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryAction: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  actionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  activeNavButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  activeNavText: {
    color: '#fff',
  },
  scheduledInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  scheduledText: {
    color: 'rgba(46,204,113,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  scheduledDays: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoCard: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  compactSection: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  programButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 10,
  },
  programButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,67,54,0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 10,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  devToggle: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 6,
  },
  templatesContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationControls: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 10,
    gap: 10,
  },
  navArrow: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  disabledArrow: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorModal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  selectorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  selectorContent: {
    padding: 20,
    gap: 12,
  },
  seasonOption: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  seasonOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 15,
  },
  seasonOptionIcon: {
    fontSize: 24,
  },
  seasonOptionInfo: {
    flex: 1,
  },
  seasonOptionName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  seasonOptionNumber: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  selectorNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  selectorNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    gap: 4,
  },
  disabledNavButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  selectorNavText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledNavText: {
    color: 'rgba(255,255,255,0.3)',
  },
  selectorPageInfo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SeasonInfo;