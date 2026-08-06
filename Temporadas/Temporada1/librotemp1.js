import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { db, auth } from '../../firebaseConfig';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import TabButtons from '../../components/TabButtons';

const IMAGENES = [
  require('../../assets/temporadas/libro/Temporada1/Historia/historia1.png'),
  require('../../assets/temporadas/libro/Temporada1/Historia/historia2.png'),
  require('../../assets/temporadas/libro/Temporada1/Historia/historia3.png'),
  require('../../assets/temporadas/libro/Temporada1/Historia/historia4.png'),
  require('../../assets/temporadas/libro/Temporada1/Historia/historia5.png'),
  require('../../assets/temporadas/libro/Temporada1/Historia/historia6.png'),
];

const POR_PAGINA = 4;

export default function LibroTemp1({ navigation }) {
  const [desbloqueadas, setDesbloqueadas] = useState({});
  const [pagina, setPagina] = useState(0);
  const [halconDesbloqueado, setHalconDesbloqueado] = useState(false);
  const [reclamando, setReclamando] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, 'Historias', uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setDesbloqueadas(snap.data().temporada1 || {});
    });
    getDoc(doc(db, 'usuarios', uid)).then(snap => {
      if (snap.exists()) setHalconDesbloqueado(!!snap.data().halconDesbloqueado);
    }).catch(() => {});
    return unsub;
  }, []);

  const totalNodos = 6;
  const todasCompletas = Object.keys(desbloqueadas).filter(k => k.startsWith('nodo')).length >= totalNodos;

  const reclamarHalcon = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || reclamando) return;
    setReclamando(true);
    try {
      await setDoc(doc(db, 'usuarios', uid), { halconDesbloqueado: true }, { merge: true });
      setHalconDesbloqueado(true);
    } catch (e) {
      console.error('Error al reclamar halcón:', e);
    } finally {
      setReclamando(false);
    }
  };

  const inicio = pagina * POR_PAGINA;
  const paginas = Math.ceil(IMAGENES.length / POR_PAGINA);
  const visibles = IMAGENES.slice(inicio, inicio + POR_PAGINA);
  const esPagina2 = pagina === 1;

  const POSICIONES = [
    { top: '26%',  left: '26.5%', texto: 'El día que todo comenzó...' },
    { top: '26%', left: '59.6%', texto: 'Una sonrisa que no olvidé.' },
    { top: '57%', left: '26.1%', texto: 'La lluvia y tus manos.' },
    { top: '57%', left: '60%', texto: 'Un regalo sin palabras.' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image source={require('../../assets/temporadas/libro/Temporada1/fondo1.png')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} contentFit="cover" cachePolicy="memory" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      <TabButtons onExit={() => navigation?.navigate?.('temporada1')} customAddButton={<View />} />
      <Image source={require('../../assets/temporadas/libro/coleccion1.png')} style={styles.coleccion} contentFit="contain" cachePolicy="memory" />
      {esPagina2 && (
        <View style={styles.regaloWrap}>
          {todasCompletas ? (
            <>
              <View style={styles.regaloMarco}>
                <Image source={require('../../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png')} style={styles.regaloImg} contentFit="contain" cachePolicy="memory" />
              </View>
              {halconDesbloqueado
                ? <View style={styles.regaloBadge}><Text style={styles.regaloBadgeText}>✓ obtenido</Text></View>
                : <TouchableOpacity style={styles.regaloBtn} onPress={reclamarHalcon} disabled={reclamando}>
                    <Text style={styles.regaloBtnText}>reclamar</Text>
                  </TouchableOpacity>
              }
            </>
          ) : (
            <View style={styles.rewardRow}>
              <Image source={halconDesbloqueado ? require('../../assets/temporadas/rewardopen.png') : require('../../assets/temporadas/reward.png')} style={styles.rewardImg} contentFit="contain" cachePolicy="memory" />
              <Text style={styles.rewardTexto}>{halconDesbloqueado ? `¡Lo lograste!\n¡Halcón es tuyo!` : `Completa la historia\npara reclamar`}</Text>
            </View>
          )}
        </View>
      )}
      {visibles.map((img, i) => {
        const idx = inicio + i;
        const desbloqueada = !!desbloqueadas[`nodo${idx + 1}`];
        const pos = POSICIONES[i];
        return (
          <View key={idx} style={[styles.marco, { top: pos.top, left: pos.left }]}>
            {desbloqueada
              ? <Image source={img} style={styles.img} contentFit="cover" cachePolicy="memory" />
              : <View style={styles.bloqueado}><Text style={styles.bloqueadoIcon}>🔒</Text></View>
            }
            <Text style={styles.marcoTexto}>{pos.texto}</Text>
          </View>
        );
      })}
      {paginas > 1 && (
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0} style={[styles.navBtn, styles.navBtnIzq, pagina === 0 && styles.navBtnOff]}>
            <Text style={styles.navText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPagina(p => Math.min(paginas - 1, p + 1))} disabled={pagina === paginas - 1} style={[styles.navBtn, styles.navBtnDer, pagina === paginas - 1 && styles.navBtnOff]}>
            <Text style={styles.navText}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coleccion: { position: 'absolute', width: '125%', height: '125%', alignSelf: 'center', top: '-10%', left: '-8%' },
  marco: {
    position: 'absolute',
    width: 80, height: 80,
    backgroundColor: '#fff',
    padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6,
  },
  marcoTexto: { position: 'absolute', left: 88, top: 0, width: 110, color: '#fff', fontSize: 12, fontFamily: 'Delius', lineHeight: 17, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  img: { width: '100%', height: '100%' },
  bloqueado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(90,62,43,0.06)' },
  bloqueadoIcon: { fontSize: 22, opacity: 0.4 },
  regaloWrap: { position: 'absolute', bottom: '18.5%', right: '13%', width: 220, alignItems: 'center' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardImg: { width: 100, height: 100 },
  rewardTexto: { color: '#fff', fontSize: 11, fontFamily: 'Delius', lineHeight: 16, fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  regaloMarco: { width: 80, height: 80, backgroundColor: '#fff', padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6, transform: [{ rotate: '2deg' }] },
  regaloImg: { width: '100%', height: '100%' },
  regaloBtn: { marginTop: 7, backgroundColor: 'rgba(255,220,150,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,220,150,0.4)' },
  regaloBtnText: { color: 'rgba(255,220,150,0.9)', fontSize: 10, fontWeight: '700', fontFamily: 'Delius' },
  regaloBadge: { marginTop: 7, backgroundColor: 'rgba(76,175,80,0.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(76,175,80,0.5)' },
  regaloBadgeText: { color: 'rgba(150,255,150,0.9)', fontSize: 10, fontWeight: '700', fontFamily: 'Delius' },
  nav: { flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: '15%', left: '38%' },
  navBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(0,0,0,0.35)' },
  navBtnIzq: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  navBtnDer: { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  navBtnOff: { opacity: 0.25 },
  navText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
