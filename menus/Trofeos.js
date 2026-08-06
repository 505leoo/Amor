import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import TabButtons from '../components/TabButtons';
import { useTrofeos } from '../TrofeosContext';
import { TROFEOS_DEF } from '../utils/trofeosDef';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_XP = 100;

const Trofeos = ({ navigation }) => {
  const { refreshTrofeos } = useTrofeos();

  const [xp, setXp] = useState(0);
  const [userData, setUserData] = useState(null);
  const [claimedTrofeos, setClaimedTrofeos] = useState([]);
  const [loading, setLoading] = useState(true);
  const progress = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, 'usuarios', uid));
      if (snap.exists()) {
        const data = snap.data();
        setXp(data.xp ?? 0);
        setUserData(data);
        setClaimedTrofeos(data.claimedTrofeos || []);
        Animated.timing(progress, {
          toValue: ((data.xp ?? 0) / MAX_XP) * 100,
          duration: 400,
          useNativeDriver: false,
        }).start();
      }
    } catch (e) {
      console.error('Error loading user:', e);
    } finally {
      setLoading(false);
    }
  };

  const awardXp = async (amount) => {
    const newXp = Math.min(MAX_XP, xp + amount);
    setXp(newXp);
    Animated.timing(progress, {
      toValue: (newXp / MAX_XP) * 100,
      duration: 500,
      useNativeDriver: false,
    }).start();

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await updateDoc(doc(db, 'usuarios', uid), { xp: newXp });
      refreshTrofeos();
    } catch (e) {
      console.error('Error saving XP:', e);
    }
  };

  const claimTrofeo = async (trofeoId, reward) => {
    const newXp = Math.min(MAX_XP * 100, xp + reward);
    const newClaimedTrofeos = [...claimedTrofeos, trofeoId];
    
    setXp(newXp);
    setClaimedTrofeos(newClaimedTrofeos);
    
    Animated.timing(progress, {
      toValue: ((newXp % MAX_XP) / MAX_XP) * 100,
      duration: 500,
      useNativeDriver: false,
    }).start();

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await updateDoc(doc(db, 'usuarios', uid), { 
        xp: newXp,
        claimedTrofeos: newClaimedTrofeos
      });
      refreshTrofeos();
    } catch (e) {
      console.error('Error claiming trofeo:', e);
    }
  };

  const getTrophyRank = () => {
    const level = Math.floor(xp / 100) + 1;
    const ranks = ['Bronce', 'Plata', 'Hierro', 'Oro', 'Diamante'];
    const rankIndex = Math.floor((level - 1) / 3);
    const subRank = ((level - 1) % 3) + 1;
    const rankName = ranks[Math.min(rankIndex, ranks.length - 1)];
    return `${rankName} ${subRank}`;
  };

  const getTrophyColors = () => {
    const level = Math.floor(xp / 100) + 1;
    const rankIndex = Math.floor((level - 1) / 3);
    const colorSets = [
      ['#CD7F32', '#8B4513', '#A0522D'], // Bronce
      ['#C0C0C0', '#A9A9A9', '#808080'], // Plata
      ['#708090', '#2F4F4F', '#696969'], // Hierro
      ['#FFD700', '#FFA500', '#DAA520'], // Oro
      ['#B9F2FF', '#87CEEB', '#4682B4'], // Diamante
    ];
    return colorSets[Math.min(rankIndex, colorSets.length - 1)];
  };

  const trophyColors = getTrophyColors();
  const trophyRank = getTrophyRank();
  const gradientColors = ['#071029', '#0b1b2b'];

  const resetProgress = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await updateDoc(doc(db, 'usuarios', uid), { 
        xp: 0,
        claimedTrofeos: []
      });
      setXp(0);
      setClaimedTrofeos([]);
      Animated.timing(progress, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start();
    } catch (e) {
      console.error('Error resetting progress:', e);
    }
  };

  const availableTrofeos = TROFEOS_DEF.filter(trofeo => 
    userData && trofeo.checkCompleted(userData) && !claimedTrofeos.includes(trofeo.id)
  ).slice(0, 2);

  const Trophy = () => (
    <View style={styles.trophyContainer}>
      {/* Trophy Cup */}
      <LinearGradient
        colors={trophyColors}
        style={styles.modernCup}
      >
        {/* Victory Star */}
        <Text style={styles.victorySymbol}>★</Text>
        
        {/* Clean Highlight */}
        <View style={styles.cleanHighlight} />
      </LinearGradient>

      {/* Rounded Trophy Handles (Manijas) */}
      <View style={styles.roundedHandleLeft} />
      <View style={styles.roundedHandleRight} />

      {/* Trophy Stem */}
      <LinearGradient
        colors={['#DAA520', '#B8860B']}
        style={styles.trophyStem}
      />

      {/* Trophy Base */}
      <LinearGradient
        colors={['#B8860B', '#8B7355']}
        style={styles.trophyBase}
      />
    </View>
  );

  const progressInterpolate = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <TabButtons
        onExit={() => navigation?.navigate('main')}
        userMoney={0}
        customAddButton={<View />}
        onStopMusic={null}
      />
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={gradientColors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.centerArea}>
              <Trophy />
              <Text style={styles.trophyLabel}>{trophyRank}</Text>

              <View style={styles.xpContainer}>
                <View style={styles.xpBarBg} />
                <Animated.View
                  style={[styles.xpBarFill, { width: progressInterpolate }]}
                />
                <Text style={styles.xpText}>
                  {xp}/{MAX_XP} XP
                </Text>
              </View>

              <View style={styles.sectionsContainer}>
                <View style={styles.missionsContainer}>
                  <Text style={styles.missionsTitle}>Misiones</Text>

                  {availableTrofeos.map((trofeo, index) => (
                    <View key={trofeo.id} style={styles.missionCard}>
                      <View style={styles.missionContent}>
                        <Text style={styles.missionTitle}>
                          {trofeo.title}
                        </Text>
                        <Text style={styles.missionDesc}>
                          {trofeo.description}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.missionBtn}
                        onPress={() => claimTrofeo(trofeo.id, trofeo.reward)}
                      >
                        <Text style={styles.missionBtnText}>
                          +{trofeo.reward} XP
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {availableTrofeos.length === 0 && (
                    <View style={styles.missionPlaceholder}>
                      <Text style={styles.missionPlaceholderText}>
                        No hay misiones disponibles
                      </Text>
                    </View>
                  )}

                  {availableTrofeos.length === 1 && (
                    <View style={styles.missionPlaceholder}>
                      <Text style={styles.missionPlaceholderText}>
                        Próxima misión
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.rewardsContainer}>
                  <Text style={styles.rewardsTitle}>Recompensas</Text>

                  <View style={styles.rewardCard}>
                    <View style={styles.rewardContent}>
                      <Text style={styles.rewardTitle}>
                        Copa de Oro
                      </Text>
                      <Text style={styles.rewardDesc}>
                        Completa todas las misiones
                      </Text>
                    </View>
                    <View style={styles.rewardBtn}>
                      <Text style={styles.rewardBtnText}>
                        Bloqueado
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rewardPlaceholder}>
                    <Text style={styles.rewardPlaceholderText}>
                      Próxima recompensa
                    </Text>
                  </View>
                </View>
              </View>


            </View>
          </ScrollView>
        </LinearGradient>
      </View>
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
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 60,
    alignItems: 'center',
  },
  centerArea: {
    width: '100%',
    alignItems: 'center',
  },

  /* Trophy */
  trophyContainer: {
    width: 160,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    marginTop: -8,
  },
  modernCup: {
    width: 100,
    height: 85,
    borderRadius: 12,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 2,
    borderColor: '#B8860B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  victorySymbol: {
    fontSize: 20,
    color: '#ffffffd3',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    position: 'relative',
  },
  cleanHighlight: {
    position: 'absolute',
    top: 15,
    left: 20,
    width: 20,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    transform: [{ rotate: '-15deg' }],
  },
  trophyStem: {
    width: 20,
    height: 40,
    borderRadius: 10,
    marginTop: -1,
    borderWidth: 1,
    borderColor: '#8B7355',
  },
  trophyBase: {
    width: 75,
    height: 20,
    borderRadius: 10,
    marginTop: -1,
    borderWidth: 1,
    borderColor: '#654321',
  },
  roundedHandleLeft: {
    position: 'absolute',
    left: 9.5,
    top: 50,
    width: 24,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: '#ccb637',
    borderRightWidth: 0,
  },
  roundedHandleRight: {
    position: 'absolute',
    right: 8,
    top: 50,
    width: 24,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: '#ccb637',
    borderLeftWidth: 0,
  },
  trophyLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: -39,
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    letterSpacing: 1,
  },

  /* XP Bar */
  xpContainer: {
    width: SCREEN_WIDTH * 0.5,
    marginTop: -15,
    alignItems: 'center',
  },
  xpBarBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: 'rgba(226, 226, 226, 0.28)',
    borderRadius: 8,
  },
  xpBarFill: {
    position: 'absolute',
    left: 0,
    height: 14,
    backgroundColor: '#7CFFB2',
    borderRadius: 8,
  },
  xpText: {
    color: '#747474',
    fontWeight: '800',
    marginTop: 4,
  },

  /* Sections Container */
  sectionsContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 0.8,
    marginTop: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    alignSelf: 'center',
  },

  /* Missions */
  missionsContainer: {
    flex: 1,
    marginRight: 5,
  },
  missionsTitle: {
    color: '#b8b8b8',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 12,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    height: 65,
  },
  missionContent: {
    flex: 1,
    paddingRight: 8,
  },
  missionTitle: {
    color: '#d6d4d4',
    fontWeight: '800',
    marginBottom: 4,
  },
  missionDesc: {
    color: 'rgba(207, 206, 206, 0.8)',
    fontSize: 12,
  },
  missionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  missionBtnClaimed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  missionBtnText: {
    color: '#04201a',
    fontWeight: '900',
    fontSize: 12,
  },
  missionPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  missionPlaceholderText: {
    color: 'rgba(228, 225, 225, 0.84)',
    fontWeight: '600',
  },

  /* Rewards */
  rewardsContainer: {
    flex: 1,
    marginLeft: 5,
  },
  rewardsTitle: {
    color: '#b3b3b3',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 12,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    height: 65,
  },
  rewardContent: {
    flex: 1,
    paddingRight: 8,
  },
  rewardTitle: {
    color: '#b3afaf',
    fontWeight: '800',
    marginBottom: 4,
  },
  rewardDesc: {
    color: 'rgba(207, 207, 207, 0.8)',
    fontSize: 12,
  },
  rewardBtn: {
    backgroundColor: 'rgba(255, 0, 0, 0.36)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  rewardBtnText: {
    color: 'rgba(240, 240, 240, 0.66)',
    fontWeight: '900',
    fontSize: 12,
  },
  rewardPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rewardPlaceholderText: {
    color: 'rgba(240,240,240,0.6)',
    fontWeight: '600',
  },

  /* Reset Button */
  resetBtn: {
    display: 'none',
  },
  testBtn: {
    display: 'none',
  },
  resetBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
});

export default Trofeos;