import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Ellipse, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { db, auth } from '../firebaseConfig';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const ChicleSvg = () => (
  <Svg width={16} height={16}>
    <Defs>
      <SvgLinearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#ffb8cc" />
        <Stop offset="100%" stopColor="#e8607a" />
      </SvgLinearGradient>
    </Defs>
    <Circle cx={8} cy={8} r={6} fill="url(#cg)" />
    <Circle cx={8} cy={8} r={6} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
    <Ellipse cx={5.5} cy={5.5} rx={2} ry={1.1} fill="rgba(255,255,255,0.35)" />
  </Svg>
);

const fmt = (n) => Number(n || 0).toLocaleString('es-MX');

const MoneyStrip = ({ userMoney, diamantes, cartasUniversales }) => (
  <View style={styles.moneyStripWrap}>
    <View style={styles.resourceItem}>
      <Text style={styles.moneyCoin}>🪙</Text>
      <Text style={styles.moneyStripText} numberOfLines={1}>{fmt(userMoney)}</Text>
    </View>
    <View style={styles.resourceDivider} />
    <View style={styles.resourceItem}>
      <MaterialIcons name="diamond" size={12} color="#32b9d5" />
      <Text style={styles.moneyStripText} numberOfLines={1}>{fmt(diamantes)}</Text>
    </View>
    <View style={styles.resourceDivider} />
    <View style={styles.resourceItem}>
      <MaterialIcons name="style" size={13} color="#8858bd" />
      <Text style={styles.moneyStripText} numberOfLines={1}>{fmt(cartasUniversales)}</Text>
    </View>
  </View>
);

const TabButtons = ({ onExit, userMoney, onAddSticker, onStopMusic, title, customAddButton, chicles, chicleIcono }) => {
  const isAdmin = auth.currentUser?.email?.toLowerCase() === 'admin@gmail.com';
  const [dineroInterno, setDineroInterno] = useState(null);
  const [diamantesInternos, setDiamantesInternos] = useState(0);
  const [cartasInternas, setCartasInternas] = useState(0);

  // Leer dinero desde Firestore si no se pasa como prop
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      setDineroInterno(data.dinero ?? 0);
      setDiamantesInternos(data.diamantes ?? data.diamante ?? 0);
      setCartasInternas(data.cartasAnimalitos ?? 0);
    });
    return () => unsub();
  }, []);

  const moneyFinal = userMoney !== undefined ? userMoney : dineroInterno;

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    const seccion = global.currentScreen;
    if (!uid || !seccion) return undefined;
    const ahora = new Date();
    const diaKey = `${ahora.getFullYear()}-${ahora.getMonth() + 1}-${ahora.getDate()}`;
    setDoc(doc(db, 'usuarios', uid, 'misiones', diaKey), {
      progreso: { secciones_hoy: { [seccion]: true } },
    }, { merge: true }).catch(() => {});
    return undefined;
  }, []);

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => { if (onStopMusic) onStopMusic(); onExit(); }}
        activeOpacity={0.75}
        style={[styles.touchable, styles.exitTouchable]}
        accessibilityLabel="Salir"
        hitSlop={7}
      >
        <View style={styles.exitButton}>
          <View pointerEvents="none" style={styles.exitHighlight} />
          <View style={styles.exitInner}><MaterialIcons name="close" size={15} color="#76502d" /></View>
        </View>
      </TouchableOpacity>
      <MoneyStrip userMoney={moneyFinal} diamantes={diamantesInternos} cartasUniversales={cartasInternas} />

      {isAdmin && <View style={styles.rightButtons} pointerEvents="auto">
        {customAddButton ? customAddButton : (
          <TouchableOpacity onPress={onAddSticker} activeOpacity={0.7} style={styles.touchable}>
            <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.addButton}>
              <MaterialIcons name="add" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  touchable: {
    pointerEvents: 'auto',
  },
  exitButton: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,248,226,0.96)',
    borderWidth: 1.25,
    borderColor: '#c79d62',
    shadowColor: '#674523',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 14,
  },
  exitTouchable: { position: 'absolute', top: 21, left: 25 },
  exitInner: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(238,215,174,0.42)', borderWidth: 1, borderColor: 'rgba(176,126,69,0.42)' },
  exitHighlight: { position: 'absolute', top: 3, left: 8, width: 11, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.76)', transform: [{ rotate: '-16deg' }] },
  rightButtons: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moneyStripWrap: {
    position: 'absolute',
    top: -1,
    left: 112,
    flexDirection: 'row',
    alignItems: 'center',
    width: 216,
    height: 27,
    paddingHorizontal: 3,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#f1e1bd',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#d0ad70',
    shadowColor: '#5f4428',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 12,
    zIndex: 102,
  },
  resourceItem: { flex: 1, height: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 3 },
  resourceDivider: { width: 1, height: 14, backgroundColor: 'rgba(164,116,53,0.35)' },
  moneyCoin: { fontSize: 11 },
  moneyStripText: {
    color: '#76552f',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 80,
    zIndex: -1,
    pointerEvents: 'none',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
});

export default TabButtons;
