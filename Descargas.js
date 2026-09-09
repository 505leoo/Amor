import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from './firebaseConfig';
import { useOfflineSyncStatus } from './utils/offlineSync';

export const CACHE_STATE_KEY = 'descargas_app_estado_v1';

export const claveRecurso = (modulo, indice) => {
  try {
    const asset = Asset.fromModule(modulo);
    // localUri puede cambiar después de downloadAsync; nombre/tipo/hash son
    // la identidad estable que permite detectar únicamente assets nuevos.
    return [asset.name, asset.type, asset.hash].filter(Boolean).join('|') || asset.uri || `indice-${indice}`;
  } catch {
    return `indice-${indice}`;
  }
};

// Recursos locales que la app puede preparar en la caché del dispositivo.
// Los archivos ya vienen dentro del bundle; downloadAsync evita que se vuelvan
// a resolver desde la red cuando se usan mediante Asset/Image/Audio.
export const RECURSOS_APP = [
  require('./assets/inicio/inicio.webp'), require('./assets/inicio/jugar.webp'),
  require('./assets/inicio/pareja.webp'), require('./assets/inicio/regalodiario.webp'),
  require('./assets/inicio/comercio.webp'), require('./assets/inicio/eventos/eventochicle.webp'), require('./assets/inicio/eventos/eventoglobo.webp'),
  require('./assets/inicio/eventos/eventokitty.webp'), require('./assets/inicio/eventos/eventorutas.webp'),
  require('./assets/inicio/iconos/icono1.webp'), require('./assets/inicio/iconos/icono-ajolote-caramelo.webp'),
  require('./assets/inicio/iconos/icono-ardilla-bellota-v2.webp'), require('./assets/inicio/iconos/icono-erizo-dulce-medianoche.webp'),
  require('./assets/inicio/iconos/icono-gato-ovillo-dorado.webp'), require('./assets/inicio/iconos/icono-mono-selva-dorada.webp'),
  require('./assets/inicio/iconos/icono-pezglobo-perla-abisal.webp'),
  require('./assets/juegos/conexion.webp'), require('./assets/temporadas/reward.webp'), require('./assets/temporadas/rewardopen.webp'),
  require('./assets/temporadas/libro/coleccion1.webp'), require('./assets/temporadas/libro/libro1.webp'), require('./assets/temporadas/libro/libro2.webp'),
  require('./assets/temporadas/libro/libro3.webp'), require('./assets/temporadas/libro/libroanimal.webp'), require('./assets/temporadas/libro/libroanimal2.webp'),
  require('./assets/temporadas/libro/panel1.webp'), require('./assets/temporadas/libro/Temporada1/fondo1.webp'),
  require('./assets/temporadas/libro/Temporada1/Historia/historia1.webp'),
  require('./assets/temporadas/libro/Temporada1/Historia/historia2.webp'), require('./assets/temporadas/libro/Temporada1/Historia/historia3.webp'),
  require('./assets/temporadas/libro/Temporada1/Historia/historia4.webp'), require('./assets/temporadas/libro/Temporada1/Historia/historia5.webp'),
  require('./assets/temporadas/libro/Temporada1/Historia/historia6.webp'), require('./assets/temporadas/libro/Temporada1/logo1.webp'),
  require('./assets/temporadas/libro/Temporada2/fondo2.webp'), require('./assets/temporadas/libro/Temporada2/logo1.webp'), require('./assets/temporadas/libro/Temporada2/logokitty.webp'),
  require('./assets/Lottie/Fire.lottie'), require('./assets/Lottie/reward.json'),
  require('./assets/sounds/click.mp3'), require('./assets/sounds/enter.mp3'), require('./assets/sounds/reward.mp3'), require('./assets/sounds/ukelele.mp3'),
  require('./assets/Animalitos/Abeja/abeja1.webp'), require('./assets/Animalitos/Ajolote/ajolote1.webp'),
  require('./assets/Animalitos/Ajolote/skins/ajolotet1.webp'), require('./assets/Animalitos/Ajolote/skins/ajolotet2.webp'),
  require('./assets/Animalitos/Ardilla/ardilla1.webp'), require('./assets/Animalitos/Ardilla/skins/ardillat1.webp'), require('./assets/Animalitos/Ardilla/skins/ardillat2.webp'),
  require('./assets/Animalitos/Ballena/ballena1.webp'), require('./assets/Animalitos/Buho/buho1.webp'), require('./assets/Animalitos/CaballitoMar/caballitodemar1.webp'),
  require('./assets/Animalitos/Cangrejo/cangrejo1.webp'), require('./assets/Animalitos/Colibri/colibri1.webp'), require('./assets/Animalitos/Conejo/conejo1.webp'),
  require('./assets/Animalitos/Delfin/delfin1.webp'), require('./assets/Animalitos/Erizo/erizo1.webp'), require('./assets/Animalitos/Erizo/skins/erizot1.webp'), require('./assets/Animalitos/Erizo/skins/erizot2.webp'),
  require('./assets/Animalitos/Gato/gato1.webp'), require('./assets/Animalitos/Gato/skins/gatot1.webp'), require('./assets/Animalitos/Gato/skins/gatot2.webp'),
  require('./assets/Animalitos/Halcon/halcon1.webp'), require('./assets/Animalitos/Halcon/skins/halcont1.webp'), require('./assets/Animalitos/Halcon/skins/halcont2.webp'),
  require('./assets/Animalitos/Loro/loro1.webp'), require('./assets/Animalitos/Loro/skins/lorot1.webp'), require('./assets/Animalitos/Loro/skins/lorot2.webp'),
  require('./assets/Animalitos/Mapache/mapache1.webp'), require('./assets/Animalitos/Mariposa/mariposa1.webp'), require('./assets/Animalitos/Mono/mono1.webp'),
  require('./assets/Animalitos/Mono/skins/monot1.webp'), require('./assets/Animalitos/Mono/skins/monot2.webp'), require('./assets/Animalitos/Murcielago/murcielago1.webp'),
  require('./assets/Animalitos/Oso/oso1.webp'), require('./assets/Animalitos/Panda/panda1.webp'), require('./assets/Animalitos/PezGlobo/pezglobo1.webp'),
  require('./assets/Animalitos/PezGlobo/skins/pezglobot1.webp'), require('./assets/Animalitos/PezGlobo/skins/pezglobot2.webp'), require('./assets/Animalitos/Pulpo/pulpo1.webp'),
  require('./assets/Animalitos/Tortuga/tortuga1.webp'), require('./assets/Animalitos/Zorro/zorro1.webp'),
];

// La intro usa este mismo manifiesto para decidir si una sesión iniciada sin
// conexión puede continuar. No basta con que exista alguna caché: todos los
// recursos actuales deben estar registrados como preparados.
export const recursosPreparados = async () => {
  const valor = await AsyncStorage.getItem(CACHE_STATE_KEY).catch(() => null);
  let guardado = null;
  try { guardado = JSON.parse(valor || 'null'); } catch {}
  if (guardado?.estado !== 'ready' || !Array.isArray(guardado.recursos)) return false;
  const clavesActuales = RECURSOS_APP.map((modulo, indice) => claveRecurso(modulo, indice));
  return clavesActuales.every(clave => guardado.recursos.includes(clave));
};

export default function Descargas({ visible, onClose }) {
  const total = RECURSOS_APP.length;
  const recursos = useMemo(() => RECURSOS_APP.map((modulo, indice) => ({ modulo, clave: claveRecurso(modulo, indice) })), []);
  const clavesActuales = useMemo(() => recursos.map(recurso => recurso.clave), [recursos]);
  const [completados, setCompletados] = useState(0);
  const [estado, setEstado] = useState('idle');
  const [pendientes, setPendientes] = useState(total);
  const [mensaje, setMensaje] = useState('Tus recursos están dentro de la app.');
  const syncStatus = useOfflineSyncStatus(auth.currentUser?.uid);
  const modoSinLinea = syncStatus.modeEnabled;
  const porcentaje = useMemo(() => Math.round((completados / Math.max(1, total)) * 100), [completados, total]);

  useEffect(() => {
    if (!visible) return undefined;
    AsyncStorage.getItem(CACHE_STATE_KEY).then(valor => {
      let guardado = null;
      try { guardado = JSON.parse(valor || 'null'); } catch {}
      // Versiones anteriores solo guardaban "ready" y no permiten comprobar
      // que cada recurso actual exista. Se fuerza una preparación única para
      // construir el manifiesto completo.
      const clavesPreparadas = Array.isArray(guardado?.recursos)
        ? guardado.recursos
        : [];
      const faltantes = clavesActuales.filter(clave => !clavesPreparadas.includes(clave));
      setPendientes(faltantes.length);
      setCompletados(total - faltantes.length);
      if (faltantes.length === 0) {
        setEstado('ready');
        setMensaje('Todo listo. Solo tendrás que preparar los recursos si aparece alguno nuevo.');
      } else if (clavesPreparadas.length > 0) {
        setEstado('idle');
        setMensaje(`Hay ${faltantes.length} recurso${faltantes.length === 1 ? '' : 's'} nuevo${faltantes.length === 1 ? '' : 's'} por preparar.`);
      }
    }).catch(() => {});
    return undefined;
  }, [visible, total, clavesActuales]);

  const prepararRecursos = async () => {
    if (estado === 'downloading') return;
    const valor = await AsyncStorage.getItem(CACHE_STATE_KEY).catch(() => null);
    let guardado = null;
    try { guardado = JSON.parse(valor || 'null'); } catch {}
    const preparadas = Array.isArray(guardado?.recursos)
      ? guardado.recursos
      : [];
    const indicesPendientes = recursos
      .map((recurso, indice) => ({ ...recurso, indice }))
      .filter(recurso => !preparadas.includes(recurso.clave));
    if (indicesPendientes.length === 0) {
      setCompletados(total);
      setPendientes(0);
      setEstado('ready');
      setMensaje('Todo ya está preparado. No hace falta descargarlo de nuevo.');
      return;
    }
    setEstado('downloading');
    setCompletados(total - indicesPendientes.length);
    setPendientes(indicesPendientes.length);
    setMensaje(`Preparando ${indicesPendientes.length} recurso${indicesPendientes.length === 1 ? '' : 's'} nuevo${indicesPendientes.length === 1 ? '' : 's'}…`);
    let omitidos = [];
    for (const recurso of indicesPendientes) {
      const { indice: index } = recurso;
      let etiqueta = `recurso ${index + 1}`;
      try {
        const asset = Asset.fromModule(recurso.modulo);
        etiqueta = asset.name || asset.uri || etiqueta;
        await asset.downloadAsync();
      } catch (error) {
        omitidos.push(etiqueta);
        console.warn('[Descargas] No se pudo precargar', { indice: index + 1, recurso: etiqueta, error: error?.message || error });
      } finally {
        // Un asset que ya viene dentro del bundle no debe detener toda la
        // preparación solo porque downloadAsync no pudo crear otra copia.
        setCompletados(previous => Math.min(total, previous + 1));
        setPendientes(previous => Math.max(0, previous - 1));
      }
    }
    try {
      await AsyncStorage.setItem(CACHE_STATE_KEY, JSON.stringify({ estado: 'ready', recursos: clavesActuales, omitidos }));
    } catch (error) {
      console.warn('[Descargas] No se pudo guardar el estado', error?.message || error);
    }
    setEstado('ready');
    setMensaje(omitidos.length
      ? `¡Listo! ${omitidos.length} recurso${omitidos.length === 1 ? '' : 's'} ya estaba incluido en la app y no necesitó otra descarga.`
      : '¡Listo! La app ya puede reutilizar sus recursos locales.');
  };

  return (
    <Modal visible={Boolean(visible)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.fondo}>
        <TouchableOpacity style={s.cerrarFondo} activeOpacity={1} onPress={onClose} />
        <View style={s.tarjeta}>
          <TouchableOpacity style={s.cerrar} onPress={onClose} hitSlop={8}><MaterialIcons name="close" size={19} color="#76502d" /></TouchableOpacity>
          <View style={s.icono}><MaterialIcons name="cloud-download" size={25} color="#fff8dc" /></View>
          <Text style={s.eyebrow}>TU APP, TAMBIÉN SIN INTERNET</Text>
          <Text style={s.titulo}>Preparar recursos</Text>
          <Text style={s.descripcion}>Guárdalos una vez y sigue disfrutando aunque la conexión se vaya.</Text>
          <View style={s.modoFila}>
            <View style={s.modoIcono}><MaterialIcons name={modoSinLinea ? 'cloud-off' : 'cloud-queue'} size={17} color={modoSinLinea ? '#b66b58' : '#6f9876'} /></View>
            <View style={s.modoInfo}><Text style={s.modoTitulo}>Modo sin línea automático</Text><Text style={s.modoDetalle}>{modoSinLinea ? 'Activo porque no hay conexión' : 'Se activa solo si la red se pierde'}</Text></View>
          </View>
          <View style={s.syncFila}><View style={[s.syncPunto, syncStatus.online && !modoSinLinea && s.syncPuntoOnline]} /><Text style={s.syncTexto}>{syncStatus.syncing ? 'Sincronizando cambios…' : syncStatus.pending ? `${syncStatus.pending} cambio${syncStatus.pending === 1 ? '' : 's'} pendiente${syncStatus.pending === 1 ? '' : 's'}` : syncStatus.online && !modoSinLinea ? 'Todo sincronizado' : 'Guardado localmente'}</Text></View>
          <View style={s.estadoFila}><View style={[s.estadoPunto, estado === 'ready' && s.estadoPuntoListo, estado === 'error' && s.estadoPuntoError]} /><Text style={s.estadoTexto}>{estado === 'downloading' ? 'Preparando…' : estado === 'ready' ? 'Preparado' : estado === 'error' ? 'Necesita reintento' : 'Aún no preparado'}</Text><Text style={s.contador}>{completados}/{total}</Text></View>
          <View style={s.progreso}><View style={[s.progresoLleno, { width: `${porcentaje}%` }]} /></View>
          <Text style={s.mensaje}>{mensaje}</Text>
          <TouchableOpacity style={[s.boton, estado === 'ready' && s.botonListo]} onPress={prepararRecursos} disabled={estado === 'downloading' || (estado === 'ready' && pendientes === 0)} activeOpacity={0.82}>
            {estado === 'downloading' ? <ActivityIndicator size="small" color="#fff8dc" /> : <MaterialIcons name={estado === 'ready' ? 'check' : 'download-done'} size={16} color="#fff8dc" />}
            <Text style={s.botonTexto}>{estado === 'downloading' ? 'PREPARANDO…' : estado === 'ready' ? 'TODO PREPARADO' : 'PREPARAR RECURSOS NUEVOS'}</Text>
          </TouchableOpacity>
          <Text style={s.nota}>Cuando vuelva Internet, tus cambios se sincronizarán automáticamente.</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(35,25,18,0.58)' },
  cerrarFondo: { ...StyleSheet.absoluteFillObject },
  tarjeta: { width: 316, maxWidth: '88%', padding: 16, alignItems: 'center', borderRadius: 20, backgroundColor: '#fff7e3', borderWidth: 1.5, borderColor: '#d0ad70', shadowColor: '#3c291b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 11, elevation: 9 },
  cerrar: { position: 'absolute', top: 9, right: 9, width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#f1e1bd' },
  icono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#6f9876', borderWidth: 1.5, borderColor: '#eff9e9', shadowColor: '#405744', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 3 },
  eyebrow: { marginTop: 8, color: '#8e6b42', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 1 },
  titulo: { marginTop: 3, color: '#543b29', fontFamily: 'Delius', fontSize: 17, fontWeight: '900' },
  descripcion: { marginTop: 6, color: '#80684e', fontFamily: 'Delius', fontSize: 8, lineHeight: 11, fontWeight: '700', textAlign: 'center' },
  modoFila: { width: '100%', marginTop: 10, padding: 8, flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: '#f5ead0', borderWidth: 1, borderColor: '#e2cda1' },
  modoIcono: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#fff8e8' },
  modoInfo: { flex: 1, marginLeft: 8 },
  modoTitulo: { color: '#654b35', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
  modoDetalle: { marginTop: 2, color: '#9a7c5c', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9, fontWeight: '700' },
  syncFila: { width: '100%', marginTop: 9, flexDirection: 'row', alignItems: 'center' },
  syncPunto: { width: 7, height: 7, marginRight: 6, borderRadius: 4, backgroundColor: '#d19a72' },
  syncPuntoOnline: { backgroundColor: '#6f9876' },
  syncTexto: { color: '#846b4e', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '800' },
  estadoFila: { width: '100%', marginTop: 13, flexDirection: 'row', alignItems: 'center' },
  estadoPunto: { width: 8, height: 8, marginRight: 6, borderRadius: 4, backgroundColor: '#d0ad70' },
  estadoPuntoListo: { backgroundColor: '#6f9876' }, estadoPuntoError: { backgroundColor: '#c87568' },
  estadoTexto: { flex: 1, color: '#6f573c', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' }, contador: { color: '#92734e', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  progreso: { width: '100%', height: 8, marginTop: 6, overflow: 'hidden', borderRadius: 5, backgroundColor: '#e6d9bd', borderWidth: 1, borderColor: '#d3bd91' },
  progresoLleno: { height: '100%', borderRadius: 5, backgroundColor: '#6f9876' },
  mensaje: { minHeight: 24, marginTop: 7, color: '#92734e', fontFamily: 'Delius', fontSize: 7.5, lineHeight: 10, fontWeight: '700', textAlign: 'center' },
  boton: { minWidth: 184, height: 35, marginTop: 7, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, backgroundColor: '#6f9876', borderWidth: 1, borderColor: '#4f7658', shadowColor: '#405744', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 3 },
  botonListo: { backgroundColor: '#7f8e67', borderColor: '#61704d' }, botonTexto: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.35 },
  nota: { marginTop: 9, color: '#ad9677', fontFamily: 'Delius', fontSize: 6.5, lineHeight: 9, textAlign: 'center' },
});
