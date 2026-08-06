// TODO: Migrar validación a Cloud Function en producción.

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import RoomBackground from '../components/RoomBackground';
import TabButtons from '../components/TabButtons';
import RecompensaOverlay from '../components/RecompensaOverlay';

const ADMIN = 'admin@gmail.com';

const ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

// QR decorativo SVG
const QRDecorativo = () => (
  <Svg width={90} height={90} viewBox="0 0 90 90">
    {/* esquina sup-izq */}
    <Rect x="5"  y="5"  width="30" height="30" rx="4" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
    <Rect x="13" y="13" width="14" height="14" rx="2" fill="rgba(255,255,255,0.7)"/>
    {/* esquina sup-der */}
    <Rect x="55" y="5"  width="30" height="30" rx="4" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
    <Rect x="63" y="13" width="14" height="14" rx="2" fill="rgba(255,255,255,0.7)"/>
    {/* esquina inf-izq */}
    <Rect x="5"  y="55" width="30" height="30" rx="4" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
    <Rect x="13" y="63" width="14" height="14" rx="2" fill="rgba(255,255,255,0.7)"/>
    {/* puntos centrales */}
    <Rect x="42" y="5"  width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="42" y="15" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="42" y="25" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="5"  y="42" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="15" y="42" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="25" y="42" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="55" y="42" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="65" y="42" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="75" y="42" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="42" y="55" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="55" y="55" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="65" y="65" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="75" y="75" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="55" y="75" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="42" y="75" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="42" y="65" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="75" y="55" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
    <Rect x="75" y="65" width="6" height="6"  rx="1" fill="rgba(255,255,255,0.5)"/>
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
          <Text style={s.qrHint}>Presiona aquí</Text>
          <TouchableOpacity onPress={abrirScanner} activeOpacity={0.7} style={s.qrBtn}>
            <QRDecorativo />
          </TouchableOpacity>
        </View>

        {/* Columna derecha — teclado */}
        <View style={s.center}>
          <View style={s.topSection}>
            <Text style={s.titulo}>canjear código</Text>
            <View style={s.tituloLinea} />
          </View>

          <Animated.View style={[s.inputRow, { transform: [{ translateX: shakeAnim }] }]}>
            {input.split('').map((ch, i) => (
              <View key={i} style={s.charWrap}>
                <Text style={s.inputChar}>{ch}</Text>
                <View style={s.charLinea} />
              </View>
            ))}
            {!recompensa && (
              <View style={s.charWrap}>
                <Animated.View style={[s.cursor, { opacity: cursorAnim }]} />
                <View style={s.charLineaCursor} />
              </View>
            )}
          </Animated.View>

          {!recompensa && (
            <View style={s.keyboard}>
              {ROWS.map((row, ri) => (
                <View key={ri} style={s.keyRow}>
                  {row.map(key => (
                    <TouchableOpacity key={key} style={s.key} onPress={() => handleKey(key)} activeOpacity={0.5}>
                      <Text style={s.keyText}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                  {ri === ROWS.length - 1 && (
                    <TouchableOpacity style={[s.key, s.keyDel]} onPress={handleDelete} activeOpacity={0.5}>
                      <Text style={s.keyText}>⌫</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[s.keyConfirmar, (!input || cargando) && s.keyConfirmarDisabled]}
                onPress={handleConfirmar}
                disabled={!input || cargando}
                activeOpacity={0.7}
              >
                <Text style={s.keyConfirmarText}>{cargando ? '...' : 'confirmar'}</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 10,
  },

  // QR col
  qrCol: {
    alignItems: 'center',
    gap: 14,
    marginRight: 40,
    marginLeft: 60,
  },
  qrHint: {
    fontSize: 11, fontWeight: '300', color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Delius',
  },
  qrBtn: {
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Teclado col
  center: {
    alignItems: 'center',
    gap: 18,
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

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 7, minHeight: 44, flexWrap: 'wrap', justifyContent: 'center',
    maxWidth: 360,
  },
  charWrap:        { alignItems: 'center', gap: 5 },
  inputChar:       { fontSize: 20, fontWeight: '300', color: '#fff', fontFamily: 'Delius', textAlign: 'center', minWidth: 18 },
  charLinea:       { width: 18, height: 0.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  charLineaCursor: { width: 18, height: 0.5, backgroundColor: 'rgba(255,255,255,0.7)' },
  cursor:          { width: 1.5, height: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 1 },

  keyboard:  { gap: 6, alignItems: 'center' },
  keyRow:    { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  key: {
    width: 36, height: 40,
    backgroundColor: 'rgba(255,105,180,0.35)',
    borderRadius: 7,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,105,180,0.5)',
  },
  keyDel:  { width: 50, backgroundColor: 'rgba(255,105,180,0.18)' },
  keyText: { fontSize: 13, fontWeight: '400', color: '#fff', fontFamily: 'Delius' },

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
