import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Image as RNImage, ScrollView, Modal, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import RoomBackground from './components/RoomBackground';
import TabButtons from './components/TabButtons';
import Loading from './components/Loading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { contenidoDisponible, useTemporadaActual } from './hooks/useTemporadaActual';
import { actualizarPasoTutorial } from './components/Tutorial';
import { ANIMALITOS, SKINS, animalitoEstaDesbloqueado } from './data/animalitos';

const COPIAS_POR_NIVEL = nivel => (2 * nivel) + 1;
const COSTO_MEJORA = nivel => 120 * nivel;
const EXP_POR_MEJORA = nivel => 15 + (5 * nivel);
const PALETA_RAREZA = {
  Común: { fondo: '#dcebd5', brillo: '#f5fae9', acento: '#6f9e55', texto: '#35572f' },
  Raro: { fondo: '#dcebf4', brillo: '#f5fbff', acento: '#4f87b8', texto: '#294f70' },
  Épico: { fondo: '#eadcf3', brillo: '#fbf3ff', acento: '#9160b7', texto: '#583672' },
  Legendario: { fondo: '#f5e2bd', brillo: '#fff8e6', acento: '#c4862e', texto: '#704815' },
};
const proyectarMejoras = ({ nivel, cartasPropias, cartasUniversales }, dineroDisponible) => {
  let nivelSimulado = Math.max(1, Number(nivel) || 1);
  let propias = Math.max(0, Number(cartasPropias) || 0);
  let universales = Math.max(0, Number(cartasUniversales) || 0);
  let monedas = Math.max(0, Number(dineroDisponible) || 0);
  let cartasGastadas = 0;
  let monedasGastadas = 0;
  let nivelesPosibles = 0;
  while (nivelesPosibles < 100) {
    const cartasNecesarias = COPIAS_POR_NIVEL(nivelSimulado);
    const monedasNecesarias = COSTO_MEJORA(nivelSimulado);
    if (propias + universales < cartasNecesarias || monedas < monedasNecesarias) break;
    const propiasUsadas = Math.min(propias, cartasNecesarias);
    propias -= propiasUsadas;
    universales -= cartasNecesarias - propiasUsadas;
    cartasGastadas += cartasNecesarias;
    monedasGastadas += monedasNecesarias;
    monedas -= monedasNecesarias;
    nivelSimulado += 1;
    nivelesPosibles += 1;
  }
  return { nivelesPosibles, nivelFinal: nivelSimulado, cartasGastadas, monedasGastadas };
};
const CartaUniversalIcon = () => <View style={s.cartaBarra}><Text style={s.cartaBarraMarca}>✦</Text></View>;
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
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
  ajolote: [
    { nivel: 5, tipo: 'dinero', cantidad: 1000, icono: '🪙', titulo: '1.000 monedas' },
    { nivel: 15, tipo: 'diamantes', cantidad: 40, icono: '◆', titulo: '40 diamantes' },
    { nivel: 25, tipo: 'iconoPendiente', identificador: 'ajolote_icon', icono: '✦', titulo: 'Icono de Ajolote', detalle: 'Próximamente' },
    { nivel: 75, tipo: 'cartasAnimalitos', cantidad: 25, icono: '▣', titulo: '25 cartas universales' },
    { nivel: 100, tipo: 'skin', skinId: 'ajolotet1', icono: '☁️', titulo: 'Algodón de Azúcar' },
  ],
  erizo: [
    { nivel: 5, tipo: 'dinero', cantidad: 1200, icono: '🪙', titulo: '1.200 monedas' },
    { nivel: 15, tipo: 'diamantes', cantidad: 45, icono: '◆', titulo: '45 diamantes' },
    { nivel: 25, tipo: 'iconoPendiente', identificador: 'erizo_icon', icono: '✦', titulo: 'Icono de Erizo', detalle: 'Próximamente' },
    { nivel: 75, tipo: 'cartasAnimalitos', cantidad: 25, icono: '▣', titulo: '25 cartas universales' },
    { nivel: 100, tipo: 'skin', skinId: 'erizot1', icono: '🫐', titulo: 'Cupcake de Arándanos' },
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
  const [skinsEquipadas, setSkinsEquipadas] = useState(() => Object.fromEntries(ANIMALITOS.map(animal => [animal.id, 'default'])));
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
  const [recordatorioCerrado, setRecordatorioCerrado] = useState(false);
  const [llamadaMejoraActiva, setLlamadaMejoraActiva] = useState(false);

  const loadingRef = useRef(null);
  const limpiezaArdillaRef = useRef(false);
  const mejoraEnCursoRef = useRef(false);
  const llamadaMejora = useRef(new Animated.Value(0)).current;
  const transicion = (fn) => loadingRef.current?.fadeIn(() => { fn(); setTimeout(() => loadingRef.current?.fadeOut(), 80); });

  const irAMejorarAhora = animal => {
    setSeleccionado(animalitosFiltrados.find(item => item.id === animal.id) || animal);
    setRecordatorioCerrado(true);
    setLlamadaMejoraActiva(true);
    llamadaMejora.stopAnimation();
    llamadaMejora.setValue(0);
    Animated.sequence([
      Animated.delay(180),
      Animated.loop(Animated.sequence([
        Animated.timing(llamadaMejora, { toValue: 1, duration: 230, useNativeDriver: false }),
        Animated.timing(llamadaMejora, { toValue: 0, duration: 330, useNativeDriver: false }),
      ]), { iterations: 3 }),
    ]).start(() => setLlamadaMejoraActiva(false));
  };

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
      const lista = ANIMALITOS
        .filter(animal => animalitoEstaDesbloqueado(animal, data, data.animalitos?.[animal.id] || {}))
        .map(animal => animal.id);
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

  const recordatorioMejora = mode === 'skins' ? null : ANIMALITOS
    .filter(animal => desbloqueados.includes(animal.id) && contenidoDisponible(animal.temporada || 't1', temporadaActual))
    .map(animal => {
      const estado = estadoAnimal(animal.id);
      const proyeccion = proyectarMejoras(estado, dinero);
      return { animal, estado, ...proyeccion };
    })
    .filter(resultado => resultado.nivelesPosibles >= 2)
    .sort((a, b) => b.nivelesPosibles - a.nivelesPosibles || Number(b.animal.id === equipado) - Number(a.animal.id === equipado))[0] || null;

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
    if (ordenCatalogo === 'nivel') return estadoAnimal(b.id).nivel - estadoAnimal(a.id).nivel;
    return ANIMALITOS.findIndex(animal => animal.id === a.id) - ANIMALITOS.findIndex(animal => animal.id === b.id);
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

  if (mode !== 'skins') {
    const animalesDisponibles = soloDesbloqueados ? animalitosOrdenados : animalitosCatalogo;
    const listaSimple = [
      ...animalesDisponibles,
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `proximamente-${index + 1}`,
        bloqueado: true,
        proximo: true,
      })),
    ];
    return (
      <View style={s.nuevaPantalla}>
        <StatusBar hidden />
        <RoomBackground />
        <TabButtons onExit={() => navigation?.navigate?.('main')} customAddButton={<View />} chicles={cartasAnimalitos} chicleIcono={<CartaUniversalIcon />} />
        <View style={s.animalitosSimple}>
          <View style={s.animalitosSimpleBody}>
            {!seleccionado && <ScrollView style={s.animalitosSimpleList} contentContainerStyle={s.animalitosSimpleListContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {listaSimple.map((item, index) => {
                const bloqueado = Boolean(item?.bloqueado);
                const activo = item?.id === seleccionado?.id;
                const tema = PALETA_RAREZA[item?.rareza] || PALETA_RAREZA.Común;
                const estadoItem = item && !bloqueado ? estadoAnimal(item.id) : null;
                return <TouchableOpacity key={item?.id || `animal-simple-${index}`} disabled={!item || bloqueado} onPress={() => setSeleccionado(item)} style={[s.animalitoSimpleSquare, { backgroundColor: tema.fondo, borderColor: tema.acento }, activo && s.animalitoSimpleSquareActive, bloqueado && s.animalitoSimpleSquareLocked]} activeOpacity={0.82}>
                  {item && !bloqueado ? <>
                    <LinearGradient colors={[tema.brillo, tema.fondo]} style={s.animalitoSimpleCardGlow} pointerEvents="none" />
                    <View style={[s.animalitoSimpleRarityBadge, { backgroundColor: tema.acento }]}><Text style={s.animalitoSimpleRarityBadgeText}>{item.rareza || 'COMÚN'}</Text></View>
                    <Image source={item.imagen} style={s.animalitoSimpleImage} contentFit="contain" cachePolicy="memory" />
                    <View style={[s.animalitoSimpleCardSide, { backgroundColor: tema.acento }]}><Text style={s.animalitoSimpleCardSideIcon}>◆</Text><Text style={s.animalitoSimpleCardSideLevel}>N{estadoItem?.nivel || 1}</Text></View>
                    <View style={[s.animalitoSimpleCardFooter, { backgroundColor: tema.acento }]}><Text style={s.animalitoSimpleCardName} numberOfLines={1}>{item.nombre}</Text><Text style={s.animalitoSimpleCardSkill} numberOfLines={1}>{item.habilidad || 'COMPAÑERO'}</Text></View>
                  </> : item?.proximo ? <><Text style={s.animalitoSimpleLock}>✦</Text><Text style={s.animalitoSimpleComingSoon}>PRÓXIMAMENTE</Text></> : <Text style={s.animalitoSimpleLock}>🔒</Text>}
                </TouchableOpacity>;
              })}
            </ScrollView>}

            {seleccionado && <View style={s.animalitoSimpleDetail}>
              <View style={s.animalitoSimpleDetailTop}><TouchableOpacity onPress={() => setSeleccionado(null)} style={s.animalitoSimpleBack} hitSlop={8} activeOpacity={0.8}><MaterialIcons name="arrow-back" size={13} color="#76512f" /></TouchableOpacity><View style={s.animalitoSimpleDetailHeading}><Text style={s.animalitoSimpleEyebrow}>INFORMACIÓN DEL ANIMALITO</Text><Text style={s.animalitoSimpleDetailTitle}>{animalMostrado.nombre}</Text></View><View style={s.animalitoSimpleLevel}><Text style={s.animalitoSimpleLevelLabel}>NV.</Text><Text style={s.animalitoSimpleLevelNumber}>{estadoMostrado.nivel}</Text></View></View>
              <View style={s.animalitoSimpleHero}><Image source={animalMostrado.imagen} style={s.animalitoSimpleHeroImage} contentFit="contain" cachePolicy="memory" /><View style={s.animalitoSimpleHeroCopy}><Text style={s.animalitoSimpleRarity}>{fichaAnimalMostrado.rareza}</Text><Text style={s.animalitoSimpleDescription}>{fichaAnimalMostrado.habilidadTexto || 'Un compañero que crece con tus cuidados.'}</Text></View></View>
              <View style={s.animalitoSimpleStats}><View><Text style={s.animalitoSimpleStatLabel}>HABILIDAD</Text><Text style={s.animalitoSimpleStatValue}>{fichaAnimalMostrado.habilidad || 'Compañía'}</Text></View><View><Text style={s.animalitoSimpleStatLabel}>CARTAS</Text><Text style={s.animalitoSimpleStatValue}>{estadoMostrado.totalCartas}/{cartasNecesarias}</Text></View><View><Text style={s.animalitoSimpleStatLabel}>PROGRESO</Text><Text style={s.animalitoSimpleStatValue}>{Math.round(progresoCartas)}%</Text></View></View>
              <Text style={s.animalitoSimpleSectionTitle}>RECOMPENSAS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.animalitoSimpleRewards}>{recompensasMostradas.map(recompensa => { const disponible = estadoMostrado.nivel >= recompensa.nivel; const reclamada = Boolean(recompensasReclamadas?.[animalMostradoId]?.[recompensa.nivel]); return <TouchableOpacity key={recompensa.nivel} disabled={!disponible || reclamada} onPress={() => reclamarRecompensaNivel(recompensa)} style={[s.animalitoSimpleReward, disponible && s.animalitoSimpleRewardReady]} activeOpacity={0.8}><Text style={s.animalitoSimpleRewardLevel}>NV. {recompensa.nivel}</Text><Text style={s.animalitoSimpleRewardIcon}>{recompensa.icono}</Text><Text style={s.animalitoSimpleRewardName} numberOfLines={2}>{reclamada ? 'Reclamado' : recompensa.titulo}</Text></TouchableOpacity>; })}</ScrollView>
              <View style={s.animalitoSimpleActions}><TouchableOpacity style={s.animalitoSimpleCards} onPress={() => navigation?.navigate?.('comerciante')} activeOpacity={0.82}><Text style={s.animalitoSimpleActionText}>CONSEGUIR CARTAS</Text></TouchableOpacity><TouchableOpacity style={[s.animalitoSimpleUse, equipado === animalMostrado.id && s.animalitoSimpleUseActive]} onPress={() => handleEquipar(animalMostrado.id)} activeOpacity={0.82}><Text style={s.animalitoSimpleActionText}>{equipado === animalMostrado.id ? 'USANDO' : 'USAR'}</Text></TouchableOpacity><TouchableOpacity style={[s.animalitoSimpleUpgrade, !puedeMejorar && s.animalitoSimpleUpgradeDisabled]} onPress={() => manejarMejora(animalMostrado.id)} disabled={!puedeMejorar || Boolean(mejoraEnCurso)} activeOpacity={puedeMejorar ? 0.82 : 1}><Text style={s.animalitoSimpleActionText}>{mejoraEnCurso === animalMostrado.id ? 'MEJORANDO…' : 'SUBIR NIVEL'}</Text></TouchableOpacity></View>
            </View>}
          </View>
        </View>
        <Loading ref={loadingRef} />
      </View>
    );
  }

  if (mode !== 'skins') {
    const listaAnimalitosIntegrada = soloDesbloqueados ? animalitosOrdenados : animalitosCatalogo;
    return (
      <View style={s.nuevaPantalla}>
        <StatusBar hidden />
        <RoomBackground />
        <TabButtons onExit={() => navigation?.navigate?.('main')} customAddButton={<View />} chicles={cartasAnimalitos} chicleIcono={<CartaUniversalIcon />} />

        <View style={s.animalitosIntegrados}>
          <View style={s.animalitosIntegradosHeader}>
            <View>
              <Text style={s.animalitosIntegradosTitle}>MIS ANIMALITOS</Text>
              <Text style={s.animalitosIntegradosSubtitle}>Elegí uno para conocer su historia y hacerlo crecer</Text>
            </View>
            <View style={s.animalitosIntegradosCount}><Text style={s.animalitosIntegradosCountText}>{animalitosFiltrados.length}/8</Text><Text style={s.animalitosIntegradosCountLabel}>DESCUBIERTOS</Text></View>
          </View>

          <View style={s.animalitosIntegradosBody}>
            <View style={s.animalitosIntegradosListPanel}>
              <View style={s.animalitosIntegradosListTitle}><MaterialIcons name="pets" size={13} color="#6f9e55" /><Text style={s.animalitosIntegradosListTitleText}>TU COLECCIÓN</Text></View>
              <ScrollView style={s.animalitosIntegradosScroll} contentContainerStyle={s.animalitosIntegradosScrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {listaAnimalitosIntegrada.map((item, index) => {
                  const bloqueado = Boolean(item?.bloqueado);
                  const id = item?.id === 'default' ? 'halcon' : item?.id;
                  const estadoItem = item && !bloqueado ? estadoAnimal(id) : null;
                  const cartasNecesariasItem = estadoItem ? COPIAS_POR_NIVEL(estadoItem.nivel) : 1;
                  const progresoItem = estadoItem ? Math.min(100, (estadoItem.totalCartas / cartasNecesariasItem) * 100) : 0;
                  const activo = item?.id === animalMostrado.id;
                  return <TouchableOpacity key={item?.id || `animal-integrado-${index}`} disabled={!item || bloqueado} onPress={() => setSeleccionado(item)} style={[s.animalIntegradoItem, activo && s.animalIntegradoItemActivo, bloqueado && s.animalIntegradoItemBloqueado]} activeOpacity={0.82}>
                    {item && !bloqueado ? <>
                      <Image source={item.imagen} style={s.animalIntegradoImagen} contentFit="contain" cachePolicy="memory" />
                      <View style={s.animalIntegradoCopy}><Text style={s.animalIntegradoName} numberOfLines={1}>{item.nombre}</Text><Text style={s.animalIntegradoMeta}>{item.rareza || 'Común'} · Nivel {estadoItem.nivel}</Text><View style={s.animalIntegradoTrack}><View style={[s.animalIntegradoFill, { width: `${progresoItem}%` }]} /><Text style={s.animalIntegradoTrackText}>{estadoItem.totalCartas}/{cartasNecesariasItem}</Text></View></View>
                      {activo && <MaterialIcons name="chevron-right" size={18} color="#6f9e55" />}
                    </> : <><Text style={s.animalIntegradoLock}>🔒</Text><View style={s.animalIntegradoCopy}><Text style={s.animalIntegradoName}>Animal misterioso</Text><Text style={s.animalIntegradoMeta}>{item?.pistaBloqueada || 'Aún no descubierto'}</Text></View></>}
                  </TouchableOpacity>;
                })}
              </ScrollView>
              <View style={s.animalitosIntegradosFilters}><TouchableOpacity style={[s.integratedFilter, soloDesbloqueados && s.integratedFilterActive]} onPress={() => setSoloDesbloqueados(value => !value)} activeOpacity={0.8}><Text style={s.integratedFilterText}>{soloDesbloqueados ? '✓ Desbloqueados' : 'Todos'}</Text></TouchableOpacity><TouchableOpacity style={s.integratedFilter} onPress={() => setOrdenCatalogo(value => value === 'rareza' ? 'nivel' : 'rareza')} activeOpacity={0.8}><Text style={s.integratedFilterText}>Por {ordenCatalogo}</Text></TouchableOpacity></View>
            </View>

            <View style={s.animalitoIntegradoDetail}>
              <View style={s.animalitoIntegradoDetailHeader}><View><Text style={s.animalitoIntegradoDetailEyebrow}>COMPAÑERO SELECCIONADO</Text><Text style={s.animalitoIntegradoDetailTitle}>{animalMostrado.nombre || 'Animalito'}</Text></View><View style={s.animalitoIntegradoLevel}><Text style={s.animalitoIntegradoLevelLabel}>NIVEL</Text><Text style={s.animalitoIntegradoLevelNumber}>{estadoMostrado.nivel}</Text></View></View>
              <View style={s.animalitoIntegradoHero}><Image source={animalMostrado.imagen} style={s.animalitoIntegradoImage} contentFit="contain" cachePolicy="memory" /><View style={s.animalitoIntegradoHeroCopy}><View style={s.animalitoIntegradoRarity}><Text style={s.animalitoIntegradoRarityText}>{fichaAnimalMostrado.rareza}</Text></View><Text style={s.animalitoIntegradoDescription}>{fichaAnimalMostrado.habilidadTexto || 'Un compañero especial que crece con tus cuidados.'}</Text><View style={s.animalitoIntegradoProgress}><View style={[s.animalitoIntegradoProgressFill, { width: `${progresoCartas}%` }]} /><Text style={s.animalitoIntegradoProgressText}>{estadoMostrado.totalCartas} / {cartasNecesarias} cartas</Text></View></View></View>
              <View style={s.animalitoIntegradoInfoRow}><View style={s.animalitoIntegradoInfoCard}><Text style={s.animalitoIntegradoInfoLabel}>HABILIDAD</Text><Text style={s.animalitoIntegradoInfoValue}>{fichaAnimalMostrado.habilidad || 'Compañía'}</Text></View><View style={s.animalitoIntegradoInfoCard}><Text style={s.animalitoIntegradoInfoLabel}>CARTAS PROPIAS</Text><Text style={s.animalitoIntegradoInfoValue}>{estadoMostrado.cartasPropias}</Text></View><View style={s.animalitoIntegradoInfoCard}><Text style={s.animalitoIntegradoInfoLabel}>UNIVERSALES</Text><Text style={s.animalitoIntegradoInfoValue}>{estadoMostrado.cartasUniversales}</Text></View></View>
              <View style={s.animalitoIntegradoRewards}><Text style={s.animalitoIntegradoSectionTitle}>PRÓXIMAS RECOMPENSAS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.animalitoIntegradoRewardsContent}>{recompensasMostradas.map(recompensa => { const disponible = estadoMostrado.nivel >= recompensa.nivel; const reclamada = Boolean(recompensasReclamadas?.[animalMostradoId]?.[recompensa.nivel]); return <TouchableOpacity key={recompensa.nivel} style={[s.integratedReward, disponible && s.integratedRewardReady]} onPress={() => disponible && !reclamada ? reclamarRecompensaNivel(recompensa) : setPreviewRecompensa(recompensa)} activeOpacity={0.8}><Text style={s.integratedRewardLevel}>NV. {recompensa.nivel}</Text><Text style={s.integratedRewardIcon}>{recompensa.icono}</Text><Text style={s.integratedRewardName} numberOfLines={2}>{reclamada ? '✓ Reclamado' : recompensa.titulo}</Text></TouchableOpacity>; })}</ScrollView></View>
              <View style={s.animalitoIntegradoActions}><TouchableOpacity style={s.integratedCardsButton} onPress={() => navigation?.navigate?.('comerciante')} activeOpacity={0.82}><MaterialIcons name="style" size={13} color="#fff8df" /><Text style={s.integratedActionText}>CONSEGUIR CARTAS</Text></TouchableOpacity><TouchableOpacity style={[s.integratedUseButton, equipado === animalMostrado.id && s.integratedUseButtonActive]} onPress={() => handleEquipar(animalMostrado.id)} activeOpacity={0.82}><MaterialIcons name={equipado === animalMostrado.id ? 'check' : 'pets'} size={13} color="#fff8df" /><Text style={s.integratedActionText}>{equipado === animalMostrado.id ? 'USANDO' : 'USAR'}</Text></TouchableOpacity><TouchableOpacity style={[s.integratedUpgradeButton, !puedeMejorar && s.integratedUpgradeDisabled]} onPress={() => manejarMejora(animalMostrado.id)} disabled={!puedeMejorar || Boolean(mejoraEnCurso)} activeOpacity={puedeMejorar ? 0.82 : 1}><MaterialIcons name="arrow-upward" size={13} color="#fff8df" /><Text style={s.integratedActionText}>{mejoraEnCurso === animalMostrado.id ? 'MEJORANDO…' : 'SUBIR NIVEL'}</Text></TouchableOpacity></View>
            </View>
          </View>
        </View>
        <Modal visible={Boolean(previewRecompensa)} transparent animationType="fade" onRequestClose={() => setPreviewRecompensa(null)}><View style={s.previewFondo}><TouchableOpacity style={s.previewCerrarFondo} activeOpacity={1} onPress={() => setPreviewRecompensa(null)} /><View style={s.previewTarjeta}><Text style={s.previewIconoTexto}>{previewRecompensa?.icono}</Text><Text style={s.previewTitulo}>{previewRecompensa?.titulo}</Text><Text style={s.previewNivel}>Recompensa de nivel {previewRecompensa?.nivel}</Text><TouchableOpacity style={s.previewBoton} onPress={() => setPreviewRecompensa(null)}><Text style={s.previewBotonTexto}>Entendido</Text></TouchableOpacity></View></View></Modal>
        <Loading ref={loadingRef} />
      </View>
    );
  }

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
            <AnimatedTouchableOpacity style={[s.subirBtn, (!puedeMejorar || mejoraEnCurso) && s.subirBtnBloqueado, mejoraPendiente === animalMostrado.id && s.subirBtnConfirmar, llamadaMejoraActiva && { backgroundColor: llamadaMejora.interpolate({ inputRange: [0, 1], outputRange: ['#4384bd', '#f3a8c3'] }), borderColor: llamadaMejora.interpolate({ inputRange: [0, 1], outputRange: ['#286190', '#d86f9d'] }), transform: [{ scale: llamadaMejora.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }]} onPress={() => manejarMejora(animalMostrado.id)} disabled={!puedeMejorar || Boolean(mejoraEnCurso)} activeOpacity={puedeMejorar ? 0.82 : 1}><Text style={s.botonFinalTexto}>{mejoraEnCurso === animalMostrado.id ? 'MEJORANDO…' : mejoraPendiente === animalMostrado.id ? `CONFIRMAR -${costoMejora}` : `⬆ SUBIR NIVEL · ${costoMejora}`}</Text></AnimatedTouchableOpacity>
          </View>
        </View>
        </>}
      </View>

      <Modal visible={Boolean(recordatorioMejora) && !recordatorioCerrado} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setRecordatorioCerrado(true)}>
        <View style={s.recordatorioOverlay}>
          <TouchableOpacity style={s.recordatorioCerrarFondo} activeOpacity={1} onPress={() => setRecordatorioCerrado(true)} />
          {recordatorioMejora && <View style={s.recordatorioCard}>
            <LinearGradient colors={['#eaf2c9', '#b8d49a', '#719b68']} style={s.recordatorioHero}>
              <View pointerEvents="none" style={s.recordatorioSol} />
              <View pointerEvents="none" style={s.recordatorioColinaUno} /><View pointerEvents="none" style={s.recordatorioColinaDos} />
              <Image source={recordatorioMejora.animal.imagen} style={s.recordatorioAnimal} contentFit="contain" cachePolicy="memory-disk" />
              <View style={s.recordatorioNivelActual}><Text style={s.recordatorioNivelEtiqueta}>AHORA</Text><Text style={s.recordatorioNivelNumero}>{recordatorioMejora.estado.nivel}</Text></View>
              <MaterialIcons name="arrow-forward" size={17} color="#fff6d7" style={s.recordatorioFlecha} />
              <View style={s.recordatorioNivelFuturo}><Text style={s.recordatorioNivelEtiqueta}>PUEDE LLEGAR A</Text><Text style={s.recordatorioNivelNumero}>{recordatorioMejora.nivelFinal}</Text></View>
              <View style={s.recordatorioBotonEjemplo}><MaterialIcons name="arrow-upward" size={11} color="#fff" /><Text style={s.recordatorioBotonEjemploTexto}>SUBIR NIVEL</Text></View>
            </LinearGradient>
            <TouchableOpacity style={s.recordatorioCerrar} onPress={() => setRecordatorioCerrado(true)} accessibilityLabel="Cerrar recordatorio"><MaterialIcons name="close" size={16} color="#765136" /></TouchableOpacity>

            <View style={s.recordatorioContenido}>
              <Text style={s.recordatorioEtiqueta}>TUS CARTAS ESTÁN ESPERANDO</Text>
              <Text style={s.recordatorioTitulo}>¡{recordatorioMejora.animal.nombre} puede crecer!</Text>
              <Text style={s.recordatorioTexto}>Tienes las cartas y monedas necesarias para subirlo <Text style={s.recordatorioDestacado}>{recordatorioMejora.nivelesPosibles} niveles seguidos</Text>.</Text>
              <View style={s.recordatorioRecursos}>
                <View style={s.recordatorioRecurso}><View style={s.recordatorioCartaIcono}><Text style={s.recordatorioCartaMarca}>✦</Text></View><View><Text style={s.recordatorioRecursoValor}>{recordatorioMejora.cartasGastadas}</Text><Text style={s.recordatorioRecursoLabel}>CARTAS PARA 2+ NIVELES</Text></View></View>
                <View style={s.recordatorioSeparador} />
                <View style={s.recordatorioRecurso}><Text style={s.recordatorioMoneda}>●</Text><View><Text style={s.recordatorioRecursoValor}>{recordatorioMejora.monedasGastadas.toLocaleString('es-AR')}</Text><Text style={s.recordatorioRecursoLabel}>MONEDAS NECESARIAS</Text></View></View>
              </View>
              <Text style={s.recordatorioNota}>Usaremos primero las cartas propias de {recordatorioMejora.animal.nombre}; las universales solo completan lo que falte.</Text>
              <View style={s.recordatorioAcciones}><TouchableOpacity style={s.recordatorioDespues} onPress={() => setRecordatorioCerrado(true)} activeOpacity={0.8}><Text style={s.recordatorioDespuesTexto}>Después</Text></TouchableOpacity><TouchableOpacity style={s.recordatorioIr} onPress={() => irAMejorarAhora(recordatorioMejora.animal)} activeOpacity={0.84}><MaterialIcons name="pets" size={13} color="#fff8df" /><Text style={s.recordatorioIrTexto}>MEJORAR AHORA</Text></TouchableOpacity></View>
            </View>
          </View>}
        </View>
      </Modal>

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
  nuevaPantalla: { flex: 1, overflow: 'hidden' },
  nuevoContenido: { position: 'absolute', left: '14%', top: '9%', width: '78%', height: '86%', flexDirection: 'row', padding: 13, borderRadius: 24, backgroundColor: '#fff4d6', borderWidth: 4, borderColor: '#9b6a35', shadowColor: '#171008', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.48, shadowRadius: 16, elevation: 22 },
  animalitosIntegrados: { position: 'absolute', left: '7%', top: '8%', width: '86%', height: '84%', padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,248,226,0.9)', borderWidth: 2, borderColor: '#a8753c', shadowColor: '#3d2818', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 14 },
  animalitosSimple: { position: 'absolute', left: '4%', top: '8%', width: '92%', height: '86%', padding: 5 },
  animalitosSimpleHeader: { height: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  animalitosSimpleTitle: { color: '#62401f', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  animalitosSimpleHint: { color: '#9b754b', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800' },
  animalitosSimpleBody: { flex: 1, width: '100%', alignItems: 'center', paddingTop: 6 },
  animalitosSimpleList: { width: '100%' },
  animalitosSimpleListContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start', columnGap: 5, rowGap: 6, paddingVertical: 2, paddingHorizontal: 2, paddingBottom: 24 },
  animalitoSimpleSquare: { width: '18%', aspectRatio: 1, position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: 'rgba(255,252,237,0.82)', borderWidth: 1.5, borderColor: '#969696', shadowColor: '#4b3c33', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.22, shadowRadius: 2, elevation: 3 },
  animalitoSimpleSquareActive: { borderWidth: 2, borderColor: '#6d9d53', backgroundColor: '#e9f2cf', shadowColor: '#5b873f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 3, elevation: 3 },
  animalitoSimpleSquareLocked: { opacity: 0.58, borderStyle: 'dashed', backgroundColor: '#e1e1e1', borderColor: '#969696', shadowOpacity: 0 },
  animalitoSimpleCardGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.9 },
  animalitoSimpleRarityBadge: { position: 'absolute', top: 3, left: 3, maxWidth: '68%', paddingHorizontal: 4, paddingVertical: 2, zIndex: 2 },
  animalitoSimpleRarityBadgeText: { color: '#fffdf5', fontFamily: 'Delius', fontSize: 4.3, fontWeight: '900', letterSpacing: 0.2 },
  animalitoSimpleImage: { position: 'absolute', right: '-5%', top: '5%', width: '78%', height: '78%', zIndex: 1 },
  animalitoSimpleCardSide: { position: 'absolute', top: 0, right: 0, bottom: '29%', width: 10, alignItems: 'center', justifyContent: 'space-around', zIndex: 2 },
  animalitoSimpleCardSideIcon: { color: '#fffbe9', fontSize: 5 },
  animalitoSimpleCardSideLevel: { color: '#fffbe9', fontFamily: 'Delius', fontSize: 4.3, fontWeight: '900', transform: [{ rotate: '90deg' }] },
  animalitoSimpleCardFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '29%', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 4, zIndex: 3 },
  animalitoSimpleCardName: { maxWidth: '88%', color: '#fffdf5', fontFamily: 'Delius', fontSize: 5.7, fontWeight: '900' },
  animalitoSimpleCardSkill: { maxWidth: '88%', marginTop: 1, color: 'rgba(255,253,245,0.82)', fontFamily: 'Delius', fontSize: 3.9, fontWeight: '800' },
  animalitoSimpleLock: { color: '#a98b62', fontSize: 23, lineHeight: 24, opacity: 0.8 },
  animalitoSimpleComingSoon: { marginTop: 2, color: '#9c7a4d', fontFamily: 'Delius', fontSize: 5.2, fontWeight: '900', textAlign: 'center', letterSpacing: 0.2 },
  animalitoSimpleDetail: { width: '100%', flex: 1, padding: 9, borderRadius: 11, backgroundColor: 'rgba(255,252,239,0.86)', borderWidth: 1, borderColor: 'rgba(170,126,71,0.28)' },
  animalitoSimpleDetailTop: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  animalitoSimpleBack: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginRight: 5, borderRadius: 12, backgroundColor: 'rgba(221,195,148,0.32)' },
  animalitoSimpleDetailHeading: { flex: 1, minWidth: 0, marginLeft: 1 },
  animalitoSimpleEyebrow: { color: '#a27843', fontFamily: 'Delius', fontSize: 5.3, fontWeight: '900', letterSpacing: 0.5 },
  animalitoSimpleDetailTitle: { marginTop: 2, color: '#5f3e22', fontFamily: 'Delius', fontSize: 14, fontWeight: '900' },
  animalitoSimpleLevel: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#7ca555', borderWidth: 1.5, borderColor: '#dcebb5' },
  animalitoSimpleLevelLabel: { color: '#eaf5d2', fontFamily: 'Delius', fontSize: 4.5, fontWeight: '900' },
  animalitoSimpleLevelNumber: { color: '#fff', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' },
  animalitoSimpleHero: { flexDirection: 'row', alignItems: 'center', minHeight: 94, marginTop: 5, padding: 5, borderRadius: 9, backgroundColor: 'rgba(224,238,191,0.42)' },
  animalitoSimpleHeroImage: { width: 105, height: 92 },
  animalitoSimpleHeroCopy: { flex: 1, paddingHorizontal: 5 },
  animalitoSimpleRarity: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, color: '#fffbea', backgroundColor: '#79a755', fontFamily: 'Delius', fontSize: 6, fontWeight: '900' },
  animalitoSimpleDescription: { marginTop: 6, color: '#6f593a', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9, fontWeight: '800' },
  animalitoSimpleStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 7, paddingVertical: 6, borderRadius: 7, backgroundColor: 'rgba(238,225,191,0.5)' },
  animalitoSimpleStatLabel: { color: '#9a7646', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900', textAlign: 'center' },
  animalitoSimpleStatValue: { marginTop: 2, color: '#654426', fontFamily: 'Delius', fontSize: 8, fontWeight: '900', textAlign: 'center' },
  animalitoSimpleSectionTitle: { marginTop: 7, color: '#74502d', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.4 },
  animalitoSimpleRewards: { gap: 5, paddingVertical: 5 },
  animalitoSimpleReward: { width: 61, minHeight: 55, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: 'rgba(228,218,196,0.58)', borderWidth: 1, borderColor: '#c7b38e', opacity: 0.72 },
  animalitoSimpleRewardReady: { backgroundColor: '#e7f1ca', borderColor: '#82a85c', opacity: 1 },
  animalitoSimpleRewardLevel: { color: '#9a7547', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
  animalitoSimpleRewardIcon: { marginTop: 2, fontSize: 15 },
  animalitoSimpleRewardName: { marginTop: 1, color: '#6c4b2e', fontFamily: 'Delius', fontSize: 5, lineHeight: 6.5, fontWeight: '900', textAlign: 'center' },
  animalitoSimpleActions: { flexDirection: 'row', gap: 5, marginTop: 5 },
  animalitoSimpleCards: { flex: 1.2, minHeight: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#679b55', borderWidth: 1, borderColor: '#457b3a' },
  animalitoSimpleUse: { flex: 0.75, minHeight: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#bd9144', borderWidth: 1, borderColor: '#8d662d' },
  animalitoSimpleUseActive: { backgroundColor: '#78a65a', borderColor: '#4d7b3e' },
  animalitoSimpleUpgrade: { flex: 1, minHeight: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#4c83b4', borderWidth: 1, borderColor: '#2f628e' },
  animalitoSimpleUpgradeDisabled: { backgroundColor: '#8b9697', borderColor: '#6f7a7b', opacity: 0.65 },
  animalitoSimpleActionText: { color: '#fff8df', fontFamily: 'Delius', fontSize: 5.6, fontWeight: '900', textAlign: 'center' },
  animalitoSimpleEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  animalitoSimpleEmptyIcon: { fontSize: 27, opacity: 0.62 },
  animalitoSimpleEmptyTitle: { marginTop: 7, color: '#69452a', fontFamily: 'Delius', fontSize: 10, fontWeight: '900' },
  animalitoSimpleEmptyText: { marginTop: 4, color: '#96714a', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9, fontWeight: '800', textAlign: 'center' },
  animalitosIntegradosHeader: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(154,109,57,0.24)' },
  animalitosIntegradosTitle: { color: '#63401f', fontFamily: 'Delius', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  animalitosIntegradosSubtitle: { marginTop: 2, color: '#98724a', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800' },
  animalitosIntegradosCount: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#e7efc7', borderWidth: 1, borderColor: '#a5bd70' },
  animalitosIntegradosCountText: { color: '#52713d', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' },
  animalitosIntegradosCountLabel: { color: '#78935d', fontFamily: 'Delius', fontSize: 5, fontWeight: '900' },
  animalitosIntegradosBody: { flex: 1, flexDirection: 'row', gap: 10, paddingTop: 9 },
  animalitosIntegradosListPanel: { width: '36%', padding: 7, borderRadius: 12, backgroundColor: 'rgba(240,231,198,0.62)', borderWidth: 1, borderColor: 'rgba(161,119,67,0.26)' },
  animalitosIntegradosListTitle: { height: 21, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 3 },
  animalitosIntegradosListTitleText: { color: '#6b4b2d', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  animalitosIntegradosScroll: { flex: 1 },
  animalitosIntegradosScrollContent: { paddingVertical: 3, gap: 5 },
  animalIntegradoItem: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 9, backgroundColor: 'rgba(255,252,236,0.86)', borderWidth: 1, borderColor: '#d0b77f' },
  animalIntegradoItemActivo: { backgroundColor: '#e9f3ce', borderColor: '#75a052', shadowColor: '#64883f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  animalIntegradoItemBloqueado: { opacity: 0.65, borderStyle: 'dashed' },
  animalIntegradoImagen: { width: 46, height: 46, marginRight: 4 },
  animalIntegradoLock: { width: 42, textAlign: 'center', fontSize: 17, opacity: 0.65 },
  animalIntegradoCopy: { flex: 1, minWidth: 0 },
  animalIntegradoName: { color: '#614329', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' },
  animalIntegradoMeta: { marginTop: 2, color: '#96714a', fontFamily: 'Delius', fontSize: 5.8, fontWeight: '800' },
  animalIntegradoTrack: { height: 8, marginTop: 4, borderRadius: 4, overflow: 'hidden', justifyContent: 'center', backgroundColor: '#cbb58b' },
  animalIntegradoFill: { ...StyleSheet.absoluteFillObject, right: undefined, backgroundColor: '#7ba752' },
  animalIntegradoTrackText: { color: '#fff9e8', fontFamily: 'Delius', fontSize: 5, fontWeight: '900', textAlign: 'center', zIndex: 2 },
  animalitosIntegradosFilters: { height: 25, flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  integratedFilter: { flex: 1, paddingVertical: 4, borderRadius: 6, backgroundColor: '#eed7a6', borderWidth: 1, borderColor: '#c49a58' },
  integratedFilterActive: { backgroundColor: '#dcebb8', borderColor: '#81a358' },
  integratedFilterText: { color: '#76522d', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900', textAlign: 'center' },
  animalitoIntegradoDetail: { flex: 1, padding: 9, borderRadius: 12, backgroundColor: 'rgba(255,251,235,0.9)', borderWidth: 1, borderColor: 'rgba(170,126,71,0.3)' },
  animalitoIntegradoDetailHeader: { minHeight: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  animalitoIntegradoDetailEyebrow: { color: '#a27843', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900', letterSpacing: 0.6 },
  animalitoIntegradoDetailTitle: { marginTop: 2, color: '#5f3e22', fontFamily: 'Delius', fontSize: 14, fontWeight: '900' },
  animalitoIntegradoLevel: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#7ca555', borderWidth: 2, borderColor: '#dcebb5' },
  animalitoIntegradoLevelLabel: { color: '#eaf5d2', fontFamily: 'Delius', fontSize: 4.5, fontWeight: '900' },
  animalitoIntegradoLevelNumber: { color: '#fff', fontFamily: 'Delius', fontSize: 12, fontWeight: '900' },
  animalitoIntegradoHero: { minHeight: 100, flexDirection: 'row', alignItems: 'center', marginTop: 4, padding: 5, borderRadius: 10, backgroundColor: 'rgba(224,238,191,0.45)' },
  animalitoIntegradoImage: { width: 116, height: 106 },
  animalitoIntegradoHeroCopy: { flex: 1, paddingHorizontal: 5 },
  animalitoIntegradoRarity: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#79a755' },
  animalitoIntegradoRarityText: { color: '#fffbea', fontFamily: 'Delius', fontSize: 6, fontWeight: '900' },
  animalitoIntegradoDescription: { marginTop: 6, color: '#6f593a', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9, fontWeight: '800' },
  animalitoIntegradoProgress: { height: 14, marginTop: 8, borderRadius: 7, overflow: 'hidden', justifyContent: 'center', backgroundColor: '#bda67d' },
  animalitoIntegradoProgressFill: { ...StyleSheet.absoluteFillObject, right: undefined, backgroundColor: '#6f9e55' },
  animalitoIntegradoProgressText: { color: '#fff8e6', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900', textAlign: 'center', zIndex: 2 },
  animalitoIntegradoInfoRow: { flexDirection: 'row', gap: 5, marginTop: 7 },
  animalitoIntegradoInfoCard: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: 'rgba(238,225,191,0.55)', borderWidth: 1, borderColor: 'rgba(182,142,84,0.22)' },
  animalitoIntegradoInfoLabel: { color: '#9a7646', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900', textAlign: 'center' },
  animalitoIntegradoInfoValue: { marginTop: 3, color: '#654426', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  animalitoIntegradoRewards: { flex: 1, minHeight: 83, marginTop: 7 },
  animalitoIntegradoSectionTitle: { color: '#74502d', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.45 },
  animalitoIntegradoRewardsContent: { gap: 5, paddingVertical: 5, paddingHorizontal: 2 },
  integratedReward: { width: 64, minHeight: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 7, backgroundColor: 'rgba(228,218,196,0.58)', borderWidth: 1, borderColor: '#c7b38e', opacity: 0.72 },
  integratedRewardReady: { backgroundColor: '#e7f1ca', borderColor: '#82a85c', opacity: 1 },
  integratedRewardLevel: { color: '#9a7547', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
  integratedRewardIcon: { marginTop: 3, fontSize: 16 },
  integratedRewardName: { marginTop: 2, color: '#6c4b2e', fontFamily: 'Delius', fontSize: 5.2, lineHeight: 7, fontWeight: '900', textAlign: 'center' },
  animalitoIntegradoActions: { flexDirection: 'row', gap: 5, marginTop: 5 },
  integratedCardsButton: { flex: 1.25, minHeight: 27, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 7, backgroundColor: '#679b55', borderWidth: 1, borderColor: '#457b3a' },
  integratedUseButton: { flex: 0.8, minHeight: 27, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 7, backgroundColor: '#bd9144', borderWidth: 1, borderColor: '#8d662d' },
  integratedUseButtonActive: { backgroundColor: '#78a65a', borderColor: '#4d7b3e' },
  integratedUpgradeButton: { flex: 1.05, minHeight: 27, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 7, backgroundColor: '#4c83b4', borderWidth: 1, borderColor: '#2f628e' },
  integratedUpgradeDisabled: { backgroundColor: '#8b9697', borderColor: '#6f7a7b', opacity: 0.65 },
  integratedActionText: { color: '#fff8df', fontFamily: 'Delius', fontSize: 5.6, fontWeight: '900', textAlign: 'center' },
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
  recordatorioOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,22,16,0.72)' },
  recordatorioCerrarFondo: { ...StyleSheet.absoluteFillObject },
  recordatorioCard: { width: 430, maxWidth: '88%', overflow: 'hidden', borderRadius: 20, backgroundColor: '#fff3d5', borderWidth: 3, borderColor: '#976231', shadowColor: '#130c08', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.52, shadowRadius: 15, elevation: 25 },
  recordatorioHero: { height: 112, position: 'relative', overflow: 'hidden', borderBottomWidth: 2, borderBottomColor: '#6e824d' },
  recordatorioSol: { position: 'absolute', top: 12, left: 25, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,241,161,0.72)', shadowColor: '#fff0a4', shadowOpacity: 0.6, shadowRadius: 8 },
  recordatorioColinaUno: { position: 'absolute', left: -30, bottom: -35, width: 260, height: 95, borderRadius: 120, backgroundColor: '#789b61', transform: [{ rotate: '5deg' }] },
  recordatorioColinaDos: { position: 'absolute', right: -50, bottom: -43, width: 300, height: 105, borderRadius: 140, backgroundColor: '#5d8259', transform: [{ rotate: '-4deg' }] },
  recordatorioAnimal: { position: 'absolute', zIndex: 3, left: 20, bottom: -4, width: 135, height: 110 },
  recordatorioNivelActual: { position: 'absolute', zIndex: 4, left: '43%', top: 19, width: 57, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,246,215,0.87)', borderWidth: 1.2, borderColor: '#a57b42' },
  recordatorioNivelFuturo: { position: 'absolute', zIndex: 4, right: 46, top: 16, minWidth: 77, height: 54, paddingHorizontal: 7, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9c861', borderWidth: 2, borderColor: '#9b7028', shadowColor: '#755321', shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  recordatorioNivelEtiqueta: { color: '#795a32', fontFamily: 'Delius', fontSize: 4.8, lineHeight: 6, fontWeight: '900', letterSpacing: 0.35, textAlign: 'center' },
  recordatorioNivelNumero: { color: '#5a3d25', fontFamily: 'Delius', fontSize: 18, lineHeight: 20, fontWeight: '900' },
  recordatorioFlecha: { position: 'absolute', zIndex: 5, left: '59%', top: 35 },
  recordatorioBotonEjemplo: { position: 'absolute', zIndex: 5, right: 18, bottom: 8, height: 25, minWidth: 104, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4384bd', borderWidth: 1.2, borderColor: '#286190', shadowColor: '#234f72', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  recordatorioBotonEjemploTexto: { color: '#fff', fontFamily: 'Delius', fontSize: 7.2, fontWeight: '900', letterSpacing: 0.45 },
  recordatorioCerrar: { position: 'absolute', zIndex: 10, top: 7, right: 7, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,247,222,0.88)', borderWidth: 1, borderColor: '#c5a06e' },
  recordatorioContenido: { paddingHorizontal: 17, paddingTop: 10, paddingBottom: 13, alignItems: 'center' },
  recordatorioEtiqueta: { color: '#9a6834', fontFamily: 'Delius', fontSize: 5.8, lineHeight: 7, fontWeight: '900', letterSpacing: 1 },
  recordatorioTitulo: { marginTop: 2, color: '#573821', fontFamily: 'Delius', fontSize: 15.5, lineHeight: 18, fontWeight: '900', textAlign: 'center' },
  recordatorioTexto: { width: '94%', marginTop: 3, color: '#806047', fontFamily: 'Delius', fontSize: 7, lineHeight: 10, fontWeight: '700', textAlign: 'center' },
  recordatorioDestacado: { color: '#6b8f51', fontWeight: '900' },
  recordatorioRecursos: { width: '100%', height: 43, marginTop: 8, paddingHorizontal: 12, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#f1dfb7', borderWidth: 1, borderColor: '#d0ac70' },
  recordatorioRecurso: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  recordatorioCartaIcono: { width: 23, height: 29, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d6bb6d', borderWidth: 1.5, borderColor: '#8d6d36', transform: [{ rotate: '-5deg' }] },
  recordatorioCartaMarca: { color: '#fff8dc', fontSize: 14, lineHeight: 17, fontWeight: '900' },
  recordatorioMoneda: { width: 25, height: 25, borderRadius: 13, color: '#fff0a5', backgroundColor: '#daa63e', borderWidth: 2, borderColor: '#9e7024', fontSize: 10, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
  recordatorioRecursoValor: { color: '#5e4229', fontFamily: 'Delius', fontSize: 9, lineHeight: 11, fontWeight: '900' },
  recordatorioRecursoValorFaltante: { color: '#b5533d' },
  recordatorioRecursoLabel: { color: '#987352', fontFamily: 'Delius', fontSize: 4.5, lineHeight: 6, fontWeight: '900', letterSpacing: 0.25 },
  recordatorioSeparador: { width: 1, height: 27, backgroundColor: 'rgba(147,104,57,0.3)' },
  recordatorioNota: { marginTop: 6, color: '#97775d', fontFamily: 'Delius', fontSize: 5.5, lineHeight: 7, fontWeight: '700', textAlign: 'center' },
  recordatorioAcciones: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  recordatorioDespues: { height: 30, minWidth: 82, paddingHorizontal: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ead9b8', borderWidth: 1, borderColor: '#bea079' },
  recordatorioDespuesTexto: { color: '#806047', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
  recordatorioIr: { height: 30, minWidth: 137, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6f985d', borderWidth: 1, borderColor: '#486f42', shadowColor: '#355334', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.27, shadowRadius: 3, elevation: 4 },
  recordatorioIrTexto: { color: '#fff8df', fontFamily: 'Delius', fontSize: 7.2, fontWeight: '900', letterSpacing: 0.4 },
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
