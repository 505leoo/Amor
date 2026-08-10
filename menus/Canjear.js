// TODO: Migrar validación a Cloud Function en producción.

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, Modal, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import RoomBackground from '../components/RoomBackground';
import TabButtons from '../components/TabButtons';
import RecompensaOverlay from '../components/RecompensaOverlay';

const ADMIN = 'admin@gmail.com';

const ROWS = [];

// QR decorativo SVG
const QRDecorativo = () => (
  <Svg width={48} height={48} viewBox="0 0 48 48">
    {/* esquina sup-izq */}
    <Rect x="2" y="2" width="16" height="16" rx="3" fill="none" stroke="#fff" strokeWidth="2"/>
    <Rect x="6" y="6" width="8" height="8" rx="1.5" fill="#fff"/>
    {/* esquina sup-der */}
    <Rect x="30" y="2" width="16" height="16" rx="3" fill="none" stroke="#fff" strokeWidth="2"/>
    <Rect x="34" y="6" width="8" height="8" rx="1.5" fill="#fff"/>
    {/* esquina inf-izq */}
    <Rect x="2" y="30" width="16" height="16" rx="3" fill="none" stroke="#fff" strokeWidth="2"/>
    <Rect x="6" y="34" width="8" height="8" rx="1.5" fill="#fff"/>
    {/* datos zona derecha-abajo */}
    <Rect x="30" y="30" width="4" height="4" rx="1" fill="#fff"/>
    <Rect x="36" y="30" width="4" height="4" rx="1" fill="#fff"/>
    <Rect x="42" y="30" width="4" height="4" rx="1" fill="#fff"/>
    <Rect x="30" y="36" width="4" height="4" rx="1" fill="#fff"/>
    <Rect x="42" y="36" width="4" height="4" rx="1" fill="#fff"/>
    <Rect x="30" y="42" width="4" height="4" rx="1" fill="#fff"/>
    <Rect x="36" y="42" width="4" height="4" rx="1" fill="#fff"/>
    <Rect x="42" y="42" width="4" height="4" rx="1" fill="#fff"/>
    {/* fila central */}
    <Rect x="22" y="2"  width="4" height="4" rx="1" fill="rgba(255,255,255,0.6)"/>
    <Rect x="22" y="8"  width="4" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>
    <Rect x="22" y="14" width="4" height="4" rx="1" fill="rgba(255,255,255,0.6)"/>
    <Rect x="2"  y="22" width="4" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>
    <Rect x="8"  y="22" width="4" height="4" rx="1" fill="rgba(255,255,255,0.6)"/>
    <Rect x="14" y="22" width="4" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>
    <Rect x="22" y="22" width="4" height="4" rx="1" fill="#fff"/>
    <Rect x="28" y="22" width="4" height="4" rx="1" fill="rgba(255,255,255,0.6)"/>
    <Rect x="34" y="22" width="4" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>
    <Rect x="40" y="22" width="4" height="4" rx="1" fill="rgba(255,255,255,0.6)"/>
    <Rect x="22" y="28" width="4" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>
    <Rect x="22" y="34" width="4" height="4" rx="1" fill="rgba(255,255,255,0.6)"/>
    <Rect x="22" y="40" width="4" height="4" rx="1" fill="rgba(255,255,255,0.4)"/>
  </Svg>
);

const AdminBtn = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ pointerEvents: 'auto' }}>
    <LinearGradient colors={['#4CAF50', '#45a049']} style={s.adminBtn}>
      <Text style={s.adminBtnText}>!</Text>
    </LinearGradient>
  </TouchableOpacity>
);

export default function Canjear({ navigation }) {
  const [input,      setInput]      = useState('');
  const [codigos,    setCodigos]    = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [recompensa, setRecompensa] = useState(null);
  const [scanOpen,   setScanOpen]   = useState(false);
  const [scanned,    setScanned]    = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const cursorAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef(null);
  const isAdmin = auth.currentUser?.email === ADMIN;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(cursorAnim, { toValue: 0, duration: 530, useNativeDriver: true }),
      Animated.timing(cursorAnim, { toValue: 1, duration: 530, useNativeDriver: true }),
    ])).start();
  }, []);
  useEffect(() => {
    getDocs(collection(db, 'codigos')).then(snap => {
      setCodigos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});
  }, []);

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validarCodigo = async (codigo) => {
    const uid = auth.currentUser?.uid;
    const match = codigos.find(c => {
      if (!c.codigo || c.codigo !== codigo) return false;
      const vencido = c.expiraDias && c.creadoEn
        ? new Date() > new Date((c.creadoEn.toDate?.() ?? new Date(c.creadoEn)).getTime() + c.expiraDias * 86400000)
        : false;
      const agotado = (c.reclamadoPor?.length ?? 0) >= c.usos;
      const yaUsado = c.reclamadoPor?.includes(uid);
      if (vencido) { global.showToast?.({ text1: 'Código vencido',    text2: 'Este código ya expiró',        type: 'error' }); return false; }
      if (agotado) { global.showToast?.({ text1: 'Código agotado',    text2: 'Ya no quedan usos disponibles', type: 'error' }); return false; }
      if (yaUsado) { global.showToast?.({ text1: 'Ya reclamado',      text2: 'Ya usaste este código antes',   type: 'error' }); return false; }
      return true;
    });

    if (!match) {
      const existe = codigos.find(c => c.codigo === codigo);
      if (!existe) { shake(); setInput(''); }
      return;
    }

    setCargando(true);
    try {
      await updateDoc(doc(db, 'codigos', match.id), { reclamadoPor: arrayUnion(uid) });
      setRecompensa({ monedas: match.recompensa });
    } catch {
      global.showToast?.({ text1: 'Error', text2: 'No se pudo canjear', type: 'error' });
    } finally {
      setCargando(false);
    }
  };

  const handleKey    = (key) => { if (cargando || recompensa || input.length >= 16) return; setInput(p => p + key); };
  const handleDelete = ()    => { if (cargando || recompensa) return; setInput(p => p.slice(0, -1)); };
  const handleConfirmar = () => { if (!input || cargando || recompensa) return; validarCodigo(input); };
  const abrirTeclado = () => { if (!cargando && !recompensa) inputRef.current?.focus(); };

  const handleScan = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setScanOpen(false);
    await validarCodigo(data?.trim());
  };

  const abrirScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScanned(false);
    setScanOpen(true);
  };

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <RoomBackground />
      <TabButtons
        onExit={() => navigation?.navigate('main')}
        customAddButton={isAdmin ? <AdminBtn onPress={() => navigation?.navigate('adminCodigos')} /> : <View />}
      />

      <View style={s.layout}>

        {/* Columna izquierda — QR */}
        <View style={s.qrCol}>
          <TouchableOpacity onPress={abrirScanner} activeOpacity={0.7} style={s.qrBtn}>
            <QRDecorativo />
            <Text style={s.qrHint}>escanear</Text>
          </TouchableOpacity>
          <Image source={require('../assets/inicio/menta1.png')} style={s.menta} />
        </View>

        {/* Columna derecha — input */}
        <View style={s.center}>
          <View style={s.topSection}>
            <Text style={s.titulo}>canjear código</Text>
            <View style={s.tituloLinea} />
          </View>

          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={t => { if (!cargando && !recompensa) setInput(t.toUpperCase().slice(0, 16)); }}
            onSubmitEditing={handleConfirmar}
            style={s.hiddenInput}
            autoCapitalize="characters"
            returnKeyType="done"
            editable={!cargando && !recompensa}
          />

          <Animated.View style={[s.inputRow, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity onPress={abrirTeclado} activeOpacity={0.7} style={s.barsRow}>
              {[0,1,2,3,4].map(i => (
                <View key={i} style={s.barSlot}>
                  <Text style={s.barChar}>{input[i] ?? ''}</Text>
                  <View style={[s.barLine, input.length === i && s.barLineActive]} />
                </View>
              ))}
            </TouchableOpacity>
          </Animated.View>

          {input.length > 0 && !recompensa && (
            <TouchableOpacity
              style={[s.keyConfirmar, cargando && s.keyConfirmarDisabled]}
              onPress={handleConfirmar}
              disabled={cargando}
              activeOpacity={0.7}
            >
              <Text style={s.keyConfirmarText}>{cargando ? '...' : 'confirmar'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Scanner modal */}
      <Modal visible={scanOpen} transparent animationType="fade" onRequestClose={() => setScanOpen(false)}>
        <View style={s.scanOverlay}>
          <CameraView
            style={s.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
          <View style={s.scanFrame} />
          <Text style={s.scanHint}>Apuntá al código QR</Text>
          <TouchableOpacity style={s.scanClose} onPress={() => setScanOpen(false)} activeOpacity={0.7}>
            <Text style={s.scanCloseText}>cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <RecompensaOverlay
        visible={!!recompensa}
        monedas={recompensa?.monedas}
        titulo="¡Código canjeado!"
        texto="Las monedas fueron acreditadas a tu cuenta"
        onClose={() => { setRecompensa(null); navigation?.navigate('main'); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  adminBtn: {
    paddingHorizontal: 22, paddingVertical: 18,
    borderBottomLeftRadius: 25,
    justifyContent: 'center', alignItems: 'center', minWidth: 52,
  },
  adminBtnText: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 24 },

  container: { flex: 1 },

  layout: {
    flex: 1,
    paddingTop: 60,
  },

  // QR col
  qrCol: {
    position: 'absolute',
    left: 150,
    top: '30%',
    alignItems: 'center',
    gap: 10,
  },
  qrHint: {
    fontSize: 10, fontWeight: '400', color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2, textTransform: 'lowercase',
    marginTop: 4,
  },
  menta: { width: 180, height: 180, resizeMode: 'contain', position: 'absolute', bottom: -130, left: 15 },
  qrBtn: {
    padding: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },

  center: {
    position: 'absolute',
    right: 100,
    top: '25%',
    alignItems: 'flex-start',
    gap: 18,
    marginLeft: -50,
  },

  topSection: { alignItems: 'center', gap: 10 },
  titulo: {
    fontSize: 15, fontWeight: '500', color: '#fff',
    letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'Delius',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  tituloLinea: {
    height: 0.5, alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.4)', marginTop: -6,
  },

  hiddenInput: { position: 'absolute', width: 0, height: 0, opacity: 0 },

  barsRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  barSlot: { alignItems: 'center', gap: 6 },
  barChar: { fontSize: 22, fontWeight: '300', color: '#fff', minWidth: 22, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  barLine: { width: 22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.7)' },
  barLineActive: { backgroundColor: '#fff' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },

  keyConfirmar:         { marginTop: 6, paddingHorizontal: 36, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.45)' },
  keyConfirmarDisabled: { opacity: 0.25 },
  keyConfirmarText:     { fontSize: 11, fontWeight: '300', color: '#fff', letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'Delius' },

  // Scanner
  scanOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera:      { width: 280, height: 280, borderRadius: 12, overflow: 'hidden' },
  scanFrame: {
    position: 'absolute',
    width: 200, height: 200,
    borderWidth: 2, borderColor: 'rgba(255,105,180,0.8)',
    borderRadius: 8,
  },
  scanHint:      { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Delius', letterSpacing: 1, marginTop: 24 },
  scanClose:     { marginTop: 20, paddingHorizontal: 32, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.4)' },
  scanCloseText: { color: '#fff', fontSize: 11, fontFamily: 'Delius', letterSpacing: 3, textTransform: 'uppercase' },
});
