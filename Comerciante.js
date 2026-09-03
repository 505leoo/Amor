import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Dimensions, TouchableOpacity, Modal, Animated, ScrollView } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, doc, getDocs, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import RoomBackground from './components/RoomBackground';
import TabButtons from './components/TabButtons';
import RecompensaOverlay from './components/RecompensaOverlay';
import { auth, db, functions } from './firebaseConfig';
import { contenidoDisponible, numeroTemporada, useTemporadaActual } from './hooks/useTemporadaActual';
import { useMisiones } from './MisionesContext';
import { actualizarPasoTutorial } from './components/Tutorial';
import { ANIMALITOS, SKINS, animalitoEstaDesbloqueado } from './data/animalitos';
import { ALIMENTOS } from './data/alimentos';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COMERCIO_W = Math.min(SCREEN_W * 0.58, SCREEN_H * 0.45);
const TIENDA_H = Math.min(SCREEN_H * 0.78, 460);
const TIENDA_W = TIENDA_H / 1.43;
const COMERCIO_IMAGE = require('./assets/inicio/comercio.png');
const CARTAS_POR_ANIMAL = ANIMALITOS.map(animal => ({
  ...animal,
  color: animal.comercio?.color || animal.colorRareza,
  fondo: animal.comercio?.fondo || '#f3e5c8',
  borde: animal.comercio?.borde || animal.colorRareza,
}));

const TiendaInterior = () => (
  <Svg style={StyleSheet.absoluteFillObject} width={SCREEN_W} height={SCREEN_H} viewBox="0 0 1600 900" preserveAspectRatio="none">
    <Defs>
      <LinearGradient id="tiendaPared" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#d5a66f" /><Stop offset="0.58" stopColor="#f3d79d" /><Stop offset="1" stopColor="#e8c181" /></LinearGradient>
      <LinearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#6bc6ec" /><Stop offset="1" stopColor="#d8f2f2" /></LinearGradient>
      <LinearGradient id="madera" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#b96e31" /><Stop offset="0.5" stopColor="#87451f" /><Stop offset="1" stopColor="#5d2e18" /></LinearGradient>
      <LinearGradient id="maderaClara" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#e4a452" /><Stop offset="1" stopColor="#9a5428" /></LinearGradient>
      <LinearGradient id="piso" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#b67a47" /><Stop offset="1" stopColor="#80502f" /></LinearGradient>
    </Defs>
    <Rect width="1600" height="900" fill="url(#tiendaPared)" />
    <Path d="M0 110Q380 55 800 92T1600 96V0H0Z" fill="#bb8a5b" opacity=".28" />
    {[80,260,470,690,920,1140,1360].map((x, i) => <Path key={`ladrillo-${i}`} d={`M${x} ${120 + (i % 3) * 78}h120v46H${x - 24}`} fill="none" stroke="#b78152" strokeWidth="5" opacity=".18" />)}

    <Path d="M116 215Q116 105 226 105Q336 105 336 215V505H116Z" fill="url(#cielo)" stroke="#80502e" strokeWidth="16" />
    <Path d="M226 112v386M121 265h210M121 382h210" stroke="#9b6536" strokeWidth="12" />
    <Path d="M126 426q48-75 104-32 51-92 98-13v117H126Z" fill="#91b85d" />
    <Path d="M132 204q42-48 81 0 43-67 94-5" fill="none" stroke="#fff" strokeWidth="20" strokeLinecap="round" opacity=".85" />
    <Path d="M1264 202Q1264 112 1354 112Q1444 112 1444 202V316H1264Z" fill="url(#cielo)" stroke="#80502e" strokeWidth="14" />
    <Path d="M1354 118v192M1269 222h170" stroke="#9b6536" strokeWidth="10" />

    <Path d="M170 82Q800 14 1432 82" fill="none" stroke="#3d3320" strokeWidth="6" />
    {[214,300,390,485,585,690,800,915,1020,1128,1230,1332,1410].map((x, i) => <Circle key={`guirnalda-${i}`} cx={x} cy={58 + Math.abs(800 - x) * 0.055} r="15" fill={i % 4 === 2 ? '#df816f' : '#ffd66d'} stroke="#a76430" strokeWidth="4" />)}

    <Path d="M350 196Q515 190 638 145Q800 98 958 145Q1080 190 1250 196V232H350Z" fill="#9d5728" stroke="#5e3019" strokeWidth="7" />
    <Rect x="355" y="222" width="890" height="477" rx="5" fill="url(#madera)" stroke="#582b17" strokeWidth="9" />
    <Rect x="382" y="250" width="836" height="175" fill="#713719" stroke="#512713" strokeWidth="5" />
    <Rect x="382" y="458" width="836" height="174" fill="#713719" stroke="#512713" strokeWidth="5" />
    <Path d="M342 421h916v45H342zM342 625h916v50H342z" fill="url(#maderaClara)" stroke="#653519" strokeWidth="7" />
    <Path d="M372 430h854M372 634h854" stroke="#f1ba66" strokeWidth="5" opacity=".65" />
    <Circle cx="800" cy="174" r="49" fill="#e8aa4e" stroke="#663719" strokeWidth="7" />
    <Circle cx="783" cy="162" r="6" fill="#63371f" /><Circle cx="817" cy="162" r="6" fill="#63371f" /><Path d="M778 187q22 21 44 0" fill="none" stroke="#63371f" strokeWidth="7" strokeLinecap="round" />
    <Path d="M700 184q-35-45-57-9 21 15 57 9M900 184q35-45 57-9-21 15-57 9" fill="#718b25" stroke="#40591c" strokeWidth="5" />

    <Path d="M300 674h1000v111H300z" fill="url(#maderaClara)" stroke="#653519" strokeWidth="9" />
    {[390,535,680,825,970,1115].map(x => <Path key={`panel-${x}`} d={`M${x} 690v80`} stroke="#7d421f" strokeWidth="5" opacity=".6" />)}
    <Rect y="784" width="1600" height="116" fill="url(#piso)" />
    {[0,170,350,540,740,955,1175,1400].map(x => <Path key={`piso-${x}`} d={`M${x} 784l75 116`} stroke="#633e27" strokeWidth="4" opacity=".45" />)}
    <Path d="M490 900q-30-112 310-113t310 113" fill="#dc776f" stroke="#a84d50" strokeWidth="8" /><Path d="M555 900q-15-80 245-80t245 80" fill="none" stroke="#f2b26e" strokeWidth="11" />

    <Rect x="1285" y="360" width="210" height="250" rx="10" fill="#6e421f" stroke="#4f2d18" strokeWidth="8" /><Rect x="1302" y="380" width="176" height="205" fill="#263026" stroke="#bc8242" strokeWidth="5" />
    <TextSvg x="1390" y="438" textAnchor="middle" fill="#f8dda1" fontSize="34" fontWeight="bold">Tienda</TextSvg><TextSvg x="1390" y="500" textAnchor="middle" fill="#efc87d" fontSize="19">Nuevos productos</TextSvg>
    <Path d="M75 710q-20-162 58-232 14 83 44 117 11-121 86-158 5 106-29 173 73-75 126-31-65 118-207 139Z" fill="#587321" stroke="#354714" strokeWidth="8" /><Rect x="92" y="690" width="170" height="105" rx="32" fill="#bd6955" stroke="#773d32" strokeWidth="7" />
    <Path d="M1342 735q-20-88 42-126 4 58 25 79 14-72 67-82 0 64-28 96 63-37 91 6-67 62-197 27Z" fill="#688621" stroke="#405615" strokeWidth="7" /><Rect x="1330" y="724" width="180" height="97" fill="#84502c" stroke="#56311c" strokeWidth="8" />
    <Path d="M1490 430h68v240h-68z" fill="#9b5c32" stroke="#60351f" strokeWidth="6" /><Circle cx="1524" cy="512" r="28" fill="#ffd66d" opacity=".75" />
  </Svg>
);

const TextSvg = ({ children, ...props }) => <SvgText {...props}>{children}</SvgText>;

const tiempoRestanteCredito = (vencimientoMs, ahora) => {
  const restante = Number(vencimientoMs) - ahora;
  if (!Number.isFinite(restante) || restante <= 0) return 'Vencida';
  const minutos = Math.floor(restante / 60000);
  const dias = Math.floor(minutos / 1440);
  if (dias >= 1) return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  const horas = Math.floor(minutos / 60);
  if (horas >= 1) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `${Math.max(1, minutos)} ${minutos === 1 ? 'minuto' : 'minutos'}`;
};

const cicloComercio = (ahoraMs = Date.now()) => {
  const ahora = new Date(ahoraMs);
  const inicio = new Date(ahora);
  inicio.setMinutes(0, 0, 0);
  inicio.setHours(ahora.getHours() < 12 ? 0 : 12);
  const siguiente = new Date(inicio);
  siguiente.setHours(siguiente.getHours() + 12);
  const restanteMin = Math.max(0, Math.ceil((siguiente.getTime() - ahoraMs) / 60000));
  const horas = Math.floor(restanteMin / 60);
  const minutos = restanteMin % 60;
  return {
    key: `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}-${inicio.getHours()}`,
    texto: `${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m`,
  };
};

export default function Comerciante({ navigation, temporada }) {
  const saliendoRef = useRef(false);
  const temporadaActualHook = useTemporadaActual();
  const temporadaActual = temporada || temporadaActualHook;
  const { registrarProgreso } = useMisiones();
  const [credito, setCredito] = useState(null);
  const [monedas, setMonedas] = useState(0);
  const [procesandoCredito, setProcesandoCredito] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const [mostrarPrestamos, setMostrarPrestamos] = useState(false);
  const [usuario, setUsuario] = useState({});
  const [catalogoIconos, setCatalogoIconos] = useState([]);
  const [comprando, setComprando] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [confirmarSaldar, setConfirmarSaldar] = useState(false);
  const [recompensa, setRecompensa] = useState(null);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [animalitosDesbloqueados, setAnimalitosDesbloqueados] = useState([]);
  const [animalitosEstado, setAnimalitosEstado] = useState({});
  const [productosFadeAnim] = useState(new Animated.Value(0));
  const tutorialActivo = usuario?.tutorial === 'no';

  useEffect(() => {
    Image.prefetch(COMERCIO_IMAGE, { cachePolicy: 'memory-disk', priority: 'high' }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    console.log('[Credito Menta] Montaje comercio', { uid: uid || null });
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid), snapshot => {
      if (saliendoRef.current) return;
      const data = snapshot.data() || {};
      setMonedas(Number.isFinite(data.dinero) ? data.dinero : 0);
      setCredito(data.comercio?.mentaCredito || null);
      setUsuario(data);
      if (data.comercio) setDoc(doc(db, 'usuarios', uid, 'comercio', 'estado'), data.comercio, { merge: true }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(collection(db, 'usuarios', uid, 'animalitos'), snapshot => {
      if (saliendoRef.current) return;
      const estados = {};
      setAnimalitosDesbloqueados(snapshot.docs.filter(animal => {
        const data = animal.data() || {};
        estados[animal.id] = data;
        return data.desbloqueado === true || (data.desbloqueado !== false && (Number(data.nivel) > 0 || Number(data.cartas ?? data.copias) > 0));
      }).map(animal => animal.id));
      setAnimalitosEstado(estados);
    }, () => { if (!saliendoRef.current) setAnimalitosDesbloqueados([]); });
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid, 'comercio', 'estado'), snap => {
      if (saliendoRef.current) return;
      if (snap.exists()) setUsuario(previous => ({ ...previous, comercio: snap.data() }));
      setCredito(snap.data()?.mentaCredito || null);
    }, () => {});
  }, []);

  useEffect(() => {
    getDocs(collection(db, 'iconos')).then(snap => {
      if (saliendoRef.current) return;
      setCatalogoIconos(snap.docs.map(icono => ({ id: icono.id, ...icono.data() })));
      // Fade in cuando cargue
      Animated.timing(productosFadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }).catch(() => {});
    const fallback = setTimeout(() => productosFadeAnim.setValue(1), 450);
    return () => clearTimeout(fallback);
  }, [productosFadeAnim]);

  useEffect(() => onAuthStateChanged(auth, user => {
    console.log('[Credito Menta] Estado de autenticación', { uid: user?.uid || null });
  }), []);

  const ejecutarCredito = async (operation, amount) => {
    if (procesandoCredito) return;
    console.log('[Credito Menta] Intento de operación', {
      operation,
      uidInicial: auth.currentUser?.uid || null,
    });
    const usuario = auth.currentUser || await new Promise(resolve => {
      let unsubscribe = () => {};
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 3500);
      unsubscribe = onAuthStateChanged(auth, user => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      });
    });
    if (!usuario) {
      console.warn('[Credito Menta] No hubo usuario autenticado tras esperar la sesión.');
      global.showToast?.({ text1: 'Inicia sesión para usar el crédito de Mentita.', type: 'error' });
      return;
    }
    setProcesandoCredito(true);
    try {
      // Asegura que Functions reciba un ID token vigente antes de la llamada.
      await usuario.getIdToken();
      console.log('[Credito Menta] Token disponible', { uid: usuario.uid });
      await httpsCallable(functions, 'creditoMenta')({ operation, amount });
      if (operation === 'solicitar') setPrestamoSeleccionado(null);
      if (operation === 'saldar') setConfirmarSaldar(false);
      global.showToast?.({ text1: operation === 'solicitar' ? 'Menta te prestó monedas' : 'Deuda saldada', type: 'success' });
    } catch (error) {
      console.error('[Credito Menta] Error de crédito', {
        code: error?.code || null,
        message: error?.message || null,
        details: error?.details || null,
      });
      global.showToast?.({ text1: 'Menta dice...', text2: error?.message || 'No se pudo procesar el crédito.', type: 'error' });
    } finally {
      setProcesandoCredito(false);
    }
  };

  const deuda = Number(credito?.restante) || 0;
  const creditoActivo = Boolean(credito?.activo && deuda > 0);
  const vencido = creditoActivo && ahora > credito.vencimientoMs;
  const tiempoDeuda = creditoActivo ? tiempoRestanteCredito(credito.vencimientoMs, ahora) : '';
  const tieneSkin = (animalId, skinId) => Boolean(
    animalitosEstado?.[animalId]?.skinsDesbloqueadas?.[skinId]
    || usuario?.skinsDesbloqueadas?.[animalId]?.[skinId]
    || (usuario?.animalito === animalId && usuario?.skin === skinId)
  );
  const tieneIcono = icono => Boolean(usuario?.iconosDesbloqueados?.[icono.id] || usuario?.iconoUrl === icono.url);
  const tutorialPaso = Number(usuario?.tutorialPaso || 0);
  const tutorialCompraActiva = tutorialActivo && tutorialPaso === 3;
  const rotacion = cicloComercio(ahora);
  const comprasRotacion = usuario?.comercio?.compras?.[rotacion.key] || {};
  const productoComprado = producto => producto.tipo !== 'alimento' && Boolean(comprasRotacion[producto.id]);
  const animalEstaDesbloqueado = animal => Boolean(animal) && (animalitosDesbloqueados.includes(animal.id)
    || animalitoEstaDesbloqueado(animal, usuario, animalitosEstado?.[animal.id] || usuario?.animalitos?.[animal.id] || {}));
  const cartasAnimalesDisponibles = CARTAS_POR_ANIMAL
    .filter(animal => animalEstaDesbloqueado(animal) && contenidoDisponible(animal.temporada || 't1', temporadaActual))
    .map(animal => ({
      id: `cartas_${animal.id}_3`,
      temporada: animal.temporada || 't1',
      tipo: 'cartasAnimal',
      animalId: animal.id,
      icon: 'style',
      nombre: `Cartas de ${animal.nombre}`,
      cantidad: 3,
      cantidadLabel: 'x3',
      precio: 280,
      imagen: animal.imagen,
      colorAnimal: animal.color,
      fondoAnimal: animal.fondo,
      bordeAnimal: animal.borde,
      rareza: animal.rareza,
    }));
  const skinsDisponibles = SKINS
    .filter(skin => skin.comercioPrecio
      && contenidoDisponible(skin.temporada || 't1', temporadaActual)
      && animalEstaDesbloqueado(CARTAS_POR_ANIMAL.find(animal => animal.id === skin.animalId))
      && (!tieneSkin(skin.animalId, skin.storageId) || comprasRotacion[skin.id]))
    .map(skin => ({
      id: skin.id,
      temporada: skin.temporada || 't1',
      tipo: 'skin',
      animalId: skin.animalId,
      animalNombre: skin.animalNombre,
      skinId: skin.storageId,
      icon: 'checkroom',
      nombre: skin.nombre,
      cantidadLabel: 'x1',
      precio: skin.comercioPrecio,
      imagen: skin.imagen,
    }));
  const productosDisponibles = [
    ...ALIMENTOS.map(alimento => ({ ...alimento, tipo: 'alimento', cantidadLabel: `x${alimento.cantidad}` })),
    { id: 'cartas_3', temporada: 't1', tipo: 'cartasAnimalitos', icon: 'style', nombre: 'Cartas universales', cantidad: 3, cantidadLabel: 'x3', precio: 360 },
    ...cartasAnimalesDisponibles,
    { id: 'diamantes_25', temporada: 't1', tipo: 'diamantes', icon: 'diamond', nombre: 'Diamantes', cantidad: 25, cantidadLabel: 'x25', precio: 900 },
    ...skinsDisponibles,
    ...catalogoIconos.length > 0 ? (catalogoIconos
      .filter(icono => contenidoDisponible(icono.temporada || 't1', temporadaActual) && (!tieneIcono(icono) || comprasRotacion[`icono_${icono.id}`]))
      .sort((a, b) => numeroTemporada(b.temporada || 't1') - numeroTemporada(a.temporada || 't1'))
      .slice(0, 3).map(icono => ({ id: `icono_${icono.id}`, temporada: icono.temporada || 't1', tipo: 'icono', icon: 'face', nombre: 'Icono especial', cantidadLabel: 'x1', precio: 1200, icono, imagen: { uri: icono.url } }))) : [],
  ];
  const productosRelleno = [
    { id: 'cartas_8', tipo: 'cartasAnimalitos', icon: 'style', nombre: 'Cartas universales', cantidad: 8, cantidadLabel: 'x8', precio: 860 },
    { id: 'diamantes_10', tipo: 'diamantes', icon: 'diamond', nombre: 'Diamantes', cantidad: 10, cantidadLabel: 'x10', precio: 420 },
    { id: 'cartas_1', tipo: 'cartasAnimalitos', icon: 'style', nombre: 'Carta universal', cantidad: 1, cantidadLabel: 'x1', precio: 140 },
  ];
  // Durante el tutorial solo se ofrece el paquete especial de 3 cartas y
  // únicamente mientras el tutorial está detenido en el paso del comerciante.
  // Después de comprarlo, el paso avanza y la tienda queda sin compras.
  const productos = tutorialActivo
    ? (tutorialCompraActiva ? [{ ...productosDisponibles.find(producto => producto.id === 'cartas_3'), precio: 120 }] : [])
    : productosDisponibles.filter(producto => producto.tipo === 'alimento' || producto.tipo === 'diamantes').slice(0, 14);
  const productosVisibles = productos.filter(producto => producto.tipo === 'alimento' || producto.tipo === 'diamantes');

  const salirComerciante = () => {
    if (saliendoRef.current) return;
    saliendoRef.current = true;
    productosFadeAnim.stopAnimation();
    navigation?.navigate?.(temporada ? `temporada${temporada.slice(1)}` : 'main');
  };

  const comprarProducto = async producto => {
    if (comprando) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (tutorialActivo && (!tutorialCompraActiva || producto.id !== 'cartas_3')) return;
    setComprando(true);
    try {
      await runTransaction(db, async transaction => {
        const ref = doc(db, 'usuarios', uid);
        const snap = await transaction.get(ref);
        const data = snap.data() || {};
        const comercioRef = doc(db, 'usuarios', uid, 'comercio', 'estado');
        const comercioSnap = await transaction.get(comercioRef);
        const comercio = comercioSnap.exists() ? (comercioSnap.data() || {}) : (data.comercio || {});
        const animalRef = (producto.tipo === 'cartasAnimal' || producto.tipo === 'skin') ? doc(db, 'usuarios', uid, 'animalitos', producto.animalId) : null;
        const animalSnap = animalRef ? await transaction.get(animalRef) : null;
        const precio = vencido ? Math.ceil(producto.precio * 1.2) : producto.precio;
        const compras = comercio.compras || {};
        const comprasActuales = compras[rotacion.key] || {};
        if (producto.tipo !== 'alimento' && comprasActuales[producto.id]) throw new Error('comprado');
        if ((data.dinero || 0) < precio) throw new Error('monedas');
        const update = { dinero: data.dinero - precio };
        if (producto.tipo === 'alimento') update.alimentos = { ...(data.alimentos || {}), [producto.id]: Math.max(0, Number(data.alimentos?.[producto.id]) || 0) + producto.cantidad };
        if (producto.tipo === 'cartasAnimalitos') update.cartasAnimalitos = (data.cartasAnimalitos || 0) + producto.cantidad;
        if (producto.tipo === 'cartasAnimal') {
          const animalData = animalSnap?.exists() ? (animalSnap.data() || {}) : (data.animalitos?.[producto.animalId] || {});
          const desbloqueado = animalitoEstaDesbloqueado(
            ANIMALITOS.find(animal => animal.id === producto.animalId),
            data,
            animalData,
          );
          if (!desbloqueado) throw new Error('animal_bloqueado');
          const cartasActuales = Math.max(0, Number(animalData.cartas ?? animalData.copias ?? 0) || 0);
          transaction.set(animalRef, { desbloqueado: true, cartas: cartasActuales + producto.cantidad, copias: cartasActuales + producto.cantidad }, { merge: true });
        }
        if (producto.tipo === 'diamantes') update.diamantes = (data.diamantes ?? data.diamante ?? 0) + producto.cantidad;
        if (producto.tipo === 'skin') {
          const animalData = animalSnap?.exists() ? (animalSnap.data() || {}) : (data.animalitos?.[producto.animalId] || {});
          const desbloqueado = animalitoEstaDesbloqueado(
            ANIMALITOS.find(animal => animal.id === producto.animalId),
            data,
            animalData,
          );
          if (!desbloqueado) throw new Error('animal_bloqueado');
          if (animalData.skinsDesbloqueadas?.[producto.skinId] || (data.animalito === producto.animalId && data.skin === producto.skinId)) throw new Error('poseido');
          transaction.set(animalRef, { skinsDesbloqueadas: { ...(animalData.skinsDesbloqueadas || {}), [producto.skinId]: true } }, { merge: true });
          // Mantiene el mapa antiguo para clientes previos sin convertirlo en
          // la fuente principal del vestidor nuevo.
          update.skinsDesbloqueadas = { ...(data.skinsDesbloqueadas || {}), [producto.animalId]: { ...(data.skinsDesbloqueadas?.[producto.animalId] || {}), [producto.skinId]: true } };
        }
        if (producto.tipo === 'icono') {
          if (data.iconosDesbloqueados?.[producto.icono.id] || data.iconoUrl === producto.icono.url) throw new Error('poseido');
          update.iconosDesbloqueados = { ...(data.iconosDesbloqueados || {}), [producto.icono.id]: true };
        }
        const comprasActualizadas = producto.tipo === 'alimento'
          ? compras
          : { ...compras, [rotacion.key]: { ...comprasActuales, [producto.id]: true } };
        transaction.set(ref, update, { merge: true });
        transaction.set(comercioRef, { ...comercio, compras: comprasActualizadas }, { merge: true });
      });
      await registrarProgreso('compras_hoy');
      actualizarPasoTutorial(uid, 4).catch(() => {});
      global.showToast?.({ text1: `${producto.nombre} añadido`, type: 'success' });
      setProductoSeleccionado(null);
    } catch (error) {
      global.showToast?.({ text1: error.message === 'monedas' ? 'No tienes suficientes monedas' : 'Ese producto ya no está disponible', type: 'error' });
    } finally {
      setComprando(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.topControls}><TabButtons onExit={salirComerciante} customAddButton={<View />} showResources={false} /></View>
      <View style={styles.tiendaEscena}>
        <View style={styles.svgTiendaLayer} pointerEvents="none"><TiendaInterior /></View>
        <View style={styles.tiendaTitulo}><Text style={styles.tiendaKicker}>DESPENSA DEL BOSQUE</Text><Text style={styles.tiendaNombre}>Mentita & compañía</Text></View>
        <View style={styles.tiendaMonedas}><Text style={styles.tiendaMonedasIcono}>🪙</Text><Text style={styles.tiendaMonedasTexto}>{monedas}</Text></View>
        <TouchableOpacity style={styles.catalogoInfo} onPress={() => setMostrarCatalogo(true)} activeOpacity={0.78}><Text style={styles.catalogoInfoTexto}>!</Text></TouchableOpacity>
        <Text style={styles.tiendaRenueva}>Nuevos productos en {rotacion.texto}</Text>
        <Animated.View style={[styles.estantesProductos, { opacity: productosFadeAnim }]}>
          {productosVisibles.map(producto => {
            const precio = vencido ? Math.ceil(producto.precio * 1.2) : producto.precio;
            const comprado = productoComprado(producto);
            const agotado = monedas < precio || comprando || comprado;
            return <TouchableOpacity key={producto.id} style={[styles.estanteProducto, agotado && styles.estanteProductoAgotado]} onPress={() => comprarProducto(producto)} disabled={agotado} activeOpacity={0.72}>
              <View style={styles.estanteProductoVista}>
                {producto.emoji ? <Text style={styles.estanteProductoEmoji}>{producto.emoji}</Text>
                  : producto.imagen ? <Image source={producto.imagen} style={styles.estanteProductoImagen} contentFit="contain" cachePolicy="memory-disk" />
                    : <MaterialIcons name={producto.icon || 'redeem'} size={23} color={producto.tipo === 'diamantes' ? '#49b8d2' : '#8b4e2d'} />}
              </View>
              <Text style={styles.estanteProductoNombre} numberOfLines={1}>{producto.tipo === 'skin' ? 'Traje' : producto.tipo === 'icono' ? 'Icono' : producto.nombre}</Text>
              <Text style={styles.estanteProductoCantidad} numberOfLines={1}>{producto.tipo === 'alimento' ? `Compra x${producto.cantidad} · Tenés x${Number(usuario?.alimentos?.[producto.id]) || 0}` : producto.cantidadLabel}</Text>
              <View style={styles.estanteProductoPrecio}><Text style={styles.estanteProductoPrecioTexto}>{comprado ? '✓' : `🪙 ${precio}`}</Text></View>
            </TouchableOpacity>;
          })}
        </Animated.View>
      </View>
      <Modal visible={mostrarCatalogo} transparent animationType="fade" onRequestClose={() => setMostrarCatalogo(false)}>
        <View style={styles.catalogoFondo}>
          <TouchableOpacity style={styles.catalogoCerrarFondo} activeOpacity={1} onPress={() => setMostrarCatalogo(false)} />
          <View style={styles.catalogoTarjeta}>
            <View style={styles.catalogoCabecera}><View><Text style={styles.catalogoKicker}>SURTIDO COMPLETO</Text><Text style={styles.catalogoTitulo}>Alimentos y diamantes</Text></View><TouchableOpacity style={styles.catalogoCerrar} onPress={() => setMostrarCatalogo(false)}><MaterialIcons name="close" size={17} color="#704126" /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={styles.catalogoLista} showsVerticalScrollIndicator={false}>
              {productosDisponibles.filter(producto => producto.tipo === 'alimento' || producto.tipo === 'diamantes').map(producto => {
                const precio = vencido ? Math.ceil(producto.precio * 1.2) : producto.precio;
                const comprado = productoComprado(producto);
                return <View key={`catalogo-${producto.id}`} style={[styles.catalogoProducto, (monedas < precio || comprando || comprado) && styles.catalogoProductoAgotado]}>
                  <Text style={styles.catalogoProductoIcono}>{producto.emoji || '💎'}</Text><View style={styles.catalogoProductoInfo}><Text style={styles.catalogoProductoNombre}>{producto.nombre}</Text><Text style={styles.catalogoProductoDetalle}>{producto.tipo === 'alimento' ? `+${producto.saciedad} saciedad · ${producto.cantidadLabel}` : producto.cantidadLabel}</Text></View><Text style={styles.catalogoProductoPrecio}>{comprado ? '✓' : `🪙 ${precio}`}</Text>
                </View>;
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {false && <View style={styles.comercioLayout}>
        <View style={styles.comercioLayer} pointerEvents="none">
          <TiendaInterior />
        </View>
        <View style={styles.comercioMenu}>
          {!mostrarPrestamos && <>
          <View style={styles.comercioIntro}>
            <View style={styles.comercioIntroIcon}><MaterialIcons name="storefront" size={20} color="#76552f" /></View>
            <View>
              <Text style={styles.comercioIntroTitle}>PRODUCTOS DE MENTITA</Text>
              <Text style={styles.comercioIntroText}>{temporada ? `${temporadaActual.toUpperCase()} Debug` : temporadaActual.toUpperCase()} · Renueva en {rotacion.texto}</Text>
            </View>
          </View>
          <View style={styles.productosLista}>
            <Animated.View style={{ opacity: productosFadeAnim, width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 }}>
              {productos.map(producto => {
                const precio = vencido ? Math.ceil(producto.precio * 1.2) : producto.precio;
                const comprado = productoComprado(producto);
                const esVisual = producto.tipo === 'skin' || producto.tipo === 'icono';
                const esCartaAnimal = producto.tipo === 'cartasAnimal';
                return (
                  <TouchableOpacity key={producto.id} style={[styles.producto, esCartaAnimal && styles.productoAnimal, esCartaAnimal && { backgroundColor: producto.fondoAnimal, borderColor: producto.bordeAnimal }, (monedas < precio || comprando) && !comprado && styles.productoBloqueado, comprado && styles.productoComprado]} onPress={() => comprarProducto(producto)} disabled={comprando || comprado || monedas < precio} activeOpacity={comprado ? 1 : 0.75}>
                    <View style={[styles.productoIcono, (producto.imagen || producto.emoji) && styles.productoIconoVisual]}>
                      {producto.emoji
                        ? <Text style={styles.productoEmoji}>{producto.emoji}</Text>
                        : esCartaAnimal
                        ? <View style={[styles.productoSimboloAnimal, { backgroundColor: producto.colorAnimal, borderColor: producto.bordeAnimal }]}><MaterialIcons name="style" size={12} color="#fffbe9" /></View>
                        : producto.imagen
                        ? <View style={[styles.productoMarco, esCartaAnimal && styles.productoMarcoAnimal]}><Image source={producto.imagen} style={styles.productoImagen} contentFit={producto.tipo === 'icono' ? 'cover' : 'contain'} cachePolicy="memory-disk" />{esCartaAnimal && <View style={styles.productoCartaMarca}><Text style={styles.productoCartaMarcaTexto}>▣</Text></View>}</View>
                        : <MaterialIcons name={producto.icon} size={16} color="#a56b16" />}
                    </View>
                    <Text style={[styles.productoNombre, esVisual && styles.productoNombreVisual]}>{producto.tipo === 'icono' ? 'Icono' : producto.tipo === 'skin' ? 'Traje' : producto.nombre}</Text>
                    {esCartaAnimal && <><Text style={styles.productoTemporada}>{producto.temporada.toUpperCase()}</Text><Text style={styles.productoRareza}>{producto.rareza}</Text></>}
                    {producto.cantidadLabel && <Text style={styles.productoCantidad}>{producto.cantidadLabel}</Text>}
                    {comprado ? <View style={styles.productoEstadoComprado}><Text style={styles.productoEstadoTexto}>✓</Text></View> : <View style={[styles.productoPrecio, vencido && styles.productoPrecioConRecargo]}><Text style={styles.moneda}>🪙</Text><Text style={styles.productoPrecioTexto}>{precio}</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </View>
          {!tutorialActivo && <TouchableOpacity style={[styles.creditoPanel, vencido && styles.creditoPanelVencido]} activeOpacity={0.78} onPress={() => setMostrarPrestamos(true)}>
            <View style={styles.creditoIcono}><MaterialIcons name="volunteer-activism" size={17} color={vencido ? '#a64a56' : '#76552f'} /></View>
            <View style={styles.creditoInfo}>
              <Text style={[styles.creditoTitulo, vencido && styles.creditoTextoVencido]}>PRÉSTAMOS DE MENTITA</Text>
              <Text style={styles.creditoTexto}>
                {creditoActivo ? (vencido ? 'Tienes un recargo activo.' : `Deuda: 🪙 ${deuda} · ${tiempoDeuda}`) : 'Consulta sus préstamos y condiciones.'}
              </Text>
            </View>
            <View style={styles.creditoAccion}>
              <MaterialIcons name="chevron-right" size={17} color="#76552f" />
            </View>
          </TouchableOpacity>}
          <View style={styles.comercioOpciones}>
            <View style={styles.comercioOpcion}>
              <MaterialIcons name="refresh" size={14} color="#76552f" />
              <Text style={styles.comercioOpcionText}>Actualiza cada día</Text>
            </View>
            <View style={styles.comercioOpcion}>
              <MaterialIcons name="account-balance-wallet" size={14} color="#76552f" />
              <Text style={styles.comercioOpcionText}>Tus monedas</Text>
            </View>
          </View>
          </>}
          {mostrarPrestamos && <View style={styles.prestamosSeccion}>
            <View style={styles.prestamosCabecera}>
              <View style={styles.prestamosIcono}><MaterialIcons name="volunteer-activism" size={23} color="#76552f" /></View>
              <View style={styles.prestamosTituloWrap}><Text style={styles.prestamosTitulo}>PRÉSTAMOS DE MENTITA</Text><Text style={styles.prestamosSubtitulo}>Una ayudita cuando te faltan monedas</Text></View>
              <TouchableOpacity style={styles.cerrarPrestamos} onPress={() => setMostrarPrestamos(false)}><MaterialIcons name="arrow-back" size={17} color="#76552f" /></TouchableOpacity>
            </View>
            {creditoActivo ? (
              <View style={[styles.deudaDetalle, vencido && styles.deudaDetalleVencida]}>
                <Text style={styles.deudaTitulo}>DEUDA ACTUAL · 🪙 {deuda}</Text>
                <Text style={styles.deudaTexto}>{vencido ? 'Menta aumentó los precios un 20% hasta que saldes la deuda.' : `Tiempo para saldarla: ${tiempoDeuda}.`}</Text>
                <TouchableOpacity style={[styles.saldarBtn, (procesandoCredito || monedas < deuda) && styles.creditoAccionDesactivada]} disabled={procesandoCredito || monedas < deuda} onPress={() => setConfirmarSaldar(true)}><Text style={styles.saldarTexto}>SALDAR 🪙 {deuda}</Text></TouchableOpacity>
                {monedas < deuda && <Text style={styles.deudaAviso}>Necesitas {deuda - monedas} monedas más.</Text>}
              </View>
            ) : <>
              <Text style={styles.prestamosInfo}>Elige una cantidad. Todos los préstamos tienen 10% de interés y vencen en 3 días.</Text>
              <View style={styles.opcionesPrestamo}>
                {[250, 500, 1000].map(monto => <TouchableOpacity key={monto} style={[styles.opcionPrestamo, procesandoCredito && styles.creditoAccionDesactivada]} disabled={procesandoCredito} onPress={() => setPrestamoSeleccionado(monto)}><Text style={styles.opcionMonto}>🪙 {monto}</Text><Text style={styles.opcionDevolucion}>Devuelves {Math.ceil(monto * 1.1)}</Text></TouchableOpacity>)}
              </View>
              <View style={styles.reglaPrestamo}><MaterialIcons name="info-outline" size={14} color="#88642b" /><Text style={styles.reglaTexto}>Si vence sin pagar, los precios del comercio suben 20% hasta saldar la deuda.</Text></View>
            </>}
          </View>}
        </View>
      </View>}
      <Modal visible={Boolean(productoSeleccionado)} transparent animationType="fade" onRequestClose={() => setProductoSeleccionado(null)}>
        <View style={styles.compraFondo}>
          <TouchableOpacity style={styles.compraCerrarFondo} activeOpacity={1} onPress={() => setProductoSeleccionado(null)} />
          {productoSeleccionado && (() => {
            const precio = vencido ? Math.ceil(productoSeleccionado.precio * 1.2) : productoSeleccionado.precio;
            const descripcion = productoSeleccionado.tipo === 'alimento' ? productoSeleccionado.descripcion
              : productoSeleccionado.tipo === 'cartasAnimalitos' ? 'Un paquete de cartas universales que completa las cartas que le falten a cualquier animalito.'
              : productoSeleccionado.tipo === 'cartasAnimal' ? `Cartas propias de ${productoSeleccionado.nombre.replace('Cartas de ', '')}. Se usan primero al mejorar este animalito.`
              : productoSeleccionado.tipo === 'diamantes' ? 'Un paquete de diamantes para conseguir recompensas y objetos especiales.'
              : productoSeleccionado.tipo === 'skin' ? `Un traje exclusivo que podrás equipar a ${productoSeleccionado.animalNombre || 'tu animalito'} desde el vestidor.`
              : 'Un icono nuevo para personalizar tu perfil y hacerlo único.';
            return <View style={styles.compraTarjeta}>
              <View style={styles.compraVista}>
                {productoSeleccionado.emoji
                  ? <Text style={styles.compraEmoji}>{productoSeleccionado.emoji}</Text>
                  : productoSeleccionado.imagen
                  ? <Image source={productoSeleccionado.imagen} style={styles.compraImagen} contentFit={productoSeleccionado.tipo === 'icono' ? 'cover' : 'contain'} cachePolicy="memory-disk" />
                  : <MaterialIcons name={productoSeleccionado.icon} size={45} color={productoSeleccionado.tipo === 'diamantes' ? '#32b9d5' : '#a56b16'} />}
              </View>
              <Text style={styles.compraTitulo}>{productoSeleccionado.tipo === 'icono' ? 'Icono' : productoSeleccionado.tipo === 'skin' ? 'Traje' : productoSeleccionado.nombre}</Text>
              {productoSeleccionado.cantidadLabel && <Text style={styles.compraCantidad}>{productoSeleccionado.cantidadLabel}</Text>}
              <Text style={styles.compraDescripcion}>{descripcion}</Text>
              <View style={styles.compraPrecio}><Text style={styles.compraMoneda}>🪙</Text><Text style={styles.compraPrecioTexto}>{precio}</Text></View>
              {monedas < precio && <Text style={styles.compraAviso}>Te faltan {precio - monedas} monedas.</Text>}
              <View style={styles.compraAcciones}>
                <TouchableOpacity style={styles.compraCancelar} onPress={() => setProductoSeleccionado(null)} activeOpacity={0.8}><Text style={styles.compraCancelarTexto}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.compraConfirmar, (monedas < precio || comprando) && styles.compraConfirmarBloqueado]} onPress={() => comprarProducto(productoSeleccionado)} disabled={monedas < precio || comprando} activeOpacity={0.8}><Text style={styles.compraConfirmarTexto}>{comprando ? 'Comprando…' : 'Comprar'}</Text></TouchableOpacity>
              </View>
            </View>;
          })()}
        </View>
      </Modal>
      <Modal visible={Boolean(prestamoSeleccionado)} transparent animationType="fade" onRequestClose={() => setPrestamoSeleccionado(null)}>
        <View style={styles.compraFondo}>
          <TouchableOpacity style={styles.compraCerrarFondo} activeOpacity={1} onPress={() => setPrestamoSeleccionado(null)} />
          {prestamoSeleccionado && <View style={styles.compraTarjeta}>
            <View style={styles.prestamoVista}><MaterialIcons name="volunteer-activism" size={44} color="#a56b16" /></View>
            <Text style={styles.compraTitulo}>Préstamo de Mentita</Text>
            <Text style={styles.prestamoMonto}>🪙 {prestamoSeleccionado}</Text>
            <Text style={styles.compraDescripcion}>Mentita te presta estas monedas ahora. Devolverás {Math.ceil(prestamoSeleccionado * 1.1)} monedas en un plazo de 3 días.</Text>
            <View style={styles.compraAcciones}>
              <TouchableOpacity style={styles.compraCancelar} onPress={() => setPrestamoSeleccionado(null)} activeOpacity={0.8}><Text style={styles.compraCancelarTexto}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.compraConfirmar, procesandoCredito && styles.compraConfirmarBloqueado]} onPress={() => ejecutarCredito('solicitar', prestamoSeleccionado)} disabled={procesandoCredito} activeOpacity={0.8}><Text style={styles.compraConfirmarTexto}>{procesandoCredito ? 'Solicitando…' : 'Solicitar'}</Text></TouchableOpacity>
            </View>
          </View>}
        </View>
      </Modal>
      <Modal visible={confirmarSaldar} transparent animationType="fade" onRequestClose={() => setConfirmarSaldar(false)}>
        <View style={styles.compraFondo}>
          <TouchableOpacity style={styles.compraCerrarFondo} activeOpacity={1} onPress={() => setConfirmarSaldar(false)} />
          <View style={styles.compraTarjeta}>
            <View style={styles.prestamoVista}><MaterialIcons name="account-balance-wallet" size={42} color="#a56b16" /></View>
            <Text style={styles.compraTitulo}>Saldar deuda</Text>
            <Text style={styles.prestamoMonto}>🪙 {deuda}</Text>
            <Text style={styles.compraDescripcion}>Pagarás tu deuda completa a Mentita y se quitará el recargo del comercio.</Text>
            <View style={styles.compraAcciones}>
              <TouchableOpacity style={styles.compraCancelar} onPress={() => setConfirmarSaldar(false)} activeOpacity={0.8}><Text style={styles.compraCancelarTexto}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.compraConfirmar, procesandoCredito && styles.compraConfirmarBloqueado]} onPress={() => ejecutarCredito('saldar', deuda)} disabled={procesandoCredito} activeOpacity={0.8}><Text style={styles.compraConfirmarTexto}>{procesandoCredito ? 'Pagando…' : 'Saldar'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <RecompensaOverlay visible={Boolean(recompensa)} onClose={() => setRecompensa(null)}>
        {recompensa?.emoji
          ? <Text style={styles.recompensaEmoji}>{recompensa.emoji}</Text>
          : recompensa?.imagen
          ? <Image source={recompensa.imagen} style={styles.recompensaImagen} contentFit="contain" />
          : <View style={styles.recompensaIcono}><MaterialIcons name={recompensa?.icon || 'auto-awesome'} size={45} color="#a56b16" /></View>}
        <Text style={styles.recompensaTitulo}>{recompensa?.tipo === 'icono' ? 'Icono especial' : recompensa?.nombre}</Text>
        {recompensa?.cantidadLabel && <Text style={styles.recompensaCantidad}>{recompensa.cantidadLabel}</Text>}
      </RecompensaOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadbde' },
  backgroundLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0, elevation: 0 },
  tiendaEscena: { ...StyleSheet.absoluteFillObject, backgroundColor: '#ead5b1', zIndex: 200, elevation: 200 },
  svgTiendaLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1, elevation: 1 },
  topControls: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, elevation: 1000 },
  tiendaTitulo: { position: 'absolute', top: 18, left: 0, right: 0, alignItems: 'center', zIndex: 10, elevation: 10 },
  tiendaKicker: { color: '#f6e2a8', fontFamily: 'Delius', fontWeight: '900', fontSize: 6, letterSpacing: 1.2, textShadowColor: '#60361f', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  tiendaNombre: { color: '#fff7d8', fontFamily: 'Delius', fontWeight: '900', fontSize: 13, textShadowColor: '#60361f', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  tiendaMonedas: { position: 'absolute', top: 18, right: 28, minWidth: 54, height: 25, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: 'rgba(95,52,29,0.88)', borderWidth: 1, borderColor: '#f3cd73', borderRadius: 7, zIndex: 10, elevation: 10 },
  tiendaMonedasIcono: { fontSize: 12 },
  tiendaMonedasTexto: { color: '#fff5ce', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  tiendaRenueva: { position: 'absolute', top: 42, right: 28, color: '#6f4228', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900', zIndex: 10 },
  catalogoInfo: { position: 'absolute', top: 70, left: 28, width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#f4d178', borderWidth: 2, borderColor: '#754127', zIndex: 20, elevation: 20 },
  catalogoInfoTexto: { color: '#704126', fontFamily: 'Delius', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  catalogoFondo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(49,28,17,0.62)' },
  catalogoCerrarFondo: { ...StyleSheet.absoluteFillObject },
  catalogoTarjeta: { width: Math.min(SCREEN_W * 0.88, 360), maxHeight: SCREEN_H * 0.78, padding: 14, borderRadius: 18, backgroundColor: '#f5dfaa', borderWidth: 3, borderColor: '#8b5129', shadowColor: '#2b180d', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 22 },
  catalogoCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: '#c08a4c' },
  catalogoKicker: { color: '#a36a33', fontFamily: 'Delius', fontSize: 6, fontWeight: '900', letterSpacing: 1 },
  catalogoTitulo: { marginTop: 2, color: '#633719', fontFamily: 'Delius', fontSize: 15, fontWeight: '900' },
  catalogoCerrar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#fff0c8', borderWidth: 1, borderColor: '#bd8950' },
  catalogoLista: { paddingTop: 9, paddingBottom: 2, gap: 6 },
  catalogoProducto: { minHeight: 43, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: '#fff0c8', borderWidth: 1, borderColor: '#c49354' },
  catalogoProductoAgotado: { opacity: 0.45 },
  catalogoProductoIcono: { width: 30, fontSize: 22, textAlign: 'center' },
  catalogoProductoInfo: { flex: 1, marginLeft: 7 },
  catalogoProductoNombre: { color: '#6e3d20', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  catalogoProductoDetalle: { marginTop: 2, color: '#a06b35', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '700' },
  catalogoProductoPrecio: { color: '#754323', fontFamily: 'Delius', fontSize: 7, fontWeight: '900' },
  estantesProductos: { position: 'absolute', top: SCREEN_H * 0.285, left: SCREEN_W * 0.235, right: SCREEN_W * 0.225, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: Math.max(6, SCREEN_H * 0.035), zIndex: 500, elevation: 500 },
  estanteProducto: { width: '14.285%', height: 73, alignItems: 'center', justifyContent: 'flex-start' },
  estanteProductoAgotado: { opacity: 0.4 },
  estanteProductoVista: { width: 38, height: 36, alignItems: 'center', justifyContent: 'center' },
  estanteProductoEmoji: { fontSize: 27, lineHeight: 32 },
  estanteProductoImagen: { width: 34, height: 34 },
  estanteProductoNombre: { width: '100%', marginTop: 1, color: '#fff3ca', fontFamily: 'Delius', fontSize: 5.1, fontWeight: '900', textAlign: 'center', textShadowColor: '#5c311d', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  estanteProductoCantidad: { width: '100%', marginTop: 1, color: '#ffe5a6', fontFamily: 'Delius', fontSize: 4.2, fontWeight: '700', textAlign: 'center', textShadowColor: '#5c311d', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  estanteProductoPrecio: { marginTop: 2, minWidth: 35, paddingHorizontal: 4, paddingVertical: 1, alignItems: 'center', backgroundColor: '#f4d178', borderWidth: 1, borderColor: '#754127', borderRadius: 3 },
  estanteProductoPrecioTexto: { color: '#6d3c24', fontFamily: 'Delius', fontSize: 5.3, fontWeight: '900' },
  comercioLayout: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 34, transform: [{ translateY: -22 }], zIndex: 100, elevation: 100 },
  comercioLayer: { width: Math.min(SCREEN_W * 0.88, 390), height: Math.min(SCREEN_W * 0.88, 390) * 1.43, alignItems: 'center', justifyContent: 'center' },
  comercioImagen: { width: COMERCIO_W, height: COMERCIO_W * 1.5 },
  comercioMenu: { position: 'absolute', top: 142, width: 260, alignItems: 'center' },
  comercioIntro: { width: '100%', height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderRadius: 13, backgroundColor: '#f1e1bd', borderWidth: 1.5, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 7, elevation: 10 },
  comercioIntroIcon: { width: 31, height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 7, backgroundColor: '#ead2a0', borderWidth: 1, borderColor: '#d0ad70' },
  comercioIntroTitle: { color: '#76552f', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.4 },
  comercioIntroText: { color: '#88642b', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '700', marginTop: 1 },
  productosLista: { width: 214, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 7 },
  producto: { width: 68, height: 70, alignItems: 'center', justifyContent: 'center', padding: 2, borderRadius: 10, backgroundColor: '#f3e7c8', borderWidth: 1, borderColor: '#d7b46a', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  productoAnimal: { shadowColor: '#6e4b25', shadowOpacity: 0.26 },
  productoIcono: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ead2a0' },
  productoEmoji: { fontSize: 18, lineHeight: 21 },
  productoIconoVisual: { overflow: 'visible', backgroundColor: 'transparent' },
  productoMarco: { width: 27, height: 27, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff8e2', borderWidth: 1.5, borderColor: '#bf9142', shadowColor: '#6e4d21', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.24, shadowRadius: 3, elevation: 4, transform: [{ translateY: -1 }] },
  productoMarcoAnimal: { backgroundColor: '#f6ffe7', borderColor: '#79a34e' },
  productoSimboloAnimal: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#40562f', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.22, shadowRadius: 2, elevation: 3 },
  productoImagen: { width: 23, height: 23, borderRadius: 5 },
  productoCartaMarca: { position: 'absolute', right: -5, bottom: -4, width: 13, height: 15, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9c17a', borderWidth: 1, borderColor: '#92743c', zIndex: 4 },
  productoCartaMarcaTexto: { color: '#fff8dc', fontSize: 8, lineHeight: 10, fontWeight: '900' },
  productoTemporada: { position: 'absolute', top: 4, left: 5, color: '#8b653b', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
  productoRareza: { position: 'absolute', top: 3, right: 4, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5, backgroundColor: '#82ad58', color: '#fffbe8', fontFamily: 'Delius', fontSize: 4.2, fontWeight: '900', overflow: 'hidden' },
  productoNombre: { color: '#76552f', fontFamily: 'Delius', fontSize: 4.4, lineHeight: 5, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  productoNombreVisual: { transform: [{ translateY: 1 }] },
  productoCantidad: { color: '#8d6024', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', marginTop: 1 },
  productoPrecio: { flexDirection: 'row', alignItems: 'center', marginTop: 1, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 5, backgroundColor: '#e8d3a3' },
  productoPrecioConRecargo: { backgroundColor: '#eab8b6' },
  productoBloqueado: { opacity: 0.72 },
  productoComprado: { backgroundColor: '#dcebd5', borderColor: '#81a976' },
  productoEstadoComprado: { width: 15, height: 15, marginTop: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#6da160', borderWidth: 1, borderColor: '#eaf7df' },
  productoEstadoTexto: { color: '#fff', fontSize: 10, lineHeight: 12, fontWeight: '900' },
  compraFondo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(43,31,20,0.58)' },
  compraCerrarFondo: { ...StyleSheet.absoluteFillObject },
  compraTarjeta: { width: 236, minHeight: 270, alignItems: 'center', padding: 18, borderRadius: 17, backgroundColor: '#fff0c8', borderWidth: 3, borderColor: '#b7873b', shadowColor: '#1f150d', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 20 },
  compraVista: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#f5e2ab', borderWidth: 2, borderColor: '#c3933e' },
  compraEmoji: { fontSize: 48, lineHeight: 58 },
  compraImagen: { width: 68, height: 68, borderRadius: 13 },
  prestamoVista: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#f5e2ab', borderWidth: 2, borderColor: '#c3933e' },
  prestamoMonto: { marginTop: 4, color: '#a16e25', fontFamily: 'Delius', fontSize: 14, fontWeight: '900' },
  compraTitulo: { marginTop: 9, color: '#624426', fontFamily: 'Delius', fontSize: 13, fontWeight: '900' },
  compraCantidad: { marginTop: 1, color: '#a16e25', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' },
  compraDescripcion: { marginTop: 9, color: '#80634a', fontFamily: 'Delius', fontSize: 8.5, lineHeight: 12, fontWeight: '700', textAlign: 'center' },
  compraPrecio: { flexDirection: 'row', alignItems: 'center', marginTop: 11, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9, backgroundColor: '#ead2a0', borderWidth: 1, borderColor: '#c39442' },
  compraMoneda: { fontSize: 13, marginRight: 3 },
  compraPrecioTexto: { color: '#76552f', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' },
  compraAviso: { marginTop: 5, color: '#a64a56', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '800' },
  compraAcciones: { width: '100%', flexDirection: 'row', gap: 7, marginTop: 14 },
  compraCancelar: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9, backgroundColor: '#e2ddd2', borderWidth: 1, borderColor: '#aaa198' },
  compraCancelarTexto: { color: '#71665a', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  compraConfirmar: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9, backgroundColor: '#c99d42', borderWidth: 1, borderColor: '#8d6926' },
  compraConfirmarBloqueado: { opacity: 0.48 },
  compraConfirmarTexto: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  recompensaImagen: { width: 112, height: 82 },
  recompensaEmoji: { fontSize: 64, lineHeight: 76 },
  recompensaIcono: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#f5e2ab', borderWidth: 2, borderColor: '#c3933e' },
  recompensaTitulo: { marginTop: 6, color: '#683714', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  recompensaCantidad: { marginTop: 1, color: '#b16d25', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' },
  moneda: { fontSize: 7, marginRight: 1 },
  productoPrecioTexto: { color: '#76552f', fontFamily: 'Delius', fontSize: 4.8, fontWeight: '900' },
  creditoPanel: { width: '100%', minHeight: 43, flexDirection: 'row', alignItems: 'center', marginTop: 7, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#f1e1bd', borderWidth: 1.5, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 7 },
  creditoPanelVencido: { backgroundColor: '#f2d7d4', borderColor: '#b87578' },
  creditoIcono: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#ead2a0' },
  creditoInfo: { flex: 1, marginLeft: 5 },
  creditoTitulo: { color: '#76552f', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900' },
  creditoTexto: { color: '#88642b', fontFamily: 'Delius', fontSize: 5.2, fontWeight: '700', marginTop: 1 },
  creditoTextoVencido: { color: '#a64a56' },
  creditoAccion: { minWidth: 30, alignItems: 'center', paddingHorizontal: 4, paddingVertical: 5, borderRadius: 8, backgroundColor: '#ead2a0', borderWidth: 1, borderColor: '#c89b55' },
  creditoAccionDesactivada: { opacity: 0.45 },
  creditoAccionTexto: { color: '#76552f', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900' },
  comercioOpciones: { width: '100%', flexDirection: 'row', gap: 6, marginTop: 7 },
  comercioOpcion: { flex: 1, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 9, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 7 },
  comercioOpcionText: { color: '#76552f', fontFamily: 'Delius', fontSize: 5.8, fontWeight: '900' },
  prestamosSeccion: { width: '100%', alignItems: 'center' },
  prestamosCabecera: { width: '100%', height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderRadius: 13, backgroundColor: '#f1e1bd', borderWidth: 1.5, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 7, elevation: 10 },
  prestamosIcono: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#ead2a0', borderWidth: 1, borderColor: '#d0ad70' },
  prestamosTituloWrap: { flex: 1, marginLeft: 8 },
  prestamosTitulo: { color: '#76552f', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.4 },
  prestamosSubtitulo: { color: '#88642b', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '700', marginTop: 1 },
  cerrarPrestamos: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  prestamosInfo: { width: '100%', color: '#88642b', fontFamily: 'Delius', fontSize: 6.7, lineHeight: 9, fontWeight: '700', textAlign: 'center', marginTop: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f3e7c8', borderWidth: 1, borderColor: '#d7b46a' },
  opcionesPrestamo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
  opcionPrestamo: { width: 70, height: 55, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#ead2a0', borderWidth: 1, borderColor: '#c89b55', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  opcionMonto: { color: '#76552f', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' },
  opcionDevolucion: { color: '#88642b', fontFamily: 'Delius', fontSize: 5, fontWeight: '700', marginTop: 3 },
  reglaPrestamo: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, padding: 7, borderRadius: 9, backgroundColor: '#f0d9d2' },
  reglaTexto: { flex: 1, color: '#8b5a57', fontFamily: 'Delius', fontSize: 6, lineHeight: 8, fontWeight: '700', marginLeft: 5 },
  deudaDetalle: { alignItems: 'center', marginTop: 11, padding: 12, borderRadius: 12, backgroundColor: '#ead2a0' },
  deudaDetalleVencida: { backgroundColor: '#f0d9d2' },
  deudaTitulo: { color: '#76552f', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
  deudaTexto: { color: '#88642b', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  saldarBtn: { marginTop: 9, paddingHorizontal: 15, paddingVertical: 7, borderRadius: 10, backgroundColor: '#d9b76f', borderWidth: 1, borderColor: '#a87936' },
  saldarTexto: { color: '#65492f', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900' },
  deudaAviso: { color: '#a64a56', fontFamily: 'Delius', fontSize: 6, fontWeight: '700', marginTop: 5 },
});
