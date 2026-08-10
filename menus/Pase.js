import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import TabButtons from '../components/TabButtons';
import Visual1, { Camino } from '../components/Visuales/Visual1';

const NODE_W = 96;
const NODE_H = 96;
const COL_W = 172;
const TRACK_H = 360;
const PATH_Y = TRACK_H - 118;
const getX = (i) => 90 + i * COL_W;
const getY = () => PATH_Y;

const MILESTONES = [
  { count: 10, reward: 75, label: 'Amanecer' },
  { count: 20, reward: 120, label: 'Brisa' },
  { count: 30, reward: 160, label: 'Rayo' },
  { count: 40, reward: 210, label: 'Sol' },
  { count: 50, reward: 260, label: 'Oro' },
  { count: 60, reward: 320, label: 'Luz' },
  { count: 70, reward: 380, label: 'Alba' },
  { count: 80, reward: 450, label: 'Día' },
  { count: 90, reward: 520, label: 'Gloria' },
  { count: 100, reward: 600, label: 'Aurora' },
  { count: 200, reward: 900, label: 'Cielo' },
  { count: 400, reward: 1400, label: 'Luna' },
  { count: 600, reward: 1900, label: 'Eterno' },
  { count: 800, reward: 2400, label: 'Fénix' },
  { count: 1000, reward: 3000, label: 'Dorado' },
];

const Nodo = ({ milestone, index, completado, bloqueado }) => {
  const x = getX(index);
  const y = getY(index);
  const num = index + 1;
  const bgColor = completado ? '#ffcf55' : bloqueado ? '#6c5738' : '#c9748f';
  const ringColor = completado ? '#ffe08a' : bloqueado ? '#8d7451' : '#f5c3d7';
  const shadowColor = completado ? '#ffd970' : bloqueado ? '#504028' : '#e89cb7';

  return (
    <View style={[n.wrap, { left: x - NODE_W / 2, top: y - NODE_H / 2, zIndex: 10 }]}>
      <Svg width={NODE_W} height={NODE_H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={NODE_W / 2} cy={NODE_H / 2} r={42} fill="rgba(0,0,0,0.18)" />
        <Circle cx={NODE_W / 2} cy={NODE_H / 2} r={38} fill={bgColor} opacity={0.26} />
        <Circle cx={NODE_W / 2} cy={NODE_H / 2} r={34} stroke={ringColor} strokeWidth={3} fill="none" strokeDasharray={completado ? '0' : '6 5'} />
        <Circle cx={NODE_W / 2} cy={NODE_H / 2} r={28} fill="rgba(255,255,255,0.12)" />
      </Svg>

      <View style={[n.circulo, { backgroundColor: bgColor, shadowColor }]}>
        {completado ? (
          <MaterialIcons name="check" size={24} color="#fff" />
        ) : bloqueado ? (
          <MaterialIcons name="lock" size={18} color="#f8e7b6" />
        ) : (
          <MaterialIcons name="emoji-events" size={21} color="#fff" />
        )}
      </View>

      <View style={[n.badge, { backgroundColor: bloqueado ? '#504028' : '#5a2a3a' }]}>
        <Text style={n.badgeText}>{num}</Text>
      </View>

      <View style={n.label}>
        <Text style={n.labelText} numberOfLines={1}>{milestone.count} trofeos</Text>
        <Text style={n.rewardText}>+{milestone.reward} 💎</Text>
        <Text style={n.subLabel}>{milestone.label}</Text>
      </View>
    </View>
  );
};

const n = StyleSheet.create({
  wrap: { position: 'absolute', width: NODE_W, height: NODE_H, alignItems: 'center', justifyContent: 'center' },
  circulo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  badge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  label: {
    position: 'absolute',
    bottom: -24,
    alignItems: 'center',
    width: 110,
  },
  labelText: { fontSize: 8.8, color: '#fff', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  rewardText: { fontSize: 7.2, color: '#ffe27a', fontWeight: '700', marginTop: 1 },
  subLabel: { fontSize: 7, color: 'rgba(255,255,255,0.74)', marginTop: 1 },
});

const Pase = ({ navigation }) => {
  const total = MILESTONES.length;
  const totalW = 90 + total * COL_W + 110;
  const currentCount = 74;

  return (
    <View style={s.root}>
      <StatusBar hidden />

      <View style={s.overlay} />

      <TabButtons
        onExit={() => navigation?.navigate('main')}
        userMoney={0}
      />

      <View style={s.header}>
        <Text style={s.titulo}>Pase de Temporada</Text>
        <Text style={s.subtitulo}>Amanecer Dorado · Recompensas cada 10 hasta 100 y luego cada 200</Text>
      </View>

      <View style={s.summary}>
        <Text style={s.summaryLabel}>Progreso actual</Text>
        <Text style={s.summaryValue}>{currentCount} trofeos</Text>
        <Text style={s.summaryHint}>Siguiente gran recompensa: 100 trofeos</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { width: totalW }]}
        style={s.scrollView}
      >
        <Visual1 totalW={totalW} />
        <Camino total={total} totalW={totalW} />

        {MILESTONES.map((milestone, i) => (
          <Nodo
            key={milestone.count}
            milestone={milestone}
            index={i}
            completado={milestone.count <= currentCount}
            bloqueado={milestone.count > currentCount + 20}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffe6a3' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(180,80,10,0.10)' },
  header: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff9e7',
    letterSpacing: 1.8,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitulo: {
    fontSize: 10,
    color: 'rgba(255,248,225,0.72)',
    letterSpacing: 1,
    marginTop: 3,
  },
  summary: {
    position: 'absolute',
    top: 52,
    left: 18,
    zIndex: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(12, 10, 7, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  summaryLabel: { fontSize: 9, color: 'rgba(255,244,214,0.72)', letterSpacing: 1.1, textTransform: 'uppercase' },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#fff7d8', marginTop: 2 },
  summaryHint: { fontSize: 9.5, color: '#ffd779', marginTop: 2 },
  scrollView: {
    flex: 1,
    marginTop: 52,
  },
  scroll: {
    height: TRACK_H + 90,
    position: 'relative',
  },
});

export default Pase;
