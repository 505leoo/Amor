import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import RoomBackground from '../components/RoomBackground';
import TabButtons from '../components/TabButtons';

const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.9)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
};

const formatFecha = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const ModalForm = ({ visible, inicial, onClose, onSave }) => {
  const [codigo,      setCodigo]      = useState('');
  const [recompensa,  setRecompensa]  = useState('');
  const [expiraDias,  setExpiraDias]  = useState('');
  const [usos,        setUsos]        = useState('1');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (visible) {
      setCodigo(inicial?.codigo      ?? '');
      setRecompensa(inicial?.recompensa ?? '');
      setExpiraDias(inicial?.expiraDias != null ? String(inicial.expiraDias) : '');
      setUsos(inicial?.usos != null ? String(inicial.usos) : '1');
    }
  }, [visible]);

  const handleSave = async () => {
    if (!codigo.trim()) return;
    setSaving(true);
    await onSave({
      codigo:     codigo.trim().toUpperCase(),
      recompensa: recompensa.trim(),
      expiraDias: expiraDias ? parseInt(expiraDias) : null,
      usos:       usos ? parseInt(usos) : 1,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={m.card} activeOpacity={1} onPress={() => {}}>
          <Text style={m.titulo}>{inicial ? 'Editar código' : 'Nuevo código'}</Text>

          <Text style={m.label}>Código</Text>
          <TextInput
            style={m.input}
            value={codigo}
            onChangeText={t => setCodigo(t.toUpperCase())}
            placeholder="Ej: AMOR2025"
            placeholderTextColor="rgba(0,0,0,0.3)"
            autoCapitalize="characters"
            maxLength={12}
          />

          <Text style={m.label}>Recompensa (monedas)</Text>
          <TextInput
            style={m.input}
            value={recompensa}
            onChangeText={setRecompensa}
            placeholder="Ej: 100"
            placeholderTextColor="rgba(0,0,0,0.3)"
            keyboardType="numeric"
          />

          <View style={m.row}>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Expira en (días)</Text>
              <TextInput
                style={m.input}
                value={expiraDias}
                onChangeText={setExpiraDias}
                placeholder="Sin límite"
                placeholderTextColor="rgba(0,0,0,0.3)"
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Usos máximos</Text>
              <TextInput
                style={m.input}
                value={usos}
                onChangeText={setUsos}
                placeholder="1"
                placeholderTextColor="rgba(0,0,0,0.3)"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={m.btns}>
            <TouchableOpacity style={m.btnCancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={m.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.btnSave} onPress={handleSave} disabled={saving} activeOpacity={0.7}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={m.btnSaveText}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  card: {
    width: 320, backgroundColor: '#fff', borderRadius: 16,
    padding: 24, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 16,
  },
  titulo: { fontSize: 16, fontWeight: '700', color: '#2a2a2a', marginBottom: 8 },
  label:  { fontSize: 11, fontWeight: '600', color: '#888', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 6 },
  input: {
    borderBottomWidth: 1, borderBottomColor: '#ddd',
    paddingVertical: 6, fontSize: 14, color: '#222',
  },
  row: { flexDirection: 'row', marginTop: 4 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancel: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  btnCancelText: { fontSize: 13, color: '#888', fontWeight: '600' },
  btnSave: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#4CAF50', alignItems: 'center' },
  btnSaveText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});

const AdminCodigos = ({ navigation }) => {
  const [codigos,    setCodigos]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editando,   setEditando]   = useState(null);
  const [expandido,  setExpandido]  = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'codigos'), snap => {
      setCodigos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async (data) => {
    if (editando) {
      await updateDoc(doc(db, 'codigos', editando.id), data);
    } else {
      await addDoc(collection(db, 'codigos'), {
        ...data,
        reclamadoPor: [],
        creadoEn: serverTimestamp(),
      });
    }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'codigos', id));
  };

  const abrirEditar = (c) => { setEditando(c); setModalOpen(true); };
  const abrirNuevo  = ()  => { setEditando(null); setModalOpen(true); };

  const estaVencido = (c) => {
    if (!c.expiraDias || !c.creadoEn) return false;
    const creado = c.creadoEn.toDate ? c.creadoEn.toDate() : new Date(c.creadoEn);
    const expira = new Date(creado.getTime() + c.expiraDias * 86400000);
    return new Date() > expira;
  };

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <RoomBackground />
      <TabButtons
        onExit={() => navigation?.navigate('canjear')}
        customAddButton={
          <TouchableOpacity onPress={abrirNuevo} activeOpacity={0.7} style={s.touchable}>
            <View style={s.addBtn}>
              <MaterialIcons name="add" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        }
      />

      <View style={s.content}>
        <Text style={s.titulo}>Códigos</Text>
        <View style={s.tituloLinea} />

        {loading
          ? <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
          : (
            <ScrollView style={s.lista} showsVerticalScrollIndicator={false}>
              {codigos.length === 0 && (
                <TouchableOpacity style={s.emptyBtn} onPress={abrirNuevo} activeOpacity={0.7}>
                  <MaterialIcons name="add-circle-outline" size={32} color="rgba(255,255,255,0.4)" />
                  <Text style={[s.empty, SHADOW]}>Sin códigos aún</Text>
                  <Text style={[s.emptyHint, SHADOW]}>Tocá para crear el primero</Text>
                </TouchableOpacity>
              )}
              {codigos.map(c => {
                const vencido   = estaVencido(c);
                const usosLeft  = c.usos - (c.reclamadoPor?.length ?? 0);
                const agotado   = usosLeft <= 0;
                const abierto   = expandido === c.id;

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.card, (vencido || agotado) && s.cardInactivo]}
                    onPress={() => setExpandido(abierto ? null : c.id)}
                    activeOpacity={0.8}
                  >
                    <View style={s.cardHeader}>
                      <View style={s.cardLeft}>
                        <Text style={s.cardCodigo}>{c.codigo}</Text>
                        <View style={s.badges}>
                          {vencido  && <View style={[s.badge, s.badgeRojo]}><Text style={s.badgeText}>Vencido</Text></View>}
                          {agotado  && <View style={[s.badge, s.badgeGris]}><Text style={s.badgeText}>Agotado</Text></View>}
                          {!vencido && !agotado && <View style={[s.badge, s.badgeVerde]}><Text style={s.badgeText}>Activo</Text></View>}
                        </View>
                      </View>
                      <View style={s.cardActions}>
                        <TouchableOpacity onPress={() => abrirEditar(c)} style={s.iconBtn}>
                          <MaterialIcons name="edit" size={16} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(c.id)} style={s.iconBtn}>
                          <MaterialIcons name="delete-outline" size={16} color="rgba(255,100,100,0.8)" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={s.cardMeta}>
                      <Text style={s.metaText}>💎 {c.recompensa || '—'} monedas</Text>
                      <Text style={s.metaText}>🔁 {usosLeft}/{c.usos} usos</Text>
                      <Text style={s.metaText}>📅 {c.expiraDias ? `${c.expiraDias}d` : '∞'}</Text>
                    </View>

                    {abierto && (
                      <View style={s.expandido}>
                        <Text style={s.expandidoTitulo}>Reclamado por:</Text>
                        {c.reclamadoPor?.length > 0
                          ? c.reclamadoPor.map((uid, i) => (
                              <Text key={i} style={s.expandidoUid}>· {uid}</Text>
                            ))
                          : <Text style={s.expandidoUid}>Nadie aún</Text>
                        }
                        <Text style={[s.expandidoUid, { marginTop: 4 }]}>Creado: {formatFecha(c.creadoEn)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }
      </View>

      <ModalForm
        visible={modalOpen}
        inicial={editando}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  touchable: { pointerEvents: 'auto' },
  addBtn: {
    paddingHorizontal: 22, paddingVertical: 18,
    borderBottomLeftRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center',
    minWidth: 52,
  },

  content: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 24,
    gap: 10,
  },
  titulo: {
    fontSize: 13, fontWeight: '300', color: '#fff',
    letterSpacing: 6, textTransform: 'uppercase', fontFamily: 'Delius',
    ...SHADOW,
  },
  tituloLinea: {
    height: 0.5, backgroundColor: 'rgba(255,255,255,0.45)', marginTop: -6,
  },
  empty:     { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, textAlign: 'center' },
  emptyHint:  { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4, textAlign: 'center', letterSpacing: 0.5 },
  emptyBtn:   { alignItems: 'center', marginTop: 40, gap: 6 },

  lista: { flex: 1, marginTop: 8 },

  card: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  cardInactivo: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft:   { gap: 4 },
  cardCodigo: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 2, ...SHADOW },
  badges:     { flexDirection: 'row', gap: 6 },
  badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  badgeVerde: { backgroundColor: 'rgba(76,175,80,0.7)' },
  badgeRojo:  { backgroundColor: 'rgba(244,67,54,0.7)' },
  badgeGris:  { backgroundColor: 'rgba(120,120,120,0.7)' },
  badgeText:  { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  cardActions: { flexDirection: 'row', gap: 8 },
  iconBtn:     { padding: 6 },

  cardMeta:   { flexDirection: 'row', gap: 14 },
  metaText:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', ...SHADOW },

  expandido:       { marginTop: 6, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 8, gap: 3 },
  expandidoTitulo: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' },
  expandidoUid:    { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'Delius' },
});

export default AdminCodigos;
