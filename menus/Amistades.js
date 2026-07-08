import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, arrayRemove, query, where, getDocs, deleteDoc } from 'firebase/firestore';

const Avatar = ({ name }) => {
  const initials = (name || 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  return (
    <View style={styles.avatar}>{/* simple circle with initials */}
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
};

export default function Amistades({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myFriends, setMyFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [message, setMessage] = useState(null);
  const [processingIds, setProcessingIds] = useState([]);
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!db) return;

    const usersCol = collection(db, 'usuarios');
    const unsubUsers = onSnapshot(usersCol, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // exclude self by default
      const filtered = list.filter(u => u.id !== currentUid);
      setUsers(filtered);
      setLoading(false);
    }, err => {
      console.error('users snapshot error', err);
      setLoading(false);
    });

    // listen to current user's document to get friends list
    let unsubMe = () => {};
    if (currentUid) {
      const meDoc = doc(db, 'usuarios', currentUid);
      unsubMe = onSnapshot(meDoc, snap => {
        const data = snap.data() || {};
        setMyFriends(data.amigos || []);
      }, err => console.error('me snapshot err', err));
    }

    // listen to outgoing pending requests so we can disable duplicate sends
    let unsubSent = () => {};
    if (currentUid) {
      const qSent = query(collection(db, 'friend_requests'), where('from', '==', currentUid), where('status', '==', 'pending'));
      unsubSent = onSnapshot(qSent, snap => {
        const ids = snap.docs.map(d => d.data().to).filter(Boolean);
        setSentRequests(ids);
      }, err => console.error('sent requests err', err));
    }

    return () => {
      try { unsubUsers(); } catch(e){}
      try { unsubMe(); } catch(e){}
      try { unsubSent(); } catch(e){}
    };
  }, [currentUid]);

  const handleAddFriend = async (friendId) => {
    if (!currentUid) return showMessage('Usuario no autenticado', 'error');
    if (myFriends.includes(friendId)) {
      showMessage('Ya son amigos', 'info');
      return;
    }

    if (sentRequests.includes(friendId)) {
      showMessage('Solicitud ya enviada', 'info');
      return;
    }

    // prevent duplicate taps
    setProcessingIds(p => [...p, friendId]);
    try {
      const docRef = await addDoc(collection(db, 'friend_requests'), {
        from: currentUid,
        fromName: auth.currentUser?.displayName || null,
        fromEmail: auth.currentUser?.email || null,
        to: friendId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSentRequests(s => [...s, friendId]);
      showMessage('Solicitud enviada', 'success');
    } catch (error) {
      console.error('add friend request error', error);
      showMessage('No se pudo enviar la solicitud', 'error');
    } finally {
      setProcessingIds(p => p.filter(id => id !== friendId));
    }
  };

  // show transient inline messages (no modal)
  const showMessage = (text, type = 'info', ms = 2300) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), ms);
  };

  const handleRemoveFriend = async (friendId) => {
    if (!currentUid) return showMessage('Usuario no autenticado', 'error');
    setProcessingIds(p => [...p, friendId]);
    try {
      // Actualización optimista
      setMyFriends(prev => prev.filter(id => id !== friendId));
      
      const myRef = doc(db, 'usuarios', currentUid);
      const friendRef = doc(db, 'usuarios', friendId);
      await updateDoc(myRef, { amigos: arrayRemove(friendId) });
      await updateDoc(friendRef, { amigos: arrayRemove(currentUid) });
      showMessage('Amigo eliminado', 'success');
    } catch (error) {
      console.error('remove friend error', error);
      showMessage('No se pudo eliminar amigo', 'error');
    } finally {
      setProcessingIds(p => p.filter(id => id !== friendId));
    }
  };

  const handleCancelRequest = async (friendId) => {
    if (!currentUid) return showMessage('Usuario no autenticado', 'error');
    setProcessingIds(p => [...p, friendId]);
    try {
      const qCancel = query(
        collection(db, 'friend_requests'),
        where('from', '==', currentUid),
        where('to', '==', friendId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(qCancel);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      setSentRequests(s => s.filter(id => id !== friendId));
      showMessage('Solicitud cancelada', 'success');
    } catch (error) {
      console.error('cancel request error', error);
      showMessage('No se pudo cancelar', 'error');
    } finally {
      setProcessingIds(p => p.filter(id => id !== friendId));
    }
  };

  

  const renderItem = ({ item }) => {
    const isFriend = myFriends.includes(item.id);
    const isRequested = sentRequests.includes(item.id);
    const isProcessing = processingIds.includes(item.id);
    return (
      <LinearGradient colors={[ 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)' ]} style={styles.card}>
        <View style={styles.row}>
          <Avatar name={item.nombre} />
          <View style={styles.info}>
            <Text style={styles.name}>{item.nombre || 'Sin nombre'}</Text>
            <Text style={styles.meta}>{item.genero || ''} • {item.edad || ''}</Text>
          </View>
          <View style={styles.actions}>
            {isFriend ? (
              <TouchableOpacity disabled={isProcessing} style={[styles.actionBtn, styles.removeBtn]} onPress={() => handleRemoveFriend(item.id)}>
                {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Eliminar</Text>}
              </TouchableOpacity>
            ) : isRequested ? (
              <TouchableOpacity disabled={isProcessing} style={[styles.actionBtn, styles.requestedBtn]} onPress={() => handleCancelRequest(item.id)}>
                {isProcessing ? <ActivityIndicator color="#5a3b00" /> : <Text style={[styles.actionText, { color: '#5a3b00' }]}>Cancelar</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={isProcessing} style={[styles.actionBtn, styles.addBtn]} onPress={() => handleAddFriend(item.id)}>
                {isProcessing ? <ActivityIndicator color="#081" /> : <Text style={styles.actionText}>Agregar</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5a83" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCompact}>
        <View style={styles.handle} />
        {message ? (
          <View style={[styles.messageBanner, message.type === 'success' ? styles.msgSuccess : message.type === 'error' ? styles.msgError : styles.msgInfo]}>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ) : null}
      </View>

      

      <FlatList
        data={users}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10, paddingTop: 2, paddingBottom: 80 }}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No se encontraron usuarios</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  headerCompact: { paddingTop: 6, paddingHorizontal: 12, paddingBottom: 6 },
  handle: { width: 64, height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 6, alignSelf: 'center', marginVertical: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 12, borderRadius: 12, marginBottom: 10, overflow: 'hidden', backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e6e6e6', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#333', fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  name: { color: '#111', fontSize: 16, fontWeight: '700' },
  meta: { color: '#666', fontSize: 12, marginTop: 4 },
  actions: { marginLeft: 8 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  addBtn: { backgroundColor: '#6be28a' },
  removeBtn: { backgroundColor: '#ff6b6b' },
  requestedBtn: { backgroundColor: 'rgba(252, 244, 229, 0.9)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  actionText: { color: '#080808', fontWeight: '700' },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#666' },
  emptyDebug: { color: '#999', fontSize: 12, marginTop: 6 },
  debugRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f6f6f6', borderBottomWidth: 1, borderBottomColor: '#eee' },
  debugRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6 },
  messageBanner: { marginTop: 8, alignSelf: 'stretch', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  msgSuccess: { backgroundColor: '#e6f9ef', borderWidth: 1, borderColor: '#34C759' },
  msgError: { backgroundColor: '#ffecec', borderWidth: 1, borderColor: '#ff6b6b' },
  msgInfo: { backgroundColor: '#fff8e6', borderWidth: 1, borderColor: '#f1d76b' },
  messageText: { color: '#333', fontWeight: '700', textAlign: 'center' }
});
