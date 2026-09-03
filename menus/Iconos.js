import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import RoomBackground from '../components/RoomBackground';
import { Buffer } from 'buffer';

const BUCKET = 'amor-9df0d.firebasestorage.app';
const ADMIN_EMAIL = 'admin@gmail.com';
const ICONO_DEFAULT_ID = 'icono_default';
const ICONO_DEFAULT = {
  id: ICONO_DEFAULT_ID,
  nombre: 'icono1',
  url: null,
  source: require('../assets/inicio/iconos/icono1.jpg'),
};
const ICONO_ARDILLA = {
  id: 'ardilla_bellota',
  nombre: 'ardilla_bellota',
  url: null,
  local: true,
  source: require('../assets/inicio/iconos/icono-ardilla-bellota-v2.png'),
  seccion: 'animales',
  temporada: 't1',
};
const ICONO_AJOLOTE = {
  id: 'ajolote_caramelo',
  nombre: 'ajolote_caramelo',
  url: null,
  local: true,
  source: require('../assets/inicio/iconos/icono-ajolote-caramelo.png'),
  seccion: 'animales',
  temporada: 't2',
};
const ICONO_ERIZO = {
  id: 'erizo_dulce_medianoche',
  nombre: 'erizo_dulce_medianoche',
  url: null,
  local: true,
  source: require('../assets/inicio/iconos/icono-erizo-dulce-medianoche.png'),
  seccion: 'animales',
  temporada: 't2',
};

const SECCIONES = ['temporada', 'evento', 'animales'];
const SECCION_LABELS = { temporada: '🌸 Temporada', evento: '🎉 Evento', animales: '🐾 Animalito' };

const nombreVisibleIcono = icono => {
  if (icono.id === ICONO_DEFAULT_ID) return 'Original';
  if (icono.id === 'ardilla_bellota') return 'Bellota dorada';
  if (icono.id === 'ajolote_caramelo') return 'Reino de Caramelo';
  if (icono.id === 'erizo_dulce_medianoche') return 'Dulce Medianoche';
  const match = String(icono.nombre || '').match(/^icono_([tea])_(\d+)$/i);
  if (match) {
    const category = { t: 'Temporada', e: 'Evento', a: 'Animalito' }[match[1].toLowerCase()];
    return `${category} ${match[2]}`;
  }
  return String(icono.nombre || 'Icono especial').replace(/^icono[_-]?/i, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
};

const uploadToStorage = async (uri, nombre) => {
  const user = auth.currentUser;
  const token = await user.getIdToken();
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  const fullPath = `iconos/${Date.now()}_${nombre}`;
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(fullPath)}?uploadType=media`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': mime, Authorization: `Bearer ${token}` },
    body: Buffer.from(base64, 'base64'),
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(fullPath)}?alt=media`;
};

const SECCION_PREFIX = { temporada: 't', evento: 'e', animales: 'a' };
let iconosCache = null;
let iconosCarga = null;

const cargarCatalogoIconos = async () => {
  if (iconosCache) return iconosCache;
  if (!iconosCarga) {
    iconosCarga = getDocs(collection(db, 'iconos')).then(snap => {
      iconosCache = snap.docs.map(icono => ({ id: icono.id, ...icono.data() }));
      return iconosCache;
    }).finally(() => { iconosCarga = null; });
  }
  return iconosCarga;
};

const nextNombre = (iconos, seccion) => {
  const prefix = SECCION_PREFIX[seccion] || 'x';
  const pattern = new RegExp(`^icono_${prefix}_(\\d+)$`);
  const nums = iconos
    .map(ic => { const m = ic.nombre?.match(pattern); return m ? parseInt(m[1], 10) : null; })
    .filter(n => n !== null);
  const max = nums.length ? Math.max(...nums) : 0;
  return `icono_${prefix}_${max + 1}`;
};

// ── Modal selector de sección ─────────────────────────────────────────────────
const SeccionModal = ({ visible, onSelect, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={m.backdrop}>
      <View style={m.card}>
        <Text style={m.titulo}>¿En qué sección?</Text>
        {SECCIONES.map(sec => (
          <TouchableOpacity key={sec} style={m.opcion} onPress={() => onSelect(sec)} activeOpacity={0.75}>
            <Text style={m.opcionText}>{SECCION_LABELS[sec]}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={m.cancelar} onPress={onCancel}>
          <Text style={m.cancelarText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const NombreIdentificableModal = ({ visible, value, onChange, onConfirm, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={m.backdrop}>
      <View style={m.card}>
        <Text style={m.titulo}>Nombre identificable</Text>
        <Text style={m.descripcion}>Solo se usa internamente para encontrar este icono en las recompensas. No será visible para los jugadores.</Text>
        <TextInput
          style={m.input}
          value={value}
          onChangeText={onChange}
          placeholder="Ej.: halcon_icon"
          placeholderTextColor="rgba(90,42,58,0.35)"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={40}
          autoFocus
        />
        <Text style={m.ejemplo}>Ejemplo: animalito_icon</Text>
        <TouchableOpacity style={[m.opcion, !value.trim() && m.opcionDisabled]} onPress={onConfirm} disabled={!value.trim()} activeOpacity={0.75}>
          <Text style={m.opcionText}>Guardar y subir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={m.cancelar} onPress={onCancel}><Text style={m.cancelarText}>Cancelar</Text></TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const TemporadaModal = ({ visible, onSelect, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={m.backdrop}><View style={m.card}>
      <Text style={m.titulo}>Temporada del icono</Text>
      <Text style={m.descripcion}>Define cuándo podrá aparecer en el comercio y las recompensas.</Text>
      {['t1', 't2', 't3'].map(temporada => <TouchableOpacity key={temporada} style={m.opcion} onPress={() => onSelect(temporada)}><Text style={m.opcionText}>{temporada.toUpperCase()}</Text></TouchableOpacity>)}
      <TouchableOpacity style={m.cancelar} onPress={onCancel}><Text style={m.cancelarText}>Cancelar</Text></TouchableOpacity>
    </View></View>
  </Modal>
);

// ── Modal editar nombre ───────────────────────────────────────────────────────
const EditModal = ({ icono, onCancel, onSave }) => {
  const [nombre, setNombre] = useState(icono?.nombre || '');
  useEffect(() => { setNombre(icono?.nombre || ''); }, [icono]);
  if (!icono) return null;
  return (
    <View style={e.wrap}>
      <ExpoImage source={{ uri: icono.url }} style={e.thumb} contentFit="cover" cachePolicy="memory" />
      <TextInput style={e.input} value={nombre} onChangeText={setNombre} maxLength={24} autoFocus />
      <View style={e.actions}>
        <TouchableOpacity style={e.cancelBtn} onPress={onCancel}>
          <Text style={e.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={e.saveBtn} onPress={() => onSave(nombre)}>
          <Text style={e.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Icono individual ──────────────────────────────────────────────────────────
const IconoItem = ({ ic, gestion, activo, seleccionado, bloqueado, separador, onPress, onEliminar, onEditar }) => (
  <View style={s.itemWrap}>
    {gestion && activo && (
      <View style={s.acciones}>
        <TouchableOpacity onPress={onEditar} style={s.accionBtn}>
          <Text style={s.accionEmoji}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onEliminar} style={s.accionBtn}>
          <Text style={s.accionEmoji}>🗑️</Text>
        </TouchableOpacity>
      </View>
    )}
    <TouchableOpacity onPress={onPress} disabled={bloqueado} activeOpacity={bloqueado ? 1 : 0.75}>
      <View style={[s.cuadro, gestion && activo && s.cuadroActivo, seleccionado && s.cuadroSeleccionado, bloqueado && s.cuadroBloqueado, separador && s.cuadroSep]}>
        <ExpoImage source={ic.source || { uri: ic.url }} style={s.icImg} contentFit="cover" cachePolicy="memory" />
        {bloqueado && <View style={s.lockOverlay}><MaterialIcons name="lock" size={16} color="#fff" /></View>}
        {seleccionado && (
          <View style={s.checkOverlay}>
            <Text style={s.checkEmoji}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    <Text style={[s.icNombre, bloqueado && s.icNombreBloqueado, seleccionado && s.icNombreSeleccionado]} numberOfLines={1}>
      {gestion ? ic.nombre : bloqueado ? 'Bloqueado' : nombreVisibleIcono(ic)}
    </Text>
  </View>
);

const SECCION_POR_FILA = { temporada: 3, evento: 2, animales: 3 };
const SECCION_ANCHO = { temporada: 204, evento: 136, animales: 204 }; // n×64 + (n-1)×4

// ── Fila de N iconos ──────────────────────────────────────────────────────────
const FilaIconos = ({ iconos, gestion, activoId, iconoSeleccionado, setActivoId, handleSeleccionar, handleEliminar, setEditTarget, porFila = 3 }) => {
  const filas = [];
  for (let i = 0; i < iconos.length; i += porFila) filas.push(iconos.slice(i, i + porFila));
  return (
    <>
      {filas.map((fila, fi) => (
        <View key={fi} style={s.fila}>
          {fila.map(ic => (
            <IconoItem
              key={ic.id}
              ic={ic}
              gestion={gestion}
              activo={activoId === ic.id}
              seleccionado={!gestion && iconoSeleccionado === ic.url}
              onPress={() => gestion
                ? setActivoId(activoId === ic.id ? null : ic.id)
                : handleSeleccionar(ic)
              }
              onEliminar={() => handleEliminar(ic)}
              onEditar={() => setEditTarget(ic)}
            />
          ))}
        </View>
      ))}
    </>
  );
};

// ── Lista unificada con separadores ──────────────────────────────────────────
const ListaUnificada = ({ porSeccion, sinSeccion, gestion, activoId, iconoSeleccionado, iconosDesbloqueados, setActivoId, handleSeleccionar, handleEliminar, setEditTarget }) => {
  const POR_FILA = 7;

  // Aplanar iconos marcando cuál es el último de su sección
  const secciones = [...SECCIONES.map(sec => porSeccion[sec]).filter(arr => arr.length > 0)];
  if (sinSeccion.length > 0) secciones.push(sinSeccion);

  const planos = [];
  secciones.forEach((secIconos, si) => {
    secIconos.forEach((ic, idx) => {
      const esUltimoDeSec = idx === secIconos.length - 1 && si < secciones.length - 1;
      planos.push({ ic, esUltimoDeSec });
    });
  });

  // Armar filas de 7
  const filas = [];
  for (let i = 0; i < planos.length; i += POR_FILA) filas.push(planos.slice(i, i + POR_FILA));

  return (
    <>
      {filas.map((fila, fi) => (
        <View key={fi} style={s.fila}>
          {fila.map(({ ic, esUltimoDeSec }) => (
            (() => {
              const valorSeleccion = ic.local ? ic.id : ic.url;
              const bloqueado = !gestion && ic.id !== ICONO_DEFAULT_ID && !iconosDesbloqueados?.[ic.id] && iconoSeleccionado !== valorSeleccion;
              return (
            <IconoItem
              key={ic.id}
              ic={ic}
              gestion={gestion}
              activo={activoId === ic.id}
              seleccionado={!gestion && iconoSeleccionado === valorSeleccion}
              bloqueado={bloqueado}
              separador={esUltimoDeSec}
              onPress={() => gestion
                ? setActivoId(activoId === ic.id ? null : ic.id)
                : !bloqueado && handleSeleccionar(ic)
              }
              onEliminar={() => handleEliminar(ic)}
              onEditar={() => setEditTarget(ic)}
            />
              );
            })()
          ))}
        </View>
      ))}
    </>
  );
};

// ── Pantalla principal ────────────────────────────────────────────────────────
const Iconos = ({ navigation }) => {
  const [iconos, setIconos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [gestion, setGestion] = useState(false);
  const [activoId, setActivoId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [iconoSeleccionado, setIconoSeleccionado] = useState(null);
  const [showSeccionModal, setShowSeccionModal] = useState(false);
  const [showNombreIdentificableModal, setShowNombreIdentificableModal] = useState(false);
  const [showTemporadaModal, setShowTemporadaModal] = useState(false);
  const [pendingUri, setPendingUri] = useState(null);
  const [nombreIdentificable, setNombreIdentificable] = useState('');
  const [seccionPendiente, setSeccionPendiente] = useState(null);
  const [temporadaPendiente, setTemporadaPendiente] = useState('t1');
  const [iconosDesbloqueados, setIconosDesbloqueados] = useState({});

  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    cargarIconos();
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid), snap => {
      const data = snap.data() || {};
      setIconoSeleccionado(data.iconoLocalId || data.iconoUrl || null);
      if (data.iconoUrl === undefined) {
        updateDoc(doc(db, 'usuarios', uid), { iconoUrl: null }, { merge: true }).catch(() => {});
      }
      setIconosDesbloqueados(data.iconosDesbloqueados || {});
    });
  }, []);

  const cargarIconos = async () => {
    try {
      setIconos(await cargarCatalogoIconos());
    } catch (e) {
      console.error('Error al cargar iconos:', e);
    }
  };

  const cargarIconoUsuario = async () => {
    try {
      const snap = await getDoc(doc(db, 'usuarios', auth.currentUser.uid));
      if (snap.exists()) setIconoSeleccionado(snap.data().iconoLocalId || snap.data().iconoUrl || null);
    } catch (e) { console.error('Error al cargar icono usuario:', e); }
  };

  const handleSeleccionar = async (ic) => {
    try {
      const esLocal = Boolean(ic.local);
      const valor = ic.id === ICONO_DEFAULT_ID ? null : esLocal ? ic.id : ic.url;
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), {
        iconoUrl: esLocal ? null : valor,
        iconoLocalId: esLocal ? ic.id : null,
      });
      setIconoSeleccionado(valor);
      global.showToast?.({ message: 'Icono actualizado', type: 'success' });
    } catch (e) { console.error('Error al seleccionar icono:', e); }
  };

  // Paso 1: elegir imagen
  const handleSubir = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled) return;
    setPendingUri(result.assets[0].uri);
    setShowSeccionModal(true);
  };

  // Paso 2: elegir sección y subir
  const subirIcono = async (seccion, nombreManual, temporada = 't1') => {
    if (!pendingUri) return;
    const nombre = nombreManual?.trim() || nextNombre(iconos, seccion);
    if (iconos.some(icono => icono.seccion === seccion && icono.nombre?.toLowerCase() === nombre.toLowerCase())) {
      Alert.alert('Nombre en uso', 'Ya existe un icono con ese nombre identificable.');
      setShowNombreIdentificableModal(true);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToStorage(pendingUri, nombre);
      await addDoc(collection(db, 'iconos'), {
        nombre, url, seccion, temporada, creadoEn: new Date(), creadoPor: auth.currentUser?.uid,
      });
      iconosCache = null;
      await cargarIconos();
    } catch (e) {
      console.error('Error al subir icono:', e);
      Alert.alert('Error', 'No se pudo subir el icono');
    } finally {
      setUploading(false);
      setPendingUri(null);
      setNombreIdentificable('');
    }
  };

  const handleConfirmarSeccion = (seccion) => {
    setShowSeccionModal(false);
    if (!pendingUri) return;
    setSeccionPendiente(seccion);
    setShowTemporadaModal(true);
  };

  const handleConfirmarTemporada = temporada => {
    setShowTemporadaModal(false);
    setTemporadaPendiente(temporada);
    setNombreIdentificable('');
    setShowNombreIdentificableModal(true);
  };

  const handleEliminar = (ic) => {
    Alert.alert('Eliminar', `¿Eliminar "${ic.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'iconos', ic.id));
            setIconos(prev => prev.filter(x => x.id !== ic.id));
            setActivoId(null);
          } catch (e) { console.error('Error al eliminar:', e); }
        },
      },
    ]);
  };

  const handleGuardarEdicion = async (nuevoNombre) => {
    if (!nuevoNombre.trim()) return;
    try {
      await updateDoc(doc(db, 'iconos', editTarget.id), { nombre: nuevoNombre.trim() });
      setIconos(prev => prev.map(x => x.id === editTarget.id ? { ...x, nombre: nuevoNombre.trim() } : x));
      setEditTarget(null);
      setActivoId(null);
    } catch (e) { console.error('Error al editar:', e); }
  };

  const toggleGestion = () => {
    setGestion(prev => !prev);
    setActivoId(null);
    setEditTarget(null);
  };

  // Agrupar por sección, ordenados numéricamente por nombre
  const sortByNombre = (arr) => [...arr].sort((a, b) => {
    const numA = parseInt(a.nombre?.match(/_(\d+)$/)?.[1] ?? '0', 10);
    const numB = parseInt(b.nombre?.match(/_(\d+)$/)?.[1] ?? '0', 10);
    return numA - numB;
  });

  const porSeccion = SECCIONES.reduce((acc, sec) => {
    acc[sec] = sortByNombre(iconos.filter(ic => ic.seccion === sec));
    return acc;
  }, {});
  porSeccion.animales = [...porSeccion.animales, ICONO_ARDILLA, ICONO_AJOLOTE, ICONO_ERIZO];
  const sinSeccion = [ICONO_DEFAULT, ...sortByNombre(iconos.filter(ic => !ic.seccion || !SECCIONES.includes(ic.seccion)))];
  const catalogoCompleto = [...SECCIONES.flatMap(section => porSeccion[section]), ...sinSeccion];
  const iconosObtenidos = catalogoCompleto.filter(icono => {
    const selectionValue = icono.local ? icono.id : icono.url;
    return icono.id === ICONO_DEFAULT_ID || iconosDesbloqueados?.[icono.id] || iconoSeleccionado === selectionValue;
  }).length;

  return (
    <View style={s.root}>
      <StatusBar hidden />
      <RoomBackground />
      {isAdmin && <View style={s.topBtns}>
        <TouchableOpacity onPress={toggleGestion} activeOpacity={0.7} style={s.touchable}>
          <View style={[s.manageBtn, gestion && s.btnActivo]}><MaterialIcons name="list" size={20} color="#fff" /></View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSubir} activeOpacity={0.7} style={s.touchable} disabled={uploading}>
          <View style={[s.addBtn, uploading && s.btnDisabled]}>{uploading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="add" size={20} color="#fff" />}</View>
        </TouchableOpacity>
      </View>}

      <View style={s.center}>
        <View style={s.catalogPanel}>
          <TouchableOpacity style={s.backButton} onPress={() => { if (navigation?.canGoBack?.()) navigation.goBack(); else navigation?.navigate?.('perfil'); }} activeOpacity={0.78} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={18} color="#75502f" />
          </TouchableOpacity>
          <View style={s.catalogHeader}>
            <LinearGradient colors={['#e58a9d', '#b94f69']} style={s.headerIcon}><MaterialIcons name="collections" size={20} color="#fff5dc" /></LinearGradient>
            <View style={s.headerCopy}><Text style={s.headerEyebrow}>PERSONALIZA TU PERFIL</Text><Text style={s.headerTitle}>Mi colección de iconos</Text><Text style={s.headerSubtitle}>Elige uno de tus recuerdos para representarte en Amor.</Text></View>
            <View style={s.counterPill}><Text style={s.counterValue}>{iconosObtenidos}/{catalogoCompleto.length}</Text><Text style={s.counterLabel}>OBTENIDOS</Text></View>
          </View>
          <View style={s.headerDivider} />
          <View style={s.box}>
            {editTarget ? <EditModal icono={editTarget} onCancel={() => { setEditTarget(null); setActivoId(null); }} onSave={handleGuardarEdicion} /> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
                {catalogoCompleto.length === 0 && !uploading && <View style={s.emptyState}><MaterialIcons name="collections" size={32} color="#b98e72" /><Text style={s.vacio}>Todavía no hay iconos en esta colección.</Text></View>}
                <ListaUnificada porSeccion={porSeccion} sinSeccion={sinSeccion} gestion={gestion} activoId={activoId} iconoSeleccionado={iconoSeleccionado} iconosDesbloqueados={iconosDesbloqueados} setActivoId={setActivoId} handleSeleccionar={handleSeleccionar} handleEliminar={handleEliminar} setEditTarget={setEditTarget} />
              </ScrollView>}
          </View>
          <View style={s.catalogFooter}><MaterialIcons name="touch-app" size={11} color="#9a7457" /><Text style={s.footerText}>Toca un icono disponible para equiparlo</Text><View style={s.footerDot} /><Text style={s.footerText}>Los bloqueados se consiguen jugando</Text></View>
        </View>
      </View>

      {/* Modal selector de sección */}
      <SeccionModal
        visible={showSeccionModal}
        onSelect={handleConfirmarSeccion}
        onCancel={() => { setShowSeccionModal(false); setPendingUri(null); }}
      />
      <NombreIdentificableModal
        visible={showNombreIdentificableModal}
        value={nombreIdentificable}
        onChange={setNombreIdentificable}
        onConfirm={() => { setShowNombreIdentificableModal(false); subirIcono(seccionPendiente, nombreIdentificable, temporadaPendiente); }}
        onCancel={() => { setShowNombreIdentificableModal(false); setNombreIdentificable(''); setPendingUri(null); }}
      />
      <TemporadaModal
        visible={showTemporadaModal}
        onSelect={handleConfirmarTemporada}
        onCancel={() => { setShowTemporadaModal(false); setSeccionPendiente(null); setPendingUri(null); }}
      />
    </View>
  );
};

// ── Estilos pantalla ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eadbde' },
  backgroundGlow: { position: 'absolute', top: -170, left: '17%', width: 530, height: 310, borderRadius: 270, backgroundColor: 'rgba(255,207,136,0.13)' },
  backgroundPetalOne: { position: 'absolute', left: -42, bottom: -48, width: 150, height: 105, borderRadius: 80, backgroundColor: 'rgba(76,113,74,0.25)', transform: [{ rotate: '25deg' }] },
  backgroundPetalTwo: { position: 'absolute', right: -34, top: 67, width: 120, height: 88, borderRadius: 65, backgroundColor: 'rgba(159,80,92,0.2)', transform: [{ rotate: '-25deg' }] },
  backButton: { position: 'absolute', top: 11, right: 14, zIndex: 1000, elevation: 12, width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0d7a8', borderWidth: 1, borderColor: '#bd8a53' },
  center: { position: 'absolute', top: 43, left: 13, right: 13, bottom: 9 },
  catalogPanel: { flex: 1, borderRadius: 16, padding: 10, backgroundColor: 'rgba(255,248,244,0.72)', borderWidth: 1.2, borderColor: 'rgba(173,119,137,0.28)', shadowColor: '#805968', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  panelTopShine: { position: 'absolute', top: 2, left: 8, right: 8, height: 8, borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: 'rgba(255,255,255,0.42)' },
  catalogHeader: { height: 49, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 9 },
  headerIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: '#983f57', shadowColor: '#8a344b', shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  headerCopy: { flex: 1 },
  headerEyebrow: { color: '#b56d45', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.9 },
  headerTitle: { color: '#513320', fontSize: 14.5, lineHeight: 17, fontWeight: '900' },
  headerSubtitle: { color: '#866247', fontSize: 6.4, fontWeight: '700' },
  counterPill: { width: 68, height: 34, marginRight: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eed8aa', borderWidth: 1, borderColor: '#c79b5e' },
  counterValue: { color: '#684728', fontSize: 11, lineHeight: 12, fontWeight: '900' },
  counterLabel: { color: '#9b6c3d', fontSize: 4.9, fontWeight: '900', letterSpacing: 0.5 },
  headerDivider: { height: 1, marginHorizontal: 8, backgroundColor: 'rgba(143,91,47,0.23)' },
  box: { flex: 1, marginTop: 5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,248,228,0.62)', borderWidth: 1, borderColor: 'rgba(163,108,61,0.22)' },
  scrollContent: { alignItems: 'center', gap: 3, paddingTop: 2, paddingBottom: 12 },
  cuadroSep: { marginRight: 4 },
  seccionWrap: { gap: 4 },
  seccionScroll: { flex: 1 },
  seccionTitulo: { fontSize: 8, color: '#7c5235', fontWeight: '900', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  fila: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 6, marginBottom: 5 },
  itemWrap: { width: 67, alignItems: 'center' },
  acciones: { height: 18, flexDirection: 'row', gap: 4, marginBottom: 2 },
  accionBtn: { width: 18, height: 18, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#efd8b3', borderWidth: 0.8, borderColor: '#c99b68' },
  accionEmoji: { fontSize: 10 },
  cuadro: { width: 58, height: 58, padding: 2, backgroundColor: '#5a4133', borderWidth: 2.5, borderColor: '#9b7658', borderRadius: 13, overflow: 'hidden', shadowColor: '#4d2d1d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.24, shadowRadius: 3, elevation: 3 },
  cuadroActivo: { borderColor: '#c9748f', shadowColor: '#c55271', shadowOpacity: 0.5 },
  cuadroSeleccionado: { borderColor: '#65a05f', borderWidth: 3, backgroundColor: '#6c8c55', shadowColor: '#4b843f', shadowOpacity: 0.6, elevation: 6 },
  cuadroBloqueado: { opacity: 0.62, borderColor: '#8f7a68' },
  lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(48,38,35,0.58)' },
  checkOverlay: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#5b9855', borderRadius: 9, width: 17, height: 17, borderWidth: 1, borderColor: '#e9f4d9', justifyContent: 'center', alignItems: 'center' },
  checkEmoji: { fontSize: 10, color: '#fff', fontWeight: '900' },
  icImg: { width: '100%', height: '100%', borderRadius: 8 },
  icNombre: { width: 67, fontSize: 5.8, color: '#69472f', fontWeight: '900', textAlign: 'center', marginTop: 3 },
  icNombreBloqueado: { color: '#9b8878' },
  icNombreSeleccionado: { color: '#4f813f' },
  emptyState: { height: 145, alignItems: 'center', justifyContent: 'center', gap: 5 },
  vacio: { fontSize: 8, color: '#8f7059', fontWeight: '700' },
  catalogFooter: { height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  footerText: { color: '#89674e', fontSize: 5.6, fontWeight: '800' },
  footerDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#c18658', marginHorizontal: 4 },
  topBtns: { position: 'absolute', top: 8, right: 50, zIndex: 1000, flexDirection: 'row', gap: 4 },
  touchable: { pointerEvents: 'auto' },
  addBtn: { width: 34, height: 28, borderRadius: 9, backgroundColor: '#c8667b', borderWidth: 1, borderColor: '#93475a', justifyContent: 'center', alignItems: 'center', elevation: 7 },
  manageBtn: { width: 34, height: 28, borderRadius: 9, backgroundColor: '#8a6370', borderWidth: 1, borderColor: '#674652', justifyContent: 'center', alignItems: 'center', elevation: 7 },
  btnActivo: { backgroundColor: '#633744' },
  btnDisabled: { backgroundColor: '#bbb' },
});

// ── Estilos modal sección ─────────────────────────────────────────────────────
const m = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fdf0f4',
    borderRadius: 14,
    padding: 20,
    width: 220,
    gap: 10,
    borderWidth: 2.5,
    borderColor: 'rgba(255,155,179,0.4)',
    shadowColor: '#ff9bb3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  titulo: {
    fontFamily: 'Omori',
    fontSize: 13,
    color: '#e8607a',
    textAlign: 'center',
    marginBottom: 4,
  },
  opcion: {
    backgroundColor: '#fff7f9',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,143,168,0.3)',
    alignItems: 'center',
  },
  opcionText: {
    fontFamily: 'Omori',
    fontSize: 11,
    color: '#e8607a',
  },
  opcionDisabled: { opacity: 0.45 },
  descripcion: { fontFamily: 'Delius', fontSize: 8.5, lineHeight: 12, color: 'rgba(90,42,58,0.68)', textAlign: 'center', marginTop: -4 },
  input: { backgroundColor: '#fff7f9', borderWidth: 1.5, borderColor: 'rgba(255,143,168,0.38)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#5a2a3a', fontFamily: 'Delius', fontSize: 10 },
  ejemplo: { marginTop: -6, fontFamily: 'Delius', fontSize: 7.5, color: 'rgba(90,42,58,0.42)', textAlign: 'center' },
  cancelar: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 2,
  },
  cancelarText: {
    fontFamily: 'Delius',
    fontSize: 10,
    color: 'rgba(90,42,58,0.5)',
  },
});

// ── Estilos edición ───────────────────────────────────────────────────────────
const e = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingTop: 8 },
  thumb: { width: 70, height: 70, backgroundColor: '#111', borderWidth: 2, borderColor: '#333', borderRadius: 4 },
  input: {
    width: 220, borderWidth: 1, borderColor: '#e0c8d0',
    borderRadius: 6, padding: 7, fontSize: 13, backgroundColor: '#fff',
  },
  actions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#eee', alignItems: 'center' },
  cancelText: { fontSize: 11, fontWeight: '700', color: '#666' },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#c9748f', alignItems: 'center' },
  saveText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

export default Iconos;
