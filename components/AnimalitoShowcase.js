import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// A scene on the room background, not a dialog: only the information has cards.
export default function AnimalitoShowcase({ animal, skins, tema, estado, necesarias, costo, puedeMejorar, mejorando, confirmar, equipado, skinEquipada, equipando, onEquipar, onMejorar, onCartas, children }) {
  const [skinId, setSkinId] = useState(skinEquipada);
  const [width, setWidth] = useState(700);
  const index = Math.max(0, skins.findIndex(skin => skin.storageId === skinId));
  const skin = skins[index];
  const cambiar = delta => setSkinId(skins[(index + delta + skins.length) % skins.length].storageId);
  const usando = equipado && skin?.storageId === skinEquipada;
  const compacto = width < 520;
  const progreso = Math.min(100, estado.totalCartas / necesarias * 100);
  return <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={[s.scene, compacto && s.sceneCompact]}>
      <View style={[s.info, compacto && s.infoCompact]}>
        <Text style={[s.eyebrow, { color: tema.texto }]}>TU COMPAÑERO</Text>
        <Text style={s.name}>{animal.nombre}</Text>
        <View style={[s.rarity, { backgroundColor: tema.fondo }]}><View style={[s.dot, { backgroundColor: tema.acento }]} /><Text style={[s.rarityText, { color: tema.texto }]}>{animal.rareza}</Text></View>
        <Text style={s.ability}>{animal.habilidad}</Text>
        <Text style={s.description}>{animal.habilidadTexto || 'Un compañero especial que crece con tus cuidados.'}</Text>
      </View>
      <View style={[s.stage, compacto && s.stageCompact]}>
        <View pointerEvents="none" style={[s.ground, { backgroundColor: tema.acento }]} />
        {skins.length > 1 && [-1, 1].map(side => {
          const neighbor = skins[(index + side + skins.length) % skins.length];
          return <View key={side} style={[s.wing, side < 0 ? s.wingLeft : s.wingRight]}>
            <View pointerEvents="none" style={[s.stackBack, { backgroundColor: tema.fondo, transform: [{ rotate: `${side * 12}deg` }] }]} />
            <TouchableOpacity onPress={() => cambiar(side)} accessibilityLabel={`Ver traje ${neighbor.nombre}`} style={[s.skinCard, { backgroundColor: neighbor.fondoRareza || tema.fondo, transform: [{ rotate: `${side * 6}deg` }] }]}>
              <Image source={neighbor.imagen} style={s.sideImage} contentFit="contain" />
              <MaterialIcons name={neighbor.bloqueado ? 'lock-outline' : 'checkroom'} size={12} color="#756754" />
            </TouchableOpacity>
          </View>;
        })}
        <Image key={skin?.id || animal.id} source={skin?.imagen || animal.imagen} style={s.hero} contentFit="contain" transition={180} />
        {skins.length > 1 && [-1, 1].map(side => <TouchableOpacity key={side} onPress={() => cambiar(side)} accessibilityLabel={side < 0 ? 'Traje anterior' : 'Traje siguiente'} style={[s.arrow, side < 0 ? s.arrowLeft : s.arrowRight]} hitSlop={6}><MaterialIcons name={side < 0 ? 'chevron-left' : 'chevron-right'} size={24} color={tema.texto} /></TouchableOpacity>)}
        <View style={s.skinCaption}><Text style={s.skinName}>{skin?.nombre || 'Original'}</Text><Text style={s.skinCount}>{skin?.bloqueado ? 'POR DESBLOQUEAR · ' : ''}{index + 1} / {skins.length || 1}</Text></View>
      </View>
      <View style={[s.progressCard, compacto && s.infoCompact]}>
        <Text style={s.eyebrow}>SIGUE CRECIENDO</Text>
        <View style={s.levelRow}><Text style={s.level}>Nivel {estado.nivel}</Text><Text style={s.next}>→ {estado.nivel + 1}</Text></View>
        <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: necesarias, now: Math.min(estado.totalCartas, necesarias) }} accessibilityLabel="Cartas para subir de nivel"><LinearGradient colors={[tema.acento, tema.texto]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fill, { width: `${progreso}%` }]} /></View>
        <Text style={s.cards}>{estado.totalCartas} / {necesarias} cartas</Text>
        <TouchableOpacity onPress={onMejorar} disabled={!puedeMejorar || mejorando} style={[s.upgrade, { backgroundColor: tema.acento }, (!puedeMejorar || mejorando) && s.disabled]}><Text style={s.buttonText}>{mejorando ? 'Mejorando…' : confirmar ? `Confirmar · ${costo} monedas` : 'Subir de nivel'}</Text></TouchableOpacity>
        <Text style={s.cost}>{costo} monedas por mejora</Text>
        <TouchableOpacity onPress={onCartas} hitSlop={5}><Text style={[s.link, { color: tema.texto }]}>Conseguir cartas ↗</Text></TouchableOpacity>
      </View>
    </View>
    <View style={s.equipArea}>
      <TouchableOpacity onPress={() => onEquipar(skin)} disabled={!skin || skin.bloqueado || usando || equipando} style={[s.equip, { backgroundColor: tema.texto }, (skin?.bloqueado || usando || equipando) && s.disabled]}>
        <MaterialIcons name={skin?.bloqueado ? 'lock-outline' : usando ? 'check' : 'pets'} size={15} color="#fffaf1" /><Text style={s.buttonText}>{equipando ? 'Equipando…' : skin?.bloqueado ? 'Traje bloqueado' : usando ? 'Equipado' : 'Equipar compañero'}</Text>
      </TouchableOpacity>
    </View>
    <View style={s.rewards}>{children}</View>
  </ScrollView>;
}

const s = StyleSheet.create({
  root: { flex: 1, width: '100%' }, content: { paddingHorizontal: 8, paddingBottom: 12 },
  scene: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 }, sceneCompact: { flexWrap: 'wrap', gap: 10 },
  info: { width: '23%', maxWidth: 200, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,250,239,0.88)' }, infoCompact: { width: '46%', maxWidth: undefined },
  eyebrow: { color: '#93816e', fontSize: 7, fontWeight: '800', letterSpacing: 1 }, name: { fontFamily: 'Delius', fontSize: 24, color: '#493d35', marginTop: 5, fontWeight: '900' },
  rarity: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 7 }, dot: { width: 5, height: 5, borderRadius: 3 }, rarityText: { fontSize: 9, fontWeight: '800' },
  ability: { fontFamily: 'Delius', fontSize: 11, color: '#635144', marginTop: 15, fontWeight: '800' }, description: { fontFamily: 'Delius', color: '#8a7564', fontSize: 10, lineHeight: 15, marginTop: 5 },
  stage: { width: '44%', height: 210, alignItems: 'center', justifyContent: 'center' }, stageCompact: { width: '100%', height: 210 },
  ground: { position: 'absolute', bottom: 35, width: '60%', height: 16, borderRadius: 100, opacity: 0.16 },
  hero: { width: '78%', height: 190, zIndex: 3 }, wing: { position: 'absolute', top: 48, width: '26%', height: 108 }, wingLeft: { left: '7%' }, wingRight: { right: '7%' },
  stackBack: { position: 'absolute', width: '100%', height: '90%', top: -7, borderRadius: 8, opacity: 0.4 }, skinCard: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: 0.78 }, sideImage: { width: '120%', height: 82 },
  arrow: { position: 'absolute', top: 87, width: 30, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,239,0.9)', borderRadius: 10, zIndex: 5 }, arrowLeft: { left: -7 }, arrowRight: { right: -7 },
  skinCaption: { position: 'absolute', bottom: 0, alignItems: 'center', zIndex: 4 }, skinName: { fontFamily: 'Delius', color: '#584636', fontSize: 11, fontWeight: '800' }, skinCount: { color: '#8f7863', fontSize: 7, marginTop: 3, letterSpacing: 1 },
  progressCard: { width: '23%', maxWidth: 200, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,250,239,0.88)' }, levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }, level: { fontFamily: 'Delius', color: '#493d35', fontSize: 18, fontWeight: '900' }, next: { color: '#ac9982', fontSize: 12 },
  track: { height: 8, backgroundColor: '#e6ddce', borderRadius: 4, overflow: 'hidden', marginTop: 12 }, fill: { height: '100%', borderRadius: 4 }, cards: { color: '#88715d', fontSize: 9, marginTop: 5 },
  upgrade: { marginTop: 12, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center' }, buttonText: { fontFamily: 'Delius', fontSize: 10, fontWeight: '800', color: '#fffaf1', textAlign: 'center' }, cost: { textAlign: 'center', color: '#a08b75', fontSize: 7, marginTop: 5 }, link: { fontSize: 9, textAlign: 'center', marginTop: 12 }, disabled: { opacity: 0.5 },
  equipArea: { alignItems: 'center', marginTop: 12 }, equip: { flexDirection: 'row', gap: 8, paddingHorizontal: 23, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }, rewards: { width: '86%', maxWidth: 570, alignSelf: 'center', marginTop: 18 },
});
