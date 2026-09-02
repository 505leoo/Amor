import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import TabButtons from './components/TabButtons';
import RecompensaOverlay from './components/RecompensaOverlay';

const ICONO_ARDILLA = require('./assets/inicio/iconos/icono-ardilla-bellota.png');
const ICONO_AJOLOTE = require('./assets/inicio/iconos/icono-ajolote-caramelo.png');
const AJOLOTE_BASE = require('./assets/temporadas/libro/Temporada2/Animales/Ajolote/ajolote1.png');
const AJOLOTE_TRAJE_1 = require('./assets/temporadas/libro/Temporada2/Animales/Ajolote/skins/ajolotet1.png');
const AJOLOTE_TRAJE_2 = require('./assets/temporadas/libro/Temporada2/Animales/Ajolote/skins/ajolotet2.png');
const ICONO_ERIZO = require('./assets/inicio/iconos/icono-erizo-dulce-medianoche.png');
const ERIZO_BASE = require('./assets/temporadas/libro/Temporada2/Animales/Erizo/erizo1.png');
const ERIZO_TRAJE_1 = require('./assets/temporadas/libro/Temporada2/Animales/Erizo/skins/erizot1.png');
const ERIZO_TRAJE_2 = require('./assets/temporadas/libro/Temporada2/Animales/Erizo/skins/erizot2.png');

const LOTES = {
  ardilla: {
    id: 'ardilla', nombre: 'Ardilla', subtitulo: 'Lote Bosque Dorado', color: '#d58a2d', oscuro: '#754018', claro: '#fff0b8',
    edicion: 'EDICIÓN DORADA', titulo: 'Bosque Dorado', descripcion: 'Una colección especial de Ardilla',
    gradient: ['#fff3bd', '#e6a844', '#a95c1e'], spinGradient: ['#ffd86f', '#d88722'],
    legacyUnlockField: 'ardillaDesbloqueada', premioPrincipalId: 'ardillat2', ordenCuadricula: ['icono', 'monedas', 'ardillat1', 'universales', 'personaje', 'cartas'],
    personaje: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png'),
    icono: ICONO_ARDILLA,
    premios: [
      { id: 'monedas', tipo: 'dinero', cantidad: 30, nombre: 'Monedas', iconoTexto: '🪙', tamano: 'small', peso: 57 },
      { id: 'universales', tipo: 'cartasAnimalitos', cantidad: 2, nombre: 'Cartas universales', tamano: 'small', peso: 28 },
      { id: 'cartas', tipo: 'cartasAnimal', cantidad: 3, nombre: 'Cartas de Ardilla', tamano: 'small', peso: 14 },
      { id: 'icono', tipo: 'icono', nombre: 'Icono exclusivo', imagen: ICONO_ARDILLA, tamano: 'medium', peso: 0.5, unico: true },
      { id: 'personaje', tipo: 'animal', nombre: 'Ardilla', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png'), tamano: 'character', peso: 0.25, unico: true },
      { id: 'ardillat1', tipo: 'skin', skinId: 'ardillat1', nombre: 'Bellota Dorada', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat1.png'), tamano: 'large', peso: 0.15, unico: true },
      { id: 'ardillat2', tipo: 'skin', skinId: 'ardillat2', nombre: 'Guardiana', imagen: require('./assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat2.png'), tamano: 'large', peso: 0.1, unico: true },
    ],
  },
  ajolote: {
    id: 'ajolote', nombre: 'Ajolote', subtitulo: 'Lote Reino de Caramelo', color: '#cf6493', oscuro: '#74345d', claro: '#ffe1ee',
    edicion: 'EDICIÓN DE TEMPORADA', titulo: 'Reino de Caramelo', tituloCompacto: true, descripcion: 'Una colección dulce y exclusiva de Ajolote',
    costoGiro: 25, precioOriginal: 50, descuento: 50,
    gradient: ['#ffe8f2', '#ef9cc1', '#9d5a9e'], spinGradient: ['#ffd6e9', '#d9689c'],
    legacyUnlockField: 'ajoloteDesbloqueado', premioPrincipalId: 'ajolotet2', ordenCuadricula: ['icono', 'monedas', 'ajolotet1', 'universales', 'personaje', 'cartas'],
    personaje: AJOLOTE_BASE,
    icono: ICONO_AJOLOTE,
    premios: [
      { id: 'monedas', tipo: 'dinero', cantidad: 40, nombre: 'Monedas', iconoTexto: '🪙', tamano: 'small', peso: 54 },
      { id: 'universales', tipo: 'cartasAnimalitos', cantidad: 2, nombre: 'Cartas universales', tamano: 'small', peso: 27 },
      { id: 'cartas', tipo: 'cartasAnimal', cantidad: 3, nombre: 'Cartas de Ajolote', tamano: 'small', peso: 15 },
      { id: 'icono', tipo: 'icono', iconoId: 'ajolote_caramelo', nombre: 'Icono exclusivo', imagen: ICONO_AJOLOTE, tamano: 'medium', peso: 3.5, unico: true },
      { id: 'personaje', tipo: 'animal', nombre: 'Ajolote', imagen: AJOLOTE_BASE, tamano: 'character', peso: 0.3, unico: true },
      { id: 'ajolotet1', tipo: 'skin', skinId: 'ajolotet1', nombre: 'Algodón de Azúcar', imagen: AJOLOTE_TRAJE_1, tamano: 'large', peso: 0.15, unico: true },
      { id: 'ajolotet2', tipo: 'skin', skinId: 'ajolotet2', nombre: 'Guardián de Caramelo', imagen: AJOLOTE_TRAJE_2, tamano: 'large', peso: 0.05, unico: true },
    ],
  },
  erizo: {
    id: 'erizo', nombre: 'Erizo', subtitulo: 'Lote Dulce Medianoche', color: '#75559a', oscuro: '#352044', claro: '#f1ddff',
    edicion: 'EDICIÓN DE TEMPORADA', titulo: 'Dulce Medianoche', tituloCompacto: true, descripcion: 'Cacao, arándanos y una nueva amistad bajo las estrellas',
    gradient: ['#eee2fa', '#8965aa', '#392444'], spinGradient: ['#f0c56e', '#b36c3f'],
    legacyUnlockField: 'erizoDesbloqueado', premioPrincipalId: 'erizot2', ordenCuadricula: ['icono', 'monedas', 'erizot1', 'universales', 'personaje', 'cartas'],
    personaje: ERIZO_BASE,
    icono: ICONO_ERIZO,
    premios: [
      { id: 'monedas', tipo: 'dinero', cantidad: 45, nombre: 'Monedas', iconoTexto: '🪙', tamano: 'small', peso: 52 },
      { id: 'universales', tipo: 'cartasAnimalitos', cantidad: 3, nombre: 'Cartas universales', tamano: 'small', peso: 28 },
      { id: 'cartas', tipo: 'cartasAnimal', cantidad: 4, nombre: 'Cartas de Erizo', tamano: 'small', peso: 16 },
      { id: 'icono', tipo: 'icono', iconoId: 'erizo_dulce_medianoche', nombre: 'Icono Dulce Medianoche', imagen: ICONO_ERIZO, tamano: 'medium', peso: 3.2, unico: true },
      { id: 'personaje', tipo: 'animal', nombre: 'Erizo', imagen: ERIZO_BASE, tamano: 'character', peso: 0.5, unico: true },
      { id: 'erizot1', tipo: 'skin', skinId: 'erizot1', nombre: 'Cupcake de Arándanos', imagen: ERIZO_TRAJE_1, tamano: 'large', peso: 0.2, unico: true },
      { id: 'erizot2', tipo: 'skin', skinId: 'erizot2', nombre: 'Maestro Chocolatero', imagen: ERIZO_TRAJE_2, tamano: 'large', peso: 0.1, unico: true },
    ],
  },
};

const COSTO_GIRO = 50;
const GIROS_GRATIS = 1;

const elegirPremio = premios => {
  const total = premios.reduce((suma, premio) => suma + premio.peso, 0);
  let cursor = Math.random() * total;
  for (const premio of premios) {
    cursor -= premio.peso;
    if (cursor <= 0) return premio;
  }
  return premios[0];
};

const BrilloPremioEstrella = () => {
  const pulso = useRef(new Animated.Value(0)).current;
  const barrido = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const aura = Animated.loop(Animated.sequence([
      Animated.timing(pulso, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulso, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    const reflejo = Animated.loop(Animated.sequence([
      Animated.delay(650),
      Animated.timing(barrido, { toValue: 1, duration: 1250, useNativeDriver: true }),
      Animated.timing(barrido, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(1850),
    ]));
    aura.start();
    reflejo.start();
    return () => { aura.stop(); reflejo.stop(); };
  }, [barrido, pulso]);
  return (
    <>
      <Animated.View pointerEvents="none" style={[s.grandAura, {
        opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
        transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.035] }) }],
      }]} />
      <View pointerEvents="none" style={s.grandShimmerClip}>
        <Animated.View style={[s.grandShimmer, {
          transform: [{ translateX: barrido.interpolate({ inputRange: [0, 1], outputRange: [-100, 185] }) }, { rotate: '17deg' }],
        }]} />
        <Text style={s.grandSparkleOne}>✦</Text>
        <Text style={s.grandSparkleTwo}>✦</Text>
      </View>
    </>
  );
};

const Premio = ({ premio, activo, obtenido, compacto = false, destacado = false }) => (
  <View style={[s.premio, compacto && s.premioCompacto, destacado && s.premioDestacado, activo && s.premioActivo, obtenido && s.premioObtenido]}>
    <View style={[s.premioBrillo, activo && s.premioBrilloActivo]} />
    <View style={s.premioVisual}>{premio.imagen
      ? <Image source={premio.imagen} style={[s.premioImagen, premio.tamano === 'medium' && s.premioImagenIcono, destacado && s.premioImagenDestacada]} contentFit="contain" cachePolicy="memory-disk" />
      : premio.tipo === 'cartasAnimalitos'
        ? <View style={[s.cardIconWrap, s.cardIconUniversal]}><MaterialIcons name="style" size={30} color="#8a61b3" /></View>
        : premio.tipo === 'cartasAnimal'
          ? <View style={[s.cardIconWrap, s.cardIconAnimal]}><MaterialIcons name="pets" size={27} color="#d37b2c" /></View>
          : <Text style={s.premioEmoji}>{premio.iconoTexto}</Text>}
      {premio.cantidad != null && <Text style={s.premioCantidad}>x{premio.cantidad}</Text>}
    </View>
    <View style={s.premioCaption}><Text style={s.premioNombre} numberOfLines={2}>{premio.nombre}</Text></View>
    {premio.unico && <View style={s.premioRaro}><Text style={s.premioRaroText}>✦</Text></View>}
    {obtenido && <View style={s.claimedMark}><MaterialIcons name="check" size={17} color="#fff9df" /></View>}
  </View>
);

export default function Lotes({ navigation, animalId = 'ardilla' }) {
  const [loteId, setLoteId] = useState(LOTES[animalId] ? animalId : 'ardilla');
  const lote = LOTES[loteId] || LOTES.ardilla;
  const uid = auth.currentUser?.uid;
  const [usuario, setUsuario] = useState({ dinero: 0, diamantes: 0, cartasAnimalitos: 0 });
  const [estado, setEstado] = useState({ girosGratisUsados: 0, girosTotales: 0, premiosUnicos: {} });
  const [estadoCargado, setEstadoCargado] = useState(false);
  const [girando, setGirando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [premioActual, setPremioActual] = useState(null);
  const giroAnim = useRef(new Animated.Value(0)).current;
  const brilloTitulo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (LOTES[animalId] && animalId !== loteId) setLoteId(animalId);
  }, [animalId, loteId]);

  useEffect(() => {
    const animacion = Animated.loop(Animated.sequence([
      Animated.timing(brilloTitulo, { toValue: 1, duration: 1450, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(brilloTitulo, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    animacion.start();
    return () => animacion.stop();
  }, [brilloTitulo]);

  useEffect(() => {
    if (!uid) return undefined;
    setEstadoCargado(false);
    const unsubUsuario = onSnapshot(doc(db, 'usuarios', uid), snap => {
      const data = snap.data() || {};
      setUsuario({
        dinero: Math.max(0, Number(data.dinero) || 0),
        diamantes: Math.max(0, Number(data.diamantes ?? data.diamante) || 0),
        cartasAnimalitos: Math.max(0, Number(data.cartasAnimalitos) || 0),
      });
    });
    const unsubLote = onSnapshot(doc(db, 'usuarios', uid, 'lotes', lote.id), snap => {
      setEstado(snap.data() || { girosGratisUsados: 0, girosTotales: 0, premiosUnicos: {} });
      setEstadoCargado(true);
    }, () => {
      setEstadoCargado(false);
    });
    return () => { unsubUsuario(); unsubLote(); };
  }, [uid, lote.id]);

  const gratisRestantes = Math.max(0, GIROS_GRATIS - (Number(estado.girosGratisUsados) || 0));
  const costoGiro = lote.costoGiro ?? COSTO_GIRO;
  const obtenidos = estado.premiosUnicos || {};
  const loteCompleto = lote.premios.every(item => Boolean(obtenidos[item.id]));
  const puedeGirar = estadoCargado && !saliendo && !loteCompleto && (gratisRestantes > 0 || usuario.diamantes >= costoGiro);
  const premioSeleccionadoId = premioActual?.id;
  const premios = useMemo(() => lote.premios, [lote]);
  const premioPrincipal = premios.find(item => item.id === lote.premioPrincipalId) || premios[premios.length - 1];
  const ordenCuadricula = lote.ordenCuadricula || premios.filter(item => item.id !== premioPrincipal.id).map(item => item.id);
  const premiosCuadricula = ordenCuadricula.map(id => premios.find(item => item.id === id)).filter(Boolean);
  const moverBrilloTitulo = brilloTitulo.interpolate({ inputRange: [0, 1], outputRange: [-65, 250] });
  const compensarBrilloTitulo = brilloTitulo.interpolate({ inputRange: [0, 1], outputRange: [65, -250] });
  const cambiarLote = direccion => {
    const ids = Object.keys(LOTES);
    setLoteId(ids[(ids.indexOf(loteId) + direccion + ids.length) % ids.length]);
    setPremioActual(null);
  };

  const girar = async () => {
    if (!uid || girando || !puedeGirar) return;
    setGirando(true);
    setPremioActual(null);
    try {
      const premio = await runTransaction(db, async transaction => {
        const userRef = doc(db, 'usuarios', uid);
        const loteRef = doc(db, 'usuarios', uid, 'lotes', lote.id);
        const animalRef = doc(db, 'usuarios', uid, 'animalitos', lote.id);
        const [userSnap, loteSnap, animalSnap] = await Promise.all([
          transaction.get(userRef), transaction.get(loteRef), transaction.get(animalRef),
        ]);
        if (!userSnap.exists()) throw new Error('usuario_no_encontrado');
        const data = userSnap.data() || {};
        const loteData = loteSnap.data() || {};
        const animalData = animalSnap.data() || {};
        const gratisUsados = Math.max(0, Number(loteData.girosGratisUsados) || 0);
        const esGratis = gratisUsados < GIROS_GRATIS;
        const diamantes = Math.max(0, Number(data.diamantes ?? data.diamante) || 0);
        if (!esGratis && diamantes < costoGiro) throw new Error('diamantes_insuficientes');

        const unicos = { ...(loteData.premiosUnicos || {}) };
        const disponibles = premios.filter(item => !unicos[item.id]);
        if (!disponibles.length) throw new Error('lote_completo');
        const ganado = elegirPremio(disponibles);
        const updateUsuario = {};
        const updateAnimal = {};
        if (!esGratis) updateUsuario.diamantes = diamantes - costoGiro;
        if (ganado.tipo === 'dinero') updateUsuario.dinero = Math.max(0, Number(data.dinero) || 0) + ganado.cantidad;
        if (ganado.tipo === 'diamantes') updateUsuario.diamantes = diamantes + ganado.cantidad - (esGratis ? 0 : costoGiro);
        if (ganado.tipo === 'cartasAnimalitos') updateUsuario.cartasAnimalitos = Math.max(0, Number(data.cartasAnimalitos) || 0) + ganado.cantidad;
        if (ganado.tipo === 'cartasAnimal') {
          const cartas = Math.max(0, Number(animalData.cartas ?? animalData.copias) || 0) + ganado.cantidad;
          updateAnimal.cartas = cartas;
          updateAnimal.copias = cartas;
        }
        if (ganado.tipo === 'icono') updateUsuario.iconosDesbloqueados = { ...(data.iconosDesbloqueados || {}), [ganado.iconoId || 'ardilla_bellota']: true };
        if (ganado.tipo === 'animal') {
          if (lote.legacyUnlockField) updateUsuario[lote.legacyUnlockField] = true;
          updateAnimal.desbloqueado = true;
          updateAnimal.nivel = Math.max(1, Number(animalData.nivel) || 1);
        }
        if (ganado.tipo === 'skin') {
          updateAnimal.skinsDesbloqueadas = { ...(animalData.skinsDesbloqueadas || {}), [ganado.skinId]: true };
        }
        unicos[ganado.id] = true;
        const historial = [...(Array.isArray(loteData.historial) ? loteData.historial : []), { premioId: ganado.id, gratis: esGratis, creadoEnMs: Date.now() }].slice(-20);
        transaction.set(userRef, updateUsuario, { merge: true });
        if (Object.keys(updateAnimal).length) transaction.set(animalRef, updateAnimal, { merge: true });
        transaction.set(loteRef, {
          animalId: lote.id,
          girosGratisUsados: gratisUsados + (esGratis ? 1 : 0),
          girosTotales: Math.max(0, Number(loteData.girosTotales) || 0) + 1,
          premiosUnicos: unicos,
          historial,
          ultimoGiro: serverTimestamp(),
        }, { merge: true });
        return ganado;
      });

      giroAnim.setValue(0);
      Animated.timing(giroAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start(() => {
        setPremioActual(premio);
        setGirando(false);
      });
    } catch (error) {
      setGirando(false);
      global.showToast?.({ type: 'error', text1: error?.message === 'diamantes_insuficientes' ? 'No tienes suficientes diamantes' : 'No pudimos completar el giro' });
    }
  };

  const salir = () => {
    if (saliendo) return;
    setSaliendo(true);
    navigation?.navigate?.('main');
  };

  return (
    <View style={s.root}>
      <StatusBar hidden />
      <LinearGradient colors={lote.gradient} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFill} />
      <View style={s.radialA} /><View style={s.radialB} /><View style={s.radialC} />
      <TabButtons onExit={salir} userMoney={usuario.dinero} chicles={usuario.cartasAnimalitos} chicleIcono={<Text style={s.universalMini}>✦</Text>} customAddButton={<View />} />

      <View style={s.loteSwitcher}>
        <TouchableOpacity onPress={() => cambiarLote(-1)} style={s.loteArrow} accessibilityLabel="Lote anterior"><MaterialIcons name="chevron-left" size={20} color={lote.oscuro} /></TouchableOpacity>
        <Text style={[s.loteSwitcherText, { color: lote.oscuro }]}>{lote.nombre.toUpperCase()}</Text>
        <TouchableOpacity onPress={() => cambiarLote(1)} style={s.loteArrow} accessibilityLabel="Siguiente lote"><MaterialIcons name="chevron-right" size={20} color={lote.oscuro} /></TouchableOpacity>
      </View>

      <View style={s.leftPanel}>
        <View style={[s.editionPill, { borderColor: `${lote.oscuro}55`, backgroundColor: `${lote.claro}99` }]}><Text style={[s.eyebrow, { color: lote.oscuro }]}>{lote.edicion}</Text></View>
        <View style={s.titleOrnament}><View style={s.titleLine} /><Text style={s.titleStar}>✦</Text><View style={s.titleLine} /></View>
        <Text style={s.titlePrefix}>EL LOTE DE</Text>
        <View style={s.titleWrap}>
          <Text style={[s.title, lote.tituloCompacto && s.titleCompact, { color: lote.oscuro, textShadowColor: lote.claro }]}>{lote.titulo}</Text>
          <Animated.View style={[s.titleShine, { transform: [{ translateX: moverBrilloTitulo }] }]}>
            <Animated.Text numberOfLines={1} style={[s.title, s.titleShineText, lote.tituloCompacto && s.titleCompact, { transform: [{ translateX: compensarBrilloTitulo }] }]}>{lote.titulo}</Animated.Text>
          </Animated.View>
        </View>
        <Text style={[s.subtitle, { color: lote.oscuro }]}>{lote.descripcion}</Text>
        <View style={s.titleFlourish}><Text style={s.titleFlourishText}>◆  ✦  ◆</Text></View>
        <View style={s.precioGiroWrap}><View style={s.diamondBalance}><MaterialIcons name="diamond" size={13} color="#47bfd3" /><Text style={s.diamondBalanceText}>{costoGiro}</Text></View>{lote.descuento && <View style={s.descuentoPill}><Text style={s.descuentoTexto}>{lote.descuento}% OFF</Text>{lote.precioOriginal && <Text style={s.precioAnterior}>{lote.precioOriginal}</Text>}</View>}</View>
        <TouchableOpacity style={[s.spinButton, (!puedeGirar || girando) && s.spinDisabled]} onPress={girar} disabled={!puedeGirar || girando} activeOpacity={0.8}>
          <LinearGradient colors={lote.spinGradient} style={s.spinGradient}>
            <MaterialIcons name="casino" size={18} color="#6f3b15" />
            <View><Text style={s.spinText}>{girando ? 'GIRANDO…' : !estadoCargado ? 'PREPARANDO…' : gratisRestantes > 0 ? 'GIRO GRATIS' : 'GIRAR'}</Text><Text style={s.spinSub}>{!estadoCargado ? 'Cargando tu lote' : gratisRestantes > 0 ? `${gratisRestantes} gratis disponible${gratisRestantes === 1 ? '' : 's'}` : `${costoGiro} diamantes`}</Text></View>
          </LinearGradient>
        </TouchableOpacity>
        {estadoCargado && !saliendo && !puedeGirar && <Text style={s.noDiamonds}>{loteCompleto ? '¡Completaste todo el lote!' : `Necesitas ${costoGiro} diamantes para volver a girar`}</Text>}
      </View>

      <View style={[s.rewardsPanel, { borderColor: lote.color, backgroundColor: `${lote.claro}ee` }]}>
        <View style={s.rewardsHeader}><Text style={s.rewardsTitle}>¿QUÉ PUEDE TOCARTE?</Text><Text style={s.rewardsHint}>Premios comunes y tesoros exclusivos</Text></View>
        <View style={s.rewardsGrid}>
          <View style={s.rewardShowcase}>
            <View style={s.standardGrid}>{premiosCuadricula.map(premio => <Premio key={premio.id} premio={premio} compacto obtenido={Boolean(obtenidos[premio.id])} />)}</View>
            <View style={s.grandPrizeWrap}>
              <BrilloPremioEstrella />
              <Premio premio={premioPrincipal} destacado obtenido={Boolean(obtenidos[premioPrincipal.id])} />
              <View style={s.grandPrizeLabel}><Text style={s.grandPrizeLabelText}>PREMIO ESTRELLA</Text></View>
            </View>
          </View>
        </View>
        <Text style={s.probabilityNote}>Cada giro entrega 1 recompensa · Ninguna recompensa se repite</Text>
      </View>

      <RecompensaOverlay visible={Boolean(premioActual)} onClose={() => setPremioActual(null)} encabezado="¡TE TOCÓ!" mensaje="La recompensa ya está guardada en tu cuenta.">
          {premioActual?.imagen
            ? <Image source={premioActual.imagen} style={s.modalImage} contentFit="contain" />
            : premioActual?.tipo === 'cartasAnimalitos'
              ? <View style={[s.modalCardIcon, s.cardIconUniversal]}><MaterialIcons name="style" size={62} color="#8a61b3" /></View>
              : premioActual?.tipo === 'cartasAnimal'
                ? <View style={[s.modalCardIcon, s.cardIconAnimal]}><MaterialIcons name="pets" size={56} color="#d37b2c" /></View>
                : <Text style={s.modalEmoji}>{premioActual?.iconoTexto}</Text>}
          <Text style={s.modalTitle}>{premioActual?.nombre}</Text>
          {premioActual?.cantidad != null && <Text style={s.modalCantidad}>x{premioActual.cantidad}</Text>}
      </RecompensaOverlay>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  loteSwitcher: { position: 'absolute', top: '3.5%', left: '8%', width: '39%', height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 8 },
  loteArrow: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: 'rgba(255,248,211,0.55)', borderWidth: 1, borderColor: 'rgba(125,75,30,0.32)' },
  loteSwitcherText: { minWidth: 125, textAlign: 'center', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  radialA: { position: 'absolute', left: '21%', top: '-35%', width: '58%', aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(255,255,224,0.32)' },
  radialB: { position: 'absolute', left: '27%', top: '-22%', width: '46%', aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,250,202,0.34)' },
  radialC: { position: 'absolute', right: '-13%', bottom: '-62%', width: '58%', aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(101,48,15,0.12)' },
  leftPanel: { position: 'absolute', left: '8%', top: '39%', bottom: '4%', width: '39%', alignItems: 'center' },
  editionPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9, backgroundColor: 'rgba(255,246,198,0.58)', borderWidth: 1, borderColor: 'rgba(139,84,30,0.34)' },
  eyebrow: { color: '#8b541e', fontSize: 6.5, fontWeight: '900', letterSpacing: 1.7 },
  titleOrnament: { marginTop: 4, width: 154, height: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  titleLine: { flex: 1, height: 1, backgroundColor: 'rgba(126,71,23,0.42)' }, titleStar: { color: '#9e621e', fontSize: 9 },
  titlePrefix: { marginTop: 1, color: '#9a6229', fontFamily: 'Delius', fontSize: 7, fontWeight: '900', letterSpacing: 2.3 },
  titleWrap: { position: 'relative', height: 29, minWidth: 230, alignItems: 'center', overflow: 'hidden' },
  title: { color: '#6a3514', fontFamily: 'Delius', fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: 0.5, textShadowColor: '#ffe6a1', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  titleCompact: { fontSize: 19, lineHeight: 27 },
  titleShine: { position: 'absolute', top: 0, left: 0, width: 27, height: 29, overflow: 'hidden' },
  titleShineText: { position: 'absolute', top: 0, left: 0, width: 230, color: '#fff4a8', textShadowColor: '#ffe58a', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  subtitle: { marginTop: 1, color: '#8e5825', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '700', letterSpacing: 0.25 },
  titleFlourish: { marginTop: 3 }, titleFlourishText: { color: 'rgba(132,76,25,0.55)', fontSize: 6, letterSpacing: 2 },
  precioGiroWrap: { position: 'absolute', bottom: 50, left: '50%', marginLeft: 42, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 4, elevation: 9 },
  diamondBalance: { minWidth: 48, height: 23, borderRadius: 10, paddingHorizontal: 7, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,220,0.92)', borderWidth: 1, borderColor: '#c98228' },
  diamondBalanceText: { color: '#754018', fontSize: 10, fontWeight: '900' },
  descuentoPill: { height: 21, paddingHorizontal: 5, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e85d91', borderWidth: 1, borderColor: '#fff1b8', shadowColor: '#74345d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 3, elevation: 4 },
  descuentoTexto: { color: '#fff7d9', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.4 }, precioAnterior: { marginTop: -1, color: '#ffe1ee', fontSize: 5.5, fontWeight: '800', textDecorationLine: 'line-through' },
  universalMini: { color: '#fff4bd', fontSize: 15, fontWeight: '900' },
  spinButton: { position: 'absolute', bottom: 19, width: 160, height: 38, borderRadius: 13, overflow: 'hidden', borderWidth: 1.5, borderColor: '#8c4d18', elevation: 8 },
  spinDisabled: { opacity: 0.55 }, spinGradient: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  spinText: { color: '#673613', fontSize: 10, lineHeight: 11, fontWeight: '900', letterSpacing: 0.8 }, spinSub: { color: '#88511e', fontSize: 6.5, fontWeight: '700' },
  noDiamonds: { position: 'absolute', bottom: 5, color: '#7d401c', fontSize: 6.5, fontWeight: '700' },
  rewardsPanel: { position: 'absolute', right: '3%', top: '6%', bottom: '5%', width: '48%', paddingHorizontal: 11, paddingTop: 10, paddingBottom: 7, borderRadius: 18, backgroundColor: 'rgba(255,247,218,0.88)', borderWidth: 1.5, borderColor: '#bd792e', elevation: 5 },
  rewardsHeader: { height: 31, alignItems: 'center' }, rewardsTitle: { color: '#713b16', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 }, rewardsHint: { marginTop: 1, color: '#a36a32', fontSize: 6.3, fontWeight: '700' },
  rewardsGrid: { flex: 1, justifyContent: 'center' },
  rewardShowcase: { height: 190, flexDirection: 'row', gap: 7 },
  standardGrid: { width: '62%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' },
  grandPrizeWrap: { flex: 1, position: 'relative' },
  grandAura: { position: 'absolute', top: -5, left: -5, right: -5, bottom: -5, zIndex: 0, borderRadius: 16, backgroundColor: '#ffe88b', borderWidth: 2, borderColor: '#fff2ad', shadowColor: '#ffd35e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 9 },
  grandShimmerClip: { ...StyleSheet.absoluteFillObject, zIndex: 4, borderRadius: 11, overflow: 'hidden' },
  grandShimmer: { position: 'absolute', top: -35, left: 0, width: 28, height: 270, backgroundColor: 'rgba(255,255,231,0.33)' },
  grandSparkleOne: { position: 'absolute', top: 31, right: 10, color: 'rgba(255,244,161,0.9)', fontSize: 11, textShadowColor: '#fff', textShadowRadius: 4 },
  grandSparkleTwo: { position: 'absolute', bottom: 28, left: 9, color: 'rgba(255,232,122,0.72)', fontSize: 7, textShadowColor: '#fff', textShadowRadius: 3 },
  grandPrizeLabel: { position: 'absolute', top: 7, left: 8, right: 8, height: 15, zIndex: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#a86928', borderWidth: 1, borderColor: 'rgba(255,235,159,0.72)' },
  grandPrizeLabelText: { color: '#fff6d5', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.8 },
  premio: { borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(255,250,228,0.94)', borderWidth: 1, borderColor: '#d7ae6b' },
  premioCompacto: { width: '31.5%', height: '48.2%', borderRadius: 9 },
  premioDestacado: { width: '100%', height: '100%', zIndex: 1, paddingTop: 17, borderWidth: 1.5, borderColor: '#bd792e', backgroundColor: 'rgba(255,248,215,0.98)' },
  premioActivo: { borderWidth: 2.5, borderColor: '#fff', backgroundColor: '#ffd567', transform: [{ scale: 1.04 }], elevation: 8 },
  premioObtenido: { backgroundColor: 'rgba(106,87,62,0.34)', borderColor: '#8d7659' },
  premioBrillo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.08)' }, premioBrilloActivo: { backgroundColor: 'rgba(255,231,107,0.34)' },
  premioVisual: { flex: 1, width: '100%', minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  premioCaption: { width: '100%', height: 18, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: 'rgba(150,102,49,0.15)', backgroundColor: 'rgba(233,211,165,0.18)' },
  premioImagen: { width: '76%', height: '90%' }, premioImagenIcono: { width: 38, height: 38, borderRadius: 10 }, premioImagenDestacada: { width: '94%', height: '94%' }, premioEmoji: { fontSize: 20 },
  premioNombre: { paddingHorizontal: 2, color: '#71421d', fontSize: 6.2, lineHeight: 7.5, fontWeight: '900', textAlign: 'center' },
  premioCantidad: { position: 'absolute', right: 4, bottom: 2, color: '#6c3d1c', fontSize: 7, fontWeight: '900', textShadowColor: '#fff4cd', textShadowRadius: 2 },
  cardIconWrap: { width: 39, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cardIconUniversal: { backgroundColor: 'rgba(213,190,235,0.34)' }, cardIconAnimal: { backgroundColor: 'rgba(247,208,143,0.34)' },
  premioRaro: { position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ad712f' }, premioRaroText: { color: '#fff7dc', fontSize: 6, fontWeight: '900' },
  claimedMark: { position: 'absolute', top: '35%', width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(79,63,43,0.82)', borderWidth: 1.5, borderColor: '#fff3ca', elevation: 7 },
  probabilityNote: { height: 12, color: '#95602c', fontSize: 5.8, fontWeight: '700', textAlign: 'center' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(54,29,12,0.66)' },
  modalCard: { width: 248, minHeight: 215, padding: 18, alignItems: 'center', borderRadius: 22, backgroundColor: '#fff3c7', borderWidth: 2, borderColor: '#d58a2d', elevation: 20 },
  modalEyebrow: { color: '#bb7426', fontSize: 8, fontWeight: '900', letterSpacing: 2 }, modalImage: { width: 112, height: 102 }, modalEmoji: { marginVertical: 25, fontSize: 52 },
  modalCardIcon: { width: 112, height: 102, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  modalTitle: { color: '#683714', fontSize: 17, fontWeight: '900' }, modalCantidad: { marginTop: 1, color: '#b16d25', fontSize: 13, fontWeight: '900' }, modalText: { marginTop: 3, color: '#96602b', fontSize: 7.5, fontWeight: '700' },
  modalButton: { marginTop: 12, height: 31, minWidth: 125, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c77b27', borderWidth: 1, borderColor: '#8f501b' }, modalButtonText: { color: '#fff9df', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
