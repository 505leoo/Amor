import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Polygon, Circle, Ellipse, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { db, auth } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

const STRIP_H = 29;
const STRIP_W = 96;
const TIP = 13;

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

const MoneyStrip = ({ userMoney, chicles, chicleIcono }) => (
  <View style={styles.moneyStripWrap}>
    <Svg width={STRIP_W + TIP} height={STRIP_H} style={StyleSheet.absoluteFill}>
      <Polygon
        points={`0,0 ${STRIP_W},0 ${STRIP_W + TIP},${STRIP_H / 2} ${STRIP_W},${STRIP_H} 0,${STRIP_H}`}
        fill="#c084a0"
      />
    </Svg>
    <Text style={[styles.moneyStripText, { marginLeft: 10 }]}>🪙</Text>
    <Text style={styles.moneyStripText} numberOfLines={1}>{fmt(userMoney)}</Text>
    {chicles != null && (
      <>
        {chicleIcono
          ? <View style={{ marginLeft: 2 }}>{chicleIcono}</View>
          : <Text style={[styles.moneyStripText, { fontSize: 12 }]}>🎈</Text>
        }
        <Text style={styles.moneyStripText} numberOfLines={1}>{fmt(chicles)}</Text>
      </>
    )}
  </View>
);

const TabButtons = ({ onExit, userMoney, onAddSticker, onStopMusic, title, customAddButton, chicles, chicleIcono }) => {
  const [open, setOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-130)).current;
  const [dineroInterno, setDineroInterno] = useState(null);

  // Leer dinero desde Firestore si no se pasa como prop
  useEffect(() => {
    if (userMoney !== undefined) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
      if (!snap.exists()) return;
      setDineroInterno(snap.data().dinero ?? 0);
    });
    return () => unsub();
  }, []);

  const moneyFinal = userMoney !== undefined ? userMoney : dineroInterno;

  useEffect(() => {
    AsyncStorage.getItem('tabButtons_open').then(val => {
      if (val === 'true') {
        setOpen(true);
        slideAnim.setValue(0);
      }
    }).catch(() => {});
  }, []);

  const toggle = () => {
    const toValue = open ? -130 : 0;
    Animated.spring(slideAnim, { toValue, useNativeDriver: true, bounciness: 6 }).start();
    AsyncStorage.setItem('tabButtons_open', String(!open)).catch(() => {});
    setOpen(!open);
  };

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}

      {/* Barra lateral izquierda */}
      <View style={styles.sidebarOuter}>
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
          <TouchableOpacity
            onPress={() => { if (onStopMusic) onStopMusic(); onExit(); }}
            activeOpacity={0.7}
            style={styles.touchable}
          >
            <LinearGradient colors={['#6c757d', '#5a6268']} style={styles.exitButton}>
              <Text style={styles.exitText}>Salir</Text>
            </LinearGradient>
          </TouchableOpacity>
          <MoneyStrip userMoney={moneyFinal} chicles={chicles} chicleIcono={chicleIcono} />
        </Animated.View>

        {/* Pestaña visible siempre */}
        <TouchableOpacity onPress={toggle} style={styles.tab} activeOpacity={0.8}>
          <LinearGradient colors={['#6c757d', '#5a6268']} style={styles.tabInner}>
            <Text style={styles.tabArrow}>{open ? '‹' : '›'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.rightButtons} pointerEvents="auto">
        {customAddButton ? customAddButton : (
          <TouchableOpacity onPress={onAddSticker} activeOpacity={0.7} style={styles.touchable}>
            <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.addButton}>
              <MaterialIcons name="add" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  touchable: {
    pointerEvents: 'auto',
  },
  exitButton: {
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  exitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rightButtons: {
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
  sidebarOuter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    pointerEvents: 'box-none',
  },
  sidebar: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    pointerEvents: 'box-none',
  },
  tab: {
    position: 'absolute',
    left: 0,
    top: 205,
    pointerEvents: 'auto',
    zIndex: 101,
  },
  tabInner: {
    paddingHorizontal: 8,
    paddingVertical: 22,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  tabArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  moneyStripWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: STRIP_W + TIP,
    height: STRIP_H,
    marginTop: 10,
    gap: 3,
  },
  moneyStripText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
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
