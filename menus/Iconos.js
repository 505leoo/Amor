import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import TabButtons from '../components/TabButtons';
import { Buffer } from 'buffer';

const BUCKET = 'amor-9df0d.firebasestorage.app';
const ADMIN_EMAIL = 'admin@gmail.com';

const SECCIONES = ['temporada', 'evento', 'animales'];
const SECCION_LABELS = { temporada: '🌸 Temporada', evento: '🎉 Evento', animales: '🐾 Animales' };

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
const IconoItem = ({ ic, gestion, activo, seleccionado, separador, onPress, onEliminar, onEditar }) => (
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <View style={[s.cuadro, gestion && activo && s.cuadroActivo, seleccionado && s.cuadroSeleccionado, separador && s.cuadroSep]}>
        <ExpoImage source={{ uri: ic.url }} style={s.icImg} contentFit="cover" cachePolicy="memory" />
        {seleccionado && (
          <View style={s.checkOverlay}>
            <Text style={s.checkEmoji}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    {gestion && <Text style={s.icNombre} numberOfLines={1}>{ic.nombre}</Text>}
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
const ListaUnificada = ({ porSeccion, sinSeccion, gestion, activoId, iconoSeleccionado, setActivoId, handleSeleccionar, handleEliminar, setEditTarget }) => {
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
            <IconoItem
              key={ic.id}
              ic={ic}
              gestion={gestion}
              activo={activoId === ic.id}
              seleccionado={!gestion && iconoSeleccionado === ic.url}
              separador={esUltimoDeSec}
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

// ── Pantalla principal ────────────────────────────────────────────────────────
const Iconos = ({ navigation }) => {
  const [iconos, setIconos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [gestion, setGestion] = useState(false);
  const [activoId, setActivoId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [iconoSeleccionado, setIconoSeleccionado] = useState(null);
  const [showSeccionModal, setShowSeccionModal] = useState(false);
  const [pendingUri, setPendingUri] = useState(null);

  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;

  useEffect(() => { cargarIconos(); cargarIconoUsuario(); }, []);

  const cargarIconos = async () => {
    try {
      const snap = await getDocs(collection(db, 'iconos'));
      setIconos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error al cargar iconos:', e);
    }
  };

  const cargarIconoUsuario = async () => {
    try {
      const snap = await getDoc(doc(db, 'usuarios', auth.currentUser.uid));
      if (snap.exists()) setIconoSeleccionado(snap.data().iconoUrl || null);
    } catch (e) { console.error('Error al cargar icono usuario:', e); }
  };

  const handleSeleccionar = async (ic) => {
    try {
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { iconoUrl: ic.url });
      setIconoSeleccionado(ic.url);
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
  const handleConfirmarSeccion = async (seccion) => {
    setShowSeccionModal(false);
    if (!pendingUri) return;
    setUploading(true);
    try {
      const nombre = nextNombre(iconos, seccion);
      const url = await uploadToStorage(pendingUri, nombre);
      await addDoc(collection(db, 'iconos'), {
        nombre, url, seccion, creadoEn: new Date(), creadoPor: auth.currentUser?.uid,
      });
      await cargarIconos();
    } catch (e) {
      console.error('Error al subir icono:', e);
      Alert.alert('Error', 'No se pudo subir el icono');
    } finally {
      setUploading(false);
      setPendingUri(null);
    }
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
  const sinSeccion = sortByNombre(iconos.filter(ic => !ic.seccion || !SECCIONES.includes(ic.seccion)));

  return (
    <View style={s.root}>
      <StatusBar hidden />
      <ExpoImage
        source={require('../assets/temporadas/neutral.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />

      <TabButtons
        onExit={() => navigation?.navigate('perfil')}
        userMoney={0}
        customAddButton={
          <View style={s.topBtns}>
            {isAdmin && (
              <TouchableOpacity onPress={toggleGestion} activeOpacity={0.7} style={s.touchable}>
                <View style={[s.manageBtn, gestion && s.btnActivo]}>
                  <MaterialIcons name="list" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity onPress={handleSubir} activeOpacity={0.7} style={s.touchable} disabled={uploading}>
                <View style={[s.addBtn, uploading && s.btnDisabled]}>
                  {uploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <MaterialIcons name="add" size={20} color="#fff" />
                  }
                </View>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <View style={s.center}>
        <ExpoImage
          source={require('../assets/temporadas/libro/panel2.png')}
          style={s.panelImg}
          contentFit="contain"
          cachePolicy="memory-disk"
        />

        <View style={s.box}>
          {editTarget ? (
            <EditModal
              icono={editTarget}
              onCancel={() => { setEditTarget(null); setActivoId(null); }}
              onSave={handleGuardarEdicion}
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scrollContent}
            >
              {iconos.length === 0 && !uploading && (
                <Text style={s.vacio}>Sin iconos — pulsa + para añadir</Text>
              )}
              <ListaUnificada
                porSeccion={porSeccion}
                sinSeccion={sinSeccion}
                gestion={gestion}
                activoId={activoId}
                iconoSeleccionado={iconoSeleccionado}
                setActivoId={setActivoId}
                handleSeleccionar={handleSeleccionar}
                handleEliminar={handleEliminar}
                setEditTarget={setEditTarget}
              />
            </ScrollView>
          )}
        </View>
      </View>

      {/* Modal selector de sección */}
      <SeccionModal
        visible={showSeccionModal}
        onSelect={handleConfirmarSeccion}
        onCancel={() => { setShowSeccionModal(false); setPendingUri(null); }}
      />
    </View>
  );
};

// ── Estilos pantalla ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingLeft: 220 },
  panelImg: { position: 'absolute', width: 650, height: 650, opacity: 0.85, left: 80, top: -148 },

  box: {
    position: 'absolute',
    top: 72,
    left: 168,
    width: 484, // 7×64px + 6×4px gap
    height: 208, // 3 filas × 64px + 2 gaps × 4px + respiro
  },
  scrollContent: {
    gap: 4,
    paddingBottom: 12,
  },

  cuadroSep: {
    borderRightWidth: 3,
    borderRightColor: 'rgba(90,42,58,0.18)',
  },
  seccionWrap: {
    gap: 4,
  },
  seccionScroll: {
    flex: 1,
  },
  seccionTitulo: {
    fontSize: 9,
    color: '#5a2a3a',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 4 },

  itemWrap: { alignItems: 'center' },
  acciones: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  accionBtn: { padding: 1 },
  accionEmoji: { fontSize: 14 },

  cuadro: {
    width: 64, height: 64,
    backgroundColor: '#0a0a0a',
    borderWidth: 3,
    borderColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  cuadroActivo: { borderColor: '#c9748f' },
  cuadroSeleccionado: { borderColor: '#4CAF50', borderWidth: 3 },
  checkOverlay: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 8, width: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  checkEmoji: { fontSize: 10, color: '#fff', fontWeight: '900' },
  icImg: { width: '100%', height: '100%' },
  icNombre: {
    fontSize: 7, color: '#5a2a3a', fontWeight: '600',
    maxWidth: 64, textAlign: 'center', marginTop: 2,
  },
  vacio: { fontSize: 11, color: 'rgba(90,42,58,0.5)', fontStyle: 'italic' },

  topBtns: { flexDirection: 'row' },
  touchable: { pointerEvents: 'auto' },
  addBtn: {
    width: 52, height: 52,
    backgroundColor: '#c9748f',
    borderBottomLeftRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  manageBtn: {
    width: 52, height: 52,
    backgroundColor: '#8a5a6a',
    justifyContent: 'center', alignItems: 'center',
  },
  btnActivo: { backgroundColor: '#5a2a3a' },
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
