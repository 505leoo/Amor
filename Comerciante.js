import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Dimensions, TouchableOpacity, Modal, Animated } from 'react-native';
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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COMERCIO_W = Math.min(SCREEN_W * 0.58, SCREEN_H * 0.45);
const COMERCIO_IMAGE = require('./assets/inicio/comercio.png');
const CARTAS_POR_ANIMAL = [
  { id: 'halcon', nombre: 'Halcón', temporada: 't1', rareza: 'Común', color: '#a9722f', fondo: '#f3e5c8', borde: '#c69a5b', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png') },
  { id: 'ardilla', nombre: 'Ardilla', temporada: 't1', rareza: 'Épico', color: '#9a68c4', fondo: '#eee0f7', borde: '#b58ad5', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png') },
];

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
  const productoComprado = producto => Boolean(comprasRotacion[producto.id]);
  const animalEstaDesbloqueado = animal => Boolean(animal) && (animalitosDesbloqueados.includes(animal.id)
    || Boolean(usuario?.animalitos?.[animal.id]?.desbloqueado)
    || (animal.id !== 'ardilla' && usuario?.animalito === animal.id)
    || (animal.id === 'halcon' && Boolean(usuario?.halconDesbloqueado)));
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
  const skinsDisponibles = [
    ...(!tieneSkin('halcon', 'halcont2') || comprasRotacion.halcont2 ? [{ id: 'halcont2', temporada: 't1', tipo: 'skin', animalId: 'halcon', animalNombre: 'Halcón', skinId: 'halcont2', icon: 'checkroom', nombre: 'Traje celeste', cantidadLabel: 'x1', precio: 2000, imagen: require('./assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont2.png') }] : []),
    ...(animalEstaDesbloqueado(CARTAS_POR_ANIMAL.find(animal => animal.id === 'ardilla')) && (!tieneSkin('ardilla', 'ardillat2') || comprasRotacion.ardillat2) ? [{ id: 'ardillat2', temporada: 't1', tipo: 'skin', animalId: 'ardilla', animalNombre: 'Ardilla', skinId: 'ardillat2', icon: 'checkroom', nombre: 'Guardiana del Bosque', cantidadLabel: 'x1', precio: 2400, imagen: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat2.png') }] : []),
  ];
  const productosDisponibles = [
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
    : [...productosDisponibles, ...productosRelleno].slice(0, 6);

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
        if (comprasActuales[producto.id]) throw new Error('comprado');
        if ((data.dinero || 0) < precio) throw new Error('monedas');
        const update = { dinero: data.dinero - precio };
        if (producto.tipo === 'cartasAnimalitos') update.cartasAnimalitos = (data.cartasAnimalitos || 0) + producto.cantidad;
        if (producto.tipo === 'cartasAnimal') {
          const animalData = animalSnap?.exists() ? (animalSnap.data() || {}) : (data.animalitos?.[producto.animalId] || {});
          const desbloqueado = Boolean(animalData.desbloqueado || Number(animalData.nivel) > 0 || data.animalito === producto.animalId || (producto.animalId === 'halcon' && data.halconDesbloqueado));
          if (!desbloqueado) throw new Error('animal_bloqueado');
          const cartasActuales = Math.max(0, Number(animalData.cartas ?? animalData.copias ?? 0) || 0);
          transaction.set(animalRef, { desbloqueado: true, cartas: cartasActuales + producto.cantidad, copias: cartasActuales + producto.cantidad }, { merge: true });
        }
        if (producto.tipo === 'diamantes') update.diamantes = (data.diamantes ?? data.diamante ?? 0) + producto.cantidad;
        if (producto.tipo === 'skin') {
          const animalData = animalSnap?.exists() ? (animalSnap.data() || {}) : (data.animalitos?.[producto.animalId] || {});
          const desbloqueado = Boolean(animalData.desbloqueado || Number(animalData.nivel) > 0 || data.animalito === producto.animalId || (producto.animalId === 'halcon' && data.halconDesbloqueado));
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
        const comprasActualizadas = { ...compras, [rotacion.key]: { ...comprasActuales, [producto.id]: true } };
        transaction.set(ref, update, { merge: true });
        transaction.set(comercioRef, { ...comercio, compras: comprasActualizadas }, { merge: true });
      });
      await registrarProgreso('compras_hoy');
      actualizarPasoTutorial(uid, 4).catch(() => {});
      global.showToast?.({ text1: `${producto.nombre} añadido`, type: 'success' });
      setProductoSeleccionado(null);
      setRecompensa(producto);
    } catch (error) {
      global.showToast?.({ text1: error.message === 'monedas' ? 'No tienes suficientes monedas' : 'Ese producto ya no está disponible', type: 'error' });
    } finally {
      setComprando(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RoomBackground />
      <TabButtons onExit={salirComerciante} customAddButton={<View />} />
      <View style={styles.comercioLayout}>
        <View style={styles.comercioLayer} pointerEvents="none">
          <Image
            source={COMERCIO_IMAGE}
            style={styles.comercioImagen}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
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
                  <TouchableOpacity key={producto.id} style={[styles.producto, esCartaAnimal && styles.productoAnimal, esCartaAnimal && { backgroundColor: producto.fondoAnimal, borderColor: producto.bordeAnimal }, (monedas < precio || comprando) && !comprado && styles.productoBloqueado, comprado && styles.productoComprado]} onPress={() => setProductoSeleccionado(producto)} disabled={comprando || comprado} activeOpacity={comprado ? 1 : 0.75}>
                    <View style={[styles.productoIcono, producto.imagen && styles.productoIconoVisual]}>
                      {esCartaAnimal
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
      </View>
      <Modal visible={Boolean(productoSeleccionado)} transparent animationType="fade" onRequestClose={() => setProductoSeleccionado(null)}>
        <View style={styles.compraFondo}>
          <TouchableOpacity style={styles.compraCerrarFondo} activeOpacity={1} onPress={() => setProductoSeleccionado(null)} />
          {productoSeleccionado && (() => {
            const precio = vencido ? Math.ceil(productoSeleccionado.precio * 1.2) : productoSeleccionado.precio;
            const descripcion = productoSeleccionado.tipo === 'cartasAnimalitos' ? 'Un paquete de cartas universales que completa las cartas que le falten a cualquier animalito.'
              : productoSeleccionado.tipo === 'cartasAnimal' ? `Cartas propias de ${productoSeleccionado.nombre.replace('Cartas de ', '')}. Se usan primero al mejorar este animalito.`
              : productoSeleccionado.tipo === 'diamantes' ? 'Un paquete de diamantes para conseguir recompensas y objetos especiales.'
              : productoSeleccionado.tipo === 'skin' ? `Un traje exclusivo que podrás equipar a ${productoSeleccionado.animalNombre || 'tu animalito'} desde el vestidor.`
              : 'Un icono nuevo para personalizar tu perfil y hacerlo único.';
            return <View style={styles.compraTarjeta}>
              <View style={styles.compraVista}>
                {productoSeleccionado.imagen
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
        {recompensa?.imagen
          ? <Image source={recompensa.imagen} style={styles.recompensaImagen} contentFit="contain" />
          : <View style={styles.recompensaIcono}><MaterialIcons name={recompensa?.icon || 'auto-awesome'} size={45} color="#a56b16" /></View>}
        <Text style={styles.recompensaTitulo}>{recompensa?.tipo === 'icono' ? 'Icono especial' : recompensa?.nombre}</Text>
        {recompensa?.cantidadLabel && <Text style={styles.recompensaCantidad}>{recompensa.cantidadLabel}</Text>}
      </RecompensaOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  comercioLayout: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, transform: [{ translateY: 25 }], zIndex: 100, elevation: 100 },
  comercioLayer: { alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -10 }] },
  comercioImagen: { width: COMERCIO_W, height: COMERCIO_W * 1.5 },
  comercioMenu: { width: 260, alignItems: 'center' },
  comercioIntro: { width: '100%', height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderRadius: 13, backgroundColor: '#f1e1bd', borderWidth: 1.5, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 7, elevation: 10 },
  comercioIntroIcon: { width: 31, height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 7, backgroundColor: '#ead2a0', borderWidth: 1, borderColor: '#d0ad70' },
  comercioIntroTitle: { color: '#76552f', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.4 },
  comercioIntroText: { color: '#88642b', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '700', marginTop: 1 },
  productosLista: { width: 214, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 7 },
  producto: { width: 68, height: 70, alignItems: 'center', justifyContent: 'center', padding: 2, borderRadius: 10, backgroundColor: '#f3e7c8', borderWidth: 1, borderColor: '#d7b46a', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  productoAnimal: { shadowColor: '#6e4b25', shadowOpacity: 0.26 },
  productoIcono: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ead2a0' },
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
