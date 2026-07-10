import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import TabButtons from './components/TabButtons';

const { width: W } = Dimensions.get('window');

const CARD_W = W * 0.75;
const CARD_H = CARD_W * (195 / 250);
const CARTA_RIGHT = 80;
const CARTA_TOP = -90;

const FRASES = [
  { id: '1',  linea1: 'TÚ',      linea2: 'PUEDES'    },
  { id: '2',  linea1: 'ERES',    linea2: 'LUZ'        },
  { id: '3',  linea1: 'TODO',    linea2: 'PASA'       },
  { id: '4',  linea1: 'SÉ',      linea2: 'FELIZ'      },
  { id: '5',  linea1: 'BRILLA',  linea2: 'SIEMPRE'    },
  { id: '6',  linea1: 'CONFÍA',  linea2: 'EN TI'      },
  { id: '7',  linea1: 'ERES',    linea2: 'SUFICIENTE' },
  { id: '8',  linea1: 'SIGUE',   linea2: 'ADELANTE'   },
  { id: '9',  linea1: 'HOY',     linea2: 'ES TU DÍA'  },
  { id: '10', linea1: 'MERECES', linea2: 'LO MEJOR'   },
  { id: '11', linea1: 'FLORECE', linea2: 'SOLA'       },
  { id: '12', linea1: 'RESPIRA', linea2: 'PROFUNDO'   },
];

const COLORS = ['#333', '#e8607a', '#f0a500', '#7a5cf0', '#2a9d8f', '#e9c46a', '#f4a0c0', '#fff'];

const FrasesExpandida = ({ navigation, frase: initialFrase, onConfirm }) => {
  const [selected, setSelected] = useState(null);
  const [colorIdx, setColorIdx] = useState(0);
  const [fontsLoaded] = useFonts({ Delius: require('./fonts/Delius.ttf') });
  if (!fontsLoaded) return null;

  const pickRandom = () => {
    const idx = Math.floor(Math.random() * FRASES.length);
    setSelected(FRASES[idx]);
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm(selected);
    navigation.navigate('main', { frase: `${selected.linea1}\n${selected.linea2}` });
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Image source={require('./assets/paredes/frasespared.png')} style={StyleSheet.absoluteFill} contentFit="fill" contentPosition="center" />

      <TabButtons onExit={() => navigation.navigate('main')} />

      <View style={styles.body}>

        {/* Carta */}
        <View style={styles.cartaWrap}>
          <Image source={require('./assets/frases/frases1.png')} style={styles.cartaImg} contentFit="contain" />
          {selected && (
            <View style={styles.fraseOverlayWrap}>
              <Text style={[styles.fraseLinea1, { color: COLORS[colorIdx] }]}>{selected.linea1}</Text>
              <Text style={[styles.fraseLinea2, { color: COLORS[colorIdx] }]}>{selected.linea2}</Text>
            </View>
          )}
        </View>

        {/* Botón confirmar — abajo izquierda */}
        {selected && (
          <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm}>
            <Text style={styles.btnConfirmLabel}>CONFIRMAR</Text>
          </TouchableOpacity>
        )}

        {/* Izquierda: hint + botón frase + círculo de color */}
        <View style={styles.botonesBox}>
          <Text style={styles.hintLabel}>✨ Frase al azar</Text>
          <Text style={styles.hintDesc}>{'¿Sin ideas? Toca para\nrecibir una frase.'}</Text>
          <TouchableOpacity style={styles.btnPill} onPress={pickRandom}>
            <Text style={styles.btnPillIcon}>✦</Text>
            <Text style={styles.btnPillLabel}>Sorpréndeme</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.colorCircle,
              { backgroundColor: COLORS[colorIdx] },
              !selected && styles.colorCircleDisabled,
            ]}
            onPress={() => setColorIdx(i => (i + 1) % COLORS.length)}
            disabled={!selected}
          />
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, marginTop: 55 },

  cartaWrap: {
    position: 'absolute',
    right: CARTA_RIGHT,
    top: CARTA_TOP,
    width: CARD_W,
    height: CARD_H,
  },
  cartaImg: { width: '100%', height: '100%' },
  fraseOverlayWrap: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  fraseLinea1: { fontFamily: 'Delius', fontSize: 22, color: '#333', textAlign: 'center' },
  fraseLinea2: { fontFamily: 'Delius', fontSize: 22, color: '#333', textAlign: 'center' },

  btnConfirm: {
    position: 'absolute',
    left: W * 0.5 - 29,
    top: 268,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7a5cf0',
    borderRadius: 5,
    paddingVertical: 1,
    paddingHorizontal: 5,
    shadowColor: '#7a5cf0',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 7,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  btnConfirmLabel: {
    fontFamily: 'Delius',
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  botonesBox: {
    position: 'absolute',
    left: 12,
    top: 30,
    alignItems: 'flex-start',
    width: W * 0.32,
  },
  hintLabel: {
    fontFamily: 'Delius',
    fontSize: 13,
    color: '#7a3050',
    fontWeight: '700',
    marginBottom: 3,
  },
  hintDesc: {
    fontFamily: 'Delius',
    fontSize: 10,
    color: '#9a6070',
    lineHeight: 15,
    marginBottom: 8,
  },
  btnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,96,122,0.9)',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    gap: 6,
    shadowColor: '#e8607a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  btnPillIcon: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnPillLabel: {
    color: '#fff',
    fontFamily: 'Delius',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  colorCircle: {
    marginTop: -50,
    marginRight: -290,
    alignSelf: 'flex-end',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCircleDisabled: { opacity: 0.3 },
});

export default FrasesExpandida;
