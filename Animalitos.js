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
import { ANIMALITOS, SKINS } from './data/animalitos';

const COPIAS_POR_NIVEL = nivel => (2 * nivel) + 1;
const COSTO_MEJORA = nivel => 120 * nivel;
const EXP_POR_MEJORA = nivel => 15 + (5 * nivel);
const CartaUniversalIcon = () => <View style={s.cartaBarra}><Text style={s.cartaBarraMarca}>✦</Text></View>;
const RECOMPENSAS_NIVEL = {
  halcon: [
    { nivel: 5, tipo: 'dinero', cantidad: 1000, icono: '🪙', titulo: '1.000 monedas' },
    { nivel: 15, tipo: 'diamantes', cantidad: 50, icono: '◆', titulo: '50 diamantes' },
    { nivel: 25, tipo: 'iconoPendiente', identificador: 'halcon_icon', icono: '✦', titulo: 'Icono especial', detalle: 'Próximamente' },
    { nivel: 75, tipo: 'cartasAnimalitos', cantidad: 25, icono: '▣', titulo: '25 cartas universales' },
    { nivel: 100, tipo: 'skin', skinId: 'halcont1', icono: '☀', titulo: 'Traje Especial' },
  ],
  ardilla: [
    { nivel: 5, tipo: 'dinero', cantidad: 800, icono: '🪙', titulo: '800 monedas' },
    { nivel: 15, tipo: 'diamantes', cantidad: 30, icono: '◆', titulo: '30 diamantes' },
    { nivel: 25, tipo: 'iconoPendiente', identificador: 'ardilla_icon', icono: '✦', titulo: 'Icono de Ardilla', detalle: 'Próximamente' },
    { nivel: 75, tipo: 'cartasAnimalitos', cantidad: 20, icono: '▣', titulo: '20 cartas universales' },
    { nivel: 100, tipo: 'skin', skinId: 'ardillat1', icono: '🌰', titulo: 'Bellota Dorada' },
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
  const [skinsEquipadas, setSkinsEquipadas] = useState({ halcon: 'default', ardilla: 'default' });
  const [animalesEstado, setAnimalesEstado] = useState({});
  const [dinero, setDinero] = useState(0);
  const [cartasAnimalitos, setCartasAnimalitos] = useState(0);
  const [mejoraPendiente, setMejoraPendiente] = useState(null);
  const [mejoraEnCurso, setMejoraEnCurso] = useState(null);
  const [recompensasReclamadas, setRecompensasReclamadas] = useState({});
  const [previewRecompensa, setPreviewRecompensa] = useState(null);
  const [iconosPorIdentificador, setIconosPorIdentificador] = useState({});
  const [skinsDesbloqueadas, setSkinsDesbloqueadas] = useState({});
  const [soloDesbloqueados, setSoloDesbloqueados] = useState(false);
  const [ordenCatalogo, setOrdenCatalogo] = useState('rareza');

  const loadingRef = useRef(null);
  const limpiezaArdillaRef = useRef(false);
  const mejoraEnCursoRef = useRef(false);
  const transicion = (fn) => loadingRef.current?.fadeIn(() => { fn(); setTimeout(() => loadingRef.current?.fadeOut(), 80); });

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    AsyncStorage.getItem(`skin_${uid}`).then(value => { if (value) setEquipadaSkin(value); }).catch(() => {});
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setEquipadaSkin(data.skin ?? 'default');
      if (data.animalito) setSkinsEquipadas(prev => ({ ...prev, [data.animalito]: data.skin ?? prev[data.animalito] ?? 'default' }));
      setNombreUsuario(data.datosCompletos?.nombre || data.nombre || auth.currentUser?.displayName || 'Usuario');
      setDiasNacimiento(data.halconDesbloqueadoAt ? '1 día de nacimiento' : '1 día de nacimiento');
      setEquipado(data.animalito ?? null);
      setDinero(typeof data.dinero === 'number' ? data.dinero : 0);
      setAnimalesEstado(prev => ({ ...prev, ...(data.animalitos || {}) }));
      setRecompensasReclamadas(data.recompensasAnimalitos || {});
      setSkinsDesbloqueadas(prev => ({ ...prev, ...(data.skinsDesbloqueadas || {}) }));
      // Los usuarios que ya tenían al Halcón reciben un paquete inicial de
      // tres cartas al migrar a las cartas universales.
      setCartasAnimalitos(Math.max(0, Number(data.cartasAnimalitos ?? (data.halconDesbloqueado ? 3 : 0)) || 0));
      const lista = [];
      if (data.halconDesbloqueado || data.animalito === 'halcon') lista.push('halcon');
      if (data.ardillaDesbloqueada) lista.push('ardilla');
      Object.entries(data.animalitos || {}).forEach(([animalId, estado]) => {
        if (estado?.desbloqueado || Number(estado?.nivel) > 0 || Number(estado?.cartas ?? estado?.copias) > 0) lista.push(animalId);
      });
      setDesbloqueados(prev => [...new Set([...prev, ...lista])]);

    });
    return unsub;
  }, []);

  // El progreso propio de cada animalito vive en su subcolección. Escuchar la
  // colección completa permite sumar mascotas sin agregar listeners manuales.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(collection(db, 'usuarios', uid, 'animalitos'), snapshot => {
      const estados = {};
      const desbloqueadosSubcoleccion = [];
      const skinsPorAnimal = {};
      const equipadasPorAnimal = {};
      snapshot.docs.forEach(animalDoc => {
        const data = animalDoc.data() || {};
        const esArdillaInicialErronea = animalDoc.id === 'ardilla'
          && data.desbloqueado === true
          && Math.max(1, Number(data.nivel) || 1) === 1
          && Math.max(0, Number(data.cartas ?? data.copias) || 0) === 0
          && (data.skin || 'default') === 'default'
          && Object.keys(data.skinsDesbloqueadas || {}).length === 0;
        if (esArdillaInicialErronea && !limpiezaArdillaRef.current) {
          limpiezaArdillaRef.current = true;
          setDoc(animalDoc.ref, { desbloqueado: false }, { merge: true }).catch(() => { limpiezaArdillaRef.current = false; });
        }
        estados[animalDoc.id] = { ...data, nivel: Math.max(1, Number(data.nivel) || 1) };
        skinsPorAnimal[animalDoc.id] = data.skinsDesbloqueadas || {};
        equipadasPorAnimal[animalDoc.id] = data.skin || 'default';
        const desbloqueado = data.desbloqueado === true
          || (data.desbloqueado !== false && Boolean(data.nivel || data.cartas || data.copias));
        if (desbloqueado && !esArdillaInicialErronea) desbloqueadosSubcoleccion.push(animalDoc.id);
      });
      setAnimalesEstado(prev => ({ ...prev, ...estados }));
      setSkinsDesbloqueadas(prev => ({ ...prev, ...skinsPorAnimal }));
      setSkinsEquipadas(prev => ({ ...prev, ...equipadasPorAnimal }));
      setDesbloqueados(prev => [...new Set([...prev, ...desbloqueadosSubcoleccion])]);
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
    if (!equipado || a.animalId !== equipado || !desbloqueados.includes(a.animalId) || !contenidoDisponible(a.temporada || 't1', temporadaActual)) return false;
    return a.storageId === 'default' || skinsEquipadas?.[a.animalId] === a.storageId || Boolean(skinsDesbloqueadas?.[a.animalId]?.[a.storageId]);
  });

  const handleEquipar = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      if (mode === 'skins') {
        const skin = SKINS.find(item => item.id === id);
        if (!skin || !desbloqueados.includes(skin.animalId)) return;
        const actual = skinsEquipadas?.[skin.animalId] || 'default';
        const nextSkin = actual === skin.storageId && skin.storageId !== 'default' ? 'default' : skin.storageId;
        setEquipadaSkin(nextSkin);
        setEquipado(skin.animalId);
        setSkinsEquipadas(prev => ({ ...prev, [skin.animalId]: nextSkin }));
        AsyncStorage.setItem(`skin_${uid}`, nextSkin).catch(() => {});
        await setDoc(doc(db, 'usuarios', uid, 'animalitos', skin.animalId), { skin: nextSkin }, { merge: true });
        await setDoc(doc(db, 'usuarios', uid), { animalito: skin.animalId, skin: nextSkin }, { merge: true });
      } else {
        const nuevo = equipado === id ? null : id;
        const skinDelAnimal = nuevo ? (skinsEquipadas?.[nuevo] || 'default') : 'default';
        setEquipadaSkin(skinDelAnimal);
        await setDoc(doc(db, 'usuarios', uid), { animalito: nuevo, skin: skinDelAnimal }, { merge: true });
        if (nuevo) actualizarPasoTutorial(uid, 2).catch(() => {});
      }
    } catch (e) {
      console.error('Error al equipar animalito:', e);
    }
  };

  const estadoAnimal = id => {
    const guardado = animalesEstado?.[id] || {};
    const cartasPropias = Math.max(0, Number(guardado.cartas ?? guardado.copias ?? 0) || 0);
    const cartasUniversales = Math.max(0, Number(cartasAnimalitos) || 0);
    return {
      nivel: Math.max(1, Number(guardado.nivel) || 1),
      cartasPropias,
      cartasUniversales,
      totalCartas: cartasPropias + cartasUniversales,
    };
  };

  const manejarMejora = async id => {
    const estado = estadoAnimal(id);
    const requeridas = COPIAS_POR_NIVEL(estado.nivel);
    const costo = COSTO_MEJORA(estado.nivel);
    if (estado.totalCartas < requeridas || dinero < costo) return;
    if (mejoraPendiente !== id) {
      setMejoraPendiente(id);
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid || mejoraEnCursoRef.current) return;
    mejoraEnCursoRef.current = true;
    setMejoraEnCurso(id);
    try {
      await runTransaction(db, async transaction => {
        const ref = doc(db, 'usuarios', uid);
        const snap = await transaction.get(ref);
        const data = snap.data() || {};
        const animalRef = doc(db, 'usuarios', uid, 'animalitos', id);
        const animalSnap = await transaction.get(animalRef);
        const guardado = animalSnap.exists() ? animalSnap.data() : (data.animalitos?.[id] || {});
        const nivelActual = Math.max(1, Number(guardado.nivel) || 1);
        // Si otro toque o dispositivo ya lo mejoró, esta operación no puede
        // aplicar accidentalmente el nivel siguiente.
        if (nivelActual !== estado.nivel) throw new Error('nivel_desactualizado');
        const cartasPropias = Math.max(0, Number(guardado.cartas ?? guardado.copias ?? 0) || 0);
        const cartasUniversales = Math.max(0, Number(data.cartasAnimalitos ?? (data.halconDesbloqueado ? 3 : 0)) || 0);
        const copiasNecesarias = COPIAS_POR_NIVEL(nivelActual);
        const costoActual = COSTO_MEJORA(nivelActual);
        if (cartasPropias + cartasUniversales < copiasNecesarias) throw new Error('cartas_insuficientes');
        if ((data.dinero || 0) < costoActual) throw new Error('monedas_insuficientes');
        const cartasPropiasUsadas = Math.min(cartasPropias, copiasNecesarias);
        const cartasUniversalesUsadas = copiasNecesarias - cartasPropiasUsadas;
        const cartasPropiasRestantes = cartasPropias - cartasPropiasUsadas;
        transaction.set(animalRef, {
          ...guardado,
          desbloqueado: true,
          nivel: nivelActual + 1,
          cartas: cartasPropiasRestantes,
          copias: cartasPropiasRestantes,
        }, { merge: true });
        transaction.set(ref, {
          dinero: data.dinero - costoActual,
          cartasAnimalitos: cartasUniversales - cartasUniversalesUsadas,
          exp: Math.max(0, Number(data.exp) || 0) + EXP_POR_MEJORA(nivelActual),
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
      global.showToast?.({ text1: `${ANIMALITOS.find(a => a.id === id)?.nombre || 'Animalito'} mejorado a nivel ${estado.nivel + 1}`, text2: `+${EXP_POR_MEJORA(estado.nivel)} EXP`, type: 'success' });
    } catch (error) {
      setMejoraPendiente(null);
      global.showToast?.({ text1: error.message === 'monedas_insuficientes' ? 'No tienes suficientes monedas' : 'No se pudo mejorar ahora', type: 'error' });
    } finally {
      mejoraEnCursoRef.current = false;
      setMejoraEnCurso(null);
    }
  };

  const reclamarRecompensaNivel = async recompensa => {
    const objetivo = seleccionado || animalitosFiltrados[0];
    if (!objetivo) return;
    const id = objetivo.id;
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

  const animalMostrado = seleccionado || animalitosFiltrados[0] || (mode === 'skins' ? SKINS[0] : ANIMALITOS[0]);
  const animalMostradoId = animalMostrado.animalId || animalMostrado.id;
  const fichaAnimalMostrado = ANIMALITOS.find(animal => animal.id === animalMostradoId) || ANIMALITOS[0];
  const estadoMostrado = estadoAnimal(animalMostradoId);
  const cartasNecesarias = COPIAS_POR_NIVEL(estadoMostrado.nivel);
  const costoMejora = COSTO_MEJORA(estadoMostrado.nivel);
  const puedeMejorar = estadoMostrado.totalCartas >= cartasNecesarias && dinero >= costoMejora;
  const progresoCartas = Math.min(100, (estadoMostrado.totalCartas / Math.max(1, cartasNecesarias)) * 100);
  const recompensasMostradas = RECOMPENSAS_NIVEL[animalMostradoId] || [];
  const animalitosOrdenados = [...animalitosFiltrados].sort((a, b) => {
    if (ordenCatalogo === 'nivel') return estadoAnimal(b.id === 'default' ? 'halcon' : b.id).nivel - estadoAnimal(a.id === 'default' ? 'halcon' : a.id).nivel;
    return (a.id === 'halcon' || a.id === 'default' ? 0 : 1) - (b.id === 'halcon' || b.id === 'default' ? 0 : 1);
  });
  const animalitosCatalogo = ANIMALITOS
    .filter(animal => contenidoDisponible(animal.temporada || 't1', temporadaActual))
    .map(animal => desbloqueados.includes(animal.id) ? animal : { ...animal, bloqueado: true });
  const skinsCatalogo = SKINS
    .filter(skin => Boolean(equipado) && skin.animalId === equipado && desbloqueados.includes(skin.animalId) && contenidoDisponible(skin.temporada || 't1', temporadaActual))
    .map(skin => animalitosFiltrados.some(desbloqueado => desbloqueado.id === skin.id) ? skin : { ...skin, bloqueado: true });
  const elementosCatalogo = mode === 'skins' && !soloDesbloqueados ? skinsCatalogo : (soloDesbloqueados ? animalitosOrdenados : animalitosCatalogo);
  const catalogoSlots = soloDesbloqueados ? animalitosOrdenados : Array.from({ length: 8 }, (_, index) => elementosCatalogo[index] || null);
  const slotsTrajes = Array.from({ length: 12 }, (_, index) => skinsCatalogo[index] || null);
  const columnasTrajes = Array.from({ length: 6 }, (_, columna) => slotsTrajes.slice(columna * 2, (columna * 2) + 2));

  return (
    <View style={s.nuevaPantalla}>
      <StatusBar hidden />
      <RoomBackground />
      <TabButtons onExit={() => navigation?.navigate?.('main')} customAddButton={<View />} chicles={cartasAnimalitos} chicleIcono={<CartaUniversalIcon />} />

      <View style={s.nuevoContenido}>
        {mode === 'skins' ? <View style={s.vestidor}>
          <View style={s.tituloMadera}><Text style={s.tituloMaderaTexto}>✦ MIS TRAJES ✦</Text></View>
          <Text style={s.coleccionTexto}>{equipado ? `Vestidor de ${ANIMALITOS.find(animal => animal.id === equipado)?.nombre || 'Animalito'} · ${animalitosFiltrados.length} desbloqueados` : 'Equipa un Animalito para ver sus trajes'}</Text>
          {!equipado ? <View style={s.vestidorVacio}><Text style={s.vestidorVacioIcono}>🐾</Text><Text style={s.vestidorVacioTexto}>No tienes ningún Animalito equipado.</Text><TouchableOpacity style={s.vestidorVacioBoton} onPress={() => navigation?.navigate?.('animalitos')} activeOpacity={0.8}><Text style={s.vestidorVacioBotonTexto}>ELEGIR ANIMALITO</Text></TouchableOpacity></View> : <ScrollView horizontal style={s.trajesScroll} contentContainerStyle={s.trajesLista} showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {columnasTrajes.map((columna, columnaIndex) => <View key={`columna-trajes-${columnaIndex}`} style={s.trajesColumna}>{columna.map((traje, filaIndex) => {
              const index = (columnaIndex * 2) + filaIndex;
              const equipadoAhora = Boolean(traje && equipado === traje.animalId && (skinsEquipadas?.[traje.animalId] || 'default') === traje.storageId);
              return <TouchableOpacity key={traje?.id || `traje-futuro-${index}`} style={[s.trajeTarjeta, traje && { backgroundColor: traje.fondoRareza, borderColor: traje.colorRareza }, equipadoAhora && s.trajeTarjetaActiva, (!traje || traje.bloqueado) && s.trajeTarjetaBloqueada]} disabled={!traje || traje.bloqueado} onPress={() => handleEquipar(traje.id)} activeOpacity={0.82}>
                {traje ? <><View style={[s.trajeRareza, { backgroundColor: traje.colorRareza }]}><Text style={s.trajeRarezaTexto}>{traje.rareza}</Text></View><Text style={s.trajeTemporada}>{traje.temporada.toUpperCase()} · {traje.animalNombre}</Text>{traje.bloqueado ? <RNImage source={traje.imagen} style={s.trajeImagenBloqueadaBlur} resizeMode="contain" blurRadius={15} /> : <Image source={traje.imagen} style={s.trajeImagen} contentFit="contain" cachePolicy="memory-disk" />}{!traje.bloqueado && <Text style={s.trajeNombre}>{traje.nombre}</Text>}{traje.bloqueado && <><View style={s.trajeBloqueadoVelo} /><View style={s.trajeCandadoInsignia}><Text style={s.trajeCandadoIcono}>🔒</Text></View><View style={s.trajeSecretoPlaca}><Text style={s.trajeCandadoTitulo}>Un secreto te espera</Text><Text style={s.trajeCandadoTexto}>Sigue explorando</Text></View></>}{equipadoAhora && <View style={s.trajeEquipado}><Text style={s.trajeEquipadoTexto}>✓ USANDO</Text></View>}</> : <><Text style={s.trajeFuturoIcono}>✦</Text><Text style={s.trajeFuturoTexto}>Próximamente</Text></>}
              </TouchableOpacity>;
            })}</View>)}
          </ScrollView>}
        </View> : <>
        <View style={s.paginaIzquierda}>
          <View style={s.tituloMadera}><Text style={s.tituloMaderaTexto}>🐾 {mode === 'skins' ? 'MIS TRAJES' : 'MIS ANIMALITOS'} 🐾</Text></View>
          <Text style={s.coleccionTexto}>Colección: {animalitosFiltrados.length} / 8</Text>
          <ScrollView style={s.nuevaListaScroll} contentContainerStyle={s.nuevaLista} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {catalogoSlots.map((item, index) => {
              const activo = item?.id === animalMostrado.id;
              const estadoItem = item ? estadoAnimal(item.id === 'default' ? 'halcon' : item.id) : null;
              const cartasItemNecesarias = estadoItem ? COPIAS_POR_NIVEL(estadoItem.nivel) : 1;
              const progresoItem = estadoItem ? Math.min(100, (estadoItem.totalCartas / cartasItemNecesarias) * 100) : 0;
              return (
                <TouchableOpacity key={item?.id || `slot-${index}`} style={[s.nuevaTarjeta, activo && s.nuevaTarjetaActiva, (!item || item.bloqueado) && s.nuevaTarjetaVacia]} disabled={!item || item.bloqueado} onPress={() => setSeleccionado(item)} activeOpacity={0.82}>
                  {item && !item.bloqueado ? <>
                    <View style={s.tipoBurbuja}><Text style={s.tipoBurbujaTexto}>{mode === 'skins' ? '✦' : '🍃'}</Text></View>
                    <Text style={s.tarjetaNombre}>{item.nombre || (item.id === 'default' ? 'Original' : 'Traje')}</Text>
                    <Text style={s.temporadaTarjeta}>{(item.temporada || 't1').toUpperCase()}</Text>
                    <Image source={item.imagen} style={s.tarjetaAnimal} contentFit="contain" cachePolicy="memory" />
                    <View style={s.rarezaPildora}><Text style={s.rarezaTexto}>{item.rareza || 'Común'}</Text></View>
                    <View style={s.tarjetaProgreso}><View style={[s.tarjetaProgresoFill, { width: `${progresoItem}%` }]} /><Text style={s.tarjetaProgresoTexto}>{estadoItem.totalCartas} / {cartasItemNecesarias}</Text></View>
                    <View style={s.nivelEstrella}><Text style={s.nivelEstrellaTexto}>{estadoItem.nivel}</Text></View>
                  </> : item?.bloqueado ? <>
                    <RNImage source={item.imagen} style={s.animalBloqueadoImagen} resizeMode="contain" blurRadius={18} />
                    <View style={s.animalBloqueadoVelo} />
                    <View style={s.animalBloqueadoInfo}>
                      <Text style={s.bloqueadoIcono}>🔒</Text>
                      <Text style={s.animalBloqueadoTitulo}>Animal misterioso</Text>
                      <Text style={s.animalBloqueadoPista}>{(item.temporada || 't1').toUpperCase()} · {item.rareza || 'Desconocido'}</Text>
                      <Text style={s.animalBloqueadoPista}>{item.pistaBloqueada || 'Aún no descubierto'}</Text>
                    </View>
                  </> : <><Text style={s.bloqueadoIcono}>🔒</Text><Text style={s.bloqueadoTexto}>Próximamente</Text></>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={s.filtrosFila}>
            <TouchableOpacity style={[s.filtroBtn, soloDesbloqueados && s.filtroBtnActivo]} onPress={() => setSoloDesbloqueados(valor => !valor)} activeOpacity={0.8}><Text style={s.filtroTexto}>{soloDesbloqueados ? '✓ Desbloqueados' : '▼ Todos'}</Text></TouchableOpacity>
            <TouchableOpacity style={s.filtroBtn} onPress={() => setOrdenCatalogo(orden => orden === 'rareza' ? 'nivel' : 'rareza')} activeOpacity={0.8}><Text style={s.filtroTexto}>Por {ordenCatalogo === 'rareza' ? 'rareza' : 'nivel'} ↕</Text></TouchableOpacity>
          </View>
        </View>

        <View style={s.paginaDerecha}>
          <View style={s.cintaNombre}><Text style={s.cintaNombreTexto}>{animalMostrado.nombre || (animalMostrado.id === 'default' ? 'ORIGINAL' : 'TRAJE')}</Text></View>
          <View style={s.resumenSuperior}>
            <View style={s.animalGrandeWrap}><Image source={animalMostrado.imagen} style={s.animalGrande} contentFit="contain" cachePolicy="memory" /></View>
            <View style={s.fichaDatos}>
              <View style={s.datoFila}><Text style={s.datoLabel}>Tipo</Text><Text style={s.datoValor}>🍃 Naturaleza</Text></View>
              <View style={s.datoFila}><Text style={s.datoLabel}>Rareza</Text><Text style={s.rarezaFicha}>{fichaAnimalMostrado.rareza}</Text></View>
            </View>
          </View>

          <View style={s.infoDoble}>
            <View style={s.habilidadCaja}><Text style={s.cajaMiniTitulo}>HABILIDAD</Text><Text style={s.habilidadNombre}>🍃 {fichaAnimalMostrado.habilidad}</Text><Text style={s.habilidadTexto}>{fichaAnimalMostrado.habilidadTexto}</Text></View>
            <View style={s.estadisticasCaja}>
              <View style={s.progresoResumenFila}><Text style={s.progresoResumenIcono}>{fichaAnimalMostrado.icono}</Text><View><Text style={s.progresoResumenLabel}>Cartas de {fichaAnimalMostrado.nombre}</Text><Text style={s.progresoResumenValor}>{estadoMostrado.cartasPropias}</Text></View></View>
              <View style={s.progresoResumenFila}><Text style={s.progresoResumenIcono}>▣</Text><View><Text style={s.progresoResumenLabel}>Cartas universales de apoyo</Text><Text style={s.progresoResumenValor}>{estadoMostrado.cartasUniversales} · Total {estadoMostrado.totalCartas}/{cartasNecesarias}</Text></View></View>
            </View>
          </View>

          <View style={s.recompensasCaja}>
            <View style={s.recompensasTitulo}><Text style={s.recompensasTituloTexto}>RECOMPENSAS POR NIVEL</Text></View>
            <View style={s.recompensasFila}>{recompensasMostradas.map(recompensa => {
              const disponible = estadoMostrado.nivel >= recompensa.nivel;
              const reclamada = Boolean(recompensasReclamadas?.[animalMostradoId]?.[recompensa.nivel]);
              return <TouchableOpacity key={recompensa.nivel} style={[s.premioTarjeta, disponible && s.premioDisponible]} onPress={() => disponible && !reclamada ? reclamarRecompensaNivel(recompensa) : setPreviewRecompensa(recompensa)} activeOpacity={0.8}><View style={s.premioNivel}><Text style={s.premioNivelTexto}>{recompensa.nivel}</Text></View><Text style={s.premioIcono}>{recompensa.icono}</Text><Text numberOfLines={2} style={s.premioNombre}>{reclamada ? '✓ Reclamado' : recompensa.titulo}</Text></TouchableOpacity>;
            })}</View>
          </View>

          <View style={s.botonesFinales}>
            <TouchableOpacity style={s.cartasBtn} onPress={() => navigation?.navigate?.('comerciante')} activeOpacity={0.82}><Text style={s.botonFinalTexto}>▣ CONSEGUIR CARTAS</Text></TouchableOpacity>
            <TouchableOpacity style={[s.usarBtn, (mode === 'skins' ? equipadaSkin : equipado) === animalMostrado.id && s.usarBtnActivo]} onPress={() => handleEquipar(animalMostrado.id)} activeOpacity={0.82}><Text style={s.botonFinalTexto}>{(mode === 'skins' ? equipadaSkin : equipado) === animalMostrado.id ? '✓ USANDO' : 'USAR'}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.subirBtn, (!puedeMejorar || mejoraEnCurso) && s.subirBtnBloqueado, mejoraPendiente === animalMostrado.id && s.subirBtnConfirmar]} onPress={() => manejarMejora(animalMostrado.id)} disabled={!puedeMejorar || Boolean(mejoraEnCurso)} activeOpacity={puedeMejorar ? 0.82 : 1}><Text style={s.botonFinalTexto}>{mejoraEnCurso === animalMostrado.id ? 'MEJORANDO…' : mejoraPendiente === animalMostrado.id ? `CONFIRMAR -${costoMejora}` : `⬆ SUBIR NIVEL · ${costoMejora}`}</Text></TouchableOpacity>
          </View>
        </View>
        </>}
      </View>

      <Modal visible={Boolean(previewRecompensa)} transparent animationType="fade" onRequestClose={() => setPreviewRecompensa(null)}><View style={s.previewFondo}><TouchableOpacity style={s.previewCerrarFondo} activeOpacity={1} onPress={() => setPreviewRecompensa(null)} /><View style={s.previewTarjeta}><Text style={s.previewIconoTexto}>{previewRecompensa?.icono}</Text><Text style={s.previewTitulo}>{previewRecompensa?.titulo}</Text><Text style={s.previewNivel}>Recompensa de nivel {previewRecompensa?.nivel}</Text><TouchableOpacity style={s.previewBoton} onPress={() => setPreviewRecompensa(null)}><Text style={s.previewBotonTexto}>Entendido</Text></TouchableOpacity></View></View></Modal>
      <Loading ref={loadingRef} />
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <View style={s.fondoColeccion} />
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
            <View style={s.coleccionGrid}>
              {Array.from({ length: 6 }).map((_, index) => {
                const item = animalitosFiltrados[index];
                return <View key={item?.id || `vacio-${index}`} style={[s.celdaAnimal, !item && s.celdaVacia]}>
                  {item ? <TouchableOpacity onPress={() => transicion(() => setSeleccionado(item))} activeOpacity={0.8} style={s.celdaContenido}>
                    <Image source={item.imagen} style={s.celdaImagen} contentFit="contain" cachePolicy="memory" />
                    <Text style={s.celdaNombre}>{item.nombre || 'Halcón'}</Text>
                  </TouchableOpacity> : <Text style={s.celdaPregunta}>?</Text>}
                </View>;
              })}
            </View>
            <View style={s.animalCentro}>
              {animalitosFiltrados[0] ? <>
                <Image source={animalitosFiltrados[0].imagen} style={s.animalCentroImagen} contentFit="contain" cachePolicy="memory" />
                <Text style={s.animalCentroNombre}>{animalitosFiltrados[0].nombre || 'Halcón'}</Text>
                <Text style={s.animalCentroNivel}>Nivel {estadoAnimal(animalitosFiltrados[0].id).nivel}</Text>
                <TouchableOpacity style={s.animalCentroBtn} onPress={() => handleEquipar(animalitosFiltrados[0].id)} activeOpacity={0.8}><Text style={s.animalCentroBtnTexto}>{equipado === animalitosFiltrados[0].id ? 'Usando' : 'Usar'}</Text></TouchableOpacity>
              </> : <Text style={s.vacio}>Completa una temporada para desbloquear una mascota.</Text>}
            </View>
            <View style={s.hiddenLegacyList}>
              {animalitosFiltrados.length === 0
                ? null
                : animalitosFiltrados.map((item, index) => (
                <View key={item.id} style={[s.item, mode === 'skins' && s.itemSkinCard, mode === 'skins' && index === 0 && s.skinDefault, mode === 'skins' && index === 1 && s.skinSecond, mode === 'skins' && index === 2 && s.skinThird, mode === 'skins' && item.id !== 'default' && s.itemSkin]}>
                  {mode !== 'skins' && <TouchableOpacity style={s.infoBadge} onPress={() => transicion(() => setSeleccionado(item))} activeOpacity={0.75}><Text style={s.infoBadgeText}>★</Text></TouchableOpacity>}
                  {mode !== 'skins' && <View style={s.levelBadge}><Text style={s.levelBadgeText}>{estadoAnimal(item.id).nivel}</Text></View>}
                  {mode !== 'skins' && (() => {
                    const estado = estadoAnimal(item.id);
                    const requeridas = COPIAS_POR_NIVEL(estado.nivel);
                    return <View style={s.cartasProgreso}>
                      <View style={s.cartaUniversal}><Text style={s.cartaUniversalMarca}>✦</Text></View>
                      <Text style={s.cartasProgresoTexto}>{estado.totalCartas >= requeridas ? '¡Listo!' : `Faltan ${requeridas - estado.totalCartas}`}</Text>
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
                      const puedeMejorar = estado.totalCartas >= requeridas && dinero >= COSTO_MEJORA(estado.nivel);
                      const confirmar = mejoraPendiente === item.id;
                      return <View style={s.mejoraWrap}>
                        <TouchableOpacity style={[s.mejoraBtn, puedeMejorar && s.mejoraBtnLista, confirmar && s.mejoraBtnConfirmar]} onPress={() => manejarMejora(item.id)} disabled={!puedeMejorar || Boolean(mejoraEnCurso)} activeOpacity={puedeMejorar ? 0.8 : 1}>
                          <Text style={[s.mejoraTexto, (!puedeMejorar || mejoraEnCurso) && s.mejoraTextoBloqueado, puedeMejorar && s.mejoraTextoLista]}>{mejoraEnCurso === item.id ? '…' : confirmar ? `-${COSTO_MEJORA(estado.nivel)} 🪙` : 'Mejorar'}</Text>
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
  nuevaPantalla: { flex: 1, backgroundColor: '#25452c', alignItems: 'center', justifyContent: 'center' },
  nuevoContenido: { position: 'absolute', left: '14%', top: '9%', width: '78%', height: '86%', flexDirection: 'row', padding: 13, borderRadius: 24, backgroundColor: '#fff4d6', borderWidth: 4, borderColor: '#9b6a35', shadowColor: '#171008', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.48, shadowRadius: 16, elevation: 22 },
  paginaIzquierda: { width: '49%', height: '100%', paddingHorizontal: 13, paddingTop: 4, paddingBottom: 5, borderRightWidth: 2, borderRightColor: 'rgba(142,96,46,0.28)', backgroundColor: 'rgba(255,250,231,0.72)', borderTopLeftRadius: 17, borderBottomLeftRadius: 17 },
  paginaDerecha: { width: '51%', height: '100%', paddingLeft: 17, paddingRight: 10, paddingTop: 4, paddingBottom: 5, backgroundColor: 'rgba(255,247,220,0.58)', borderTopRightRadius: 17, borderBottomRightRadius: 17 },
  vestidor: { width: '106%', height: '100%', marginLeft: -14, paddingHorizontal: 13, paddingTop: 4, paddingBottom: 7, borderRadius: 17, backgroundColor: 'rgba(255,249,228,0.74)' },
  vestidorVacio: { flex: 1, alignItems: 'center', justifyContent: 'center' }, vestidorVacioIcono: { fontSize: 30, opacity: 0.6 }, vestidorVacioTexto: { marginTop: 7, color: '#866846', fontFamily: 'Delius', fontSize: 9, fontWeight: '800' }, vestidorVacioBoton: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 9, backgroundColor: '#b8863f', borderWidth: 1, borderColor: '#815b28' }, vestidorVacioBotonTexto: { color: '#fffbe8', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
  trajesScroll: { flex: 1, marginTop: 1 }, trajesLista: { alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2, gap: 5 }, trajesColumna: { gap: 5, justifyContent: 'center' },
  trajeTarjeta: { width: 92, height: 96, borderRadius: 10, alignItems: 'center', paddingTop: 13, borderWidth: 2, shadowColor: '#64472b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4, overflow: 'hidden' },
  trajeTarjetaActiva: { borderWidth: 4, shadowOpacity: 0.4, elevation: 9, transform: [{ translateY: -3 }] }, trajeTarjetaBloqueada: { backgroundColor: '#e4ddd0', borderColor: '#aaa093' },
  trajeRareza: { position: 'absolute', top: 6, right: 7, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, zIndex: 5 }, trajeRarezaTexto: { color: '#fff', fontFamily: 'Delius', fontSize: 6, fontWeight: '900' }, trajeTemporada: { position: 'absolute', top: 8, left: 9, color: '#866846', fontFamily: 'Delius', fontSize: 6, fontWeight: '900' },
  trajeImagen: { width: 84, height: 70, marginTop: -1 }, trajeImagenBloqueada: { opacity: 0.3 }, trajeImagenBloqueadaBlur: { position: 'absolute', top: 23, width: 84, height: 55, opacity: 0.48, tintColor: '#554d45' }, trajeNombre: { position: 'absolute', bottom: 3, color: '#5d4128', fontFamily: 'Delius', fontSize: 7.3, fontWeight: '900', textAlign: 'center' },
  trajeBloqueadoVelo: { position: 'absolute', top: 23, left: 4, right: 4, height: 55, borderRadius: 8, backgroundColor: 'rgba(65,56,48,0.35)', zIndex: 3 }, trajeCandadoInsignia: { position: 'absolute', top: 17, alignSelf: 'center', zIndex: 7, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7e7c8', borderWidth: 2, borderColor: '#9d7446', shadowColor: '#3d2d20', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.38, shadowRadius: 3, elevation: 7 }, trajeCandadoIcono: { fontSize: 12, lineHeight: 15, textAlign: 'center' }, trajeSecretoPlaca: { position: 'absolute', left: 5, right: 5, bottom: 4, zIndex: 8, alignItems: 'center', paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(82,61,43,0.92)', borderWidth: 1, borderColor: '#d7b887' }, trajeCandadoTitulo: { color: '#fff7e6', fontFamily: 'Delius', fontSize: 6.6, lineHeight: 8, fontWeight: '900', textAlign: 'center' }, trajeCandadoTexto: { marginTop: 1, color: '#e9d4b2', fontFamily: 'Delius', fontSize: 5.3, lineHeight: 7, fontWeight: '800', textAlign: 'center' },
  trajeEquipado: { position: 'absolute', bottom: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7, backgroundColor: '#6f9e55' }, trajeEquipadoTexto: { color: '#fff', fontFamily: 'Delius', fontSize: 6, fontWeight: '900' }, trajeFuturoIcono: { marginTop: 28, color: '#b2a18a', fontSize: 25 }, trajeFuturoTexto: { marginTop: 5, color: '#9b8c78', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
  animalBloqueadoImagen: { position: 'absolute', width: '92%', height: '92%', opacity: 0.48, tintColor: '#4b433b' }, animalBloqueadoVelo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(68,58,48,0.44)' }, animalBloqueadoInfo: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, animalBloqueadoTitulo: { marginTop: 2, color: '#fff8e8', fontFamily: 'Delius', fontSize: 8.3, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.72)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }, animalBloqueadoPista: { marginTop: 3, color: '#f2dfbf', fontFamily: 'Delius', fontSize: 6.3, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.58)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  vestidorAcciones: { height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 25, marginTop: 3, paddingHorizontal: 18, borderRadius: 12, backgroundColor: 'rgba(239,215,171,0.62)', borderWidth: 1, borderColor: 'rgba(184,139,80,0.32)' }, vestidorSeleccionado: { color: '#5c4026', fontFamily: 'Delius', fontSize: 10, fontWeight: '900' }, vestidorRarezaTexto: { fontFamily: 'Delius', fontSize: 7, fontWeight: '900', marginTop: 1 }, vestidorUsarBtn: { minWidth: 126, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9, backgroundColor: '#b8863f', borderWidth: 1, borderColor: '#815b28', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.24, shadowRadius: 3, elevation: 4 }, vestidorUsarTexto: { color: '#fffbe8', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  tituloMadera: { alignSelf: 'center', minWidth: 205, paddingHorizontal: 18, paddingVertical: 6, borderRadius: 7, backgroundColor: '#e9b85f', borderWidth: 2, borderColor: '#a96b25', shadowColor: '#684218', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  tituloMaderaTexto: { color: '#6a3d18', fontFamily: 'Delius', fontSize: 12, fontWeight: '900', textAlign: 'center', letterSpacing: 0.4 },
  coleccionTexto: { color: '#896338', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', textAlign: 'center', marginTop: 3, marginBottom: 3 },
  nuevaListaScroll: { flex: 1, marginTop: 1 },
  nuevaLista: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 },
  nuevaTarjeta: { width: '48.5%', height: 93, marginBottom: 7, borderRadius: 8, backgroundColor: 'rgba(255,248,224,0.75)', borderWidth: 1.2, borderColor: '#c7a26d', overflow: 'hidden', shadowColor: '#75522d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 2, elevation: 2 },
  nuevaTarjetaActiva: { borderWidth: 2, borderColor: '#80ad52', backgroundColor: 'rgba(249,255,221,0.88)', shadowColor: '#5e8b3e', shadowOpacity: 0.32, elevation: 4 },
  nuevaTarjetaVacia: { alignItems: 'center', justifyContent: 'center', opacity: 0.58, borderStyle: 'dashed' },
  tipoBurbuja: { position: 'absolute', top: 4, left: 5, width: 21, height: 21, borderRadius: 11, backgroundColor: '#65a84c', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e9f5d6', zIndex: 3 },
  tipoBurbujaTexto: { fontSize: 11 }, tarjetaNombre: { position: 'absolute', top: 6, right: 8, color: '#5b3b22', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', zIndex: 3 }, temporadaTarjeta: { position: 'absolute', top: 22, right: 8, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, backgroundColor: 'rgba(159,112,55,0.16)', color: '#896137', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900', zIndex: 3 },
  tarjetaAnimal: { position: 'absolute', width: '67%', height: '68%', left: '6%', top: '17%' },
  rarezaPildora: { position: 'absolute', right: 7, top: '45%', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#77ad4e' },
  rarezaTexto: { color: '#fffbe7', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900' },
  tarjetaProgreso: { position: 'absolute', left: 19, right: 7, bottom: 5, height: 12, borderRadius: 6, backgroundColor: '#b99b70', overflow: 'hidden', justifyContent: 'center' },
  tarjetaProgresoFill: { ...StyleSheet.absoluteFillObject, right: undefined, backgroundColor: '#7fb54b' }, tarjetaProgresoTexto: { color: '#fffbe9', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', textAlign: 'center', zIndex: 2 },
  nivelEstrella: { position: 'absolute', left: 4, bottom: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#82ae4c', borderWidth: 1.5, borderColor: '#dff0b5', alignItems: 'center', justifyContent: 'center', zIndex: 3 }, nivelEstrellaTexto: { color: '#fff', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  bloqueadoIcono: { fontSize: 18, opacity: 0.55 }, bloqueadoTexto: { color: '#9b7a52', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', marginTop: 3 },
  filtrosFila: { height: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 3, paddingHorizontal: 4 }, filtroBtn: { minWidth: 90, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: '#f0d6a5', borderWidth: 1, borderColor: '#c59a5b' }, filtroBtnActivo: { backgroundColor: '#d8e9b0', borderColor: '#83a454' }, filtroTexto: { color: '#7b5630', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  cintaNombre: { alignSelf: 'center', minWidth: 192, paddingHorizontal: 24, paddingVertical: 6, borderRadius: 5, backgroundColor: '#57905a', borderWidth: 2, borderColor: '#35683e', transform: [{ rotate: '-1deg' }], shadowColor: '#274e30', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 },
  cintaNombreTexto: { color: '#fffde8', fontFamily: 'Delius', fontSize: 14, fontWeight: '900', textAlign: 'center', letterSpacing: 0.8, textShadowColor: 'rgba(43,80,48,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  resumenSuperior: { height: '27%', flexDirection: 'row', marginTop: 2, marginBottom: 3 }, animalGrandeWrap: { width: '38%', alignItems: 'center', justifyContent: 'center' }, animalGrande: { width: 108, height: 108 },
  fichaDatos: { flex: 1, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,248,226,0.66)', borderWidth: 1, borderColor: 'rgba(184,139,80,0.35)' },
  datoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 21, borderBottomWidth: 1, borderBottomColor: 'rgba(178,137,83,0.15)' }, datoLabel: { color: '#b07a39', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' }, datoValor: { color: '#654426', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' }, rarezaFicha: { color: '#537a31', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', backgroundColor: '#c6dc8e', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8 },
  nivelProgresoFila: { flexDirection: 'row', alignItems: 'center', marginTop: 2 }, nivelGrande: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#dfa83e', borderWidth: 2, borderColor: '#fff0a9', alignItems: 'center', justifyContent: 'center', zIndex: 2 }, nivelGrandeTexto: { color: '#fff', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
  barraNivel: { flex: 1, height: 13, marginLeft: -3, borderRadius: 7, backgroundColor: '#b89b73', overflow: 'hidden', justifyContent: 'center' }, barraNivelFill: { ...StyleSheet.absoluteFillObject, right: undefined, backgroundColor: '#83b74a' }, barraNivelTexto: { color: '#fff', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', textAlign: 'center' }, faltanTexto: { color: '#69492b', fontFamily: 'Delius', fontSize: 7, lineHeight: 10, fontWeight: '800', textAlign: 'center', marginTop: 4 }, faltanNumero: { color: '#5d9a46', fontWeight: '900' },
  infoDoble: { height: '18%', flexDirection: 'row', gap: 8 }, habilidadCaja: { flex: 0.72, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, transform: [{ translateY: -4 }], backgroundColor: 'rgba(224,235,175,0.58)', borderWidth: 1, borderColor: 'rgba(157,170,87,0.25)' }, estadisticasCaja: { flex: 1.35, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, justifyContent: 'center', transform: [{ translateY: -5 }], backgroundColor: 'rgba(255,248,226,0.68)', borderWidth: 1, borderColor: 'rgba(184,139,80,0.3)' }, cajaMiniTitulo: { color: '#866035', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', textAlign: 'center', marginBottom: 1 }, habilidadNombre: { color: '#58442a', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' }, habilidadTexto: { color: '#6f5a37', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9, fontWeight: '800', marginTop: 1 }, progresoResumenFila: { flexDirection: 'row', alignItems: 'center', minHeight: 19, borderTopWidth: 1, borderTopColor: 'rgba(174,130,75,0.16)' }, progresoResumenIcono: { width: 22, color: '#a37a36', fontSize: 12, textAlign: 'center' }, progresoResumenLabel: { color: '#8a6a43', fontFamily: 'Delius', fontSize: 5.8, fontWeight: '800' }, progresoResumenValor: { color: '#5d452c', fontFamily: 'Delius', fontSize: 6.8, fontWeight: '900' },
  recompensasCaja: { height: '27%', marginTop: 5, paddingTop: 12, borderRadius: 8, backgroundColor: 'rgba(255,248,226,0.48)', borderWidth: 1, borderColor: 'rgba(184,139,80,0.25)' }, recompensasTitulo: { position: 'absolute', top: -7, alignSelf: 'center', minWidth: 150, paddingVertical: 3, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#b77932' }, recompensasTituloTexto: { color: '#fff9e5', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', textAlign: 'center' }, recompensasFila: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 5 }, premioTarjeta: { width: '18%', height: '82%', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,249,229,0.6)', borderWidth: 1, borderColor: '#d9bd8c', opacity: 0.72 }, premioDisponible: { borderColor: '#91b657', backgroundColor: 'rgba(241,252,205,0.82)', opacity: 1 }, premioNivel: { position: 'absolute', top: -7, width: 20, height: 20, borderRadius: 10, backgroundColor: '#8c6a3b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f0ddb7' }, premioNivelTexto: { color: '#fff', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900' }, premioIcono: { fontSize: 17 }, premioNombre: { color: '#6a4a2c', fontFamily: 'Delius', fontSize: 5.5, lineHeight: 7, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  botonesFinales: { height: '11%', flexDirection: 'row', gap: 6, alignItems: 'flex-end', justifyContent: 'center' }, cartasBtn: { minWidth: 105, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 7, backgroundColor: '#6da85a', borderWidth: 1, borderColor: '#437b39' }, usarBtn: { minWidth: 62, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 7, backgroundColor: '#c19043', borderWidth: 1, borderColor: '#8a632c' }, usarBtnActivo: { backgroundColor: '#79a75b', borderColor: '#4e7b3d' }, subirBtn: { minWidth: 103, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, backgroundColor: '#4384bd', borderWidth: 1, borderColor: '#286190' }, subirBtnBloqueado: { opacity: 0.62, backgroundColor: '#7d8d96' }, subirBtnConfirmar: { backgroundColor: '#d08b37', borderColor: '#925c20' }, botonFinalTexto: { color: '#fff', fontFamily: 'Delius', fontSize: 7.2, fontWeight: '900', textAlign: 'center' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fondoColeccion: { ...StyleSheet.absoluteFillObject, width: '94%', height: '94%', transform: [{ translateX: 35 }, { translateY: 180 }] },
  hiddenLegacyList: { display: 'none' },
  coleccionGrid: { position: 'absolute', left: '28%', top: '-25%', width: 148, flexDirection: 'row', flexWrap: 'wrap', gap: 8, zIndex: 5 },
  celdaAnimal: { width: 68, height: 58, borderRadius: 9, backgroundColor: 'rgba(255,248,220,0.76)', borderWidth: 2, borderColor: '#b88c4b', alignItems: 'center', justifyContent: 'center', shadowColor: '#604322', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.24, shadowRadius: 3, elevation: 4 },
  celdaVacia: { backgroundColor: 'rgba(117,91,65,0.28)', borderColor: 'rgba(255,242,196,0.44)' },
  celdaContenido: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  celdaImagen: { width: 45, height: 40 }, celdaNombre: { color: '#65482d', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' }, celdaPregunta: { color: 'rgba(255,248,220,0.75)', fontSize: 22, fontWeight: '900' },
  animalCentro: { position: 'absolute', top: '-23%', left: '58%', width: '42%', height: '62%', alignItems: 'center', justifyContent: 'center', zIndex: 4 },
  animalCentroImagen: { width: 190, height: 190, transform: [{ translateY: 95 }] }, animalCentroNombre: { color: '#4d3425', fontFamily: 'Delius', fontSize: 22, fontWeight: '900', textShadowColor: 'rgba(255,248,220,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  animalCentroNivel: { color: '#8b632d', fontFamily: 'Delius', fontSize: 11, fontWeight: '900', marginTop: 3 }, animalCentroBtn: { marginTop: 9, paddingHorizontal: 22, paddingVertical: 5, borderRadius: 9, backgroundColor: '#c99d42', borderWidth: 1, borderColor: '#8d6926' }, animalCentroBtnTexto: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 10, fontWeight: '900' },
  libroWrap: {
    width: '100%',
    height: '100%',
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
