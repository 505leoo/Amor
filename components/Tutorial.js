import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const PASOS = [
  { icon: 'card-giftcard', titulo: 'Tu primer regalo', texto: 'Reclamá tu regalo diario. Hoy Menta preparó una sorpresa para vos.' },
  { icon: 'checkroom', titulo: 'Elegí tu animalito', texto: 'Entrá a Cambiar y equipá el animalito que acabás de recibir.' },
  { icon: 'assignment', titulo: 'Una misión sencilla', texto: 'Abrí Misiones y reclamá la misión de iniciar sesión.' },
  { icon: 'storefront', titulo: 'Una visita al Comerciante', texto: 'Usá tus monedas para comprar la oferta especial del tutorial.' },
  { icon: 'inventory-2', titulo: 'Tu inventario', texto: 'Entrá al Inventario para conocer lo que tenés guardado.' },
  { icon: 'trending-up', titulo: 'Hacé crecer a Halcón', texto: 'Volvé a Cambiar y mejorá a Halcón usando tus cartas universales y monedas.' },
  { icon: 'star', titulo: 'Tu aventura recién empieza', texto: 'Ya aprendiste lo básico de Amor. Ahora podés continuar tu aventura y descubrir todo lo que preparamos para vos.' },
];

export default function Tutorial({ visible = false, onFinish }) {
  const [datos, setDatos] = useState(null);
  const [modalVisible, setModalVisible] = useState(true);
  const [pasoMostrado, setPasoMostrado] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid), snap => setDatos(snap.data() || {}), () => {});
  }, [visible]);

  const paso = Math.min(Number(datos?.tutorialPaso || 0), PASOS.length - 1);
  const actual = PASOS[Math.min(paso, PASOS.length - 1)];
  useEffect(() => {
    if (datos && pasoMostrado === null) {
      setPasoMostrado(paso);
      setModalVisible(true);
    } else if (datos && paso > pasoMostrado) {
      setPasoMostrado(paso);
      // El overlay de recompensa ya se cerró antes de avanzar el paso.
      // Abrimos inmediatamente el siguiente modal: si lo hacíamos mediante
      // un timer, el cleanup de este mismo efecto lo cancelaba al actualizar
      // `pasoMostrado`.
      setModalVisible(true);
    }
    if (datos?.tutorial === 'no' && Number(datos?.tutorialPaso || 0) >= PASOS.length) onFinish?.();
  }, [datos, paso, pasoMostrado, onFinish]);

  useEffect(() => {
    if (!visible || !modalVisible) return;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  }, [visible, modalVisible, paso, fadeAnim]);

  if (!visible || !actual) return null;
  if (!modalVisible) return <StatusBar hidden translucent />;
  return (
      <View style={s.overlay}>
        <StatusBar hidden translucent />
        <Animated.View style={[s.card, { opacity: fadeAnim }]}>
          <View style={s.icon}><MaterialIcons name={actual.icon} size={31} color="#fff8dc" /></View>
          <Text style={s.kicker}>TUTORIAL BREVE · {paso + 1}/{PASOS.length}</Text>
          <Text style={s.title}>{actual.titulo}</Text>
          <Text style={s.text}>{actual.texto}</Text>
          <View style={s.dots}>{PASOS.map((item, index) => <View key={item.titulo} style={[s.dot, index === paso && s.dotActive]} />)}</View>
          <Text style={s.hint}>Completá la acción indicada para continuar.</Text>
          <TouchableOpacity style={s.actionButton} onPress={() => {
            if (paso >= PASOS.length - 1) onFinish?.();
            else setModalVisible(false);
          }} activeOpacity={0.8}>
            <Text style={s.action}>{paso >= PASOS.length - 1 ? 'Finalizar tutorial' : 'Continuar'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
  );
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(255,245,231,0.78)', zIndex: 999, elevation: 999 },
  card: { width: '100%', maxWidth: 330, height: 270, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#fff5dd', borderWidth: 2, borderColor: '#d4b06c' },
  icon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#a87840' },
  kicker: { marginTop: 8, color: '#b17d40', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  title: { marginTop: 5, color: '#704b2d', fontSize: 21, fontWeight: '900', textAlign: 'center' },
  text: { marginTop: 6, color: '#795a38', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#dfc9a0' },
  dotActive: { width: 16, backgroundColor: '#a87840' },
  hint: { marginTop: 8, color: '#a48662', fontSize: 9, fontWeight: '700' },
  action: { marginTop: 10, color: '#a45f76', fontSize: 11, fontWeight: '900' },
  actionButton: { minWidth: 120, marginTop: 3, paddingVertical: 8, paddingHorizontal: 22, alignItems: 'center', borderRadius: 18, backgroundColor: '#f2dce3', borderWidth: 1, borderColor: '#d9a9b8' },
});

export const actualizarPasoTutorial = (uid, paso) => uid ? setDoc(doc(db, 'usuarios', uid), { tutorialPaso: paso }, { merge: true }) : Promise.resolve();
