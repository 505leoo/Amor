import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import RoomBackground from './components/RoomBackground';
import TabButtons from './components/TabButtons';
import Loading from './components/Loading';

const ANIMALITOS = [
  { id: 'halcon', nombre: 'Halcón', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png') },
];

const Animalitos = ({ navigation }) => {
  const [equipado, setEquipado] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [desbloqueados, setDesbloqueados] = useState([]);

  const loadingRef = useRef(null);
  const transicion = (fn) => loadingRef.current?.fadeIn(() => { fn(); setTimeout(() => loadingRef.current?.fadeOut(), 80); });

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setEquipado(data.animalito ?? null);
      const lista = [];
      if (data.halconDesbloqueado) lista.push('halcon');
      setDesbloqueados(lista);
    });
    return unsub;
  }, []);

  const animalitosFiltrados = ANIMALITOS.filter(a => desbloqueados.includes(a.id));

  const handleEquipar = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const nuevo = equipado === id ? null : id;
      await setDoc(doc(db, 'usuarios', uid), { animalito: nuevo }, { merge: true });
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
            <TouchableOpacity
              style={[s.btnDetalle, equipado === seleccionado.id && s.btnEquipado]}
              onPress={() => handleEquipar(seleccionado.id)}
            >
              <Text style={s.btnText}>{equipado === seleccionado.id ? 'Desequipar' : 'Equipar'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <RNImage source={require('./assets/temporadas/libro/libroanimal.png')} style={s.libroLista} resizeMode="contain" />
            <View style={s.flatLista}>
              {animalitosFiltrados.length === 0
                ? <View style={s.vacioWrap}>
                    <Text style={s.vacio}>Completa una temporada{`\n`}para desbloquear una mascota.</Text>
                  </View>
                : animalitosFiltrados.map(item => (
                <TouchableOpacity key={item.id} style={s.item} onPress={() => transicion(() => setSeleccionado(item))}>
                  <Image source={item.imagen} style={s.img} contentFit="contain" cachePolicy="memory" />
                  <Text style={s.nombre}>{item.nombre}</Text>
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
  flatLista: { position: 'absolute', top: '23%', left: '28.3%', zIndex: 10 },
  item: { alignItems: 'center', margin: 10, width: 160 },
  img: { width: 90, height: 90 },
  nombre: { fontSize: 13, color: '#5a3e2b', marginTop: -11, fontWeight: '700', textAlign: 'center', fontFamily: 'Delius' },
  vacioWrap: { backgroundColor: 'rgba(87, 85, 84, 0.66)', borderRadius: 10, width: 563, height: 270, justifyContent: 'center', alignItems: 'center', top: '-30', left: '-4' },
  vacio: { color: '#fd9e5f', fontSize: 12, fontFamily: 'Delius', textAlign: 'center', lineHeight: 18 },
  btnEquipado: { backgroundColor: '#4caf4f60' },
  btnText: { color: '#5a3e2b', fontSize: 14, fontWeight: '700', fontFamily: 'Delius' },
  animalDetalle: {
    position: 'absolute',
    width: 125,
    height: 125,
    top: '32%',
    left: '35.1%',
    zIndex: 1,
  },
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
