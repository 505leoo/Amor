import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, PanResponder } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const RECURSOS = [
  { key: 'dinero', titulo: 'Monedas', descripcion: 'Tu saldo para comprar objetos y sorpresas en el Comerciante.', icono: 'monetization-on', color: '#c58b2d', fondo: '#f4e5bb' },
  { key: 'diamantes', titulo: 'Diamantes', descripcion: 'Brillan un poquito más cada vez que los guardás para algo especial.', icono: 'diamond', color: '#4d9bb0', fondo: '#d8eff0' },
  { key: 'chicles', titulo: 'Chicles', descripcion: 'Usalos para avanzar en los eventos y completar sus caminos.', icono: 'bubble-chart', color: '#c46d83', fondo: '#f3dce4' },
  { key: 'globos', titulo: 'Globos', descripcion: 'Pequeños premios de eventos, listos para acompañar tus momentos.', icono: 'celebration', color: '#a85f67', fondo: '#f2d9d5' },
];

export const InventarioModal = ({ visible, onClose }) => {
  const [recurso, setRecurso] = useState({ dinero: 0, diamantes: 0, chicles: 0, globos: 0 });
  const [pagina, setPagina] = useState(0);
  const touchStart = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!visible || !uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', uid), snap => {
      const data = snap.data() || {};
      setRecurso({
        dinero: data.dinero ?? data.monedas ?? 0,
        diamantes: data.diamantes ?? data.diamante ?? 0,
        chicles: data.chicles ?? 0,
        globos: data.globos ?? 0,
      });
    }, () => {});
  }, [visible]);

  useEffect(() => {
    if (!visible) setPagina(0);
  }, [visible]);

  const cambiarPagina = direccion => {
    setPagina(actual => Math.max(0, Math.min(RECURSOS.length - 1, actual + direccion)));
  };

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: event => { touchStart.current = event.nativeEvent.pageY; },
    onPanResponderRelease: event => {
      const distancia = event.nativeEvent.pageY - touchStart.current;
      if (Math.abs(distancia) < 18) return;
      cambiarPagina(distancia < 0 ? 1 : -1);
    },
  }).panHandlers;

  const actual = RECURSOS[pagina];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card} {...responder}>
          <View style={s.header}>
            <View>
              <Text style={s.kicker}>MIS RECURSOS</Text>
              <Text style={s.title}>Inventario</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.close} hitSlop={8}>
              <MaterialIcons name="close" size={17} color="#76552f" />
            </TouchableOpacity>
          </View>

          <View style={s.body}>
            <View style={[s.resourceIcon, { backgroundColor: actual.fondo, borderColor: `${actual.color}55` }]}>
              <MaterialIcons name={actual.icono} size={42} color={actual.color} />
            </View>
            <Text style={[s.resourceTitle, { color: actual.color }]}>{actual.titulo}</Text>
            <Text style={s.amount}>{Number(recurso[actual.key] || 0).toLocaleString('es-MX')}</Text>
            <Text style={s.description}>{actual.descripcion}</Text>
            <Text style={s.hint}>Deslizá hacia arriba o abajo para ver otro recurso</Text>
          </View>

          <View style={s.footer}>
            <TouchableOpacity onPress={() => cambiarPagina(-1)} disabled={pagina === 0} hitSlop={8}>
              <MaterialIcons name="keyboard-arrow-up" size={20} color={pagina === 0 ? '#cdbfa9' : '#76552f'} />
            </TouchableOpacity>
            <View style={s.dots}>{RECURSOS.map((item, index) => <View key={item.key} style={[s.dot, index === pagina && { backgroundColor: actual.color, width: 14 }]} />)}</View>
            <TouchableOpacity onPress={() => cambiarPagina(1)} disabled={pagina === RECURSOS.length - 1} hitSlop={8}>
              <MaterialIcons name="keyboard-arrow-down" size={20} color={pagina === RECURSOS.length - 1 ? '#cdbfa9' : '#76552f'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(35,24,18,0.68)' },
  card: { width: 286, minHeight: 302, overflow: 'hidden', borderRadius: 17, backgroundColor: '#fff5dd', borderWidth: 2, borderColor: '#d4b06c', shadowColor: '#2e1c10', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.4, shadowRadius: 13, elevation: 22 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, backgroundColor: '#f0dcae', borderBottomWidth: 1, borderBottomColor: '#d3af6b' },
  kicker: { color: '#a87840', fontFamily: 'Delius', fontSize: 6.5, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 1, color: '#704b2d', fontFamily: 'Delius', fontSize: 16, fontWeight: '900' },
  close: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(255,249,231,0.72)', borderWidth: 1, borderColor: '#d7b977' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 13 },
  resourceIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 21, borderWidth: 1.5 },
  resourceTitle: { marginTop: 7, fontFamily: 'Delius', fontSize: 13, fontWeight: '900' },
  amount: { marginTop: 1, color: '#6d523b', fontFamily: 'Delius', fontSize: 25, fontWeight: '900' },
  description: { marginTop: 6, color: '#876b4b', fontFamily: 'Delius', fontSize: 8.5, lineHeight: 11, fontWeight: '700', textAlign: 'center' },
  hint: { marginTop: 10, color: '#b3956e', fontFamily: 'Delius', fontSize: 6.5, textAlign: 'center' },
  footer: { height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, borderTopWidth: 1, borderTopColor: '#ead5aa' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d8c3a0' },
});

export default InventarioModal;
