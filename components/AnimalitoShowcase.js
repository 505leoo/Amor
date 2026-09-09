import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';

export const ThemeMark = ({ tematica }) => {
  const palette = { Dulces: ['#f6a4bd', '#fff0c9'], Naturaleza: ['#75a76b', '#e5f0c9'], Aventuras: ['#5d91bd', '#e4f0fa'], Fantasía: ['#8969b4', '#eee3ff'], Frutas: ['#d69b28', '#fff2b8'] }[tematica.nombre] || ['#92775c', '#f6e7c8'];
  return <Svg width="24" height="24" viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10.5" fill={palette[1]} stroke={palette[0]} strokeWidth="1.5" />
    {tematica.nombre === 'Naturaleza' ? <><Path d="M12 19V9" fill="none" stroke={palette[0]} strokeWidth="1.5" strokeLinecap="round" /><Path d="M12 15C7 15 6 11 7 7c4 0 7 2 5 8m0-3c1-4 4-5 6-5 0 4-2 6-6 7" fill={palette[0]} /></>
      : tematica.nombre === 'Aventuras' ? <><Circle cx="12" cy="12" r="6" fill="none" stroke={palette[0]} strokeWidth="1.5" /><Path d="m12 7 1.5 5-1.5 5-1.5-5Z" fill={palette[0]} /><Path d="M12 4v2m0 12v2m8-8h-2M6 12H4" stroke={palette[0]} strokeWidth="1.2" strokeLinecap="round" /></>
        : tematica.nombre === 'Guardianes' ? <><Path d="M6.5 7 12 4.8 17.5 7v4.2c0 3.5-2.3 6.1-5.5 7.5-3.2-1.4-5.5-4-5.5-7.5Z" fill={palette[0]} /><Path d="m9.2 12 1.8 1.8 3.8-4" fill="none" stroke={palette[1]} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></>
          : tematica.nombre === 'Frutas' ? <><Path d="M8 15.5c4.8 1.5 8-2.1 8.7-6.6-2.8 2.4-5.2 2.8-8.8 1.2-1.2 2-1.1 3.9.1 5.4Z" fill={palette[0]} /><Path d="M16.4 9.2c.2-1 .8-1.8 1.7-2.3" fill="none" stroke={palette[0]} strokeWidth="1.4" strokeLinecap="round" /><Path d="M9 13.2c2.5.6 4.5-.3 5.9-2" fill="none" stroke={palette[1]} strokeWidth="1" strokeLinecap="round" /></>
        : tematica.nombre?.toLowerCase().startsWith('fant') ? <><Path d="M8 8 6.5 5.5 10 7m6 1 1.5-2.5L14 7" fill={palette[0]} /><Circle cx="12" cy="13" r="6" fill={palette[0]} /><Circle cx="9.5" cy="12" r="1" fill={palette[1]} /><Circle cx="14.5" cy="12" r="1" fill={palette[1]} /><Path d="M9 15c1.8 1.5 4.2 1.5 6 0" fill="none" stroke={palette[1]} strokeWidth="1.2" strokeLinecap="round" /></>
          : <><Circle cx="11" cy="10" r="4" fill={palette[0]} /><Path d="M14 13 18 19" stroke={palette[0]} strokeWidth="1.8" strokeLinecap="round" /><Path d="M9 8.5c1 .8 2 .8 3 0m-3 3c1 .8 2 .8 3 0" fill="none" stroke={palette[1]} strokeWidth=".8" strokeLinecap="round" /><Circle cx="9.5" cy="9" r=".7" fill={palette[1]} /></>}
  </Svg>;
};

// A scene on the room background, not a dialog: only the information has cards.
export default function AnimalitoShowcase({ animal, skins, tema, estado, necesarias, costo, puedeMejorar, mejorando, confirmar, equipado, skinEquipada, equipando, desbloqueado = false, onEquipar, onMejorar, onCartas, tematicas = [], onVerTematica, children }) {
  const [skinId, setSkinId] = useState(skinEquipada);
  const [width, setWidth] = useState(700);
  const index = Math.max(0, skins.findIndex(skin => skin.storageId === skinId));
  const skin = skins[index];
  const cambiar = delta => setSkinId(skins[(index + delta + skins.length) % skins.length].storageId);
  const usando = equipado && skin?.storageId === skinEquipada;
  const compacto = width < 520;
  const progreso = Math.min(100, estado.totalCartas / necesarias * 100);
  return <View style={s.root} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={s.content}>
    <View style={[s.scene, compacto && s.sceneCompact]}>
      <View style={[s.infoColumn, compacto && s.infoColumnCompact]}>
      <View style={[s.info, compacto && s.infoCompact]}>
        <Text style={[s.eyebrow, { color: tema.texto }]}>TU COMPAÑERO</Text>
        <Text style={s.name}>{animal.nombre}</Text>
        <View style={[s.rarity, { backgroundColor: tema.fondo }]}><View style={[s.dot, { backgroundColor: tema.acento }]} /><Text style={[s.rarityText, { color: tema.texto }]}>{animal.rareza}</Text></View>
        <Text style={s.ability}>{animal.habilidad}</Text>
        <Text style={s.description}>{animal.habilidadTexto || 'Un compañero especial que crece con tus cuidados.'}</Text>
      </View>
    {tematicas.length > 0 && <View style={s.tematicasMini}><View style={s.tematicasMiniLista}>{tematicas.map(tematica => <TouchableOpacity key={tematica.nombre} onPress={() => onVerTematica?.(tematica.nombre)} accessibilityLabel={`Ver temática ${tematica.nombre}`} style={[s.tematicaMiniBoton, { borderColor: tematica.color || tema.acento }]} activeOpacity={0.8}><ThemeMark tematica={tematica} /></TouchableOpacity>)}</View></View>}
      </View>
      <View style={[s.stage, compacto && s.stageCompact]}>
        <View pointerEvents="none" style={[s.ground, { backgroundColor: tema.acento }]} />
        {skins.length > 1 && [-1, 1].map(side => {
          const neighbor = skins[(index + side + skins.length) % skins.length];
          return <View key={side} style={[s.wing, side < 0 ? s.wingLeft : s.wingRight]}>
            <View pointerEvents="none" style={[s.stackBack, { backgroundColor: tema.fondo, transform: [{ rotate: `${side * 12}deg` }] }]} />
            <TouchableOpacity onPress={() => cambiar(side)} hitSlop={{ top: 28, bottom: 28, left: 28, right: 28 }} accessibilityLabel={`Ver traje ${neighbor.nombre}`} style={s.skinCardHitbox}>
              <View style={[s.skinCard, { backgroundColor: neighbor.fondoRareza || tema.fondo, transform: [{ rotate: `${side * 6}deg` }] }]}>
                <Image source={neighbor.imagen} style={s.sideImage} contentFit="contain" />
                <MaterialIcons name={neighbor.bloqueado ? 'lock-outline' : 'checkroom'} size={12} color="#756754" />
              </View>
            </TouchableOpacity>
          </View>;
        })}
        <Image key={skin?.id || animal.id} source={skin?.imagen || animal.imagen} style={s.hero} contentFit="contain" transition={180} pointerEvents="none" />
        <View style={s.skinCaption}><Text style={s.skinName}>{skin?.nombre || 'Original'}</Text><Text style={s.skinCount}>{skin?.bloqueado ? 'POR DESBLOQUEAR · ' : ''}{index + 1} / {skins.length || 1}</Text></View>
      </View>
      <View style={[s.progressColumn, compacto && s.progressColumnCompact]}>
      <View style={[s.progressCard, compacto && s.infoCompact]}>
        <Text style={s.eyebrow}>SIGUE CRECIENDO</Text>
        <View style={s.levelRow}><Text style={s.level}>Nivel {estado.nivel}</Text><Text style={s.next}>→ {estado.nivel + 1}</Text></View>
        <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: necesarias, now: Math.min(estado.totalCartas, necesarias) }} accessibilityLabel="Cartas para subir de nivel"><LinearGradient colors={[tema.acento, tema.texto]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fill, { width: `${progreso}%` }]} /></View>
        <Text style={s.cards}>{estado.totalCartas} / {necesarias} cartas</Text>
        <TouchableOpacity onPress={onMejorar} disabled={!puedeMejorar || mejorando} style={[s.upgrade, { backgroundColor: tema.acento }, (!puedeMejorar || mejorando) && s.disabled]}><Text style={s.buttonText}>{mejorando ? 'Mejorando…' : confirmar ? `Confirmar · ${costo} monedas` : 'Subir de nivel'}</Text></TouchableOpacity>
        <Text style={s.cost}>{costo} monedas por mejora</Text>
        <TouchableOpacity onPress={onCartas} hitSlop={5}><Text style={[s.link, { color: tema.texto }]}>Conseguir cartas ↗</Text></TouchableOpacity>
      </View>
      <View style={s.rewardsInProgress}>{children}</View>
      </View>
    </View>
    <View style={s.equipArea}>
      <TouchableOpacity onPress={() => onEquipar(skin)} disabled={!desbloqueado || !skin || skin.bloqueado || usando || equipando} style={[s.equip, { backgroundColor: tema.texto }, (!desbloqueado || skin?.bloqueado || usando || equipando) && s.disabled]}>
        <MaterialIcons name={!desbloqueado || skin?.bloqueado ? 'lock-outline' : usando ? 'check' : 'pets'} size={15} color="#fffaf1" /><Text style={s.buttonText}>{equipando ? 'Equipando…' : !desbloqueado ? 'Animalito bloqueado' : skin?.bloqueado ? 'Traje bloqueado' : usando ? 'Equipado' : 'Equipar compañero'}</Text>
      </TouchableOpacity>
    </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, width: '100%' }, content: { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 12 },
  scene: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 18 }, sceneCompact: { flexWrap: 'wrap', gap: 10 },
  infoColumn: { width: '23%', maxWidth: 200, alignItems: 'stretch' }, infoColumnCompact: { width: '46%', maxWidth: undefined }, info: { width: '100%', padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,250,239,0.88)' }, infoCompact: { width: '100%', maxWidth: undefined },
  eyebrow: { color: '#93816e', fontSize: 7, fontWeight: '800', letterSpacing: 1 }, name: { fontFamily: 'Delius', fontSize: 24, color: '#493d35', marginTop: 5, fontWeight: '900' },
  rarity: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 7 }, dot: { width: 5, height: 5, borderRadius: 3 }, rarityText: { fontSize: 9, fontWeight: '800' },
  ability: { fontFamily: 'Delius', fontSize: 11, color: '#635144', marginTop: 15, fontWeight: '800' }, description: { fontFamily: 'Delius', color: '#8a7564', fontSize: 10, lineHeight: 15, marginTop: 5 },
  stage: { width: '44%', height: 210, alignItems: 'center', justifyContent: 'center' }, stageCompact: { width: '100%', height: 210 },
  ground: { position: 'absolute', bottom: 35, width: '60%', height: 16, borderRadius: 100, opacity: 0.16 },
  hero: { width: '70%', height: 172, zIndex: 3 }, wing: { position: 'absolute', top: 48, width: '26%', height: 108 }, wingLeft: { left: '7%' }, wingRight: { right: '7%' },
  stackBack: { position: 'absolute', width: '100%', height: '90%', top: -7, borderRadius: 8, opacity: 0.4 }, skinCardHitbox: { flex: 1 }, skinCard: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: 0.78 }, sideImage: { width: '120%', height: 82 },
  arrow: { position: 'absolute', top: 87, width: 30, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,239,0.9)', borderRadius: 10, zIndex: 5 }, arrowLeft: { left: -7 }, arrowRight: { right: -7 },
  skinCaption: { position: 'absolute', bottom: 0, alignItems: 'center', zIndex: 4 }, skinName: { fontFamily: 'Delius', color: '#584636', fontSize: 11, fontWeight: '800' }, skinCount: { color: '#8f7863', fontSize: 7, marginTop: 3, letterSpacing: 1 },
  progressColumn: { width: '23%', maxWidth: 200, alignItems: 'stretch' }, progressColumnCompact: { width: '46%', maxWidth: undefined }, progressCard: { width: '100%', padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,250,239,0.88)' }, rewardsInProgress: { width: '100%', alignItems: 'center' }, levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }, level: { fontFamily: 'Delius', color: '#493d35', fontSize: 18, fontWeight: '900' }, next: { color: '#ac9982', fontSize: 12 },
  track: { height: 8, backgroundColor: '#e6ddce', borderRadius: 4, overflow: 'hidden', marginTop: 12 }, fill: { height: '100%', borderRadius: 4 }, cards: { color: '#88715d', fontSize: 9, marginTop: 5 },
  upgrade: { marginTop: 12, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center' }, buttonText: { fontFamily: 'Delius', fontSize: 10, fontWeight: '800', color: '#fffaf1', textAlign: 'center' }, cost: { textAlign: 'center', color: '#a08b75', fontSize: 7, marginTop: 5 }, link: { fontSize: 9, textAlign: 'center', marginTop: 12 }, disabled: { opacity: 0.5 },
  equipArea: { alignItems: 'center', marginTop: 12 }, equip: { flexDirection: 'row', gap: 8, paddingHorizontal: 23, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }, rewards: { width: '86%', maxWidth: 570, alignSelf: 'center', marginTop: 18 },
  tematicasMini: { marginTop: 2, alignItems: 'center' }, tematicasMiniLista: { flexDirection: 'row', gap: 7 }, tematicaMiniBoton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#fff6df', borderWidth: 1.2 }, tematicaMiniIcono: { fontSize: 17 },
});
