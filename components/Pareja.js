import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';

const Avatar = ({ uri, nombre, size = 36 }) => {
  if (uri) return (
    <ExpoImage source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" cachePolicy="memory" />
  );
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarLetter}>{(nombre || '?')[0].toUpperCase()}</Text>
    </View>
  );
};

export default function Pareja() {
  const uid = auth.currentUser?.uid;
  const [pareja, setPareja] = useState(undefined); // undefined = cargando
  const [parejaData, setParejaData] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Escuchar campo pareja del usuario actual
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      setPareja(snap.data()?.pareja || null);
    });
    return unsub;
  }, [uid]);

  // Si tiene pareja, cargar sus datos
  useEffect(() => {
    if (!pareja) { setParejaData(null); return; }
    getDoc(doc(db, 'usuarios', pareja)).then(snap => {
      if (snap.exists()) setParejaData({ id: snap.id, ...snap.data() });
    }).catch(() => {});
  }, [pareja]);

  // Si no tiene pareja, cargar lista de usuarios
  useEffect(() => {
    if (pareja !== null) return;
    setLoading(true);
    getDocs(collection(db, 'usuarios')).then(snap => {
      const lista = snap.docs
        .filter(d => d.id !== uid)
        .map(d => ({ id: d.id, ...d.data() }));
      setUsuarios(lista);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pareja]);

  const [enviados, setEnviados] = useState({});

  const enviarInvitacion = async (destinatario) => {
    try {
      // Verificar si el destinatario ya tiene pareja
      const destSnap = await getDoc(doc(db, 'usuarios', destinatario.id));
      const tienePareja = !!destSnap.data()?.pareja;

      if (tienePareja) {
        // Avisar que tiene pareja pero igual preguntar — usamos global.showToast como confirmación simple
        // Como no hay Alert nativo aquí, enviamos igual con flag
        global.showToast?.({ text1: `${destinatario.nombre} ya tiene pareja. Invitación enviada igual.`, type: 'info' });
      }

      await addDoc(collection(db, 'invitaciones_pareja'), {
        de: uid,
        para: destinatario.id,
        timestamp: serverTimestamp(),
        estado: 'pendiente',
      });
      setEnviados(prev => ({ ...prev, [destinatario.id]: true }));
      global.showToast?.({ text1: 'Invitación enviada ✓', type: 'success' });
    } catch (e) {
      console.error('Error al enviar invitación:', e);
    }
  };

  if (pareja === undefined) return null;

  return (
    <View style={styles.wrap}>
      <ExpoImage
        source={require('../assets/temporadas/libro/panel1.png')}
        style={StyleSheet.absoluteFill}
        contentFit="fill"
        cachePolicy="memory"
      />

      {pareja && parejaData ? (
        // Tiene pareja — mostrar solo ella en la lista
        <View style={styles.listaWrap}>
          <View style={styles.usuarioRow}>
            <Avatar uri={parejaData.photoURL} nombre={parejaData.nombre} size={32} />
            <Text style={styles.usuarioNombre}>{parejaData.nombre}</Text>
            <View style={styles.onlineDot} />
          </View>
        </View>
      ) : (
        // Sin pareja — lista de usuarios
        <View style={styles.listaWrap}>
          {loading
            ? <ActivityIndicator color="#c9748f" />
            : (
              <FlatList
                data={usuarios}
                keyExtractor={i => i.id}
                style={styles.lista}
                renderItem={({ item }) => (
                  <View style={styles.usuarioRow}>
                    <Avatar uri={item.photoURL} nombre={item.nombre} size={32} />
                    <Text style={styles.usuarioNombre}>{item.nombre}</Text>
                    <TouchableOpacity style={[styles.addBtn, enviados[item.id] && styles.addBtnSent]} onPress={() => !enviados[item.id] && enviarInvitacion(item)} disabled={!!enviados[item.id]}>
                      <Text style={styles.addBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.vacio}>No hay usuarios</Text>}
              />
            )
          }
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: -50,
    top: '15%',
    width: 300,
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallback: {
    backgroundColor: 'rgba(201,116,143,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Con pareja
  parejaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  parejaTextos: { flex: 1 },
  parejaLabel: { fontSize: 9, color: '#c9748f', fontFamily: 'Globo' },
  parejaNombre: { fontSize: 13, color: '#5a2a3a', fontFamily: 'Globo', fontWeight: '700' },

  // Sin pareja
  listaWrap: { flex: 1, width: '100%', paddingHorizontal: 6, paddingTop: 26 },
  lista: { flex: 1 },
  usuarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingLeft: 88,
    marginTop: 6,
  },
  usuarioNombre: { width: 49.5, fontSize: 10, fontFamily: 'Globo', color: '#5a2a3a', marginLeft: 8, marginRight: 4 },
  addBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(201,116,143,0.2)',
    borderWidth: 1,
    borderColor: '#c9748f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnSent: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderColor: '#4CAF50',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  vacio: { fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 20 },
});
