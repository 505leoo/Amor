import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, functions } from '../firebaseConfig';
import RecompensaOverlay from './RecompensaOverlay';
import { ANIMALITOS_POR_ID, SKINS } from '../data/animalitos';
import { obtenerIconoLocal } from '../data/iconosLocales';

const PREMIOS = [
  { id: 'pierdes_300', tipo: 'perdida', cantidad: 300, label: '-300', icono: 'money-off', color: '#ad4148', nivel: 'malo', peso: 20 },
  { id: 'sin_premio', tipo: 'nada', cantidad: 0, label: 'Nada', icono: 'block', color: '#7f303b', nivel: 'malo', peso: 10 },
  { id: 'monedas_75', tipo: 'dinero', cantidad: 75, label: '+75', icono: 'monetization-on', color: '#356c4d', nivel: 'normal', peso: 23 },
  { id: 'cartas_3', tipo: 'cartasAnimalitos', cantidad: 3, label: 'x3', icono: 'style', color: '#285d42', nivel: 'normal', peso: 15 },
  { id: 'monedas_150', tipo: 'dinero', cantidad: 150, label: '+150', icono: 'monetization-on', color: '#407956', nivel: 'normal', peso: 14 },
  { id: 'cartas_5', tipo: 'cartasAnimalitos', cantidad: 5, label: 'x5', icono: 'style', color: '#2d6547', nivel: 'normal', peso: 6 },
  { id: 'diamantes_10', tipo: 'diamantes', cantidad: 10, label: 'x10', icono: 'diamond', color: '#c18b26', nivel: 'epico', peso: 8 },
  { id: 'diamantes_25', tipo: 'diamantes', cantidad: 25, label: 'x25', icono: 'diamond', color: '#e0ae43', nivel: 'epico', peso: 4 },
  { id: 'sorpresa_coleccion', tipo: 'coleccion', cantidad: 1, label: '?', icono: 'help-outline', color: '#9d63c0', nivel: 'epico', peso: 0.2 },
];

const resolverSorpresaColeccion = recompensa => {
  if (!recompensa) return null;
  if (recompensa.tipo === 'animal') return ANIMALITOS_POR_ID[recompensa.animalId] || null;
  if (recompensa.tipo === 'skin') return SKINS.find(skin => skin.id === recompensa.skinId) || null;
  if (recompensa.tipo === 'icono') return { imagen: obtenerIconoLocal(recompensa.iconoId), nombre: recompensa.nombre };
  return null;
};
const sectorPath = index => {
  const step = 360 / PREMIOS.length;
  const start = -90 + index * step;
  const end = start + step;
  const point = angle => {
    const radians = angle * Math.PI / 180;
    return `${50 + 43 * Math.cos(radians)} ${50 + 43 * Math.sin(radians)}`;
  };
  return `M 50 50 L ${point(start)} A 43 43 0 0 1 ${point(end)} Z`;
};
const labelPosition = index => {
  const step = 360 / PREMIOS.length;
  const angle = (-90 + step / 2 + index * step) * Math.PI / 180;
  return { left: 95 + 53 * Math.cos(angle) - 17, top: 95 + 53 * Math.sin(angle) - 15 };
};
const diaArgentina = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

const Ruleta = ({ giro, giroManual, habilitada }) => {
  const giroCombinado = Animated.add(giro, giroManual);
  const rotacion = giroCombinado.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1800deg'] });
  const baseArrastre = useRef(0);
  const habilitadaRef = useRef(habilitada);
  habilitadaRef.current = habilitada;
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => habilitadaRef.current,
    onMoveShouldSetPanResponder: (_, gesture) => habilitadaRef.current && Math.abs(gesture.dx) > 2,
    onPanResponderGrant: () => giroManual.stopAnimation((valor) => { baseArrastre.current = valor; }),
    onPanResponderMove: (_, gesture) => giroManual.setValue(baseArrastre.current + gesture.dx * 2.4 / 1800),
  })).current;
  return <View style={s.ruletaWrap}>
    <View pointerEvents="none" style={s.puntero}>
      <View style={s.punteroMarco} />
      <View style={s.punteroRosa} />
      <View style={s.punteroGema} />
    </View>
    <Animated.View {...panResponder.panHandlers} style={[s.ruleta, { transform: [{ rotate: rotacion }] }]}>
      <Svg width="190" height="190" viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill="#805090" stroke="#fff4d5" strokeWidth="2" />
        {PREMIOS.map((premio, index) => {
          return <G key={premio.id}><Path d={sectorPath(index)} fill={premio.color} stroke="#fff4d5" strokeWidth="1.1" /></G>;
        })}
        <Circle cx="50" cy="50" r="10" fill="#fff1bf" stroke="#8c5632" strokeWidth="2" />
        <Circle cx="50" cy="50" r="4" fill="#df6d87" />
      </Svg>
      {PREMIOS.map((premio, index) => {
        const point = labelPosition(index);
        return <View key={`${premio.id}-marca`} pointerEvents="none" style={[s.premioMarca, point]}><MaterialIcons name={premio.icono} size={15} color={premio.nivel === 'epico' ? '#fff0ad' : '#fff8e7'} /><Text style={s.premioMarcaTexto}>{premio.label}</Text></View>;
      })}
    </Animated.View>
  </View>;
};

export default function RuletaDiariaModal({ visible, onClose }) {
  const giro = useRef(new Animated.Value(0)).current;
  const giroManual = useRef(new Animated.Value(0)).current;
  const [girando, setGirando] = useState(false);
  const [premio, setPremio] = useState(null);
  const [recompensaVisible, setRecompensaVisible] = useState(false);
  const [estadoGiros, setEstadoGiros] = useState({ ticketsCargados: false, ruletaCargada: false, tickets: 0, diarioUsado: false });
  const [mensaje, setMensaje] = useState('Comprobando tus giros…');
  const diaActual = diaArgentina();
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    setEstadoGiros({ ticketsCargados: false, ruletaCargada: false, tickets: 0, diarioUsado: false });
    const ticketRef = doc(db, 'usuarios', uid, 'inventario', 'ticket_ruleta');
    const ruletaRef = doc(db, 'usuarios', uid, 'minijuegos', 'ruleta_diaria');
    const quitarTickets = onSnapshot(ticketRef, snap => {
      setEstadoGiros(actual => ({ ...actual, ticketsCargados: true, tickets: Math.max(0, Number(snap.data()?.cantidad) || 0) }));
    }, () => setEstadoGiros(actual => ({ ...actual, ticketsCargados: true })));
    const quitarRuleta = onSnapshot(ruletaRef, snap => {
      setEstadoGiros(actual => ({ ...actual, ruletaCargada: true, diarioUsado: snap.data()?.ultimoGiroDia === diaArgentina() }));
    }, () => setEstadoGiros(actual => ({ ...actual, ruletaCargada: true })));
    return () => { quitarTickets(); quitarRuleta(); };
  }, [visible]);
  const estadoCargado = estadoGiros.ticketsCargados && estadoGiros.ruletaCargada;
  const giroDiarioDisponible = estadoCargado && !estadoGiros.diarioUsado;
  const puedeGirar = giroDiarioDisponible || estadoGiros.tickets > 0;
  const textoEstado = !estadoCargado ? 'Comprobando tus giros…' : giroDiarioDisponible ? 'Tenés tu giro diario gratis.' : estadoGiros.tickets > 0 ? `Usarás 1 Ticket de Ruleta.` : 'No tenés giros disponibles hoy.';
  const girar = async () => {
    if (girando || premio || !puedeGirar) return;
    setGirando(true);
    setMensaje('La suerte está decidiendo…');
    try {
      const usuario = auth.currentUser || await new Promise((resolve) => {
        let unsubscribe = () => {};
        const timeout = setTimeout(() => {
          unsubscribe();
          resolve(null);
        }, 3500);
        unsubscribe = onAuthStateChanged(auth, (user) => {
          clearTimeout(timeout);
          unsubscribe();
          resolve(user);
        });
      });
      if (!usuario) {
        setGirando(false);
        setMensaje('Esperá un momento mientras recuperamos tu sesión.');
        return;
      }
      const llamarRuleta = httpsCallable(functions, 'girarRuletaDiariaV1');
      let token = await usuario.getIdToken();
      let respuesta;
      try {
        respuesta = await llamarRuleta({ authToken: token });
      } catch (error) {
        if (error?.code !== 'functions/unauthenticated') throw error;
        token = await usuario.getIdToken(true);
        respuesta = await llamarRuleta({ authToken: token });
      }
      const resultado = respuesta.data;
      const indice = Math.max(0, PREMIOS.findIndex((item) => item.id === resultado.id));
      const ganado = { ...PREMIOS[indice], ...resultado };
      giro.setValue(0);
      giroManual.setValue(0);
      const step = 360 / PREMIOS.length;
      const ajusteFinal = (360 - step / 2 - indice * step) % 360;
      Animated.timing(giro, { toValue: 1 + ajusteFinal / 1800, duration: 3600, useNativeDriver: false }).start(() => {
        setPremio(ganado);
        setMensaje('¡La ruleta eligió tu sorpresa!');
        setGirando(false);
        setRecompensaVisible(true);
      });
    } catch (error) {
      console.error('[RuletaDiaria] No se pudo completar el giro:', error);
      setGirando(false);
      setMensaje(error?.code === 'functions/failed-precondition' ? 'No tenés tickets para girar hoy.' : error?.code === 'functions/unauthenticated' ? 'Iniciá sesión de nuevo para poder girar.' : 'No pudimos girar ahora. Intentá de nuevo.');
    }
  };
  const sorpresaColeccion = useMemo(() => resolverSorpresaColeccion(premio?.recompensa), [premio?.recompensa]);
  const premioTexto = useMemo(() => premio?.tipo === 'coleccion' ? (premio?.recompensa?.nombre || 'una sorpresa de colección') : premio?.tipo === 'dinero' ? `${premio.cantidad} monedas` : premio?.tipo === 'diamantes' ? `${premio.cantidad} diamantes` : premio?.tipo === 'perdida' ? `perdés ${premio.cantidad} monedas` : premio?.tipo === 'nada' ? 'sin premio esta vez' : `${premio?.cantidad} cartas universales`, [premio]);
  const cerrarRecompensa = () => { setRecompensaVisible(false); setPremio(null); setMensaje(textoEstado); };
  const cerrarRuleta = () => { cerrarRecompensa(); onClose?.(); };
  const iconoPremio = premio?.tipo === 'coleccion' ? 'auto-awesome' : premio?.tipo === 'dinero' ? 'monetization-on' : premio?.tipo === 'diamantes' ? 'diamond' : premio?.tipo === 'perdida' ? 'money-off' : premio?.tipo === 'nada' ? 'sentiment-dissatisfied' : 'style';
  const colorPremio = premio?.tipo === 'coleccion' ? '#9361c0' : premio?.tipo === 'diamantes' ? '#35c3df' : premio?.nivel === 'malo' ? '#bd6974' : '#d99832';
  const encabezado = premio?.tipo === 'coleccion' ? '¡SORPRESA RARA!' : premio?.nivel === 'epico' ? '¡PREMIO ÉPICO!' : premio?.nivel === 'malo' ? 'CASI…' : '¡TE TOCÓ!';
  return <>
    <Modal visible={visible && !recompensaVisible} transparent animationType="fade" onRequestClose={cerrarRuleta}>
    <View style={s.fondo}><TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={cerrarRuleta} /><View style={s.card}>
      <TouchableOpacity onPress={cerrarRuleta} style={s.cerrar}><MaterialIcons name="close" size={17} color="#70412c" /></TouchableOpacity>
      <Text style={s.eyebrow}>GIRO DIARIO</Text>
      <Ruleta giro={giro} giroManual={giroManual} habilitada={!girando && !premio} />
      <View style={s.estadoGiro}><MaterialIcons name="confirmation-number" size={13} color="#a66c2a" /><Text style={s.estadoGiroTexto}>{estadoGiros.tickets} {estadoGiros.tickets === 1 ? 'TICKET' : 'TICKETS'}</Text><View style={s.estadoSeparador} /><View style={[s.estadoPunto, puedeGirar ? s.estadoPuntoDisponible : s.estadoPuntoAgotado]} /><Text style={s.estadoDisponible}>{puedeGirar ? 'PODÉS GIRAR' : 'SIN GIROS'}</Text></View>
      <Text style={s.descripcion}>{girando ? mensaje : textoEstado}</Text>
      {!premio && <TouchableOpacity onPress={girar} disabled={girando || !puedeGirar} activeOpacity={0.82} style={[s.girarBtn, (girando || !puedeGirar) && s.girarBtnDisabled]}><LinearGradient colors={puedeGirar ? ['#ffd86f', '#d8892b'] : ['#d8c5a7', '#b59a79']} style={s.girarGrad}><MaterialIcons name="casino" size={18} color="#6d3c18" /><Text style={s.girarTexto}>{girando ? 'GIRANDO…' : giroDiarioDisponible ? 'GIRO DIARIO GRATIS' : estadoGiros.tickets > 0 ? 'USAR TICKET' : 'SIN GIROS'}</Text></LinearGradient></TouchableOpacity>}
    </View></View>
    </Modal>
    <RecompensaOverlay visible={recompensaVisible} onClose={cerrarRecompensa} encabezado={encabezado} mensaje="El resultado ya quedó registrado en tu cuenta.">
      <View style={s.recompensaVista}>
        {sorpresaColeccion?.imagen ? <View style={s.sorpresaImagenWrap}><ExpoImage source={sorpresaColeccion.imagen} style={s.sorpresaImagen} contentFit="contain" cachePolicy="memory-disk" /></View> : <MaterialIcons name={iconoPremio} size={50} color={colorPremio} />}
        <Text style={s.recompensaCantidad}>{premio?.nivel === 'malo' ? premioTexto : `+${premioTexto}`}</Text>
        <Text style={s.recompensaEtiqueta}>{premio?.tipo === 'coleccion' ? 'Quedó guardado en tu colección' : premio?.nivel === 'malo' ? 'No fue tu mejor giro' : premio?.nivel === 'epico' ? 'Resultado épico de la ruleta' : 'Resultado de la ruleta'}</Text>
      </View>
    </RecompensaOverlay>
  </>;
}

const s = StyleSheet.create({
  fondo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(38,20,44,0.75)' },
  card: { width: 255, minHeight: 328, alignItems: 'center', paddingTop: 14, paddingBottom: 14, borderRadius: 25, overflow: 'hidden', backgroundColor: '#fff2d6', borderWidth: 3, borderColor: '#d69b43', elevation: 24 },
  eyebrow: { color: '#a66c2a', fontSize: 7, fontWeight: '900', letterSpacing: 1.6 },
  cerrar: { position: 'absolute', top: 8, right: 8, zIndex: 5, width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(255,252,233,0.72)', borderWidth: 1, borderColor: '#d7b977' },
  ruletaWrap: { width: 190, height: 190, marginTop: 2, alignItems: 'center', justifyContent: 'center' }, ruleta: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.93 }] }, premioMarca: { position: 'absolute', width: 34, height: 30, alignItems: 'center', justifyContent: 'center' }, premioMarcaTexto: { marginTop: -1, color: '#fff9e9', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  puntero: { position: 'absolute', top: 1, zIndex: 4, width: 34, height: 37, alignItems: 'center' }, punteroMarco: { position: 'absolute', width: 0, height: 0, borderLeftWidth: 17, borderRightWidth: 17, borderTopWidth: 32, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#8a4a57' }, punteroRosa: { position: 'absolute', top: 3, width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 24, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#f7b1c4' }, punteroGema: { position: 'absolute', top: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: '#ffe9a5', borderWidth: 1.5, borderColor: '#a7634d' },
  estadoGiro: { height: 23, marginTop: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 9, backgroundColor: '#f7e7c6', borderWidth: 1, borderColor: '#dfbe80' }, estadoGiroTexto: { marginLeft: 4, color: '#8e6230', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 }, estadoSeparador: { width: 1, height: 10, marginHorizontal: 7, backgroundColor: '#d5b77e' }, estadoPunto: { width: 6, height: 6, borderRadius: 3, marginRight: 4 }, estadoPuntoDisponible: { backgroundColor: '#3d8a55' }, estadoPuntoAgotado: { backgroundColor: '#bd6974' }, estadoDisponible: { color: '#785532', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.45 }, descripcion: { minHeight: 21, marginTop: 3, paddingHorizontal: 22, color: '#8e6539', fontSize: 8, fontWeight: '700', textAlign: 'center' }, girarBtn: { marginTop: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#9b5d20' }, girarBtnDisabled: { opacity: 0.7 }, girarGrad: { minWidth: 154, height: 39, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, girarTexto: { color: '#653815', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  recompensaVista: { minHeight: 92, width: '100%', alignItems: 'center', justifyContent: 'center' }, recompensaCantidad: { marginTop: 3, color: '#683714', fontSize: 16, fontWeight: '900' }, recompensaEtiqueta: { marginTop: 2, color: '#96602b', fontSize: 8, fontWeight: '800' },
  sorpresaImagenWrap: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2e4fb', borderWidth: 2, borderColor: '#c394d8' }, sorpresaImagen: { width: 53, height: 53, borderRadius: 14 },
});
