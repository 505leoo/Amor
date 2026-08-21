import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebaseConfig';
import { actualizarPasoTutorial } from '../components/Tutorial';
import { useMisiones } from '../MisionesContext';

const regalos = [
  { tipo: 'dinero', titulo: 'Monedas', icono: 'monetization-on', cantidades: [100, 250, 500] },
  { tipo: 'diamantes', titulo: 'Diamantes', icono: 'diamond', cantidades: [1, 5, 10] },
  { tipo: 'cartasAnimalitos', titulo: 'Cartas universales', icono: 'style', cantidades: [1, 3, 5] },
  { tipo: 'especial', titulo: 'Objetos especiales', icono: 'auto-awesome', cantidades: [] },
];

export const RecompensasModal = ({ visible, onClose }) => {
  const { registrarProgreso } = useMisiones();
  const [tab, setTab] = useState('inicio');
  const [regalo, setRegalo] = useState(null);
  const [cantidad, setCantidad] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [reclamando, setReclamando] = useState({});
  const [reclamados, setReclamados] = useState({});
  const [recibidos, setRecibidos] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    return onSnapshot(query(collection(db, 'regalos_pareja'), where('para', '==', uid), where('reclamado', '==', false)), snap => setRecibidos(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setRecibidos([]));
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setTab('inicio');
      setRegalo(null);
      setCantidad(null);
      setConfirmar(false);
      setEnviado(false);
      setReclamando({});
      setReclamados({});
    }
  }, [visible]);

  const enviar = async () => {
    if (enviando || enviado || !regalo || !cantidad) return;
    try {
      setEnviando(true);
      await httpsCallable(functions, 'regaloPareja')({ tipo: regalo.tipo, cantidad });
      await registrarProgreso('regalos_hoy');
      setEnviado(true);
      global.showToast?.({ text1: `Enviaste x${cantidad} ${regalo.titulo}`, type: 'success' });
      setTimeout(cerrar, 850);
    } catch (e) {
      global.showToast?.({ text1: e?.message || 'No se pudo enviar el regalo.', type: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  const reclamar = async id => {
    if (reclamando[id] || reclamados[id]) return;
    try {
      setReclamando(current => ({ ...current, [id]: true }));
      await httpsCallable(functions, 'reclamarRegaloPareja')({ regaloId: id });
      if (auth.currentUser?.uid) actualizarPasoTutorial(auth.currentUser.uid, 1).catch(() => {});
      setReclamados(current => ({ ...current, [id]: true }));
      global.showToast?.({ text1: 'Regalo reclamado', type: 'success' });
    } catch (e) {
      global.showToast?.({ text1: e?.message || 'No se pudo reclamar.', type: 'error' });
    } finally {
      setReclamando(current => ({ ...current, [id]: false }));
    }
  };

  const cerrar = () => {
    setTab('inicio');
    setRegalo(null);
    setCantidad(null);
    setConfirmar(false);
    setEnviado(false);
    onClose();
  };

  const volver = () => {
    if (regalo) {
      setRegalo(null);
      setCantidad(null);
      setEnviado(false);
    } else {
      setTab('inicio');
    }
  };

  const abrirRegalo = item => {
    if (item.tipo === 'especial') {
      global.showToast?.({ text1: 'Pronto podrás elegir iconos y trajes de tu inventario.', type: 'info' });
      return;
    }
    setRegalo(item);
  };

  const renderInicio = () => (
    <View style={s.body}>
      <View style={s.homeActions}>
        <TouchableOpacity style={s.homeTile} onPress={() => setTab('enviar')} activeOpacity={0.82}>
          <View style={s.homeIcon}><MaterialIcons name="redeem" size={22} color="#fff7df" /></View>
          <Text style={s.homeTitle}>Enviar</Text>
          <Text style={s.homeMeta}>regalo</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!recibidos.length} style={[s.homeTile, !recibidos.length && s.homeTileDisabled]} onPress={() => setTab('recibidos')} activeOpacity={0.82}>
          <View style={[s.homeIcon, !recibidos.length && s.homeIconDisabled]}><MaterialIcons name="inventory-2" size={22} color={recibidos.length ? '#fff7df' : '#9f978b'} /></View>
          <Text style={[s.homeTitle, !recibidos.length && s.disabledText]}>Recibidos</Text>
          <Text style={[s.homeMeta, !recibidos.length && s.disabledText]}>{recibidos.length ? `${recibidos.length} pendiente${recibidos.length > 1 ? 's' : ''}` : 'vacio'}</Text>
        </TouchableOpacity>
      </View>
      <View style={s.descriptionBox}>
        <View style={s.descriptionSpark}><MaterialIcons name="auto-awesome" size={14} color="#b86b82" /></View>
        <View style={s.descriptionInfo}>
          <Text style={s.descriptionTitle}>Un detalle para guardar cerquita</Text>
          <Text style={s.descriptionText}>Envia monedas, diamantes o cartas universales. Tu pareja podra reclamarlos desde este mismo cofrecito.</Text>
        </View>
      </View>
    </View>
  );

  const renderEnviar = () => (
    <View style={s.body}>
      {!regalo ? (
        <View style={s.giftGrid}>
          {regalos.map(item => (
            <TouchableOpacity key={item.tipo} style={s.giftOption} onPress={() => abrirRegalo(item)} activeOpacity={0.82}>
              <View style={s.giftIcon}><MaterialIcons name={item.icono} size={19} color="#a87840" /></View>
              <Text style={s.giftTitle} numberOfLines={2}>{item.titulo}</Text>
              <MaterialIcons name="chevron-right" size={17} color="#c09254" />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={s.amountPanel}>
          <View style={s.selection}>
            <View style={s.selectionIcon}><MaterialIcons name={regalo.icono} size={25} color="#fff7df" /></View>
            <View style={s.selectionCopy}>
              <Text style={s.selectionTitle}>{regalo.titulo}</Text>
              <Text style={s.selectionText}>Elegir cantidad</Text>
            </View>
          </View>
          <View style={s.amounts}>
            {regalo.cantidades.map(value => (
              <TouchableOpacity key={value} style={[s.amount, cantidad === value && s.sel]} onPress={() => setCantidad(value)} activeOpacity={0.82}>
                <Text style={[s.amountText, cantidad === value && s.selText]}>x{value}</Text>
                <Text style={[s.amountHint, cantidad === value && s.selHint]}>enviar</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity disabled={!cantidad} style={[s.send, !cantidad && s.sendDisabled]} onPress={() => setConfirmar(true)} activeOpacity={0.86}>
            <MaterialIcons name="favorite" size={14} color={cantidad ? '#fff' : '#b7a98f'} />
            <Text style={[s.sendText, !cantidad && s.sendTextDisabled]}>{cantidad ? 'REVISAR REGALO' : 'ELIGE UNA CANTIDAD'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderRecibidos = () => (
    <View style={s.body}>
      {Object.values(recibidos.reduce((groups, item) => {
        const key = `${item.de || 'pareja'}|${item.regaloTipo || 'especial'}`;
        if (!groups[key]) groups[key] = { ...item, ids: [], total: 0 };
        groups[key].ids.push(item.id);
        groups[key].total += Number(item.cantidad) || 0;
        return groups;
      }, {})).map(item => {
        const r = regalos.find(a => a.tipo === item.regaloTipo);
        const grupoReclamado = item.ids.every(id => reclamados[id]);
        const grupoCargando = item.ids.some(id => reclamando[id]);
        return (
          <View key={`${item.de}-${item.regaloTipo}`} style={s.row}>
            <MaterialIcons name={r?.icono || 'card-giftcard'} size={20} color="#a87840" />
            <View style={s.info}>
              <Text style={s.rowTitle}>x{item.total} {r?.titulo || 'Regalo'}</Text>
              <Text style={s.rowText}>Tu pareja te envió todo junto.</Text>
            </View>
            <TouchableOpacity disabled={grupoCargando || grupoReclamado} style={[s.claim, grupoReclamado && s.claimSuccess]} onPress={async () => { for (const id of item.ids) await reclamar(id); }}>
              {grupoCargando ? <ActivityIndicator size="small" color="#fff" /> : <><MaterialIcons name={grupoReclamado ? 'check' : 'redeem'} size={12} color="#fff" /><Text style={s.claimText}>{grupoReclamado ? 'RECLAMADO' : 'RECLAMAR'}</Text></>}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={cerrar}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.dismiss} onPress={cerrar} />
        <View style={[s.card, { height: 292 }]}>
          <View style={s.header}>
            <MaterialIcons name="card-giftcard" size={23} color="#fff" style={s.headIcon} />
            <View style={{ flex: 1 }}><Text style={s.title}>REGALOS</Text><Text style={s.sub}>ENTRE PAREJAS</Text></View>
            {(tab !== 'inicio' || regalo) && <TouchableOpacity onPress={volver} style={s.headerBtn}><MaterialIcons name="arrow-back" size={18} color="#76552f" /></TouchableOpacity>}
            <TouchableOpacity onPress={cerrar} style={s.headerBtn}><MaterialIcons name="close" size={19} color="#814f5d" /></TouchableOpacity>
          </View>
          {tab === 'inicio' ? renderInicio() : tab === 'enviar' ? renderEnviar() : renderRecibidos()}
        </View>
        <Modal visible={confirmar} transparent animationType="fade">
          <View style={s.confirmOverlay}>
            <View style={s.confirm}>
              <MaterialIcons name="card-giftcard" size={34} color="#b86b82" />
              <Text style={s.confirmTitle}>¿Enviar regalo?</Text>
              <Text style={s.confirmText}>Enviaras x{cantidad} {regalo?.titulo.toLowerCase()} a tu pareja. No se puede deshacer.</Text>
              <View style={[s.actions, (enviando || enviado) && s.actionsSuccess]}>
                {!enviando && !enviado && <TouchableOpacity onPress={() => setConfirmar(false)}><Text style={s.cancel}>CANCELAR</Text></TouchableOpacity>}
                <TouchableOpacity disabled={enviando || enviado} style={[s.confirmOk, enviado && s.confirmOkSuccess]} onPress={enviar}>
                  {enviando ? <ActivityIndicator size="small" color="#fff" /> : <><MaterialIcons name={enviado ? 'check' : 'send'} size={13} color="#fff" /><Text style={s.ok}>{enviado ? 'ENVIADO' : 'ENVIAR'}</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,9,5,.82)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  dismiss: { ...StyleSheet.absoluteFillObject },
  card: { width: '100%', maxWidth: 365, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff5dd', borderWidth: 3, borderColor: '#d4b06c' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', padding: 13, backgroundColor: '#f0dcae' },
  headIcon: { backgroundColor: '#a87840', padding: 8, borderRadius: 10, marginRight: 9 },
  headerBtn: { marginLeft: 10, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#704b2d', fontFamily: 'Delius', fontSize: 13, fontWeight: '900' },
  sub: { color: '#9c7644', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800' },
  body: { flex: 1, gap: 8, padding: 13 },
  homeActions: { flexDirection: 'row', gap: 9 },
  homeTile: { flex: 1, minHeight: 84, borderRadius: 13, backgroundColor: '#f7e9c8', borderWidth: 1, borderColor: '#e0bd7d', alignItems: 'center', justifyContent: 'center', padding: 8 },
  homeTileDisabled: { backgroundColor: '#e8e2d8', borderColor: '#d1c7ba' },
  homeIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#a87840', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  homeIconDisabled: { backgroundColor: '#d1c7ba' },
  homeTitle: { color: '#704b2d', fontFamily: 'Delius', fontSize: 10, fontWeight: '900' },
  homeMeta: { color: '#9a7244', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '800', marginTop: 1 },
  descriptionBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: '#ffe8dc', borderWidth: 1, borderColor: '#eac0ae', padding: 11 },
  descriptionSpark: { width: 27, height: 27, borderRadius: 10, backgroundColor: '#fff7df', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  descriptionInfo: { flex: 1 },
  descriptionTitle: { color: '#7b4f3d', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
  descriptionText: { color: '#9d6854', fontFamily: 'Delius', fontSize: 6.6, lineHeight: 10, marginTop: 3 },
  giftGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  giftOption: { width: '48%', height: 80, borderRadius: 13, backgroundColor: '#f7e9c8', borderWidth: 1, borderColor: '#e3c991', padding: 9, justifyContent: 'space-between' },
  giftIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#fff5dd', alignItems: 'center', justifyContent: 'center' },
  giftTitle: { color: '#7a5530', fontFamily: 'Delius', fontSize: 8.5, fontWeight: '900', lineHeight: 11 },
  amountPanel: { flex: 1, justifyContent: 'space-between' },
  selection: { minHeight: 58, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: '#f7e0b6', borderWidth: 1, borderColor: '#e0bd7d' },
  selectionIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#a87840', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  selectionCopy: { flex: 1 },
  selectionTitle: { color: '#704b2d', fontFamily: 'Delius', fontSize: 11, fontWeight: '900' },
  selectionText: { color: '#9a7244', fontFamily: 'Delius', fontSize: 7, marginTop: 2 },
  amounts: { flexDirection: 'row', gap: 8 },
  amount: { flex: 1, height: 62, borderRadius: 14, backgroundColor: '#fff0cf', borderWidth: 1, borderColor: '#e3c991', alignItems: 'center', justifyContent: 'center' },
  sel: { backgroundColor: '#a87840', borderColor: '#8d6135' },
  amountText: { color: '#7a5530', fontFamily: 'Delius', fontSize: 14, fontWeight: '900' },
  amountHint: { color: '#b08958', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', marginTop: 1 },
  selText: { color: '#fff7df' },
  selHint: { color: '#f9ddb1' },
  send: { height: 38, borderRadius: 12, backgroundColor: '#a87840', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  sendDisabled: { backgroundColor: '#efe3c7', borderWidth: 1, borderColor: '#dfc894' },
  sendText: { color: '#fff', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  sendTextDisabled: { color: '#a89168' },
  row: { minHeight: 45, flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 10, backgroundColor: '#f7e9c8', borderWidth: 1, borderColor: '#e3c991' },
  disabledText: { color: '#999' },
  info: { flex: 1, marginLeft: 9 },
  rowTitle: { color: '#7a5530', fontFamily: 'Delius', fontSize: 9, fontWeight: '900' },
  rowText: { color: '#9a7244', fontFamily: 'Delius', fontSize: 6.5 },
  claim: { minWidth: 69, height: 28, paddingHorizontal: 7, borderRadius: 8, backgroundColor: '#a87840', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  claimSuccess: { backgroundColor: '#4d9a68' },
  claimText: { color: '#fff', fontFamily: 'Delius', fontSize: 6, fontWeight: '900' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.7)', alignItems: 'center', justifyContent: 'center', padding: 25 },
  confirm: { alignItems: 'center', padding: 20, borderRadius: 15, backgroundColor: '#fff5dd' },
  confirmTitle: { color: '#704b2d', fontFamily: 'Delius', fontSize: 13, fontWeight: '900', marginTop: 5 },
  confirmText: { color: '#795a38', fontFamily: 'Delius', fontSize: 8, textAlign: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 25, marginTop: 17 },
  actionsSuccess: { justifyContent: 'center' },
  cancel: { color: '#795a38', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
  confirmOk: { minWidth: 70, height: 30, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#a87840', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  confirmOkSuccess: { backgroundColor: '#4d9a68' },
  ok: { color: '#fff', fontFamily: 'Delius', fontSize: 8, fontWeight: '900' },
});
