import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Animated, StatusBar, Modal, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, getDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import TabButtons from '../components/TabButtons';
import { useNewIndicator } from '../NewIndicatorContext';

const Avatar = ({ name }) => {
  const initials = (name || 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  return (
    <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
  );
};

export default function Buzon({ navigation }) {
  const { markBuzonVisited } = useNewIndicator();
  const [requests, setRequests] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [friends, setFriends] = useState([]);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [giftAmount, setGiftAmount] = useState('');
  const [giftTitle, setGiftTitle] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftColor, setGiftColor] = useState('#FF6B6B');
  const [userMoney, setUserMoney] = useState(0);
  const currentUid = auth.currentUser?.uid;

  const giftColors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#A8E6CF', '#FF8B94', '#C7CEEA'];

  const allItems = [...requests.map(r => ({ ...r, type: 'request' })), ...gifts.map(g => ({ ...g, type: 'gift' }))]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  // Quitar indicador "nuevo" del icono de Buzón en Hud2 al entrar aquí
  useEffect(() => {
    markBuzonVisited();
  }, [markBuzonVisited]);

  useEffect(() => {
    if (!currentUid) return;
    
    const requestsQuery = query(collection(db, 'friend_requests'), where('to', '==', currentUid), where('status', '==', 'pending'));
    const unsubRequests = onSnapshot(requestsQuery, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(list);
    });

    const giftsQuery = query(collection(db, 'gifts'), where('to', '==', currentUid));
    const unsubGifts = onSnapshot(giftsQuery, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGifts(list);
      
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1000);
    });

    const userDoc = doc(db, 'usuarios', currentUid);
    const unsubUser = onSnapshot(userDoc, async (snap) => {
      const data = snap.data() || {};
      setUserMoney(data.monedas || 0);
      const friendIds = data.amigos || [];
      
      if (friendIds.length > 0) {
        const friendsData = await Promise.all(
          friendIds.map(async (fid) => {
            const friendDoc = await getDoc(doc(db, 'usuarios', fid));
            return { id: fid, ...friendDoc.data() };
          })
        );
        setFriends(friendsData);
      } else {
        setFriends([]);
      }
    });

    return () => {
      unsubRequests();
      unsubGifts();
      unsubUser();
    };
  }, [currentUid]);

  const accept = async (req) => {
    try {
      const meRef = doc(db, 'usuarios', currentUid);
      const otherRef = doc(db, 'usuarios', req.from);
      await updateDoc(meRef, { amigos: arrayUnion(req.from) });
      await updateDoc(otherRef, { amigos: arrayUnion(currentUid) });
      await deleteDoc(doc(db, 'friend_requests', req.id));
      Alert.alert('Solicitud aceptada', 'Ahora sois amigos');
    } catch (error) {
      console.error('accept error', error);
      Alert.alert('Error', 'No se pudo aceptar la solicitud');
    }
  };

  const reject = async (req) => {
    try {
      await updateDoc(doc(db, 'friend_requests', req.id), { status: 'rejected' });
      Alert.alert('Solicitud rechazada');
    } catch (error) {
      console.error('reject error', error);
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    }
  };

  const sendGift = async () => {
    if (!selectedFriend) return;
    const amount = parseInt(giftAmount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Ingresa una cantidad válida');
    if (amount > userMoney) return Alert.alert('Error', 'No tienes suficientes monedas');
    if (!giftTitle.trim()) return Alert.alert('Error', 'Ingresa un título para el regalo');

    try {
      await updateDoc(doc(db, 'usuarios', currentUid), {
        monedas: increment(-amount)
      });
      
      await updateDoc(doc(db, 'usuarios', selectedFriend.id), {
        monedas: increment(amount)
      });
      
      await addDoc(collection(db, 'gifts'), {
        from: currentUid,
        fromName: auth.currentUser?.displayName || 'Anónimo',
        to: selectedFriend.id,
        amount,
        title: giftTitle,
        description: giftDescription || '',
        color: giftColor,
        createdAt: serverTimestamp()
      });
      
      Alert.alert('¡Regalo enviado!', `Has enviado ${amount} monedas a ${selectedFriend.nombre}`);
      setShowGiftModal(false);
      setShowFriendSelector(false);
      setGiftAmount('');
      setGiftTitle('');
      setGiftDescription('');
      setSelectedFriend(null);
    } catch (error) {
      console.error('send gift error', error);
      Alert.alert('Error', 'No se pudo enviar el regalo');
    }
  };

  const renderItem = ({ item }) => {
    if (item.type === 'request') {
      return (
        <View style={styles.requestCard}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <Avatar name={item.fromName || 'Usuario'} />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.fromName || 'Usuario'}</Text>
                <Text style={styles.userEmail}>{item.fromEmail || 'Sin email'}</Text>
              </View>
            </View>
            <View style={styles.requestBadge}>
              <MaterialIcons name="person-add" size={14} color="#667eea" />
              <Text style={styles.badgeText}>Solicitud</Text>
            </View>
          </View>
          
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.rejectButton} onPress={() => reject(item)}>
              <MaterialIcons name="close" size={16} color="#fff" />
              <Text style={styles.actionText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton} onPress={() => accept(item)}>
              <MaterialIcons name="check" size={16} color="#fff" />
              <Text style={styles.actionText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    if (item.type === 'gift') {
      return (
        <View style={[styles.requestCard, { borderLeftColor: item.color || '#FF6B6B' }]}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.giftIcon, { backgroundColor: item.color || '#FF6B6B' }]}>
                <MaterialIcons name="card-giftcard" size={20} color="#fff" />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.title || 'Regalo'}</Text>
                <Text style={styles.userEmail}>De: {item.fromName || 'Anónimo'}</Text>
              </View>
            </View>
            <View style={[styles.requestBadge, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="monetization-on" size={14} color="#FF9800" />
              <Text style={[styles.badgeText, { color: '#FF9800' }]}>{item.amount}</Text>
            </View>
          </View>
          
          {item.description && (
            <Text style={styles.giftDescription}>{item.description}</Text>
          )}
          
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.acceptButton, { backgroundColor: item.color || '#FF6B6B' }]}>
              <MaterialIcons name="favorite" size={16} color="#fff" />
              <Text style={styles.actionText}>¡Gracias!</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  const customGiftButton = (
    <TouchableOpacity 
      onPress={() => {
        if (friends.length === 0) {
          Alert.alert('Sin amigos', 'Necesitas tener amigos para enviar regalos');
        } else {
          setShowFriendSelector(true);
        }
      }}
      activeOpacity={0.7}
      style={styles.touchable}
    >
      <LinearGradient
        colors={['#FF6B6B', '#EE5A6F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.addButton}
      >
        <MaterialIcons name="card-giftcard" size={20} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      
      <TabButtons 
        onExit={() => navigation && navigation.navigate('main')}
        userMoney={userMoney}
        customAddButton={customGiftButton}
      />
      
      <View style={styles.content}>
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={allItems}
              keyExtractor={i => i.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <MaterialIcons name="inbox" size={80} color="#E0E0E0" />
                  <Text style={styles.emptyText}>No tienes notificaciones</Text>
                </View>
              )}
            />
          </Animated.View>
        </View>

      <Modal
        visible={showFriendSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFriendSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.compactModal}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="card-giftcard" size={24} color="#667eea" />
              <Text style={styles.modalTitle}>Enviar Regalo</Text>
              <TouchableOpacity onPress={() => setShowFriendSelector(false)}>
                <MaterialIcons name="close" size={20} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.leftPanel}>
                <View style={styles.quickSection}>
                  <Text style={styles.quickLabel}>Para:</Text>
                  <View style={styles.friendsRow}>
                    {friends.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.friendChip, selectedFriend?.id === item.id && styles.chipSelected]}
                        onPress={() => setSelectedFriend(item)}
                      >
                        <Text style={[styles.chipText, selectedFriend?.id === item.id && styles.chipTextSelected]}>
                          {(item.nombre || 'Amigo').split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {selectedFriend && (
                  <>
                    <View style={styles.quickSection}>
                      <Text style={styles.quickLabel}>Cantidad:</Text>
                      <View style={styles.quickInputs}>
                        {[50, 100, 200, 500].map(amount => (
                          <TouchableOpacity
                            key={amount}
                            style={[styles.amountChip, giftAmount === amount.toString() && styles.chipSelected]}
                            onPress={() => setGiftAmount(amount.toString())}
                          >
                            <Text style={[styles.chipText, giftAmount === amount.toString() && styles.chipTextSelected]}>
                              {amount}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TextInput
                          style={styles.customAmount}
                          placeholder="Otro"
                          keyboardType="numeric"
                          value={!["50", "100", "200", "500"].includes(giftAmount) ? giftAmount : ''}
                          onChangeText={setGiftAmount}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.quickSection}>
                      <Text style={styles.quickLabel}>Mensaje:</Text>
                      <TextInput
                        style={styles.quickInput}
                        placeholder="¡Feliz cumpleaños!"
                        value={giftTitle}
                        onChangeText={setGiftTitle}
                        maxLength={30}
                      />
                    </View>
                    
                    <View style={styles.quickSection}>
                      <Text style={styles.quickLabel}>Color:</Text>
                      <View style={styles.colorRow}>
                        {giftColors.map(color => (
                          <TouchableOpacity
                            key={color}
                            style={[styles.colorDot, { backgroundColor: color }, giftColor === color && styles.colorSelected]}
                            onPress={() => setGiftColor(color)}
                          />
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </View>
              
              {selectedFriend && giftAmount && giftTitle && (
                <View style={styles.rightPanel}>
                  <Text style={styles.previewLabel}>Vista previa:</Text>
                  <View style={[styles.giftPreview, { backgroundColor: giftColor }]}>
                    <MaterialIcons name="card-giftcard" size={32} color="#fff" />
                    <Text style={styles.previewAmount}>{giftAmount}</Text>
                    <Text style={styles.previewCoins}>monedas</Text>
                  </View>
                  <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>{giftTitle}</Text>
                    <Text style={styles.previewFrom}>De: {auth.currentUser?.displayName || 'Tú'}</Text>
                    <Text style={styles.previewTo}>Para: {selectedFriend.nombre}</Text>
                  </View>
                  
                  <TouchableOpacity style={[styles.sendBtn, { backgroundColor: giftColor }]} onPress={sendGift}>
                    <MaterialIcons name="send" size={18} color="#fff" />
                    <Text style={styles.sendBtnText}>Enviar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    marginTop: 70,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  userEmail: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  requestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#667eea',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  giftIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginBottom: 12,
    paddingLeft: 4,
  },
  compactModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '95%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalBody: {
    flexDirection: 'row',
    minHeight: 300,
  },
  leftPanel: {
    flex: 1,
    padding: 16,
  },
  rightPanel: {
    width: 140,
    padding: 16,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  quickSection: {
    marginBottom: 16,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  friendsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  friendChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  chipSelected: {
    backgroundColor: '#667eea',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
  },
  chipTextSelected: {
    color: '#fff',
  },
  quickInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  amountChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  customAmount: {
    width: 50,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    fontSize: 12,
    textAlign: 'center',
  },
  quickInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#2C3E50',
    transform: [{ scale: 1.2 }],
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
  },
  giftPreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  previewCoins: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.9,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 4,
  },
  previewFrom: {
    fontSize: 9,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  previewTo: {
    fontSize: 9,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 14,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#7F8C8D',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  touchable: {
    pointerEvents: 'auto',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
});
