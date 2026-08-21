import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Animated, StatusBar, Modal, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, getDoc, addDoc, serverTimestamp, increment, setDoc } from 'firebase/firestore';
import TabButtons from '../components/TabButtons';

const BUZON_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const expiraEn = () => new Date(Date.now() + BUZON_RETENTION_MS);

const Avatar = ({ name }) => {
  const initials = (name || 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  return (
    <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
  );
};

const tiempoAviso = timestamp => {
  const segundos = timestamp?.seconds;
  if (!segundos) return 'Ahora';
  const minutos = Math.max(0, Math.floor(Date.now() / 60000 - segundos / 60));
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
};

// Modal compacto para el acceso rápido de Inicio. Buzón conserva su pantalla
// completa para las herramientas administrativas ya existentes.
export const BuzonModal = ({ visible, onClose }) => {
  const [mensajes, setMensajes] = useState([]);
  const [solicitudesPareja, setSolicitudesPareja] = useState([]);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [procesandoSolicitud, setProcesandoSolicitud] = useState(false);
  const [credito, setCredito] = useState(null);
  const [ahora, setAhora] = useState(Date.now());
  const [pagina, setPagina] = useState(0);
  const swipeStart = useRef(null);
  const cardsFade = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const modalWidth = Math.min(Math.max(screenWidth - 32, 320), 360);
  const gridWidth = modalWidth - 16;
  const tileWidth = Math.floor((gridWidth - 12) / 3);
  const tileHeight = 60;
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    return onSnapshot(query(collection(db, 'buzon'), where('para', '==', uid)), snap => {
      const nuevosMensajes = snap.docs.map(item => ({ id: item.id, ...item.data() }));
      setMensajes(nuevosMensajes);
      // La misión pertenece al usuario que recibe la notificación. Se marca
      // desde su propio buzón para no depender de permisos sobre otra cuenta.
      if (nuevosMensajes.some(mensaje => mensaje.tipo === 'pareja_conectada')) {
        const ahora = new Date();
        const diaKey = `${ahora.getFullYear()}-${ahora.getMonth() + 1}-${ahora.getDate()}`;
        setDoc(doc(db, 'usuarios', uid, 'misiones', diaKey), {
          progreso: { pareja_entro_hoy: 1 },
        }, { merge: true }).catch(() => {});
      }
    }, () => setMensajes([]));
  }, [visible]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    return onSnapshot(query(collection(db, 'invitaciones_pareja'), where('para', '==', uid), where('estado', '==', 'pendiente')), async snap => {
      const solicitudes = await Promise.all(snap.docs.map(async invitacion => {
        const data = invitacion.data();
        const remitente = await getDoc(doc(db, 'usuarios', data.de));
        return { id: invitacion.id, ...data, remitente: remitente.data() || {} };
      }));
      setSolicitudesPareja(solicitudes);
    }, () => setSolicitudesPareja([]));
  }, [visible]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid), snap => {
      setCredito(snap.data()?.comercio?.mentaCredito || null);
    }, () => setCredito(null));
  }, [visible]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid, 'comercio', 'estado'), snap => {
      if (snap.exists()) setCredito(snap.data()?.mentaCredito || null);
    }, () => {});
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const interval = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    cardsFade.setValue(0);
    Animated.timing(cardsFade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    return undefined;
  }, [visible]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid || !credito?.activo || Number(credito.restante) <= 0 || !credito.creditoId) return undefined;
    const diaKey = new Date().toISOString().slice(0, 10);
    const deudaRef = doc(db, 'buzon', `mentita-deuda-${uid}-${diaKey}`);
    let cancelado = false;
    getDoc(deudaRef).then(snap => {
      if (cancelado || snap.exists()) return;
      const vencida = Date.now() > Number(credito.vencimientoMs);
      const dias = Math.max(0, Math.ceil((Number(credito.vencimientoMs) - Date.now()) / 86400000));
      return setDoc(deudaRef, {
        para: uid,
        tipo: 'deuda',
        creditoId: credito.creditoId || null,
        fase: 'diaria',
        deudaDia: diaKey,
        creadoEn: serverTimestamp(),
        expiraEn: expiraEn(),
        leido: false,
        texto: vencida
          ? 'Mentita quiere que saldes tu deuda. Ya esta vencida.'
          : `Mentita quiere que saldes tu deuda. Te quedan ${dias} ${dias === 1 ? 'dia' : 'dias'}.`,
      });
    }).catch(() => {});
    return () => { cancelado = true; };
  }, [visible, credito?.activo, credito?.restante, credito?.vencimientoMs]);

  const avisosAgrupados = mensajes.reduce((grupos, mensaje) => {
    const clave = mensaje.tipo === 'deuda'
      ? `deuda|${mensaje.fase || 'diaria'}`
      : mensaje.tipo === 'regalo'
      ? `regalo|${mensaje.regaloTipo || 'regalo'}`
      : `mensaje|${mensaje.texto || 'aviso'}`;
    if (!grupos[clave]) grupos[clave] = { ...mensaje, repeticiones: 0 };
    grupos[clave].repeticiones += 1;
    if ((mensaje.creadoEn?.seconds || 0) > (grupos[clave].creadoEn?.seconds || 0)) grupos[clave] = { ...grupos[clave], ...mensaje };
    return grupos;
  }, {});
  const avisosMensajes = mensajes.length ? Object.values(avisosAgrupados).map(mensaje => ({
    id: mensaje.id,
    icon: mensaje.tipo === 'deuda' ? 'account-balance-wallet' : mensaje.tipo === 'regalo' ? 'card-giftcard' : 'mail-outline',
    seccion: mensaje.tipo === 'deuda' ? (mensaje.fase === 'aviso' ? 'aviso' : 'deuda') : mensaje.tipo === 'regalo' ? 'regalo' : 'aviso',
    titulo: mensaje.tipo === 'deuda' ? (mensaje.fase === 'aviso' ? 'Aviso' : 'Deuda') : mensaje.tipo === 'deuda_saldada' ? 'Deuda saldada' : mensaje.tipo === 'pareja_confirmada' ? 'Pareja confirmada' : mensaje.tipo === 'pareja_conectada' ? 'Pareja conectada' : mensaje.tipo === 'bienvenida_menta' ? 'Bienvenida de Menta' : mensaje.tipo === 'regalo'
      ? `Regalos de ${mensaje.regaloTipo || 'especial'}`
      : 'Mensaje de Mentita',
    texto: mensaje.tipo === 'deuda' ? mensaje.texto : mensaje.tipo === 'deuda_saldada' ? mensaje.texto : mensaje.tipo === 'pareja_confirmada' ? mensaje.texto : mensaje.tipo === 'pareja_conectada' ? mensaje.texto : mensaje.tipo === 'bienvenida_menta' ? mensaje.texto : mensaje.tipo === 'regalo'
      ? (mensaje.texto || `Tienes un regalo de ${mensaje.regaloTipo || 'especial'}.`)
      : (mensaje.texto || 'Tienes un nuevo aviso en tu buzón.'),
    tiempo: tiempoAviso(mensaje.creadoEn),
    repeticiones: mensaje.repeticiones,
    creadoEn: mensaje.creadoEn,
  })).sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0)) : [];
  const avisosPareja = solicitudesPareja.map(solicitud => ({
    id: `pareja-${solicitud.id}`,
    seccion: 'aviso',
    titulo: 'Solicitud de pareja',
    texto: `${solicitud.remitente?.nombre || 'Alguien'} ha solicitado ser tu pareja.`,
    tiempo: tiempoAviso(solicitud.timestamp),
    solicitud,
    creadoEn: solicitud.timestamp,
  }));
  const avisosDisponibles = [...avisosMensajes, ...avisosPareja].sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
  const avisos = avisosDisponibles.length ? avisosDisponibles : [{
    id: 'buzon-vacio',
    icon: 'inbox',
    titulo: 'Buzón vacío',
    texto: 'Aún no tienes avisos nuevos.',
    tiempo: 'Ahora',
  }];
  const paginas = avisos.reduce((resultado, aviso, index) => {
    const bloque = Math.floor(index / 9);
    if (!resultado[bloque]) resultado[bloque] = [];
    resultado[bloque].push(aviso);
    return resultado;
  }, []);

  const aceptarSolicitud = async () => {
    const solicitud = solicitudSeleccionada?.solicitud;
    const uid = auth.currentUser?.uid;
    if (!solicitud || !uid || procesandoSolicitud) return;
    setProcesandoSolicitud(true);
    try {
      const miSnap = await getDoc(doc(db, 'usuarios', uid));
      const miPareja = miSnap.data()?.pareja;
      if (miPareja) {
        await setDoc(doc(db, 'usuarios', uid), { pareja: null }, { merge: true });
        await setDoc(doc(db, 'usuarios', miPareja), { pareja: null }, { merge: true });
      }
      await setDoc(doc(db, 'usuarios', uid), { pareja: solicitud.de }, { merge: true });
      await setDoc(doc(db, 'usuarios', solicitud.de), { pareja: uid }, { merge: true });
      await addDoc(collection(db, 'buzon'), {
        para: uid,
        tipo: 'pareja_confirmada',
        creadoEn: serverTimestamp(),
        expiraEn: expiraEn(),
        leido: false,
        texto: 'Ahora son pareja por el resto de la eternidad.',
      });
      await deleteDoc(doc(db, 'invitaciones_pareja', solicitud.id));
      setSolicitudSeleccionada(null);
      global.showToast?.({ text1: 'Ahora son pareja', type: 'success' });
    } catch (error) {
      global.showToast?.({ text1: 'No se pudo aceptar la solicitud.', type: 'error' });
    } finally {
      setProcesandoSolicitud(false);
    }
  };

  const rechazarSolicitud = async () => {
    const solicitud = solicitudSeleccionada?.solicitud;
    if (!solicitud || procesandoSolicitud) return;
    setProcesandoSolicitud(true);
    try {
      await deleteDoc(doc(db, 'invitaciones_pareja', solicitud.id));
      setSolicitudSeleccionada(null);
    } catch (error) {
      global.showToast?.({ text1: 'No se pudo rechazar la solicitud.', type: 'error' });
    } finally {
      setProcesandoSolicitud(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={modalRapido.overlay}>
        <TouchableOpacity style={modalRapido.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={modalRapido.position}>
          <View style={[modalRapido.card, { width: modalWidth }]}>
            <View style={modalRapido.header}>
              <View style={modalRapido.headerIcon}><MaterialIcons name="mail-outline" size={24} color="#fff8dc" /></View>
              <View style={modalRapido.headerInfo}><Text style={modalRapido.title}>BUZÓN</Text><Text style={modalRapido.subtitle}>REGALOS · INVITACIONES · MENSAJES</Text></View>
              <TouchableOpacity style={modalRapido.close} onPress={onClose} hitSlop={8}><MaterialIcons name="close" size={18} color="#76552f" /></TouchableOpacity>
            </View>
            <View style={modalRapido.carousel}>
              <View
                style={modalRapido.touchArea}
                onStartShouldSetResponder={() => true}
                onResponderGrant={({ nativeEvent }) => { swipeStart.current = nativeEvent.pageY; }}
                onResponderRelease={({ nativeEvent }) => {
                  const distancia = nativeEvent.pageY - swipeStart.current;
                  if (Math.abs(distancia) > 25 && paginas.length > 1) {
                    setPagina(actual => distancia < 0 ? (actual + 1) % paginas.length : (actual - 1 + paginas.length) % paginas.length);
                  }
                  swipeStart.current = null;
                }}
              >
                <View style={[modalRapido.page, { width: gridWidth }]}>
                  <View style={modalRapido.list}>
                    {(paginas[pagina] || []).map(aviso => <Animated.View key={aviso.id || aviso.titulo} style={{ opacity: cardsFade }}>
                      <TouchableOpacity disabled={!aviso.solicitud} activeOpacity={0.78} onPress={() => aviso.solicitud && setSolicitudSeleccionada(aviso)} style={[modalRapido.item, modalRapido[`item${aviso.seccion ? aviso.seccion[0].toUpperCase() + aviso.seccion.slice(1) : 'Aviso'}`], { width: tileWidth, height: tileHeight }]}>
                      {aviso.repeticiones > 1 && <View style={[modalRapido.repeatBadge, modalRapido[`badge${aviso.seccion ? aviso.seccion[0].toUpperCase() + aviso.seccion.slice(1) : 'Aviso'}`]]}><Text style={modalRapido.repeatBadgeText}>x{aviso.repeticiones}</Text></View>}
                      <Text style={[modalRapido.itemTime, modalRapido[`badge${aviso.seccion ? aviso.seccion[0].toUpperCase() + aviso.seccion.slice(1) : 'Aviso'}`]]}>{aviso.tiempo || 'Ahora'}</Text>
                      <View style={modalRapido.itemInfo}><Text style={modalRapido.itemTitle} numberOfLines={2}>{aviso.titulo}</Text><Text style={modalRapido.itemText} numberOfLines={4}>{aviso.texto}</Text></View>
                      </TouchableOpacity>
                    </Animated.View>)}
                  </View>
                </View>
              </View>
              {paginas.length > 1 && <View style={modalRapido.indicators}>{paginas.map((_, index) => <View key={index} style={[modalRapido.indicator, pagina === index && modalRapido.indicatorActive]} />)}</View>}
            </View>
          </View>
        </View>
      </View>
      <Modal visible={!!solicitudSeleccionada} transparent animationType="fade" onRequestClose={() => !procesandoSolicitud && setSolicitudSeleccionada(null)}>
        <View style={modalRapido.solicitudOverlay}>
          <View style={modalRapido.solicitudCard}>
            <Text style={modalRapido.solicitudTitle}>Solicitud de pareja</Text>
            <Text style={modalRapido.solicitudText}>{solicitudSeleccionada?.texto}</Text>
            <Text style={modalRapido.solicitudHint}>¿Quieres compartir este camino con esa persona?</Text>
            <View style={modalRapido.solicitudActions}>
              <TouchableOpacity disabled={procesandoSolicitud} onPress={rechazarSolicitud} style={modalRapido.rechazarBtn}><Text style={modalRapido.rechazarText}>RECHAZAR</Text></TouchableOpacity>
              <TouchableOpacity disabled={procesandoSolicitud} onPress={aceptarSolicitud} style={modalRapido.aceptarBtn}><Text style={modalRapido.aceptarText}>ACEPTAR</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default function Buzon({ navigation }) {
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
  const [credito, setCredito] = useState(null);
  const [ahora, setAhora] = useState(Date.now());
  const [pagina, setPagina] = useState(0);
  const [invitacionesPareja, setInvitacionesPareja] = useState([]);
  const currentUid = auth.currentUser?.uid;

  const giftColors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#A8E6CF', '#FF8B94', '#C7CEEA'];

  const tiempoDeuda = credito?.activo && Number(credito.restante) > 0
    ? Math.max(0, Math.ceil((Number(credito.vencimientoMs) - ahora) / 86400000))
    : 0;
  const deudaItem = credito?.activo && Number(credito.restante) > 0 ? [{
    id: `deuda-${Math.floor(ahora / 86400000)}`,
    type: 'debt',
    restante: Number(credito.restante),
    dias: tiempoDeuda,
    vencida: ahora > Number(credito.vencimientoMs),
    createdAt: { seconds: Math.floor(ahora / 1000) },
  }] : [];
  const groupedGifts = Object.values(gifts.reduce((groups, gift) => {
    const key = `${gift.fromName || 'Anónimo'}|${gift.title || 'Regalo'}|${gift.amount || 0}`;
    if (!groups[key]) groups[key] = { ...gift, count: 0 };
    groups[key].count += 1;
    if ((gift.createdAt?.seconds || 0) > (groups[key].createdAt?.seconds || 0)) groups[key].createdAt = gift.createdAt;
    return groups;
  }, {}));
  const allItems = [...requests.map(r => ({ ...r, type: 'request' })), ...groupedGifts.map(g => ({ ...g, type: 'gift' })), ...deudaItem]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const paginas = allItems.reduce((resultado, item, index) => {
    const bloque = Math.floor(index / 9);
    if (!resultado[bloque]) resultado[bloque] = [];
    resultado[bloque].push(item);
    return resultado;
  }, []);

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
      setCredito(data.comercio?.mentaCredito || null);
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
    const unsubComercio = onSnapshot(doc(db, 'usuarios', currentUid, 'comercio', 'estado'), snap => {
      if (snap.exists()) setCredito(snap.data()?.mentaCredito || null);
    }, () => {});

    // Invitaciones de pareja
    const invQuery = query(collection(db, 'invitaciones_pareja'), where('para', '==', currentUid), where('estado', '==', 'pendiente'));
    const unsubInv = onSnapshot(invQuery, async snap => {
      const lista = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        const remSnap = await getDoc(doc(db, 'usuarios', data.de));
        return { id: d.id, ...data, remitente: remSnap.data() };
      }));
      setInvitacionesPareja(lista);
    });

    return () => {
      unsubRequests();
      unsubGifts();
      unsubUser();
      unsubComercio();
      unsubInv();
    };
  }, [currentUid]);

  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const aceptarPareja = async (inv) => {
    try {
      const miSnap = await getDoc(doc(db, 'usuarios', currentUid));
      const miPareja = miSnap.data()?.pareja;
      if (miPareja) {
        // Separarse de la pareja actual primero
        await setDoc(doc(db, 'usuarios', currentUid), { pareja: null }, { merge: true });
        await setDoc(doc(db, 'usuarios', miPareja), { pareja: null }, { merge: true });
      }
      await setDoc(doc(db, 'usuarios', currentUid), { pareja: inv.de }, { merge: true });
      await setDoc(doc(db, 'usuarios', inv.de), { pareja: currentUid }, { merge: true });
      await deleteDoc(doc(db, 'invitaciones_pareja', inv.id));
      global.showToast?.({ text1: '¡Ahora son pareja!', type: 'success' });
    } catch (e) {
      console.error('Error al aceptar pareja:', e);
    }
  };

  const rechazarPareja = async (inv) => {
    try {
      await deleteDoc(doc(db, 'invitaciones_pareja', inv.id));
    } catch (e) {
      console.error('Error al rechazar pareja:', e);
    }
  };

  const tiempoRelativo = (ts) => {
    if (!ts?.seconds) return '';
    const diff = Math.floor((Date.now() / 1000) - ts.seconds);
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} d`;
  };

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
    if (item.type === 'debt') {
      return (
        <View style={[styles.requestCard, styles.debtCard, item.vencida && styles.debtCardLate]}>
          <View style={styles.debtIcon}><MaterialIcons name="account-balance-wallet" size={22} color="#fff" /></View>
          <Text style={styles.debtTitle}>Mentita te recuerda</Text>
          <Text style={styles.debtAmount}>🪙 {item.restante}</Text>
          <Text style={styles.debtText}>{item.vencida ? 'Tu deuda está vencida.' : `Faltan ${item.dias} ${item.dias === 1 ? 'día' : 'días'} para saldarla.`}</Text>
          <Text style={styles.cardTime}>hoy</Text>
        </View>
      );
    }
    if (item.type === 'request') {
      return (
        <View style={[styles.requestCard, styles.gridCard]}>
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
        <View style={[styles.requestCard, styles.gridCard, { borderLeftColor: item.color || '#FF6B6B' }]}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.giftIcon, { backgroundColor: item.color || '#FF6B6B' }]}>
                <MaterialIcons name="card-giftcard" size={20} color="#fff" />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.title || 'Regalo'}{item.count > 1 ? ` · x${item.count}` : ''}</Text>
                <Text style={styles.userEmail}>De: {item.fromName || 'Anónimo'} · {tiempoRelativo(item.createdAt) || 'ahora'}</Text>
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
          {invitacionesPareja.length > 0 && (
          <View style={styles.seccionPareja}>
            <Text style={styles.seccionTitulo}>💌 Invitaciones de pareja</Text>
            {invitacionesPareja.map(inv => (
              <View key={inv.id} style={styles.invRow}>
                <View style={styles.invInfo}>
                  <Text style={styles.invNombre}>{inv.remitente?.nombre || 'Usuario'}</Text>
                  <Text style={styles.invTiempo}>{tiempoRelativo(inv.timestamp)}</Text>
                </View>
                <TouchableOpacity style={styles.invBtnRojo} onPress={() => rechazarPareja(inv)}>
                  <Text style={styles.invBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.invBtnVerde} onPress={() => aceptarPareja(inv)}>
                  <Text style={styles.invBtnText}>✓</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {paginas.length ? <FlatList
              data={paginas}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => `pagina-${index}`}
              onMomentumScrollEnd={event => setPagina(Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))}
              renderItem={({ item: paginaItems }) => <View style={styles.page}>{paginaItems.map(item => <View key={item.id} style={styles.pageItem}>{renderItem({ item })}</View>)}</View>}
            /> : (
              <View style={styles.empty}>
                <MaterialIcons name="inbox" size={80} color="#E0E0E0" />
                <Text style={styles.emptyText}>No tienes notificaciones</Text>
              </View>
            )}
            {paginas.length > 1 && <View style={styles.pageIndicators}>{paginas.map((_, index) => <View key={index} style={[styles.pageIndicator, pagina === index && styles.pageIndicatorActive]} />)}</View>}
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
  columnWrapper: {
    justifyContent: 'space-between',
  },
  page: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    padding: 12,
  },
  pageItem: {
    width: '33.333%',
    padding: 4,
  },
  gridCard: {
    width: '100%',
    aspectRatio: 1,
    padding: 7,
    marginBottom: 0,
    borderRadius: 12,
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
  debtCard: {
    width: '100%',
    aspectRatio: 1,
    padding: 8,
    marginBottom: 0,
    borderLeftColor: '#C68A3A',
    borderRadius: 12,
  },
  debtCardLate: {
    borderLeftColor: '#C95858',
    backgroundColor: '#FFF6F3',
  },
  debtIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#C68A3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  debtTitle: {
    color: '#76552f',
    fontSize: 12,
    fontWeight: '800',
  },
  debtAmount: {
    color: '#A64A56',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  debtText: {
    color: '#88642b',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
  cardTime: {
    color: '#A0A0A0',
    fontSize: 10,
    marginTop: 'auto',
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
  seccionPareja: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 10,
  },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  invInfo: { flex: 1 },
  invNombre: { fontSize: 13, fontWeight: '600', color: '#2C3E50' },
  invTiempo: { fontSize: 11, color: '#aaa', marginTop: 1 },
  invBtnRojo: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F44336',
    justifyContent: 'center', alignItems: 'center',
  },
  invBtnVerde: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center',
  },
  invBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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

const modalRapido = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16, 9, 5, 0.82)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  dismiss: { ...StyleSheet.absoluteFillObject },
  position: { width: '100%', alignItems: 'center', transform: [{ translateY: -10 }] },
  card: { height: 295, overflow: 'hidden', borderRadius: 18, backgroundColor: '#f1e1bd', borderWidth: 3, borderColor: '#d4b06c', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 28 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: '#f0dcae', borderBottomWidth: 1, borderBottomColor: '#d3af6b' },
  headerIcon: { width: 33, height: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#a87840', borderWidth: 1, borderColor: '#fff3ca' },
  headerInfo: { flex: 1, marginLeft: 10 },
  title: { color: '#704b2d', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  subtitle: { color: '#9c7644', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800', letterSpacing: 0.6, marginTop: 1 },
  close: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,249,231,0.7)', borderWidth: 1, borderColor: '#d7b977' },
  body: { paddingHorizontal: 7, paddingTop: 5 },
  bodyContent: { paddingBottom: 13 },
  carousel: { height: 215, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  touchArea: { width: '100%', height: 215, alignItems: 'center', justifyContent: 'center' },
  page: { height: 215, justifyContent: 'flex-start', alignSelf: 'center', paddingTop: 10 },
  list: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: 6, rowGap: 4 },
  item: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 5, borderRadius: 9, backgroundColor: '#f7e9c8', borderWidth: 1, borderColor: '#e3c991' },
  itemAviso: { backgroundColor: '#ead2a0', borderColor: '#d0b782' },
  itemDeuda: { backgroundColor: '#e7c3a1', borderColor: '#d0b782' },
  itemRegalo: { backgroundColor: '#eadfa0', borderColor: '#d0b782' },
  badgeAviso: { backgroundColor: '#ead2a0' },
  badgeDeuda: { backgroundColor: '#e7c3a1' },
  badgeRegalo: { backgroundColor: '#eadfa0' },
  itemIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5dd', borderWidth: 1, borderColor: '#d8b670' },
  itemInfo: { width: '100%', alignItems: 'center', justifyContent: 'center', marginLeft: 0, paddingTop: 0, paddingHorizontal: 4 },
  itemTitle: { width: '100%', color: '#7a5530', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  itemText: { width: '100%', color: '#9a7244', fontFamily: 'Delius', fontSize: 5.2, lineHeight: 6, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  itemDays: { color: '#a64a56', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  itemTime: { position: 'absolute', top: 2, right: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: '#ead2a0', color: '#8f6a3c', fontFamily: 'Delius', fontSize: 5.2, fontWeight: '800', textAlign: 'center', overflow: 'hidden' },
  itemNumber: { position: 'absolute', top: 6, right: 7, color: '#c19a59', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  repeatBadge: { position: 'absolute', top: 2, left: 2, minWidth: 17, height: 13, paddingHorizontal: 3, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ead2a0' },
  repeatBadgeText: { color: '#8f6a3c', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '800' },
  indicators: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 6 },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c9a86d', borderWidth: 1, borderColor: '#fff5dd' },
  indicatorActive: { height: 15, backgroundColor: '#a87840' },
  solicitudOverlay: { flex: 1, backgroundColor: 'rgba(16, 9, 5, 0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  solicitudCard: { width: '100%', maxWidth: 290, padding: 20, borderRadius: 16, backgroundColor: '#f1e1bd', borderWidth: 2, borderColor: '#d4b06c', alignItems: 'center' },
  solicitudTitle: { color: '#704b2d', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  solicitudText: { color: '#76552f', fontFamily: 'Delius', fontSize: 10, lineHeight: 14, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  solicitudHint: { color: '#9a7244', fontFamily: 'Delius', fontSize: 7, lineHeight: 10, textAlign: 'center', marginTop: 8 },
  solicitudActions: { width: '100%', flexDirection: 'row', gap: 8, marginTop: 18 },
  rechazarBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5c9c6' },
  rechazarText: { color: '#9b5f63', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
  aceptarBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d3dfc7' },
  aceptarText: { color: '#56744f', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
});
