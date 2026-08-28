// TODO: Migrar validación a Cloud Function en producción.

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, Modal, Image, TextInput, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { auth, functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import RoomBackground from '../components/RoomBackground';
import TabButtons from '../components/TabButtons';
import RecompensaOverlay from '../components/RecompensaOverlay';
import { MaterialIcons } from '@expo/vector-icons';

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
  const { width } = useWindowDimensions();
  const [input,      setInput]      = useState('');
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
    setCargando(true);
    try {
      const resultado = await httpsCallable(functions, 'canjearCodigo')({ codigo });
      setRecompensa(resultado.data?.recompensa || null);
    } catch (error) {
      const code = error?.code || '';
      const messages = {
        'functions/not-found': 'Código no encontrado.',
        'functions/already-exists': 'Ya usaste este código.',
        'functions/resource-exhausted': 'Este código ya alcanzó sus usos por persona.',
        'functions/deadline-exceeded': 'Este código ya expiró.',
      };
      if (code === 'functions/not-found') shake();
      global.showToast?.({ text1: messages[code] || 'No se pudo canjear el código.', type: 'error' });
      if (code === 'functions/not-found') setInput('');
    } finally {
      setCargando(false);
    }
  };

  const handleKey = key => {
    if (cargando || recompensa || !/^[a-z0-9]$/i.test(key)) return;
    setInput(previous => previous.length >= 16 ? previous : `${previous}${key.toUpperCase()}`);
  };
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
        <View style={s.pageHeader}>
          <View style={s.pageHeaderIcon}><MaterialIcons name="confirmation-number" size={22} color="#fff8dc" /></View>
          <View><Text style={s.pageTitle}>Canjear código</Text><Text style={s.pageSubtitle}>CONVIERTE TU CÓDIGO EN UNA SORPRESA</Text></View>
        </View>
        <View style={[s.contentCard, width < 700 && s.contentCardSmall]}>

        {/* Columna izquierda — QR */}
        <View style={[s.qrCol, width < 700 && s.qrColSmall]}>
          <View style={s.sectionLabel}><MaterialIcons name="qr-code-scanner" size={14} color="#a87840" /><Text style={s.sectionLabelText}>ESCANEAR</Text></View>
          <TouchableOpacity onPress={abrirScanner} activeOpacity={0.7} style={s.qrBtn}>
            <QRDecorativo />
            <Text style={s.qrHint}>Abrir cámara</Text>
          </TouchableOpacity>
          <Text style={s.qrDescription}>Usá un código QR para completar el canje rápidamente.</Text>
        </View>

        {/* Columna derecha — input */}
        <View style={[s.center, width < 700 && s.centerSmall]}>
          <View style={s.sectionLabel}><MaterialIcons name="keyboard" size={14} color="#a87840" /><Text style={s.sectionLabelText}>ESCRIBIR CÓDIGO</Text></View>

          <Animated.View style={[s.inputRow, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={text => {
                if (!cargando && !recompensa) setInput(text.toUpperCase().slice(0, 16));
              }}
              onSubmitEditing={handleConfirmar}
              style={s.codeInput}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              returnKeyType="done"
              underlineColorAndroid="transparent"
              selectionColor="#c8844d"
              textContentType="none"
              importantForAutofill="no"
              placeholder="CÓDIGO"
              placeholderTextColor="#b8997c"
              editable={!cargando && !recompensa}
            />
          </Animated.View>

          {input.length > 0 && !recompensa && (
            <TouchableOpacity
              style={[s.keyConfirmar, cargando && s.keyConfirmarDisabled]}
              onPress={handleConfirmar}
              disabled={cargando}
              activeOpacity={0.7}
            >
              <MaterialIcons name={cargando ? 'hourglass-top' : 'check'} size={16} color="#fff8dc" />
              <Text style={s.keyConfirmarText}>{cargando ? 'validando...' : 'confirmar código'}</Text>
            </TouchableOpacity>
          )}
        </View>
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
            <MaterialIcons name="close" size={16} color="#fff8dc" /><Text style={s.scanCloseText}>cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <RecompensaOverlay
        visible={!!recompensa}
        onClose={() => { setRecompensa(null); navigation?.navigate('main'); }}
      >
        <View style={s.rewardType}>
          <MaterialIcons name={recompensa?.tipo === 'dinero' ? 'monetization-on' : recompensa?.tipo === 'exp' ? 'bolt' : recompensa?.tipo === 'cartasAnimalitos' ? 'style' : 'auto-awesome'} size={42} color="#ffd36f" />
          <Text style={s.rewardTypeText}>¡Código canjeado!</Text>
          <Text style={s.rewardTypeText}>{recompensa?.tipo === 'dinero' ? `+${recompensa.cantidad} monedas` : recompensa?.tipo === 'exp' ? `+${recompensa.cantidad} EXP` : recompensa?.tipo === 'cartasAnimalitos' ? `x${recompensa.cantidad} cartas universales` : 'Icono desbloqueado'}</Text>
        </View>
      </RecompensaOverlay>
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

  layout: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 24, paddingBottom: 16 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: 9 },
  pageHeaderIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#a87840', borderWidth: 1, borderColor: '#fff3ca', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 5 },
  pageTitle: { color: '#fff8dc', fontFamily: 'Delius', fontSize: 14, fontWeight: '900', letterSpacing: 0.8, marginLeft: 8, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  pageSubtitle: { color: 'rgba(255,248,220,0.72)', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '800', letterSpacing: 0.55, marginLeft: 8, marginTop: 1 },
  contentCard: { width: '100%', maxWidth: 580, minHeight: 218, flexDirection: 'row', alignItems: 'stretch', padding: 11, borderRadius: 15, backgroundColor: '#fff5dd', borderWidth: 2, borderColor: '#d4b06c', shadowColor: '#2e1c10', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.34, shadowRadius: 11, elevation: 19 },
  contentCardSmall: { maxWidth: 400, padding: 10, flexDirection: 'column' },

  // QR col
  qrCol: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e3c991',
  },
  qrColSmall: { borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: '#e3c991', paddingBottom: 9, marginBottom: 9 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  sectionLabelText: { color: '#8e6539', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.75 },
  qrHint: {
    fontSize: 7, fontWeight: '900', color: '#795a38', fontFamily: 'Delius', letterSpacing: 0.3, marginTop: 5,
  },
  qrDescription: { color: '#9a7244', fontFamily: 'Delius', fontSize: 6, lineHeight: 8, fontWeight: '700', textAlign: 'center', marginTop: 7, maxWidth: 120 },
  qrBtn: {
    width: 84, height: 84, padding: 13, borderWidth: 1, borderColor: '#d8b670', borderRadius: 11, backgroundColor: '#f7e9c8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    flex: 1.15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  centerSmall: { flex: 1, width: '100%', paddingHorizontal: 4 },

  topSection: { alignItems: 'center', gap: 10 },

  codeInput: { width: 164, height: 42, paddingHorizontal: 12, paddingVertical: 0, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#d8b670', color: '#6d4327', fontFamily: 'Delius', fontSize: 16, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },

  keyConfirmar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 9, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 9, backgroundColor: '#a87840', borderWidth: 1, borderColor: '#7c522a', shadowColor: '#5e3d20', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.24, shadowRadius: 3, elevation: 4 },
  keyConfirmarDisabled: { opacity: 0.55 },
  keyConfirmarText:     { fontSize: 7.5, fontWeight: '900', color: '#fff8dc', letterSpacing: 0.55, textTransform: 'uppercase', fontFamily: 'Delius' },

  // Scanner
  scanOverlay: { flex: 1, backgroundColor: '#2e1c10', justifyContent: 'center', alignItems: 'center' },
  camera:      { width: 280, height: 280, borderRadius: 12, overflow: 'hidden' },
  scanFrame: {
    position: 'absolute',
    width: 200, height: 200,
    borderWidth: 2, borderColor: '#e8bd67',
    borderRadius: 8,
  },
  scanHint:      { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Delius', letterSpacing: 1, marginTop: 24 },
  scanClose:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, backgroundColor: '#a87840', borderWidth: 1, borderColor: '#e8bd67' },
  scanCloseText: { color: '#fff8dc', fontSize: 8, fontWeight: '900', fontFamily: 'Delius', letterSpacing: 1.2, textTransform: 'uppercase' },
  rewardType: { alignItems: 'center', marginTop: 18 },
  rewardTypeText: { color: '#ffd36f', fontFamily: 'Delius', fontSize: 16, fontWeight: '900', marginTop: 8 },
});
