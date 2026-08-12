import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Modal, PixelRatio } from 'react-native';

const sc = 1 / PixelRatio.getFontScale();
import { Image as ExpoImage } from 'expo-image';
import TabButtons from '../components/TabButtons';
import Loading from '../components/Loading';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const TEMPORADAS = [
  { id: 1, titulo: 'Amanecer Dorado',   desc: 'El inicio de una nueva historia.',        logo: require('../assets/temporadas/libro/Temporada1/logo1.png'), style: { left: 195, top: '22%' } },
  { id: 2, titulo: 'Dulces Sorpresas',  desc: 'Hay algo que queremos celebrar contigo.', logo: require('../assets/temporadas/libro/Temporada2/logo1.png'), style: { left: 295, top: '24%' } },
  { id: 3, logo: require('../assets/temporadas/libro/Temporada1/logo1.png'), style: { left: 210, top: '53%' } },
  { id: 4, logo: require('../assets/temporadas/libro/Temporada1/logo1.png'), style: { left: 305, top: '55%' } },
  { id: 6, logo: require('../assets/temporadas/libro/Temporada2/logo1.png'), style: { right: 151, top: '22%' } },
  { id: 5, logo: require('../assets/temporadas/libro/Temporada1/logo1.png'), style: { right: 245, top: '24%' } },
  { id: 8, logo: require('../assets/temporadas/libro/Temporada1/logo1.png'), style: { right: 140, top: '53%' } },
  { id: 7, logo: require('../assets/temporadas/libro/Temporada1/logo1.png'), style: { right: 235, top: '53%' } },
];

const DISPONIBLES = new Set([1, 2]);

const Temporadas = ({ navigation }) => {
  const loadingRef = useRef(null);
  const [seleccionada, setSeleccionada] = useState(1);
  const [modal, setModal] = useState(null);
  const [tienePareja, setTienePareja] = useState(null); // null = cargando

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      setTienePareja(!!snap.data()?.pareja);
    });
    return unsub;
  }, []);

  const handleViajar = (id) => {
    if (!DISPONIBLES.has(id)) return;
    setModal(null);
    loadingRef.current?.fadeIn(() => navigation?.navigate?.(`temporada${id}`));
  };

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <TabButtons onExit={() => navigation?.navigate?.('main')} customAddButton={<View />} />

      {tienePareja === false && (
        <View style={s.bloqueado}>
          <Text style={s.bloqueadoEmoji}>🔒</Text>
          <Text style={s.bloqueadoTitulo}>Necesitás una pareja</Text>
          <Text style={s.bloqueadoDesc}>Conectate con alguien desde el inicio para desbloquear las temporadas.</Text>
        </View>
      )}

      <View style={s.imageWrap}>
        <ExpoImage source={require('../assets/temporadas/libro/libro2.png')} style={s.image} contentFit="contain" contentPosition="center" cachePolicy="memory-disk" />
      </View>

      {TEMPORADAS.map(t => {
        const disponible = DISPONIBLES.has(t.id);
        return (
          <TouchableOpacity key={t.id} style={[s.seasonBtn, t.style, !disponible && s.seasonBtnMisterio]} onPress={() => setModal(t)}>
            <View style={s.cardImgWrap}>
              {disponible
                ? <ExpoImage source={t.logo} style={s.cardImg} contentFit="cover" cachePolicy="memory-disk" />
                : <View style={s.cardImgSilueta}><Text style={s.cardImgSiluetaIcon}>✦</Text></View>
              }
            </View>
            {disponible ? (
              <>
                <Text style={s.cardSeason}>Temporada {t.id}</Text>
                <Text style={s.cardTitle}>{t.titulo}</Text>
                <Text style={s.cardDesc} numberOfLines={2}>{t.desc}</Text>
              </>
            ) : (
              <>
                <Text style={s.cardSeasonMisterio}>{'· · ·'}</Text>
                <Text style={s.cardTitleMisterio}>{'█████'}</Text>
                <Text style={s.cardDescMisterio}>{'██ ███ ████'}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setModal(null)}>
          <TouchableOpacity style={s.modalCard} activeOpacity={1} onPress={() => {}}>
            {modal && (() => {
              const disponible = DISPONIBLES.has(modal.id);
              return disponible ? (
                <>
                  <ExpoImage source={modal.logo} style={s.modalImg} contentFit="cover" cachePolicy="memory-disk" />
                  <Text style={s.modalSeason}>Temporada {modal.id}</Text>
                  <Text style={s.modalTitulo}>{modal.titulo}</Text>
                  <Text style={s.modalDesc}>{modal.desc}</Text>
                  <TouchableOpacity style={s.btn} onPress={() => handleViajar(modal.id)}>
                    <Text style={s.btnText}>✦ Viajar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={s.modalImgMisterio}>
                    <Text style={s.modalCandado}>✦</Text>
                  </View>
                  <Text style={s.modalSeasonMisterio}>{'· · · · ·'}</Text>
                  <Text style={s.modalTituloMisterio}>{'████████'}</Text>
                  <Text style={s.modalDescMisterio}>{'Algo se está preparando\npara ustedes.'}</Text>
                  <View style={s.btnBloqueado}>
                    <Text style={s.btnBloqueadoText}>—</Text>
                  </View>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <Loading ref={loadingRef} />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageWrap: { width: '145%', height: '120%', alignSelf: 'center' },
  image: { width: '115%', height: '115%', top: -26, left: -52 },
  seasonBtn: {
    position: 'absolute',
    width: 76,
    paddingBottom: 3,
    backgroundColor: '#fcf7d0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardImgWrap: { width: '93%', height: 50, marginTop: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, overflow: 'hidden' },
  cardImg: { width: '100%', height: '100%' },
  cardSeason: { color: '#aaa', fontSize: 5.7 * sc, fontWeight: '600', textAlign: 'center', paddingTop: 2, letterSpacing: 0.3, textTransform: 'uppercase' },
  cardTitle: { color: '#333', fontSize: 6.5 * sc, fontWeight: '700', textAlign: 'center', paddingHorizontal: 3 },
  cardDesc: { color: '#999', fontSize: 6 * sc, textAlign: 'center', paddingHorizontal: 4, paddingTop: 1 },
  selectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF69B4', marginTop: 2 },
  seasonBtnMisterio: { backgroundColor: '#12101a', borderColor: 'rgba(255,255,255,0.05)' },
  cardImgSilueta: { width: '100%', height: '100%', backgroundColor: '#1c1828', justifyContent: 'center', alignItems: 'center' },
  cardImgSiluetaIcon: { fontSize: 16, color: 'rgba(255,255,255,0.06)' },
  cardSeasonMisterio: { color: 'rgba(255,255,255,0.15)', fontSize: 7 * sc, textAlign: 'center', paddingTop: 3, letterSpacing: 4 },
  cardTitleMisterio:  { color: 'rgba(255,255,255,0.12)', fontSize: 8 * sc, fontWeight: '700', textAlign: 'center', letterSpacing: 1 },
  cardDescMisterio:   { color: 'rgba(255,255,255,0.08)', fontSize: 6 * sc, textAlign: 'center', paddingHorizontal: 4, paddingTop: 1, paddingBottom: 3 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    width: 200,
    backgroundColor: '#fcf7d0',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  modalImg: { width: '100%', height: 110 },
  modalSeason: { color: '#aaa', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  modalTitulo: { color: '#333', fontSize: 15, fontWeight: '700', marginTop: 2 },
  modalDesc: { color: '#888', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, marginTop: 4 },
  btn: { marginTop: 14, paddingHorizontal: 24, paddingVertical: 8, backgroundColor: '#FF69B4', borderRadius: 20 },
  btnBloqueado: { marginTop: 14, paddingHorizontal: 24, paddingVertical: 8, backgroundColor: 'transparent' },
  btnBloqueadoText: { color: 'rgba(255,255,255,0.15)', fontWeight: '700', fontSize: 16, letterSpacing: 6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalImgMisterio: { width: '100%', height: 110, backgroundColor: '#0d0b16', justifyContent: 'center', alignItems: 'center' },
  modalCandado: { fontSize: 42, color: 'rgba(255,255,255,0.05)' },
  modalSeasonMisterio: { color: 'rgba(0,0,0,0.12)', fontSize: 10, letterSpacing: 6, marginTop: 12 },
  modalTituloMisterio: { color: 'rgba(0,0,0,0.15)', fontSize: 15, fontWeight: '700', marginTop: 4, letterSpacing: 2 },
  modalDescMisterio: { color: 'rgba(0,0,0,0.35)', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, marginTop: 6, fontFamily: 'Delius', fontStyle: 'italic', lineHeight: 17 },
  bloqueado: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    gap: 10,
    paddingHorizontal: 40,
  },
  bloqueadoEmoji: { fontSize: 40 },
  bloqueadoTitulo: { color: '#fff', fontSize: 18, fontFamily: 'Globo', fontWeight: '700' },
  bloqueadoDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', fontFamily: 'Delius' },
});

export default Temporadas;
