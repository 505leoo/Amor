import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator,
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

const nextNombre = (iconos) => {
  const nums = iconos
    .map(ic => parseInt(ic.nombre?.replace('icono_', '') || '0', 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `icono_${String(max + 1).padStart(2, '0')}`;
};

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
const IconoItem = ({ ic, gestion, activo, seleccionado, onPress, onEliminar, onEditar }) => (
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
      <View style={[s.cuadro, gestion && activo && s.cuadroActivo, seleccionado && s.cuadroSeleccionado]}>
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

// ── Pantalla principal ────────────────────────────────────────────────────────
const Iconos = ({ navigation }) => {
  const [iconos, setIconos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [gestion, setGestion] = useState(false);
  const [activoId, setActivoId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [iconoSeleccionado, setIconoSeleccionado] = useState(null);

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

  const handleSubir = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const nombre = nextNombre(iconos);
      const url = await uploadToStorage(result.assets[0].uri, nombre);
      await addDoc(collection(db, 'iconos'), {
        nombre, url, creadoEn: new Date(), creadoPor: auth.currentUser?.uid,
      });
      await cargarIconos();
    } catch (e) {
      console.error('Error al subir icono:', e);
      Alert.alert('Error', 'No se pudo subir el icono');
    } finally {
      setUploading(false);
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

  // Agrupar en filas de 10
  const filas = [];
  for (let i = 0; i < iconos.length; i += 10) filas.push(iconos.slice(i, i + 10));

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
            <TouchableOpacity onPress={handleSubir} activeOpacity={0.7} style={s.touchable} disabled={uploading}>
              <View style={[s.addBtn, uploading && s.btnDisabled]}>
                {uploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <MaterialIcons name="add" size={20} color="#fff" />
                }
              </View>
            </TouchableOpacity>
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
          {iconos.length === 0 && !uploading && (
            <Text style={s.vacio}>Sin iconos — pulsa + para añadir</Text>
          )}

          {/* Si estamos editando, mostramos el editor en lugar de la lista */}
          {editTarget ? (
            <EditModal
              icono={editTarget}
              onCancel={() => { setEditTarget(null); setActivoId(null); }}
              onSave={handleGuardarEdicion}
            />
          ) : (
            filas.map((fila, fi) => (
              <View key={fi} style={s.fila}>
                {fila.map((ic, idx) => (
                  <React.Fragment key={ic.id}>
                    {idx > 0 && idx % 3 === 0 && <View style={s.grupSep} />}
                    <IconoItem
                      ic={ic}
                      gestion={gestion}
                      activo={activoId === ic.id}
                      seleccionado={!gestion && iconoSeleccionado === ic.url}
                      onPress={() => gestion
                        ? setActivoId(activoId === ic.id ? null : ic.id)
                        : handleSeleccionar(ic)
                      }
                      onEliminar={() => handleEliminar(ic)}
                      onEditar={() => { setEditTarget(ic); setActivoId(null); }}
                    />
                  </React.Fragment>
                ))}
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
};

// ── Estilos pantalla ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingLeft: 220 },
  panelImg: { position: 'absolute', width: 650, height: 650, opacity: 0.85, left: 100 },

  box: {
    position: 'absolute',
    top: 80,
    left: 173,
    width: 600,
    flexDirection: 'column',
    gap: 4,
  },
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  grupSep: { width: 10 },

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
