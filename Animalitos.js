import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import RoomBackground from './components/RoomBackground';
import TabButtons from './components/TabButtons';
import Loading from './components/Loading';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANIMALITOS = [
  { id: 'halcon', nombre: 'Halcón', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png') },
];
const SKINS = [
  { id: 'default', nombre: '', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png') },
  { id: 'halcont1', nombre: '', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont1.png') },
  { id: 'halcont2', nombre: '', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont2.png') },
];

const Animalitos = ({ navigation, mode }) => {
  const [equipado, setEquipado] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [desbloqueados, setDesbloqueados] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState(auth.currentUser?.displayName || 'Usuario');
  const [diasNacimiento, setDiasNacimiento] = useState('1 día de nacimiento');
  const [equipadaSkin, setEquipadaSkin] = useState('default');

  const loadingRef = useRef(null);
  const transicion = (fn) => loadingRef.current?.fadeIn(() => { fn(); setTimeout(() => loadingRef.current?.fadeOut(), 80); });

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    AsyncStorage.getItem(`skin_${uid}`).then(value => { if (value) setEquipadaSkin(value); }).catch(() => {});
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setEquipadaSkin(data.skin ?? 'default');
      setNombreUsuario(data.datosCompletos?.nombre || data.nombre || auth.currentUser?.displayName || 'Usuario');
      setDiasNacimiento(data.halconDesbloqueadoAt ? '1 día de nacimiento' : '1 día de nacimiento');
      setEquipado(data.animalito ?? null);
      const lista = [];
      if (data.halconDesbloqueado || data.animalito === 'halcon') lista.push('halcon');
      setDesbloqueados(lista);
    });
    return unsub;
  }, []);

  const animalitosFiltrados = (mode === 'skins' ? SKINS : ANIMALITOS).filter(a => mode === 'skins' || desbloqueados.includes(a.id));

  const handleEquipar = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      if (mode === 'skins') {
        const nextSkin = equipadaSkin === id ? 'default' : id;
        setEquipadaSkin(nextSkin);
        AsyncStorage.setItem(`skin_${uid}`, nextSkin).catch(() => {});
        await setDoc(doc(db, 'usuarios', uid), { skin: nextSkin }, { merge: true });
      } else {
        const nuevo = equipado === id ? null : id;
        await setDoc(doc(db, 'usuarios', uid), { animalito: nuevo }, { merge: true });
      }
    } catch (e) {
      console.error('Error al equipar animalito:', e);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <RoomBackground />
      <TabButtons onExit={() => seleccionado ? transicion(() => setSeleccionado(null)) : navigation?.navigate?.('main')} customAddButton={<View />} />

      <View style={s.libroWrap}>
        {seleccionado ? (
          <>
            <Image source={require('./assets/temporadas/libro/libroanimal2.png')} style={s.libro} contentFit="contain" cachePolicy="memory" />
            <Image source={seleccionado.imagen} style={s.animalDetalle} contentFit="contain" cachePolicy="memory" />
            <View style={s.detalleFicha}>
              <Text style={s.detalleNombre}>{seleccionado.nombre}</Text>
              <Text style={[s.detalleDato, s.detalleNacimiento]}>{diasNacimiento}</Text>
              <Text style={[s.detalleDato, s.detalleGenero]}>{seleccionado.id === 'halcon' ? 'Varón' : '—'}</Text>
            </View>
            <Text style={s.versionText}>v1</Text>
          </>
        ) : (
          <>
            <RNImage source={require('./assets/temporadas/libro/libroanimal.png')} style={s.libroLista} resizeMode="contain" />
            <View style={[s.flatLista, mode === 'skins' && s.flatListaSkins]}>
              {animalitosFiltrados.length === 0
                ? <View style={s.vacioWrap}>
                    <Text style={s.vacio}>Completa una temporada{`\n`}para desbloquear una mascota.</Text>
                  </View>
                : animalitosFiltrados.map((item, index) => (
                <TouchableOpacity key={item.id} style={[s.item, mode === 'skins' && s.itemSkinCard, mode === 'skins' && index === 0 && s.skinDefault, mode === 'skins' && index === 1 && s.skinSecond, mode === 'skins' && index === 2 && s.skinThird, mode === 'skins' && item.id !== 'default' && s.itemSkin]} onPress={() => handleEquipar(item.id)}>
                  {mode !== 'skins' && <TouchableOpacity style={s.infoBadge} onPress={() => transicion(() => setSeleccionado(item))} activeOpacity={0.75}><Text style={s.infoBadgeText}>!</Text></TouchableOpacity>}
                  {mode === 'skins'
                    ? <RNImage source={item.imagen} style={[s.img, item.id === 'default' && s.imgDefault]} resizeMode="contain" />
                    : <Image source={item.imagen} style={s.img} contentFit="contain" cachePolicy="memory" />}
                  {mode !== 'skins' && <Text style={s.nombre}>{item.nombre}</Text>}
                  <TouchableOpacity style={[s.quickEquip, mode === 'skins' && index === 0 && s.quickEquipDefault, mode === 'skins' && item.id !== 'default' && s.quickEquipSkin, mode === 'skins' && index === 2 && s.quickEquipThird, mode === 'skins' && equipadaSkin === item.id && s.quickEquipSkinActive, (mode === 'skins' && index === 0 && equipadaSkin === item.id) && s.quickEquipDefaultActive, (mode === 'skins' ? equipadaSkin : equipado) === item.id && s.quickEquipActive]} onPress={() => handleEquipar(item.id)} activeOpacity={0.8}>
                    <Text style={s.quickEquipText}>{(mode === 'skins' ? equipadaSkin : equipado) === item.id ? 'Usando' : 'Usar'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
      <Loading ref={loadingRef} />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  libroWrap: {
    width: '145%',
    height: '120%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  libroLista: {
    position: 'absolute',
    width: '106%',
    height: '106%',
    top: -20,
    left: -5,
    zIndex: 0,
  },
  libro: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 3,
    left: 11,
    zIndex: 0,
  },
  lista: { alignItems: 'center', paddingTop: 20 },
  flatLista: { position: 'absolute', top: '20%', left: '28.3%', zIndex: 10 },
  flatListaSkins: { top: '23%', left: '29%', width: 300, height: 280, flexDirection: 'row', alignItems: 'flex-start' },
  itemSkin: { transform: [{ translateY: -18 }] },
  itemSkinCard: { position: 'absolute', width: 135, margin: 0, zIndex: 3, elevation: 3 },
  skinDefault: { left: 16, top: 8 },
  skinSecond: { left: 14, top: 145, zIndex: 4, elevation: 4 },
  skinThird: { left: 126, top: 33, zIndex: 4, elevation: 4 },
  item: { alignItems: 'center', margin: 10, width: 160, position: 'relative' },
  infoBadge: { position: 'absolute', top: 0, right: 22, width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e76f72', borderWidth: 2, borderColor: '#fff4d5', zIndex: 4, elevation: 4, shadowColor: '#8b3f4a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  infoBadgeText: { color: '#fff', fontFamily: 'Delius', fontSize: 14, fontWeight: '900', lineHeight: 16 },
  img: { width: 90, height: 90 },
  imgDefault: { transform: [{ translateY: 6 }] },
  nombre: { fontSize: 13, color: '#5a3e2b', marginTop: -11, fontWeight: '700', textAlign: 'center', fontFamily: 'Delius' },
  quickEquip: { marginTop: 1, transform: [{ translateY: -3 }], paddingHorizontal: 14, paddingVertical: 3, borderRadius: 8, backgroundColor: '#fcf7d0', borderWidth: 1, borderColor: '#d7b46a' },
  quickEquipSkin: { transform: [{ translateY: -18 }] },
  quickEquipDefault: { transform: [{ translateY: -9 }] },
  quickEquipThird: { transform: [{ translateY: -16 }] },
  quickEquipDefaultActive: { transform: [{ translateY: -3 }] },
  quickEquipSkinActive: { transform: [{ translateY: -10 }] },
  quickEquipActive: { backgroundColor: '#b8db9d', borderColor: '#7aa85d' },
  quickEquipText: { color: '#5a3e2b', fontFamily: 'Delius', fontSize: 9, fontWeight: '800' },
  vacioWrap: { backgroundColor: 'rgba(87, 85, 84, 0.66)', borderRadius: 10, width: 563, height: 270, justifyContent: 'center', alignItems: 'center', top: '-30', left: '-4' },
  vacio: { color: '#fd9e5f', fontSize: 12, fontFamily: 'Delius', textAlign: 'center', lineHeight: 18 },
  btnEquipado: { backgroundColor: '#4caf4f60' },
  btnText: { color: '#5a3e2b', fontSize: 14, fontWeight: '700', fontFamily: 'Delius' },
  versionText: { position: 'absolute', bottom: '18%', right: '31.65%', color: '#795a37', fontFamily: 'Delius', fontSize: 10, fontWeight: '800', zIndex: 2 },
  animalDetalle: {
    position: 'absolute',
    width: 125,
    height: 125,
    top: '32%',
    left: '35.1%',
    zIndex: 1,
  },
  detalleFicha: { position: 'absolute', top: '23.5%', left: '58%', width: 145, zIndex: 2 },
  detalleNombre: { color: '#4d3425', fontSize: 20, fontFamily: 'Delius', fontWeight: '900', marginBottom: 8, textShadowColor: 'rgba(255,248,220,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  detalleDato: { color: '#66482f', fontSize: 12, fontFamily: 'Delius', fontWeight: '800', marginTop: 3 },
  detalleNacimiento: { marginTop: 23 },
  detalleGenero: { marginTop: 42 },
  btnDetalle: {
    position: 'absolute',
    bottom: '18.5%',
    right: '31.65%',
    paddingHorizontal: 31,
    paddingVertical: 2,
    backgroundColor: '#fcf7d0',
    borderRadius: 0,
    zIndex: 1,
  },
});

export default Animalitos;
