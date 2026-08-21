import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Image as RNImage, ScrollView, Modal } from 'react-native';
import { Image } from 'expo-image';
import { collection, doc, getDoc, getDocs, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import RoomBackground from './components/RoomBackground';
import TabButtons from './components/TabButtons';
import Loading from './components/Loading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { contenidoDisponible, useTemporadaActual } from './hooks/useTemporadaActual';
import { actualizarPasoTutorial } from './components/Tutorial';

const ANIMALITOS = [
  { id: 'halcon', temporada: 't1', nombre: 'Halcón', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png') },
];
const SKINS = [
  { id: 'default', nombre: '', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png') },
  { id: 'halcont1', nombre: '', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont1.png') },
  { id: 'halcont2', nombre: '', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont2.png') },
];

const COPIAS_POR_NIVEL = nivel => (2 * nivel) + 1;
const COSTO_MEJORA = nivel => 120 * nivel;
const CartaUniversalIcon = () => <View style={s.cartaBarra}><Text style={s.cartaBarraMarca}>✦</Text></View>;
const RECOMPENSAS_NIVEL = {
  halcon: [
    { nivel: 5, tipo: 'dinero', cantidad: 1000, icono: '🪙', titulo: '1.000 monedas' },
    { nivel: 15, tipo: 'diamantes', cantidad: 50, icono: '◆', titulo: '50 diamantes' },
    { nivel: 25, tipo: 'iconoPendiente', identificador: 'halcon_icon', icono: '✦', titulo: 'Icono especial', detalle: 'Próximamente' },
    { nivel: 75, tipo: 'cartasAnimalitos', cantidad: 25, icono: '▣', titulo: '25 cartas universales' },
    { nivel: 100, tipo: 'skin', skinId: 'halcont1', icono: '☀', titulo: 'Traje Especial' },
  ],
};

const Animalitos = ({ navigation, mode }) => {
  const temporadaActual = useTemporadaActual();
  const [equipado, setEquipado] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [desbloqueados, setDesbloqueados] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState(auth.currentUser?.displayName || 'Usuario');
  const [diasNacimiento, setDiasNacimiento] = useState('1 día de nacimiento');
  const [equipadaSkin, setEquipadaSkin] = useState('default');
  const [animalesEstado, setAnimalesEstado] = useState({});
  const [dinero, setDinero] = useState(0);
  const [cartasAnimalitos, setCartasAnimalitos] = useState(0);
  const [mejoraPendiente, setMejoraPendiente] = useState(null);
  const [recompensasReclamadas, setRecompensasReclamadas] = useState({});
  const [previewRecompensa, setPreviewRecompensa] = useState(null);
  const [iconosPorIdentificador, setIconosPorIdentificador] = useState({});
  const [skinsDesbloqueadas, setSkinsDesbloqueadas] = useState({});

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
      setDinero(typeof data.dinero === 'number' ? data.dinero : 0);
      setAnimalesEstado(data.animalitos || {});
      setRecompensasReclamadas(data.recompensasAnimalitos || {});
      setSkinsDesbloqueadas(data.skinsDesbloqueadas || {});
      // Los usuarios que ya tenían al Halcón reciben un paquete inicial de
      // tres cartas al migrar a las cartas universales.
      setCartasAnimalitos(Math.max(0, Number(data.cartasAnimalitos ?? data.animalitos?.halcon?.copias ?? (data.halconDesbloqueado ? 3 : 0)) || 0));
      const lista = [];
      if (data.halconDesbloqueado || data.animalito === 'halcon') lista.push('halcon');
      setDesbloqueados(lista);
    });
    return unsub;
  }, []);

  // El progreso propio de cada animalito vive en su subcolección.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid, 'animalitos', 'halcon'), snap => {
      const data = snap.data() || {};
      if (!snap.exists()) return;
      setAnimalesEstado({ halcon: { ...data, nivel: Math.max(1, Number(data.nivel) || 1) } });
      setSkinsDesbloqueadas({ halcon: data.skinsDesbloqueadas || {} });
      setEquipadaSkin(data.skin || 'default');
      if (data.desbloqueado || data.nivel || data.copias) setDesbloqueados(['halcon']);
    }, () => {});
  }, []);

  useEffect(() => {
    getDocs(collection(db, 'iconos')).then(snap => {
      const porNombre = {};
      snap.docs.forEach(icono => {
        const data = icono.data();
        if (data.nombre && data.url) porNombre[data.nombre] = data.url;
      });
      setIconosPorIdentificador(porNombre);
    }).catch(() => {});
  }, []);

  const animalitosFiltrados = (mode === 'skins' ? SKINS : ANIMALITOS).filter(a => {
    if (mode !== 'skins') return desbloqueados.includes(a.id) && contenidoDisponible(a.temporada || 't1', temporadaActual);
    return a.id === 'default' || a.id === equipadaSkin || Boolean(skinsDesbloqueadas?.halcon?.[a.id]);
  });

  const handleEquipar = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      if (mode === 'skins') {
        const nextSkin = equipadaSkin === id ? 'default' : id;
        setEquipadaSkin(nextSkin);
        AsyncStorage.setItem(`skin_${uid}`, nextSkin).catch(() => {});
        await setDoc(doc(db, 'usuarios', uid, 'animalitos', 'halcon'), { skin: nextSkin }, { merge: true });
        await setDoc(doc(db, 'usuarios', uid), { skin: nextSkin }, { merge: true });
      } else {
        const nuevo = equipado === id ? null : id;
        await setDoc(doc(db, 'usuarios', uid), { animalito: nuevo }, { merge: true });
        if (nuevo) actualizarPasoTutorial(uid, 2).catch(() => {});
      }
    } catch (e) {
      console.error('Error al equipar animalito:', e);
    }
  };

  const estadoAnimal = id => {
    const guardado = animalesEstado?.[id] || {};
    return {
      nivel: Math.max(1, Number(guardado.nivel) || 1),
      cartas: cartasAnimalitos,
    };
  };

  const manejarMejora = async id => {
    const estado = estadoAnimal(id);
    const requeridas = COPIAS_POR_NIVEL(estado.nivel);
    const costo = COSTO_MEJORA(estado.nivel);
    if (estado.cartas < requeridas || dinero < costo) return;
    if (mejoraPendiente !== id) {
      setMejoraPendiente(id);
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await runTransaction(db, async transaction => {
        const ref = doc(db, 'usuarios', uid);
        const snap = await transaction.get(ref);
        const data = snap.data() || {};
        const guardado = data.animalitos?.[id] || {};
        const nivelActual = Math.max(1, Number(guardado.nivel) || 1);
        const cartasActuales = Math.max(0, Number(data.cartasAnimalitos ?? guardado.copias ?? (data.halconDesbloqueado ? 3 : 0)) || 0);
        const copiasNecesarias = COPIAS_POR_NIVEL(nivelActual);
        const costoActual = COSTO_MEJORA(nivelActual);
        if (cartasActuales < copiasNecesarias) throw new Error('cartas_insuficientes');
        if ((data.dinero || 0) < costoActual) throw new Error('monedas_insuficientes');
        transaction.set(doc(db, 'usuarios', uid, 'animalitos', id), {
          ...guardado,
          desbloqueado: true,
          nivel: nivelActual + 1,
          copias: cartasActuales - copiasNecesarias,
        }, { merge: true });
        transaction.set(ref, {
          dinero: data.dinero - costoActual,
          cartasAnimalitos: cartasActuales - copiasNecesarias,
        }, { merge: true });
      });
      setMejoraPendiente(null);
      const usuarioActual = await (async () => {
        try {
          const snap = await getDoc(doc(db, 'usuarios', uid));
          return snap.data() || {};
        } catch { return {}; }
      })();
      if (usuarioActual.tutorial === 'no') actualizarPasoTutorial(uid, 6).catch(() => {});
      global.showToast?.({ text1: `${ANIMALITOS.find(a => a.id === id)?.nombre || 'Animalito'} mejorado a nivel ${estado.nivel + 1}`, type: 'success' });
    } catch (error) {
      setMejoraPendiente(null);
      global.showToast?.({ text1: error.message === 'monedas_insuficientes' ? 'No tienes suficientes monedas' : 'No se pudo mejorar ahora', type: 'error' });
    }
  };

  const reclamarRecompensaNivel = async recompensa => {
    if (!seleccionado) return;
    const id = seleccionado.id;
    const nivel = estadoAnimal(id).nivel;
    if (nivel < recompensa.nivel || recompensasReclamadas?.[id]?.[recompensa.nivel]) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await runTransaction(db, async transaction => {
        const ref = doc(db, 'usuarios', uid);
        const snap = await transaction.get(ref);
        const data = snap.data() || {};
        const animalRef = doc(db, 'usuarios', uid, 'animalitos', id);
        const animalSnap = await transaction.get(animalRef);
        const animalData = animalSnap.exists() ? animalSnap.data() : (data.animalitos?.[id] || {});
        const nivelActual = Math.max(1, Number(animalData.nivel) || 1);
        if (nivelActual < recompensa.nivel || data.recompensasAnimalitos?.[id]?.[recompensa.nivel]) throw new Error('no_disponible');
        const update = {
          recompensasAnimalitos: {
            ...(data.recompensasAnimalitos || {}),
            [id]: { ...(data.recompensasAnimalitos?.[id] || {}), [recompensa.nivel]: true },
          },
        };
        if (recompensa.tipo === 'dinero' || recompensa.tipo === 'diamantes' || recompensa.tipo === 'cartasAnimalitos') update[recompensa.tipo] = (data[recompensa.tipo] || 0) + recompensa.cantidad;
        if (recompensa.tipo === 'skin') {
          transaction.set(animalRef, { skinsDesbloqueadas: { ...(animalData.skinsDesbloqueadas || {}), [recompensa.skinId]: true } }, { merge: true });
        }
        if (recompensa.tipo === 'iconoPendiente') update.recompensasPendientes = { ...(data.recompensasPendientes || {}), [`${id}Nivel${recompensa.nivel}`]: true };
        transaction.set(ref, update, { merge: true });
      });
      global.showToast?.({ text1: 'Recompensa obtenida', type: 'success' });
    } catch {
      global.showToast?.({ text1: 'Esta recompensa aún no está disponible', type: 'info' });
    }
  };

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <RoomBackground />
      <TabButtons
        onExit={() => seleccionado ? transicion(() => setSeleccionado(null)) : navigation?.navigate?.('main')}
        customAddButton={<View />}
        chicles={cartasAnimalitos}
        chicleIcono={<CartaUniversalIcon />}
      />

      <View style={s.libroWrap}>
        {seleccionado ? (
          <>
            <Image source={require('./assets/temporadas/libro/libroanimal2.png')} style={s.libro} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={0} />
            <Image source={seleccionado.imagen} style={s.animalDetalle} contentFit="contain" cachePolicy="memory" />
            <View style={s.rutaNivelAnimal}><Text style={s.rutaNivelTexto}>Nivel {estadoAnimal(seleccionado.id).nivel}</Text></View>
            <ScrollView style={s.rutaScroll} contentContainerStyle={s.rutaContenido} showsVerticalScrollIndicator={false}>
              {(RECOMPENSAS_NIVEL[seleccionado.id] || []).map(recompensa => {
                const nivelActual = estadoAnimal(seleccionado.id).nivel;
                const reclamado = Boolean(recompensasReclamadas?.[seleccionado.id]?.[recompensa.nivel]);
                const disponible = nivelActual >= recompensa.nivel && !reclamado;
                const colorPremio = recompensa.tipo === 'dinero' ? s.hitoIconoMonedas
                  : recompensa.tipo === 'diamantes' ? s.hitoIconoDiamantes
                  : recompensa.tipo === 'cartasAnimalitos' ? s.hitoIconoCartas
                  : recompensa.tipo === 'skin' ? s.hitoIconoSkin : s.hitoIconoEspecial;
                return <View key={recompensa.nivel} style={[s.hito, disponible && s.hitoDisponible, reclamado && s.hitoReclamado]}>
                  <View style={[s.hitoNivel, disponible && s.hitoNivelDisponible]}><Text style={s.hitoNivelTexto}>{recompensa.nivel}</Text></View>
                  <View style={s.hitoLinea} />
                  <View style={s.hitoPremio}><TouchableOpacity style={[s.hitoIconoWrap, colorPremio]} onPress={() => setPreviewRecompensa(recompensa)} activeOpacity={0.75} accessibilityLabel={`Ver ${recompensa.titulo}`}><Text style={s.hitoIcono}>{recompensa.icono}</Text></TouchableOpacity><View><Text style={s.hitoTitulo}>{recompensa.titulo}</Text>{recompensa.detalle && <Text style={s.hitoDetalle}>{recompensa.detalle}</Text>}</View></View>
                  <TouchableOpacity style={[s.hitoBoton, disponible && s.hitoBotonDisponible, reclamado && s.hitoBotonReclamado]} onPress={() => reclamarRecompensaNivel(recompensa)} disabled={!disponible} activeOpacity={0.8}>
                    <Text style={[s.hitoBotonTexto, disponible && s.hitoBotonTextoDisponible]}>{reclamado ? '✓' : disponible ? 'Reclamar' : `Nv. ${recompensa.nivel}`}</Text>
                  </TouchableOpacity>
                </View>;
              })}
            </ScrollView>
          </>
        ) : (
          <>
            <Image source={require('./assets/temporadas/libro/libroanimal.png')} style={s.libroLista} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={0} />
            <View style={[s.flatLista, mode === 'skins' && s.flatListaSkins]}>
              {animalitosFiltrados.length === 0
                ? <View style={s.vacioWrap}>
                    <Text style={s.vacio}>Completa una temporada{`\n`}para desbloquear una mascota.</Text>
                  </View>
                : animalitosFiltrados.map((item, index) => (
                <View key={item.id} style={[s.item, mode === 'skins' && s.itemSkinCard, mode === 'skins' && index === 0 && s.skinDefault, mode === 'skins' && index === 1 && s.skinSecond, mode === 'skins' && index === 2 && s.skinThird, mode === 'skins' && item.id !== 'default' && s.itemSkin]}>
                  {mode !== 'skins' && <TouchableOpacity style={s.infoBadge} onPress={() => transicion(() => setSeleccionado(item))} activeOpacity={0.75}><Text style={s.infoBadgeText}>★</Text></TouchableOpacity>}
                  {mode !== 'skins' && <View style={s.levelBadge}><Text style={s.levelBadgeText}>{estadoAnimal(item.id).nivel}</Text></View>}
                  {mode !== 'skins' && (() => {
                    const estado = estadoAnimal(item.id);
                    const requeridas = COPIAS_POR_NIVEL(estado.nivel);
                    return <View style={s.cartasProgreso}>
                      <View style={s.cartaUniversal}><Text style={s.cartaUniversalMarca}>✦</Text></View>
                      <Text style={s.cartasProgresoTexto}>{estado.cartas >= requeridas ? '¡Listo!' : `Faltan ${requeridas - estado.cartas}`}</Text>
                    </View>;
                  })()}
                  {mode === 'skins'
                    ? <RNImage source={item.imagen} style={[s.img, item.id === 'default' && s.imgDefault]} resizeMode="contain" />
                    : <Image source={item.imagen} style={[s.img, s.imgAnimal]} contentFit="contain" cachePolicy="memory" />}
                  {mode !== 'skins' && <Text style={s.nombre}>{item.nombre}</Text>}
                  <View style={s.accionesAnimal}>
                    <TouchableOpacity style={[s.quickEquip, mode === 'skins' && index === 0 && s.quickEquipDefault, mode === 'skins' && item.id !== 'default' && s.quickEquipSkin, mode === 'skins' && index === 2 && s.quickEquipThird, mode === 'skins' && equipadaSkin === item.id && s.quickEquipSkinActive, (mode === 'skins' && index === 0 && equipadaSkin === item.id) && s.quickEquipDefaultActive, (mode === 'skins' ? equipadaSkin : equipado) === item.id && s.quickEquipActive]} onPress={() => handleEquipar(item.id)} activeOpacity={0.8}>
                      <Text style={s.quickEquipText}>{(mode === 'skins' ? equipadaSkin : equipado) === item.id ? 'Usando' : 'Usar'}</Text>
                    </TouchableOpacity>
                    {mode !== 'skins' && (() => {
                      const estado = estadoAnimal(item.id);
                      const requeridas = COPIAS_POR_NIVEL(estado.nivel);
                      const puedeMejorar = estado.cartas >= requeridas && dinero >= COSTO_MEJORA(estado.nivel);
                      const confirmar = mejoraPendiente === item.id;
                      return <View style={s.mejoraWrap}>
                        <TouchableOpacity style={[s.mejoraBtn, puedeMejorar && s.mejoraBtnLista, confirmar && s.mejoraBtnConfirmar]} onPress={() => manejarMejora(item.id)} activeOpacity={puedeMejorar ? 0.8 : 1}>
                          <Text style={[s.mejoraTexto, !puedeMejorar && s.mejoraTextoBloqueado, puedeMejorar && s.mejoraTextoLista]}>{confirmar ? `-${COSTO_MEJORA(estado.nivel)} 🪙` : 'Mejorar'}</Text>
                        </TouchableOpacity>
                      </View>;
                    })()}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
      <Modal visible={Boolean(previewRecompensa)} transparent animationType="fade" onRequestClose={() => setPreviewRecompensa(null)}>
        <View style={s.previewFondo}>
          <TouchableOpacity style={s.previewCerrarFondo} activeOpacity={1} onPress={() => setPreviewRecompensa(null)} />
          {previewRecompensa && (() => {
            const iconoPremio = previewRecompensa.tipo === 'iconoPendiente' ? iconosPorIdentificador[previewRecompensa.identificador] : null;
            const iconoSinSubir = previewRecompensa.tipo === 'iconoPendiente' && !iconoPremio;
            return <View style={s.previewTarjeta}>
            <View style={[s.previewIcono, previewRecompensa.tipo === 'diamantes' && s.previewIconoDiamante, previewRecompensa.tipo === 'skin' && s.previewIconoTraje]}>
              {previewRecompensa.tipo === 'skin'
                ? <Image source={require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont1.png')} style={s.previewTrajeImagen} contentFit="contain" cachePolicy="memory-disk" />
                : iconoPremio
                  ? <Image source={{ uri: iconoPremio }} style={s.previewIconoSubido} contentFit="cover" cachePolicy="memory-disk" />
                : <Text style={s.previewIconoTexto}>{previewRecompensa.icono}</Text>}
            </View>
            <Text style={s.previewTitulo}>{iconoSinSubir ? 'Icono sin subir' : previewRecompensa.titulo}</Text>
            <Text style={s.previewNivel}>Recompensa de nivel {previewRecompensa.nivel}</Text>
            <Text style={s.previewDescripcion}>{iconoSinSubir ? `Sube un icono de Animalito con el nombre “${previewRecompensa.identificador}”.` : previewRecompensa.tipo === 'skin' ? 'Un traje exclusivo para tu Halcón.' : 'Alcanza el nivel indicado para reclamarlo.'}</Text>
            <TouchableOpacity style={s.previewBoton} onPress={() => setPreviewRecompensa(null)} activeOpacity={0.8}><Text style={s.previewBotonTexto}>Entendido</Text></TouchableOpacity>
          </View>;
          })()}
        </View>
      </Modal>
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
  infoBadge: { position: 'absolute', top: 0, right: 22, width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c79b43', borderWidth: 2, borderColor: '#fff4d5', zIndex: 4, elevation: 4, shadowColor: '#73521d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  infoBadgeText: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 12, fontWeight: '900', lineHeight: 15 },
  img: { width: 90, height: 90 },
  imgAnimal: { transform: [{ translateY: 6 }] },
  imgDefault: { transform: [{ translateY: 6 }] },
  nombre: { fontSize: 13, color: '#5a3e2b', marginTop: -11, fontWeight: '700', textAlign: 'center', fontFamily: 'Delius' },
  accionesAnimal: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 5, marginTop: 1, transform: [{ translateY: -3 }] },
  quickEquip: { paddingHorizontal: 11, paddingVertical: 3, borderRadius: 8, backgroundColor: '#fcf7d0', borderWidth: 1, borderColor: '#d7b46a' },
  quickEquipSkin: { transform: [{ translateY: -18 }] },
  quickEquipDefault: { transform: [{ translateY: -9 }] },
  quickEquipThird: { transform: [{ translateY: -16 }] },
  quickEquipDefaultActive: { transform: [{ translateY: -3 }] },
  quickEquipSkinActive: { transform: [{ translateY: -10 }] },
  quickEquipActive: { backgroundColor: '#b8db9d', borderColor: '#7aa85d' },
  quickEquipText: { color: '#5a3e2b', fontFamily: 'Delius', fontSize: 9, fontWeight: '800' },
  levelBadge: { position: 'absolute', top: 0, left: 22, minWidth: 21, height: 21, paddingHorizontal: 4, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c9e68', borderWidth: 2, borderColor: '#fff4d5', zIndex: 4, elevation: 4, shadowColor: '#425737', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  levelBadgeText: { color: '#fff', fontFamily: 'Delius', fontSize: 10, fontWeight: '900', lineHeight: 13 },
  mejoraWrap: { alignItems: 'center', marginTop: -1 },
  mejoraBtn: { minWidth: 51, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: '#d8d7d2', borderWidth: 1, borderColor: '#aaa69e' },
  mejoraBtnLista: { backgroundColor: '#c9a351', borderColor: '#92713c', shadowColor: '#76531d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 3 },
  mejoraBtnConfirmar: { backgroundColor: '#d8b65d', borderColor: '#a77b23' },
  mejoraTexto: { color: '#54524d', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', textAlign: 'center' },
  mejoraTextoBloqueado: { color: '#8c8a83' },
  mejoraTextoLista: { color: '#fff8dc' },
  cartasProgreso: { position: 'absolute', top: -3, left: '50%', transform: [{ translateX: -30 }], height: 19, minWidth: 60, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 10, backgroundColor: '#f3e6b9', borderWidth: 1.5, borderColor: '#b7964d', zIndex: 5, elevation: 5, shadowColor: '#5e4925', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
  cartaUniversal: { width: 11, height: 14, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9c17a', borderWidth: 1, borderColor: '#92743c' },
  cartaUniversalMarca: { color: '#fff8dc', fontSize: 9, lineHeight: 11, fontWeight: '900' },
  cartasProgresoTexto: { color: '#766447', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  cartaBarra: { width: 13, height: 16, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9c17a', borderWidth: 1, borderColor: '#92743c' },
  cartaBarraMarca: { color: '#fff8dc', fontSize: 9, lineHeight: 11, fontWeight: '900' },
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
  rutaNombre: { color: '#4d3425', fontSize: 17, fontFamily: 'Delius', fontWeight: '900' },
  rutaSubtitulo: { color: '#a27737', fontSize: 7, fontFamily: 'Delius', fontWeight: '900', letterSpacing: 0.7, marginTop: 1 },
  rutaNivelAnimal: { position: 'absolute', top: '55%', left: '35%', width: 125, paddingVertical: 2, borderRadius: 8, backgroundColor: '#e8d29a', borderWidth: 1, borderColor: '#b8954f', zIndex: 3, alignItems: 'center', transform: [{ translateY: 3 }] },
  rutaNivelTexto: { color: '#6c4f28', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  rutaScroll: { position: 'absolute', top: '22%', left: '52%', width: 230, height: 260, zIndex: 3, transform: [{ translateY: -5 }] },
  rutaContenido: { paddingBottom: 12, paddingHorizontal: 5 },
  hito: { minHeight: 45, flexDirection: 'row', alignItems: 'center', opacity: 0.68, marginBottom: 2, paddingHorizontal: 3, borderRadius: 10, backgroundColor: 'rgba(255,248,220,0.36)', borderWidth: 1, borderColor: 'rgba(184,145,79,0.22)' },
  hitoDisponible: { opacity: 1, backgroundColor: 'rgba(255,241,186,0.68)', borderColor: 'rgba(196,143,43,0.55)' },
  hitoReclamado: { opacity: 0.8, backgroundColor: 'rgba(222,239,205,0.48)', borderColor: 'rgba(100,151,82,0.35)' },
  hitoNivel: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c5bdb0', borderWidth: 2, borderColor: '#988d7f', zIndex: 2 },
  hitoNivelDisponible: { backgroundColor: '#d5ad54', borderColor: '#8e6825' },
  hitoNivelTexto: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
  hitoLinea: { position: 'absolute', left: 13, top: 35, width: 3, height: 15, backgroundColor: '#c7b383' },
  hitoPremio: { flex: 1, marginLeft: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  hitoIconoWrap: { width: 23, height: 23, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  hitoIconoMonedas: { backgroundColor: '#f6d47b', borderColor: '#c4942d' },
  hitoIconoDiamantes: { backgroundColor: '#bfeef3', borderColor: '#36aebf' },
  hitoIconoCartas: { backgroundColor: '#ead598', borderColor: '#a77d2d' },
  hitoIconoEspecial: { backgroundColor: '#d9c6f0', borderColor: '#916fbc' },
  hitoIconoSkin: { backgroundColor: '#f0c5d6', borderColor: '#c16b92' },
  hitoIcono: { textAlign: 'center', color: '#78582a', fontSize: 15, lineHeight: 18, fontWeight: '900' },
  hitoTitulo: { color: '#65482d', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  hitoDetalle: { color: '#8b7455', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '700', marginTop: 1 },
  hitoBoton: { minWidth: 43, paddingHorizontal: 5, paddingVertical: 4, alignItems: 'center', borderRadius: 7, backgroundColor: '#d2cdc4', borderWidth: 1, borderColor: '#aaa39a' },
  hitoBotonDisponible: { backgroundColor: '#c99d42', borderColor: '#8d6926' },
  hitoBotonReclamado: { backgroundColor: '#a8c792', borderColor: '#6d9661' },
  hitoBotonTexto: { color: '#77726c', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
  hitoBotonTextoDisponible: { color: '#fff8dc' },
  previewFondo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(39,27,20,0.58)' },
  previewCerrarFondo: { ...StyleSheet.absoluteFillObject },
  previewTarjeta: { width: 225, minHeight: 255, borderRadius: 18, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 19, backgroundColor: '#fff0c8', borderWidth: 3, borderColor: '#b7873b', shadowColor: '#120c08', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.42, shadowRadius: 12, elevation: 20 },
  previewIcono: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4d47b', borderWidth: 2, borderColor: '#ba8530', shadowColor: '#8b6323', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4 },
  previewIconoDiamante: { backgroundColor: '#c9f2f4', borderColor: '#39b9c8' },
  previewIconoTraje: { backgroundColor: '#f3cbdb', borderColor: '#c16b92' },
  previewTrajeImagen: { width: 72, height: 72 },
  previewIconoSubido: { width: 72, height: 72, borderRadius: 16 },
  previewIconoTexto: { color: '#795321', fontSize: 43, lineHeight: 50, fontWeight: '900' },
  previewTitulo: { marginTop: 11, color: '#604326', fontFamily: 'Delius', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  previewNivel: { marginTop: 3, color: '#a06e29', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  previewDescripcion: { marginTop: 12, color: '#80634a', fontFamily: 'Delius', fontSize: 9, lineHeight: 13, fontWeight: '700', textAlign: 'center' },
  previewBoton: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 6, borderRadius: 9, backgroundColor: '#c99d42', borderWidth: 1, borderColor: '#8d6926' },
  previewBotonTexto: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
});

export default Animalitos;
