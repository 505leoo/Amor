import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, deleteField, doc, onSnapshot, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import TabButtons from '../components/TabButtons';
import Player, { SinAnimal } from '../Player';
import { ANIMALITOS, ANIMALITOS_POR_ID, SKINS_POR_ANIMAL } from '../data/animalitos';

const ICONO_DEFAULT = require('../assets/inicio/iconos/icono1.jpg');

const GAME_DETAILS = {
  conexiones: { nombre: 'Hilito', icono: 'all-inclusive', color: '#8064ee' },
};

const FRAME_OPTIONS = [
  { id: 'corazon', nombre: 'Corazón de Amor', precio: 0, colors: ['#ffb2c2', '#c94f6b', '#8c3049'], icon: 'favorite' },
  { id: 'bosque', nombre: 'Bosque Vivo', precio: 2000, colors: ['#b8d98c', '#5c9367', '#315d49'], icon: 'eco' },
  { id: 'noche', nombre: 'Noche Compartida', precio: 4000, colors: ['#9d8bd4', '#485d9a', '#262f67'], icon: 'dark-mode' },
  { id: 'aurora', nombre: 'Aurora de Cristal', precio: 6000, colors: ['#bdf7ec', '#54b9c6', '#8b63c8'], icon: 'diamond' },
  { id: 'jardin', nombre: 'Jardín Encantado', precio: 8000, colors: ['#ffd0db', '#d86d96', '#7f3c6e'], icon: 'local-florist' },
  { id: 'marea', nombre: 'Marea de Nácar', precio: 10000, colors: ['#d8fbff', '#4ca7c8', '#245679'], icon: 'water-drop' },
  { id: 'sakura', nombre: 'Cerezos al Viento', precio: 12500, colors: ['#ffe9ee', '#e995ad', '#9a617e'], icon: 'filter-vintage', tag: 'ESPECIAL' },
  { id: 'llama', nombre: 'Llama del Destino', precio: 15000, colors: ['#ffd67a', '#ed6d32', '#8d271f'], icon: 'local-fire-department', tag: 'ÉPICO' },
  { id: 'esmeralda', nombre: 'Corona Esmeralda', precio: 18000, colors: ['#c9f5c8', '#2e9a70', '#155044'], icon: 'shield', tag: 'ÉPICO' },
  { id: 'lavanda', nombre: 'Sueño de Lavanda', precio: 22000, colors: ['#ead9ff', '#9a70cc', '#57417e'], icon: 'auto-awesome', tag: 'MÍTICO' },
  { id: 'eclipse', nombre: 'Eclipse Real', precio: 27000, colors: ['#fff1a8', '#9a7040', '#252238'], icon: 'brightness-4', tag: 'CELESTIAL' },
  { id: 'infinito', nombre: 'Constelación Eterna', precio: 33000, colors: ['#c5d8ff', '#5366b8', '#201f57'], icon: 'all-inclusive', tag: 'ETERNO' },
];

const RINCON_THEMES = [
  { id: 'amanecer', nombre: 'Amanecer', detalle: 'Cálido y dorado', icon: 'wb-sunny', colors: ['#fff3bf', '#f0c078', '#8eb87a'], ground: '#688c57', border: '#bc813d', glow: '#fff2a8' },
  { id: 'bosque', nombre: 'Bosque', detalle: 'Verde y tranquilo', icon: 'eco', colors: ['#dff0be', '#8fb77b', '#4e8268'], ground: '#416b50', border: '#527757', glow: '#e5f7ba' },
  { id: 'cielo', nombre: 'Cielo', detalle: 'Claro y liviano', icon: 'water-drop', colors: ['#e5f9ff', '#9fd6dc', '#7bb19e'], ground: '#679879', border: '#5d8d8c', glow: '#f5ffff' },
  { id: 'noche', nombre: 'Noche', detalle: 'Mágico y sereno', icon: 'dark-mode', colors: ['#9f9cce', '#5d668f', '#354667'], ground: '#334b51', border: '#48466f', glow: '#fff1a5' },
  { id: 'lavanda', nombre: 'Lavanda', detalle: 'Suave y soñador', icon: 'auto-awesome', colors: ['#f3e1f3', '#c89ac7', '#8775a7'], ground: '#776687', border: '#8a608f', glow: '#fff1fa' },
  { id: 'corazon', nombre: 'Corazón', detalle: 'Dulce y romántico', icon: 'favorite', colors: ['#ffe5dc', '#e8a0a4', '#bd7889'], ground: '#9b6675', border: '#ad6374', glow: '#fff0d8' },
];

const RINCON_DECORATIONS = [
  { id: 'flores', nombre: 'Flores', icon: 'local-florist', colors: ['#f6a9b9', '#b85773'] },
  { id: 'hojitas', nombre: 'Hojitas', icon: 'spa', colors: ['#9ac36e', '#4d7e50'] },
  { id: 'corazon', nombre: 'Corazón', icon: 'favorite', colors: ['#f28ba4', '#bd4f6d'] },
  { id: 'regalito', nombre: 'Regalito', icon: 'redeem', colors: ['#e0a052', '#a86138'] },
  { id: 'destellos', nombre: 'Destellos', icon: 'auto-awesome', colors: ['#e4bb55', '#a87132'] },
  { id: 'almohadon', nombre: 'Almohadón', icon: 'weekend', colors: ['#bc92d0', '#76588f'] },
];

const DEFAULT_RINCON = { tema: 'amanecer', animalId: null, skinId: 'default', adornos: ['flores', 'hojitas'] };

const BADGE_TIERS = [
  { id: 'bronce', nombre: 'Bronce', colors: ['#e0a16d', '#a96036', '#6d3822'] },
  { id: 'plata', nombre: 'Plata', colors: ['#edf0f2', '#aab4bd', '#66727d'] },
  { id: 'oro', nombre: 'Oro', colors: ['#fff0a0', '#dc9a20', '#855015'] },
  { id: 'mitica', nombre: 'Mítica', colors: ['#f5c5ff', '#9a55c7', '#4d246f'] },
];

const gameDetailsFor = key => GAME_DETAILS[key] || {
  nombre: String(key || 'Juego').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
  icono: 'sports-esports',
  color: '#c9748f',
};

const topGameFor = juegos => {
  const best = Object.entries(juegos || {})
    .map(([key, stats]) => ({ key, nivel: Math.max(1, Number(stats?.nivel) || 1) }))
    .sort((a, b) => b.nivel - a.nivel)[0] || { key: 'conexiones', nivel: 1 };
  return { ...gameDetailsFor(best.key), nivel: best.nivel };
};

const generoCorto = genero => {
  if (genero === 'masculino') return 'M';
  if (genero === 'femenino') return 'F';
  return genero ? String(genero).slice(0, 3) : '—';
};

const numero = value => Number(value || 0).toLocaleString('es-AR');
const sourceFor = value => (typeof value === 'string' ? { uri: value } : value);

const unlockedSkinsFor = (animalId, user, animalStates) => {
  if (!animalId) return [];
  const state = animalStates?.[animalId] || user?.animalitos?.[animalId] || {};
  return (SKINS_POR_ANIMAL[animalId] || []).filter(skin => skin.storageId === 'default'
    || Boolean(state?.skinsDesbloqueadas?.[skin.storageId])
    || Boolean(user?.skinsDesbloqueadas?.[animalId]?.[skin.storageId])
    || (user?.animalito === animalId && user?.skin === skin.storageId));
};

const normalizeRinconConfig = (raw, user, ownedAnimals, animalStates) => {
  const safeRaw = raw && typeof raw === 'object' ? raw : {};
  const ownedIds = new Set((ownedAnimals || []).map(animal => animal.id));
  const fallbackAnimal = ownedIds.has(user?.animalito) ? user.animalito : (ownedAnimals?.[0]?.id || null);
  const animalId = ownedIds.has(safeRaw.animalId) ? safeRaw.animalId : fallbackAnimal;
  const availableSkins = unlockedSkinsFor(animalId, user, animalStates);
  const fallbackSkin = animalId === user?.animalito && availableSkins.some(skin => skin.storageId === user?.skin)
    ? user.skin
    : (availableSkins[0]?.storageId || 'default');
  const skinId = availableSkins.some(skin => skin.storageId === safeRaw.skinId) ? safeRaw.skinId : fallbackSkin;
  const themeIds = new Set(RINCON_THEMES.map(theme => theme.id));
  const decorationIds = new Set(RINCON_DECORATIONS.map(decoration => decoration.id));
  const adornos = [...new Set(Array.isArray(safeRaw.adornos) ? safeRaw.adornos : DEFAULT_RINCON.adornos)]
    .filter(id => decorationIds.has(id))
    .slice(0, 2);
  return {
    tema: themeIds.has(safeRaw.tema) ? safeRaw.tema : DEFAULT_RINCON.tema,
    animalId,
    skinId,
    adornos,
  };
};

const valueToDate = value => {
  const date = value?.toDate?.() || (value instanceof Date ? value : value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const addCalendarMonths = (date, months) => {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
};

const registrationAge = value => {
  const registeredAt = valueToDate(value);
  if (!registeredAt) return { valid: false, level: 0, days: 0, label: 'Fecha sin registrar', milestones: [] };
  const now = new Date();
  const milestones = [
    { value: 1, label: '1 día', requisito: 'Cumple tu primer día formando parte de Amor.', obtenidaEn: new Date(registeredAt.getTime() + 86400000), motivo: 'Cumplió su primer día formando parte de Amor.' },
    { value: 6, label: '6 meses', requisito: 'Cumple 6 meses formando parte de Amor.', obtenidaEn: addCalendarMonths(registeredAt, 6), motivo: 'Cumplió 6 meses compartiendo momentos en Amor.' },
    { value: 12, label: '1 año', requisito: 'Celebra tu primer año dentro de Amor.', obtenidaEn: addCalendarMonths(registeredAt, 12), motivo: 'Celebró su primer año dentro de Amor.' },
    { value: 24, label: '2 años', requisito: 'Alcanza 2 años de historia dentro de Amor.', obtenidaEn: addCalendarMonths(registeredAt, 24), motivo: 'Alcanzó 2 años de historia dentro de Amor.' },
  ];
  const level = milestones.filter(milestone => now >= milestone.obtenidaEn).length;
  const days = Math.max(0, Math.floor((now.getTime() - registeredAt.getTime()) / 86400000));
  const months = Math.max(0, (now.getFullYear() - registeredAt.getFullYear()) * 12 + now.getMonth() - registeredAt.getMonth() - (now.getDate() < registeredAt.getDate() ? 1 : 0));
  const label = months >= 24 ? `${Math.floor(months / 12)} años` : months >= 1 ? `${months} ${months === 1 ? 'mes' : 'meses'}` : `${days} ${days === 1 ? 'día' : 'días'}`;
  return { valid: true, level, days, label, milestones };
};

const NamePlate = ({ name, frameId }) => {
  const frame = FRAME_OPTIONS.find(item => item.id === frameId) || FRAME_OPTIONS[0];
  const [, middle, dark] = frame.colors;
  return <View style={styles.namePlateWrap} pointerEvents="none">
    <View style={styles.namePlateShadow} />
    <LinearGradient colors={['#f8dcaa', '#edb27f', '#d88772']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.namePlateBody, { borderColor: dark }]}>
      <View style={styles.namePlateInner}>
        <View style={[styles.namePlateAccent, { backgroundColor: middle, borderColor: dark }]}><MaterialIcons name={frame.icon} size={7} color="#fff8dc" /></View>
        <Text style={styles.namePlateText} numberOfLines={1}>{name}</Text>
        <View style={[styles.namePlateAccent, { backgroundColor: middle, borderColor: dark }]}><MaterialIcons name={frame.icon} size={7} color="#fff8dc" /></View>
      </View>
      <View style={[styles.namePlateJewel, { backgroundColor: middle, borderColor: dark }]}><View style={styles.namePlateJewelCore} /></View>
    </LinearGradient>
  </View>;
};

const FrameDecoration = ({ frame, compact, catalog }) => {
  const decorationSize = compact ? 8 : catalog ? 11 : 15;
  if (frame.id === 'corazon') return <><LinearGradient colors={['#ff8fab', '#b83f63']} style={[styles.frameHeartSeal, compact && styles.frameSealCompact]}><MaterialIcons name="favorite" size={decorationSize} color="#fff1dd" /></LinearGradient>{!compact && <><View style={[styles.frameHeartJewel, styles.frameHeartJewelLeft]} /><View style={[styles.frameHeartJewel, styles.frameHeartJewelRight]} /><View style={styles.frameHeartDot} /></>}</>;
  if (frame.id === 'bosque') return <><LinearGradient colors={['#86b663', '#356744']} style={[styles.frameForestLeaf, styles.frameForestLeafTop, compact && styles.frameLeafCompact]}><MaterialIcons name="eco" size={decorationSize} color="#eff6c9" /></LinearGradient>{!compact && <><LinearGradient colors={['#769c5b', '#315d49']} style={[styles.frameForestLeaf, styles.frameForestLeafBottom]}><MaterialIcons name="spa" size={12} color="#d9ecaa" /></LinearGradient><View style={styles.frameForestKnot} /></>}</>;
  if (frame.id === 'noche') return <><LinearGradient colors={['#7072bd', '#303263']} style={[styles.frameMoonSeal, compact && styles.frameSealCompact]}><MaterialIcons name="dark-mode" size={decorationSize} color="#fff5c8" /></LinearGradient>{!compact && <><View style={[styles.frameNightStar, styles.frameNightStarOne]} /><View style={[styles.frameNightStar, styles.frameNightStarTwo]} /><View style={[styles.frameNightStar, styles.frameNightStarThree]} /></>}</>;
  if (frame.id === 'aurora') return <><LinearGradient colors={['#75e0d0', '#7765c7']} style={[styles.frameAuroraSeal, compact && styles.frameCornerSealCompact]}><MaterialIcons name="diamond" size={decorationSize} color="#efffff" /></LinearGradient>{!compact && <><View style={[styles.frameAuroraShard, styles.frameAuroraShardOne]} /><View style={[styles.frameAuroraShard, styles.frameAuroraShardTwo]} /><View style={[styles.frameAuroraShard, styles.frameAuroraShardThree]} /></>}</>;
  if (frame.id === 'jardin') return <><LinearGradient colors={['#ef8fae', '#a94c7c']} style={[styles.frameGardenSeal, compact && styles.frameSealCompact]}><MaterialIcons name="local-florist" size={decorationSize} color="#fff1d8" /></LinearGradient>{!compact && <><View style={[styles.frameGardenPetal, styles.frameGardenPetalOne]} /><View style={[styles.frameGardenPetal, styles.frameGardenPetalTwo]} /><View style={[styles.frameGardenPetal, styles.frameGardenPetalThree]} /><View style={[styles.frameGardenPetal, styles.frameGardenPetalFour]} /></>}</>;
  if (frame.id === 'marea') return <><LinearGradient colors={['#62c9dc', '#2d7195']} style={[styles.frameTideSeal, compact && styles.frameTideSealCompact]}><MaterialIcons name="water-drop" size={decorationSize} color="#effdff" /></LinearGradient>{!compact && <><View style={styles.framePearl}><View style={styles.framePearlLight} /></View><View style={[styles.frameBubble, styles.frameBubbleOne]} /><View style={[styles.frameBubble, styles.frameBubbleTwo]} /><View style={[styles.frameBubble, styles.frameBubbleThree]} /></>}</>;
  if (frame.id === 'sakura') return <><LinearGradient colors={['#f4a9bc', '#c7668a']} style={[styles.frameSakuraSeal, compact && styles.frameCornerSealCompact]}><MaterialIcons name="filter-vintage" size={decorationSize} color="#fff7df" /></LinearGradient>{!compact && <><View style={[styles.frameSakuraPetal, styles.frameSakuraPetalOne]} /><View style={[styles.frameSakuraPetal, styles.frameSakuraPetalTwo]} /><View style={[styles.frameSakuraPetal, styles.frameSakuraPetalThree]} /><View style={[styles.frameSakuraPetal, styles.frameSakuraPetalFour]} /></>}</>;
  if (frame.id === 'llama') return <><LinearGradient colors={['#ffad42', '#b83626']} style={[styles.frameFlameSeal, compact && styles.frameTideSealCompact]}><MaterialIcons name="local-fire-department" size={decorationSize} color="#fff4bc" /></LinearGradient>{!compact && <><View style={[styles.frameEmber, styles.frameEmberOne]} /><View style={[styles.frameEmber, styles.frameEmberTwo]} /><View style={[styles.frameEmber, styles.frameEmberThree]} /><View style={[styles.frameEmber, styles.frameEmberFour]} /></>}</>;
  if (frame.id === 'esmeralda') return <><LinearGradient colors={['#66c38e', '#1f6955']} style={[styles.frameEmeraldSeal, compact && styles.frameSealCompact]}><MaterialIcons name="shield" size={decorationSize} color="#efffc7" /></LinearGradient>{!compact && <><View style={[styles.frameEmeraldMiniGem, styles.frameEmeraldMiniGemLeft]} /><View style={[styles.frameEmeraldMiniGem, styles.frameEmeraldMiniGemRight]} /><View style={styles.frameEmeraldGem} /></>}</>;
  if (frame.id === 'lavanda') return <><LinearGradient colors={['#c49be9', '#6a4b99']} style={[styles.frameLavenderSeal, compact && styles.frameSealCompact]}><MaterialIcons name="auto-awesome" size={decorationSize} color="#fff1ff" /></LinearGradient>{!compact && <><View style={[styles.frameLavenderSpark, styles.frameLavenderSparkOne]} /><View style={[styles.frameLavenderSpark, styles.frameLavenderSparkTwo]} /><LinearGradient colors={['rgba(255,242,255,0.8)', 'rgba(178,130,220,0.25)']} style={styles.frameLavenderOrb} /></>}</>;
  if (frame.id === 'eclipse') return <><LinearGradient colors={['#e0b958', '#403449']} style={[styles.frameEclipseSeal, compact && styles.frameCornerSealCompact]}><View style={styles.frameEclipseSun} /><View style={styles.frameEclipseMoon} /></LinearGradient>{!compact && <><View style={[styles.frameEclipseGem, styles.frameEclipseGemLeft]} /><View style={[styles.frameEclipseGem, styles.frameEclipseGemRight]} /><View style={styles.frameEclipseHalo} /></>}</>;
  return <><LinearGradient colors={['#6e7ed2', '#34357f']} style={[styles.frameInfinitySeal, compact && styles.frameSealCompact]}><MaterialIcons name="all-inclusive" size={compact ? 9 : 17} color="#eef3ff" /></LinearGradient>{!compact && <><View style={[styles.frameConstellationStar, styles.frameConstellationOne]} /><View style={[styles.frameConstellationStar, styles.frameConstellationTwo]} /><View style={[styles.frameConstellationStar, styles.frameConstellationThree]} /><LinearGradient colors={['#666fc0', '#28275f']} style={styles.frameInfinityPlate}><MaterialIcons name="auto-awesome" size={8} color="#f4e7ff" /></LinearGradient></>}</>;
};

const ProfileFrame = ({ avatar, frameId, compact = false, catalog = false, onPress }) => {
  const frame = FRAME_OPTIONS.find(item => item.id === frameId) || FRAME_OPTIONS[0];
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.82} style={[styles.frameWrap, compact && styles.frameWrapCompact, catalog && styles.frameWrapCatalog]}>
      <LinearGradient colors={frame.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.frameOuter, styles[`frameOuter_${frame.id}`], compact && styles.frameOuterCompact, compact && styles[`frameOuterCompact_${frame.id}`], catalog && styles.frameOuterCatalog]}>
        <View style={[styles.frameInner, styles[`frameInner_${frame.id}`], compact && styles.frameInnerCompact, compact && styles[`frameInnerCompact_${frame.id}`], catalog && styles.frameInnerCatalog]}>
          <ExpoImage source={sourceFor(avatar)} style={styles.frameImage} contentFit="cover" cachePolicy="memory-disk" />
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)', 'rgba(45,28,70,0.1)']} locations={[0, 0.48, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </View>
        <FrameDecoration frame={frame} compact={compact} catalog={catalog} />
      </LinearGradient>
    </Wrapper>
  );
};

const badgeDate = value => {
  const date = value?.toDate?.() || (value instanceof Date ? value : value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return { full: 'Fecha no registrada', year: '—' };
  return { full: date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }), year: String(date.getFullYear()) };
};

const legacyBadgeRecord = (legacyMap, badgeId) => {
  if (legacyMap?.[badgeId]) {
    const direct = legacyMap[badgeId];
    const nivel = Math.max(1, Number(direct.nivel) || 1);
    return { ...direct, nivel, rango: direct.rango || BADGE_TIERS[Math.min(nivel, BADGE_TIERS.length) - 1].id };
  }
  if (badgeId === 'maestria_hilito' && legacyMap?.hilito_100) return { ...legacyMap.hilito_100, nivel: 3, rango: 'oro' };
  if (badgeId === 'guardian_animalitos') {
    if (legacyMap?.coleccion_2) return { ...legacyMap.coleccion_2, nivel: 2, rango: 'plata' };
    if (legacyMap?.primer_animalito) return { ...legacyMap.primer_animalito, nivel: 1, rango: 'bronce' };
  }
  return null;
};

const legacyBadgeTargets = legacyMap => {
  const targets = new Set();
  ['antiguedad_amor', 'maestria_hilito', 'guardian_animalitos', 'coleccion_estilo'].forEach(id => { if (legacyMap?.[id]) targets.add(id); });
  if (legacyMap?.hilito_100) targets.add('maestria_hilito');
  if (legacyMap?.primer_animalito || legacyMap?.coleccion_2) targets.add('guardian_animalitos');
  return [...targets];
};

const ProfileBadge = ({ icon, colors, title, detail, legendary = false, obtained, requirement, tierName, targetLevel = 0, earnedReason, expanded, onExpandedChange }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const animating = useRef(false);
  const desiredBack = useRef(Boolean(expanded));
  const renderedBack = useRef(false);
  const [showBack, setShowBack] = useState(false);
  const [showRequirement, setShowRequirement] = useState(false);
  const unlocked = targetLevel > 0;
  const date = badgeDate(obtained?.obtenidaEn);
  const achievementReason = obtained?.motivo || earnedReason || 'Logro comprobado con su progreso actual.';
  const rotateY = rotation.interpolate({ inputRange: [-90, 0, 90], outputRange: ['-90deg', '0deg', '90deg'] });
  const runQueuedFlip = () => {
    if (animating.current) return;
    const nextBack = desiredBack.current;
    if (nextBack === renderedBack.current) return;
    animating.current = true;
    Animated.timing(rotation, { toValue: 90, duration: 135, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) { animating.current = false; return; }
      renderedBack.current = nextBack;
      setShowBack(nextBack);
      setShowRequirement(false);
      rotation.setValue(-90);
      requestAnimationFrame(() => Animated.spring(rotation, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }).start(() => {
        animating.current = false;
        runQueuedFlip();
      }));
    });
  };
  useEffect(() => {
    desiredBack.current = Boolean(expanded);
    runQueuedFlip();
  }, [expanded]);
  const toggle = () => onExpandedChange?.(!expanded);
  return <View style={styles.badgeItem}>
    <Animated.View style={[styles.badgeFace, { transform: [{ perspective: 700 }, { rotateY }] }]}>
      {showBack ? <View style={styles.badgeBack}>
        <TouchableOpacity onPress={toggle} activeOpacity={0.9}>
        <LinearGradient colors={unlocked ? colors : ['#b9ad9d', '#80766c', '#5e5751']} style={[styles.badgeBackMedal, legendary && unlocked && styles.badgeBackMedalLegend]}>
          {showRequirement ? <>
            <MaterialIcons name={legendary ? 'verified' : 'trending-up'} size={13} color="#fff4d1" />
            <Text style={styles.badgeBackTitle}>{legendary ? 'Chapa completada' : 'Para evolucionar'}</Text>
            <Text style={styles.badgeBackReason} numberOfLines={4}>{requirement}</Text>
          </> : <>
            <Text style={styles.badgeBackTier}>{unlocked ? tierName : 'BLOQUEADA'}</Text>
            <Text style={styles.badgeBackTitle}>{unlocked ? (obtained?.obtenidaEn ? date.full : 'Logro comprobado') : 'Cómo conseguirla'}</Text>
            <Text style={styles.badgeBackReason} numberOfLines={3}>{unlocked ? achievementReason : requirement}</Text>
          </>}
        </LinearGradient>
        </TouchableOpacity>
        {unlocked && <TouchableOpacity style={[styles.badgeQuestion, showRequirement && styles.badgeQuestionActive]} onPress={() => setShowRequirement(value => !value)} activeOpacity={0.75}><Text style={styles.badgeQuestionText}>?</Text></TouchableOpacity>}
      </View> : <TouchableOpacity style={styles.badgeFront} onPress={toggle} activeOpacity={0.9}>
        <View style={[styles.badgeWing, styles.badgeWingLeft, legendary && styles.badgeWingLegend, !unlocked && styles.badgeLocked]} />
        <View style={[styles.badgeWing, styles.badgeWingRight, legendary && styles.badgeWingLegend, !unlocked && styles.badgeLocked]} />
        <LinearGradient colors={unlocked ? colors : ['#b9ad9d', '#80766c', '#5e5751']} style={[styles.badgeMedal, legendary && unlocked && styles.badgeMedalLegend]}>
          <View style={styles.badgeInnerRing}><MaterialIcons name={unlocked ? icon : 'lock'} size={legendary ? 27 : 24} color={unlocked ? '#fff8dc' : '#ddd4c9'} /></View>
          <View style={styles.badgeGem} />
          {legendary && unlocked && <Text style={styles.badgeCrown}>♛</Text>}
        </LinearGradient>
        <Text style={[styles.badgeTitle, legendary && unlocked && styles.badgeTitleLegend]} numberOfLines={1}>{title}</Text>
        <Text style={styles.badgeDetail} numberOfLines={1}>{unlocked ? detail : 'Aún no obtenida'}</Text>
        <View style={styles.badgeEvolution}>{BADGE_TIERS.map((tier, index) => <View key={tier.id} style={[styles.badgeEvolutionDot, index < targetLevel && { backgroundColor: tier.colors[1], borderColor: tier.colors[2] }]} />)}</View>
      </TouchableOpacity>}
    </Animated.View>
  </View>;
};

const RinconcitoScene = ({ config, large = false }) => {
  const theme = RINCON_THEMES.find(item => item.id === config?.tema) || RINCON_THEMES[0];
  const animal = ANIMALITOS_POR_ID[config?.animalId] || null;
  const skin = (SKINS_POR_ANIMAL[animal?.id] || []).find(item => item.storageId === config?.skinId)
    || (SKINS_POR_ANIMAL[animal?.id] || [])[0]
    || null;
  const decorations = (config?.adornos || []).map(id => RINCON_DECORATIONS.find(item => item.id === id)).filter(Boolean).slice(0, 2);
  return <LinearGradient colors={theme.colors} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={[styles.rinconScene, large && styles.rinconSceneLarge, { borderColor: theme.border }]}>
    <View pointerEvents="none" style={[styles.rinconSun, large && styles.rinconSunLarge, { backgroundColor: theme.glow }]} />
    <View pointerEvents="none" style={[styles.rinconCloud, styles.rinconCloudLeft, large && styles.rinconCloudLarge]} />
    <View pointerEvents="none" style={[styles.rinconCloud, styles.rinconCloudRight, large && styles.rinconCloudLarge]} />
    <View pointerEvents="none" style={[styles.rinconHillBack, large && styles.rinconHillBackLarge, { backgroundColor: `${theme.ground}88` }]} />
    <View pointerEvents="none" style={[styles.rinconHillFront, large && styles.rinconHillFrontLarge, { backgroundColor: theme.ground }]} />
    {[0, 1, 2, 3].map(index => <View key={index} pointerEvents="none" style={[styles.rinconSpark, large && styles.rinconSparkLarge, { left: `${17 + (index * 21)}%`, top: `${15 + ((index % 2) * 12)}%`, backgroundColor: theme.glow }]} />)}
    {decorations.map((decoration, index) => <View key={decoration.id} pointerEvents="none" style={[styles.rinconDecoration, large && styles.rinconDecorationLarge, index === 0 ? styles.rinconDecorationLeft : styles.rinconDecorationRight]}>
      <View style={[styles.rinconDecorationShadow, large && styles.rinconDecorationShadowLarge]} />
      <LinearGradient colors={decoration.colors} style={[styles.rinconDecorationMedal, large && styles.rinconDecorationMedalLarge]}>
        <MaterialIcons name={decoration.icon} size={large ? 26 : 15} color="#fff8df" />
      </LinearGradient>
    </View>)}
    <View pointerEvents="none" style={[styles.rinconPlatform, large && styles.rinconPlatformLarge, { backgroundColor: `${theme.glow}a8`, borderColor: `${theme.border}99` }]} />
    {skin ? <ExpoImage source={skin.imagen} style={[styles.rinconAnimal, large && styles.rinconAnimalLarge]} contentFit="contain" cachePolicy="memory-disk" /> : <View style={[styles.rinconNoAnimal, large && styles.rinconNoAnimalLarge]}><MaterialIcons name="pets" size={large ? 42 : 24} color="rgba(255,248,220,0.82)" /><Text style={[styles.rinconNoAnimalText, large && styles.rinconNoAnimalTextLarge]}>Tu compañero aparecerá aquí</Text></View>}
    {animal && <View pointerEvents="none" style={[styles.rinconAnimalName, large && styles.rinconAnimalNameLarge]}><Text style={[styles.rinconAnimalNameText, large && styles.rinconAnimalNameTextLarge]}>{animal.nombre}</Text><Text style={[styles.rinconSkinName, large && styles.rinconSkinNameLarge]} numberOfLines={1}>{skin?.nombre || 'Original'}</Text></View>}
  </LinearGradient>;
};

const RinconcitoPreview = ({ config, readOnly, ownerName, onPress }) => {
  return <TouchableOpacity style={styles.rinconPreview} onPress={onPress} disabled={readOnly} activeOpacity={0.88}>
    <RinconcitoScene config={config} />
    <LinearGradient pointerEvents="none" colors={['rgba(55,41,28,0.74)', 'rgba(55,41,28,0.05)']} style={styles.rinconPreviewTop}>
      <View><Text style={styles.rinconPreviewEyebrow}>{readOnly ? 'SU ESPACIO PERSONAL' : 'TU ESPACIO PERSONAL'}</Text><Text style={styles.rinconPreviewTitle}>{readOnly ? `El rinconcito de ${ownerName}` : 'Mi Rinconcito'}</Text></View>
      {!readOnly && <View style={styles.rinconEditChip}><MaterialIcons name="edit" size={9} color="#6b4327" /><Text style={styles.rinconEditChipText}>PERSONALIZAR</Text></View>}
    </LinearGradient>
    <View pointerEvents="none" style={styles.rinconPreviewBottom}>
      <Text style={styles.rinconPreviewHint}>{readOnly ? 'Un pedacito de su mundo dentro de Amor' : 'Toca para cambiar el ambiente, compañero, traje y adornos'}</Text>
      {!readOnly && <MaterialIcons name="chevron-right" size={15} color="#fff6dd" />}
    </View>
  </TouchableOpacity>;
};

const RinconcitoBookPage = ({ onBack, config, ownedAnimals, animalStates, user, onSave, saving }) => {
  const initialConfig = useRef(config).current;
  const configKey = JSON.stringify(initialConfig);
  const [draft, setDraft] = useState(initialConfig);

  const selectedAnimal = ownedAnimals.find(animal => animal.id === draft?.animalId) || null;
  const availableSkins = unlockedSkinsFor(selectedAnimal?.id, user, animalStates);
  const dirty = JSON.stringify(draft) !== configKey;
  const selectAnimal = animalId => {
    const nextSkins = unlockedSkinsFor(animalId, user, animalStates);
    const preferredSkin = animalId === user?.animalito && nextSkins.some(skin => skin.storageId === user?.skin)
      ? user.skin
      : (nextSkins[0]?.storageId || 'default');
    setDraft(current => ({ ...current, animalId, skinId: preferredSkin }));
  };
  const toggleDecoration = decorationId => setDraft(current => {
    const selected = current.adornos || [];
    if (selected.includes(decorationId)) return { ...current, adornos: selected.filter(id => id !== decorationId) };
    return { ...current, adornos: selected.length >= 2 ? [selected[1], decorationId] : [...selected, decorationId] };
  });

  return <View style={subpage.page}>
    <View style={modal.modalHeader}>
      <View><Text style={modal.eyebrow}>TU ESPACIO DENTRO DE AMOR</Text><Text style={modal.title}>Mi Rinconcito</Text><Text style={modal.subtitle}>Combina un ambiente, tu compañero, su traje y hasta dos adornos.</Text></View>
      <TouchableOpacity style={modal.close} onPress={onBack} disabled={saving}><MaterialIcons name="arrow-back" size={18} color="#75502f" /></TouchableOpacity>
    </View>
    <View style={modal.rinconEditorBody}>
      <View style={modal.rinconPreviewColumn}>
        <View style={modal.rinconPreviewFrame}><RinconcitoScene config={draft} large /></View>
        <View style={modal.rinconPreviewNote}><View style={modal.rinconPreviewNoteIcon}><MaterialIcons name="visibility" size={13} color="#fff4d8" /></View><View style={modal.rinconPreviewNoteText}><Text style={modal.rinconPreviewNoteTitle}>ASÍ SE VERÁ EN TU PERFIL</Text><Text style={modal.rinconPreviewNoteSubtitle}>Cada cambio se previsualiza aquí antes de guardarlo.</Text></View></View>
      </View>
      <View style={modal.rinconControlsColumn}>
        <ScrollView style={modal.rinconControlsScroll} showsVerticalScrollIndicator={false} contentContainerStyle={modal.rinconControls}>
          <View style={modal.rinconControlHeading}><View style={modal.rinconStep}><Text style={modal.rinconStepText}>1</Text></View><View><Text style={modal.rinconControlTitle}>ELIGE EL AMBIENTE</Text><Text style={modal.rinconControlSubtitle}>Marca el tono de todo tu rincón.</Text></View></View>
          <View style={modal.rinconThemeGrid}>{RINCON_THEMES.map(theme => {
            const active = draft?.tema === theme.id;
            return <TouchableOpacity key={theme.id} onPress={() => setDraft(current => ({ ...current, tema: theme.id }))} style={[modal.rinconThemeCard, active && modal.rinconOptionActive]} activeOpacity={0.82}>
              <LinearGradient colors={theme.colors} style={modal.rinconThemeSwatch}><MaterialIcons name={theme.icon} size={12} color="#fff9df" /></LinearGradient>
              <View style={modal.rinconThemeInfo}><Text style={modal.rinconOptionName}>{theme.nombre}</Text><Text style={modal.rinconOptionDetail}>{theme.detalle}</Text></View>
              {active && <View style={modal.rinconCheck}><MaterialIcons name="check" size={8} color="#fff" /></View>}
            </TouchableOpacity>;
          })}</View>

          <View style={modal.rinconControlHeading}><View style={modal.rinconStep}><Text style={modal.rinconStepText}>2</Text></View><View><Text style={modal.rinconControlTitle}>ELIGE TU COMPAÑERO</Text><Text style={modal.rinconControlSubtitle}>Solo aparecen los Animalitos que ya tienes.</Text></View></View>
          {ownedAnimals.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={modal.rinconChoiceRail}>{ownedAnimals.map(animal => {
            const active = draft?.animalId === animal.id;
            return <TouchableOpacity key={animal.id} onPress={() => selectAnimal(animal.id)} style={[modal.rinconAnimalChoice, active && modal.rinconOptionActive]} activeOpacity={0.82}><ExpoImage source={animal.imagen} style={modal.rinconAnimalChoiceImage} contentFit="contain" cachePolicy="memory-disk" /><Text style={modal.rinconChoiceName}>{animal.nombre}</Text>{active && <View style={modal.rinconCheck}><MaterialIcons name="check" size={8} color="#fff" /></View>}</TouchableOpacity>;
          })}</ScrollView> : <View style={modal.rinconEmptyChoice}><MaterialIcons name="pets" size={17} color="#9a7a5c" /><Text style={modal.rinconEmptyChoiceText}>Desbloquea un Animalito para invitarlo a tu rincón.</Text></View>}

          <View style={modal.rinconControlHeading}><View style={modal.rinconStep}><Text style={modal.rinconStepText}>3</Text></View><View><Text style={modal.rinconControlTitle}>ELIGE SU TRAJE</Text><Text style={modal.rinconControlSubtitle}>Usa cualquiera de sus trajes desbloqueados.</Text></View></View>
          {availableSkins.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={modal.rinconChoiceRail}>{availableSkins.map(skin => {
            const active = draft?.skinId === skin.storageId;
            return <TouchableOpacity key={skin.id} onPress={() => setDraft(current => ({ ...current, skinId: skin.storageId }))} style={[modal.rinconSkinChoice, active && modal.rinconOptionActive]} activeOpacity={0.82}><ExpoImage source={skin.imagen} style={modal.rinconSkinChoiceImage} contentFit="contain" cachePolicy="memory-disk" /><Text style={modal.rinconChoiceName} numberOfLines={1}>{skin.nombre}</Text><Text style={[modal.rinconChoiceRarity, { color: skin.colorRareza }]}>{skin.rareza}</Text>{active && <View style={modal.rinconCheck}><MaterialIcons name="check" size={8} color="#fff" /></View>}</TouchableOpacity>;
          })}</ScrollView> : <View style={modal.rinconEmptyChoice}><MaterialIcons name="checkroom" size={17} color="#9a7a5c" /><Text style={modal.rinconEmptyChoiceText}>Elige primero un Animalito.</Text></View>}

          <View style={modal.rinconControlHeading}><View style={modal.rinconStep}><Text style={modal.rinconStepText}>4</Text></View><View><Text style={modal.rinconControlTitle}>DALE EL TOQUE FINAL · {(draft?.adornos || []).length}/2</Text><Text style={modal.rinconControlSubtitle}>Al elegir un tercero, reemplaza al más antiguo.</Text></View></View>
          <View style={modal.rinconDecorationGrid}>{RINCON_DECORATIONS.map(decoration => {
            const active = draft?.adornos?.includes(decoration.id);
            return <TouchableOpacity key={decoration.id} onPress={() => toggleDecoration(decoration.id)} style={[modal.rinconDecorationChoice, active && modal.rinconOptionActive]} activeOpacity={0.82}><LinearGradient colors={decoration.colors} style={modal.rinconDecorationChoiceIcon}><MaterialIcons name={decoration.icon} size={13} color="#fff8e1" /></LinearGradient><Text style={modal.rinconChoiceName}>{decoration.nombre}</Text>{active && <View style={modal.rinconCheck}><MaterialIcons name="check" size={8} color="#fff" /></View>}</TouchableOpacity>;
          })}</View>
        </ScrollView>
        <TouchableOpacity onPress={() => onSave(draft)} disabled={saving || !dirty} style={[modal.rinconSaveWrap, (!dirty || saving) && modal.rinconSaveDisabled]} activeOpacity={0.86}>
          <LinearGradient colors={dirty ? ['#7fa468', '#527c5d'] : ['#c7bda9', '#9d9280']} style={modal.rinconSaveButton}><MaterialIcons name={saving ? 'hourglass-top' : 'favorite'} size={14} color="#fff7dc" /><View><Text style={modal.rinconSaveText}>{saving ? 'GUARDANDO…' : dirty ? 'GUARDAR MI RINCONCITO' : 'TODO ESTÁ GUARDADO'}</Text><Text style={modal.rinconSaveHint}>{dirty ? 'Se verá así en tu perfil' : 'Haz un cambio para volver a guardar'}</Text></View></LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </View>;
};

const Stat = ({ icon, value, label, color, emoji }) => (
  <View style={styles.bigStat}>
    {emoji ? <Text style={styles.statEmoji}>{emoji}</Text> : <MaterialIcons name={icon} size={17} color={color} />}
    <Text style={styles.bigStatValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.bigStatLabel}>{label}</Text>
  </View>
);

const FrameBookPage = ({ onBack, avatar, selectedFrame, unlockedFrames, readOnly, onSelect, busyFrameId }) => {
  const nextFrame = FRAME_OPTIONS.slice(1).find(frame => !unlockedFrames?.[frame.id]) || null;
  const selectedName = FRAME_OPTIONS.find(frame => frame.id === selectedFrame)?.nombre || 'Corazón de Amor';
  return <View style={subpage.page}>
    <View style={modal.modalHeader}>
      <View><Text style={modal.eyebrow}>COLECCIÓN DE MARCOS</Text><Text style={modal.title}>Un borde para cada historia</Text><Text style={modal.subtitle}>{readOnly ? `Marco equipado: ${selectedName}` : nextFrame ? `Próximo desbloqueo: ${nextFrame.nombre}` : 'Colección completa. Todos los marcos son tuyos.'}</Text></View>
      <View style={modal.frameHeaderActions}><View style={modal.frameEquippedChip}><ProfileFrame avatar={avatar} frameId={selectedFrame} compact /><View><Text style={modal.frameEquippedLabel}>EQUIPADO</Text><Text style={modal.frameEquippedName} numberOfLines={1}>{selectedName}</Text></View></View><TouchableOpacity style={modal.close} onPress={onBack}><MaterialIcons name="arrow-back" size={18} color="#75502f" /></TouchableOpacity></View>
    </View>
    <ScrollView style={modal.frameGridScroll} showsVerticalScrollIndicator={false} contentContainerStyle={modal.frameGrid} removeClippedSubviews>
      {FRAME_OPTIONS.map(frame => {
        const unlocked = frame.precio === 0 || Boolean(unlockedFrames?.[frame.id]);
        const active = frame.id === selectedFrame;
        const next = !unlocked && frame.id === nextFrame?.id;
        const waiting = !unlocked && !next;
        const busy = busyFrameId === frame.id;
        return <TouchableOpacity key={frame.id} disabled={readOnly || Boolean(busyFrameId) || waiting} onPress={() => onSelect(frame)} activeOpacity={0.82} style={[modal.frameGridCard, active && modal.frameOptionActive, waiting && modal.frameWaiting, next && modal.frameNext, busy && modal.frameOptionBusy]}>
          {next && <LinearGradient pointerEvents="none" colors={['rgba(255,240,176,0.78)', 'rgba(250,213,137,0.16)', 'rgba(255,248,218,0.62)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
          <View style={modal.frameCatalogPreview}><ProfileFrame avatar={avatar} frameId={frame.id} catalog />{waiting && <View style={modal.frameCatalogLock}><MaterialIcons name="lock" size={11} color="#fff8e5" /></View>}</View>
          <Text style={modal.frameOptionName} numberOfLines={1}>{frame.nombre}</Text>
          <Text style={[modal.frameOptionDetail, next && modal.frameNextText]} numberOfLines={1}>{busy ? 'DESBLOQUEANDO…' : active ? 'EQUIPADO' : unlocked ? 'TOCA PARA EQUIPAR' : next ? 'SIGUIENTE' : 'EN ESPERA'}</Text>
          {next ? <LinearGradient colors={['#f5ca68', '#d99534']} style={modal.frameBuyButton}><MaterialIcons name="paid" size={10} color="#70431d" /><Text style={modal.frameBuyText}>{numero(frame.precio)}</Text></LinearGradient> : !unlocked ? <View style={modal.frameFuturePrice}><MaterialIcons name="paid" size={8} color="#9c7854" /><Text style={modal.frameFuturePriceText}>{numero(frame.precio)}</Text></View> : null}
          {frame.tag && <Text style={modal.frameGridTag}>{frame.tag}</Text>}
        </TouchableOpacity>;
      })}
    </ScrollView>
  </View>;
};

const CollectionBookPage = ({ onBack, animals, ownedAnimals, animalStates, user }) => {
  const [animalId, setAnimalId] = useState(null);
  const [skinId, setSkinId] = useState('default');
  const ownedKey = (ownedAnimals || []).map(animal => animal.id).sort().join('|');
  const ownedIds = useMemo(() => new Set(ownedKey ? ownedKey.split('|') : []), [ownedKey]);

  useEffect(() => {
    const initial = animals.find(animal => animal.id === user?.animalito && ownedIds.has(animal.id)) || animals.find(animal => ownedIds.has(animal.id)) || null;
    setAnimalId(initial?.id || null);
    setSkinId(initial?.id === user?.animalito ? (user?.skin || 'default') : 'default');
  }, [animals, ownedIds, user?.animalito, user?.skin]);

  const animal = ownedIds.has(animalId) ? ANIMALITOS_POR_ID[animalId] || null : null;
  const animalState = animal ? (animalStates[animal.id] || user?.animalitos?.[animal.id] || {}) : {};
  const skinCatalog = animal ? (SKINS_POR_ANIMAL[animal.id] || []).map(skin => ({
    ...skin,
    unlocked: skin.storageId === 'default'
      || Boolean(animalState?.skinsDesbloqueadas?.[skin.storageId])
      || Boolean(user?.skinsDesbloqueadas?.[animal.id]?.[skin.storageId])
      || (user?.animalito === animal.id && user?.skin === skin.storageId),
  })) : [];
  const unlockedSkins = skinCatalog.filter(skin => skin.unlocked);
  const selectedSkin = unlockedSkins.find(skin => skin.storageId === skinId) || unlockedSkins[0] || null;

  useEffect(() => {
    if (animal && !unlockedSkins.some(skin => skin.storageId === skinId)) setSkinId(unlockedSkins[0]?.storageId || 'default');
  }, [animalId, skinId, unlockedSkins.length]);

  return (
    <View style={subpage.page}>
          <View style={modal.modalHeader}>
            <View><Text style={modal.eyebrow}>COLECCIÓN PERSONAL</Text><Text style={modal.title}>Animalitos y trajes</Text><Text style={modal.subtitle}>Elige un compañero para descubrir todo lo que consiguió.</Text></View>
            <TouchableOpacity style={modal.close} onPress={onBack}><MaterialIcons name="arrow-back" size={18} color="#75502f" /></TouchableOpacity>
          </View>
          {animals.length === 0 ? <View style={modal.empty}><Text style={modal.emptyPaw}>🐾</Text><Text style={modal.emptyTitle}>Todavía no hay Animalitos</Text><Text style={modal.emptyText}>Los nuevos compañeros aparecerán aquí.</Text></View> : <View style={modal.collectionBody}>
            <View style={modal.animalRail}>
              <Text style={modal.railTitle}>ANIMALITOS · {ownedIds.size}/{animals.length}</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modal.animalRailContent}>
                {animals.map(item => {
                  const unlocked = ownedIds.has(item.id);
                  const active = item.id === animal?.id;
                  const level = Math.max(1, Number(animalStates[item.id]?.nivel ?? user?.animalitos?.[item.id]?.nivel) || 1);
                  return <TouchableOpacity key={item.id} disabled={!unlocked} onPress={() => { setAnimalId(item.id); setSkinId(item.id === user?.animalito ? (user?.skin || 'default') : 'default'); }} style={[modal.animalRailCard, active && modal.animalRailCardActive, !unlocked && modal.animalRailCardLocked]} activeOpacity={0.8}>
                    <View style={modal.animalRailImageWrap}><ExpoImage source={item.imagen} style={modal.animalRailImage} contentFit="contain" cachePolicy="memory-disk" blurRadius={unlocked ? 0 : 8} />{!unlocked && <View style={modal.animalLockBadge}><MaterialIcons name="lock" size={9} color="#fff8e8" /></View>}</View>
                    <View style={modal.animalRailInfo}><Text style={modal.animalRailName}>{item.nombre}</Text><Text style={[modal.animalRailRarity, { color: unlocked ? item.colorRareza : '#887867' }]}>{unlocked ? `${item.rareza} · Nv. ${level}` : `Bloqueado · ${String(item.temporada).toUpperCase()}`}</Text></View>
                    {unlocked && item.id === user?.animalito && <View style={modal.equippedDot}><MaterialIcons name="check" size={9} color="#fff" /></View>}
                  </TouchableOpacity>;
                })}
              </ScrollView>
            </View>
            {animal ? <View style={modal.animalDetail}>
              <View style={modal.animalShowcase}>
                <LinearGradient colors={['rgba(255,255,255,0.76)', `${animal?.colorRareza || '#8ba86d'}25`]} style={StyleSheet.absoluteFill} />
                {selectedSkin && <ExpoImage source={selectedSkin.imagen} style={modal.animalHero} contentFit="contain" cachePolicy="memory-disk" />}
                <View style={modal.animalHeroInfo}>
                  <Text style={modal.animalSeason}>{String(animal?.temporada || 't1').toUpperCase()}</Text>
                  <Text style={modal.animalHeroName}>{animal?.nombre}</Text>
                  <Text style={[modal.animalHeroRarity, { color: selectedSkin?.colorRareza || animal?.colorRareza }]}>{selectedSkin?.nombre || 'Original'} · {selectedSkin?.rareza || animal?.rareza}</Text>
                  <Text style={modal.animalAbility}>{animal?.habilidad}</Text>
                </View>
              </View>
              <View style={modal.skinSection}>
                <View style={modal.skinHeading}><Text style={modal.skinTitle}>TRAJES · OBTENIDOS Y PENDIENTES</Text><Text style={modal.skinCount}>{unlockedSkins.length}/{skinCatalog.length}</Text></View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={modal.skinList}>
                  {skinCatalog.map(skin => <TouchableOpacity key={skin.id} disabled={!skin.unlocked} onPress={() => setSkinId(skin.storageId)} style={[modal.skinCard, skin.storageId === selectedSkin?.storageId && { borderColor: skin.colorRareza, backgroundColor: skin.fondoRareza }, !skin.unlocked && modal.skinCardLocked]} activeOpacity={0.82}>
                    <View style={modal.skinImageWrap}><ExpoImage source={skin.imagen} style={modal.skinImage} contentFit="contain" cachePolicy="memory-disk" blurRadius={skin.unlocked ? 0 : 9} />{!skin.unlocked && <View style={modal.skinLockOverlay}><MaterialIcons name="lock" size={13} color="#fff8e7" /><Text style={modal.skinLockText}>BLOQUEADO</Text></View>}</View>
                    <Text style={modal.skinName} numberOfLines={1}>{skin.nombre}</Text>
                    <View style={[modal.rarityPill, { backgroundColor: skin.colorRareza }]}><Text style={modal.rarityText}>{skin.rareza}</Text></View>
                    {user?.animalito === animal?.id && user?.skin === skin.storageId && <View style={modal.skinEquipped}><MaterialIcons name="check" size={9} color="#fff" /></View>}
                  </TouchableOpacity>)}
                </ScrollView>
              </View>
            </View> : <View style={[modal.animalDetail, modal.lockedCollectionEmpty]}><View style={modal.lockedCollectionIcon}><MaterialIcons name="lock" size={25} color="#8a6a4e" /></View><Text style={modal.emptyTitle}>Colección todavía bloqueada</Text><Text style={modal.emptyText}>Los Animalitos pendientes se muestran, pero no se pueden abrir.</Text></View>}
          </View>}
    </View>
  );
};

const Perfil = ({ navigation, route }) => {
  const externalUid = route?.params?.uid ?? null;
  const soloLectura = Boolean(externalUid);
  const [userData, setUserData] = useState(null);
  const [animalStates, setAnimalStates] = useState({});
  const [badgeRecords, setBadgeRecords] = useState({});
  const [openBadgeId, setOpenBadgeId] = useState(null);
  const [busyFrameId, setBusyFrameId] = useState(null);
  const [rinconSaving, setRinconSaving] = useState(false);
  const [seccionPerfil, setSeccionPerfil] = useState('principal');
  const contentReveal = useRef(new Animated.Value(0)).current;
  const badgeAwardingRef = useRef(new Set());
  const legacyCleanupRef = useRef(false);
  const frameActionRef = useRef(false);
  const rinconSaveRef = useRef(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    const targetUid = externalUid ?? currentUser?.uid;
    setUserData(null);
    setBadgeRecords({});
    setOpenBadgeId(null);
    setBusyFrameId(null);
    setRinconSaving(false);
    setSeccionPerfil('principal');
    frameActionRef.current = false;
    rinconSaveRef.current = false;
    legacyCleanupRef.current = false;
    if (!targetUid) return undefined;
    let conexiones = {};
    const unsubscribeUser = onSnapshot(doc(db, 'usuarios', targetUid), snap => {
      const raw = snap.exists() ? (snap.data() || {}) : {};
      setUserData({
        ...raw,
        uid: targetUid,
        nombre: raw.datosCompletos?.nombre || raw.nombre || (!soloLectura ? currentUser?.displayName : null) || 'Usuario',
        correo: raw.correo || (!soloLectura ? currentUser?.email : null) || '—',
        genero: raw.genero ?? null,
        iconoUrl: raw.iconoUrl || null,
        iconoLocalId: raw.iconoLocalId || null,
        photoURL: raw.photoURL || null,
        dinero: Math.max(0, Number(raw.dinero) || 0),
        diamantes: Math.max(0, Number(raw.diamantes ?? raw.diamante) || 0),
        exp: Math.max(0, Number(raw.exp) || 0),
        racha: Math.max(0, Number(raw.racha) || 0),
        estado: raw.estado || 'activo',
        fechaRegistro: raw.fechaRegistro || null,
        appVersion: typeof raw.appVersion === 'string' && raw.appVersion.trim() ? raw.appVersion.trim() : null,
        animalito: raw.animalito || null,
        skin: raw.skin || 'default',
        animalitos: raw.animalitos || {},
        skinsDesbloqueadas: raw.skinsDesbloqueadas || {},
        cartasAnimalitos: Math.max(0, Number(raw.cartasAnimalitos) || 0),
        juegos: { ...(raw.juegos || {}), conexiones: { ...(raw.juegos?.conexiones || {}), ...conexiones } },
        marcoPerfil: raw.marcoPerfil || 'corazon',
        marcosComprados: raw.marcosComprados || {},
        marcosDesbloqueados: { corazon: true, ...(raw.marcosComprados || {}) },
        chapasPerfil: raw.chapasPerfil || {},
        rinconcito: raw.rinconcito || {},
      });
    }, () => setUserData(null));
    const unsubscribeGame = onSnapshot(doc(db, 'usuarios', targetUid, 'juegos', 'conexiones'), snap => {
      if (!snap.exists()) return;
      conexiones = snap.data() || {};
      setUserData(previous => previous ? { ...previous, juegos: { ...(previous.juegos || {}), conexiones: { ...(previous.juegos?.conexiones || {}), ...conexiones } } } : previous);
    }, () => {});
    const unsubscribeAnimals = onSnapshot(collection(db, 'usuarios', targetUid, 'animalitos'), snap => {
      const next = {};
      snap.docs.forEach(animalDoc => { next[animalDoc.id] = animalDoc.data() || {}; });
      setAnimalStates(next);
    }, () => setAnimalStates({}));
    const unsubscribeBadges = onSnapshot(collection(db, 'usuarios', targetUid, 'chapas'), snap => {
      const next = {};
      snap.docs.forEach(badgeDoc => { next[badgeDoc.id] = { id: badgeDoc.id, ...(badgeDoc.data() || {}) }; });
      setBadgeRecords(next);
    }, () => setBadgeRecords({}));
    return () => { unsubscribeUser(); unsubscribeGame(); unsubscribeAnimals(); unsubscribeBadges(); };
  }, [externalUid, soloLectura]);

  useEffect(() => {
    if (!userData) return;
    contentReveal.setValue(0);
    Animated.timing(contentReveal, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [userData?.uid, contentReveal]);

  const mastery = topGameFor(userData?.juegos);
  const legendary = mastery.nivel >= 100;

  const ownedAnimals = useMemo(() => ANIMALITOS.filter(animal => {
    const state = animalStates[animal.id] || userData?.animalitos?.[animal.id] || {};
    if (animal.id === 'halcon' && (userData?.halconDesbloqueado || userData?.animalito === 'halcon')) return true;
    if (animal.id === 'ardilla' && userData?.ardillaDesbloqueada) return true;
    return state.desbloqueado === true || (state.desbloqueado !== false && (Number(state.nivel) > 0 || Number(state.cartas ?? state.copias) > 0));
  }), [animalStates, userData]);

  const rinconConfig = useMemo(
    () => normalizeRinconConfig(userData?.rinconcito, userData, ownedAnimals, animalStates),
    [animalStates, ownedAnimals, userData],
  );

  const unlockedStyleCount = useMemo(() => {
    const stylesOwned = new Set();
    Object.entries(userData?.iconosDesbloqueados || {}).forEach(([id, unlocked]) => { if (unlocked) stylesOwned.add(`icon:${id}`); });
    if (userData?.iconoLocalId) stylesOwned.add(`icon:${userData.iconoLocalId}`);
    if (userData?.iconoUrl) stylesOwned.add(`icon-url:${userData.iconoUrl}`);
    Object.entries(userData?.skinsDesbloqueadas || {}).forEach(([animalId, skins]) => Object.entries(skins || {}).forEach(([skinId, unlocked]) => { if (unlocked && skinId !== 'default') stylesOwned.add(`skin:${animalId}:${skinId}`); }));
    Object.entries(animalStates).forEach(([animalId, state]) => Object.entries(state?.skinsDesbloqueadas || {}).forEach(([skinId, unlocked]) => { if (unlocked && skinId !== 'default') stylesOwned.add(`skin:${animalId}:${skinId}`); }));
    if (userData?.animalito && userData?.skin && userData.skin !== 'default') stylesOwned.add(`skin:${userData.animalito}:${userData.skin}`);
    return stylesOwned.size;
  }, [animalStates, userData?.animalito, userData?.iconoLocalId, userData?.iconoUrl, userData?.iconosDesbloqueados, userData?.skin, userData?.skinsDesbloqueadas]);

  const accountAge = useMemo(() => registrationAge(userData?.fechaRegistro), [userData?.fechaRegistro]);

  const badgeCatalog = useMemo(() => {
    const evolvingBadge = ({ id, icon, title, value, unit, thresholds, levelOverride, displayValue }) => {
      const level = Number.isInteger(levelOverride) ? levelOverride : thresholds.filter(tier => value >= tier.value).length;
      const currentTier = level > 0 ? BADGE_TIERS[Math.min(level, BADGE_TIERS.length) - 1] : null;
      const currentMilestone = level > 0 ? thresholds[Math.min(level, thresholds.length) - 1] : null;
      const nextMilestone = level < thresholds.length ? thresholds[level] : null;
      const currentValueLabel = displayValue || `${value} ${unit}`;
      return {
        id, icon, title, value, unit, thresholds, targetLevel: level, displayValue: currentValueLabel,
        colors: currentTier?.colors || ['#b9ad9d', '#80766c', '#5e5751'],
        tierName: currentTier?.nombre || 'Sin rango',
        detail: level > 0 ? `${currentTier.nombre} · ${currentValueLabel}` : `Falta: ${thresholds[0].label || `${thresholds[0].value} ${unit}`}`,
        requirement: level < thresholds.length ? (nextMilestone?.requisito || `Consigue ${nextMilestone?.label || `${nextMilestone?.value} ${unit}`}.`) : 'Ya alcanzaste la evolución máxima de esta chapa.',
        earned: level > 0,
        motivo: currentMilestone?.motivo || `Consiguió ${thresholds[0].value} ${unit}.`,
        legendary: level >= BADGE_TIERS.length,
      };
    };
    return [
      evolvingBadge({ id: 'antiguedad_amor', icon: 'favorite', title: 'Historia en Amor', value: accountAge.days, unit: 'días', levelOverride: accountAge.level, displayValue: accountAge.label, thresholds: accountAge.milestones.length ? accountAge.milestones : [
        { value: 1, label: '1 día', requisito: 'Cumple tu primer día formando parte de Amor.', motivo: 'Cumplió su primer día formando parte de Amor.' },
        { value: 6, label: '6 meses', requisito: 'Cumple 6 meses formando parte de Amor.', motivo: 'Cumplió 6 meses compartiendo momentos en Amor.' },
        { value: 12, label: '1 año', requisito: 'Celebra tu primer año dentro de Amor.', motivo: 'Celebró su primer año dentro de Amor.' },
        { value: 24, label: '2 años', requisito: 'Alcanza 2 años de historia dentro de Amor.', motivo: 'Alcanzó 2 años de historia dentro de Amor.' },
      ] }),
      evolvingBadge({ id: 'maestria_hilito', icon: 'all-inclusive', title: 'Maestría en Hilito', value: mastery.nivel, unit: 'niveles', thresholds: [
        { value: 10, requisito: 'Alcanza el nivel 10 en Hilito.', motivo: 'Alcanzó el nivel 10 en Hilito.' },
        { value: 50, requisito: 'Alcanza el nivel 50 en Hilito.', motivo: 'Demostró su experiencia alcanzando el nivel 50 en Hilito.' },
        { value: 100, requisito: 'Alcanza el nivel 100 en Hilito.', motivo: 'Se convirtió en leyenda al alcanzar el nivel 100 en Hilito.' },
        { value: 200, requisito: 'Alcanza el nivel 200 en Hilito.', motivo: 'Superó la leyenda y alcanzó el nivel 200 en Hilito.' },
      ] }),
      evolvingBadge({ id: 'guardian_animalitos', icon: 'pets', title: 'Guardián del bosque', value: ownedAnimals.length, unit: 'Animalitos', thresholds: [
        { value: 1, requisito: 'Desbloquea tu primer Animalito.', motivo: 'Desbloqueó su primer Animalito.' },
        { value: 2, requisito: 'Desbloquea 2 Animalitos diferentes.', motivo: 'Reunió 2 Animalitos diferentes.' },
        { value: 4, requisito: 'Desbloquea 4 Animalitos diferentes.', motivo: 'Formó una familia de 4 Animalitos.' },
        { value: 8, requisito: 'Desbloquea 8 Animalitos diferentes.', motivo: 'Completó una gran colección de 8 Animalitos.' },
      ] }),
      evolvingBadge({ id: 'coleccion_estilo', icon: 'auto-awesome', title: 'Colección de estilo', value: unlockedStyleCount, unit: 'estilos', thresholds: [
        { value: 1, requisito: 'Consigue tu primer icono o traje especial.', motivo: 'Consiguió su primer icono o traje especial.' },
        { value: 3, requisito: 'Consigue 3 iconos o trajes especiales.', motivo: 'Reunió 3 objetos de personalización.' },
        { value: 6, requisito: 'Consigue 6 iconos o trajes especiales.', motivo: 'Construyó una colección de 6 estilos.' },
        { value: 12, requisito: 'Consigue 12 iconos o trajes especiales.', motivo: 'Reunió 12 iconos y trajes especiales.' },
      ] }),
    ];
  }, [accountAge, mastery.nivel, ownedAnimals.length, unlockedStyleCount]);

  useEffect(() => {
    if (soloLectura || !userData?.uid) return;
    const evolving = badgeCatalog.filter(badge => {
      const stored = badgeRecords[badge.id];
      const legacy = legacyBadgeRecord(userData.chapasPerfil, badge.id);
      const previousLevel = Math.max(0, Number((stored || legacy)?.nivel) || 0);
      return !badgeAwardingRef.current.has(badge.id) && ((badge.earned && badge.targetLevel > previousLevel) || (!stored && Boolean(legacy)));
    });
    if (!evolving.length) return;
    evolving.forEach(badge => badgeAwardingRef.current.add(badge.id));
    const awardedAt = new Date();
    Promise.all(evolving.map(async badge => {
      const previous = badgeRecords[badge.id] || legacyBadgeRecord(userData.chapasPerfil, badge.id) || {};
      const previousLevel = Math.max(0, Number(previous.nivel) || 0);
      const nextLevel = Math.max(previousLevel, badge.targetLevel);
      const history = { ...(previous.historial || {}) };
      if (previousLevel > 0 && !history[BADGE_TIERS[previousLevel - 1].id] && previous.obtenidaEn) {
        history[BADGE_TIERS[previousLevel - 1].id] = { obtenidaEn: previous.obtenidaEn, motivo: previous.motivo || badge.thresholds[previousLevel - 1]?.motivo };
      }
      for (let level = previousLevel + 1; level <= nextLevel; level += 1) {
        const tier = BADGE_TIERS[level - 1];
        const milestone = badge.thresholds[level - 1];
        history[tier.id] = { obtenidaEn: milestone.obtenidaEn || awardedAt, motivo: milestone.motivo };
      }
      const currentTier = BADGE_TIERS[nextLevel - 1];
      const currentAcquisition = history[currentTier.id] || { obtenidaEn: awardedAt, motivo: badge.motivo };
      await setDoc(doc(db, 'usuarios', userData.uid, 'chapas', badge.id), {
        badgeId: badge.id,
        nombre: badge.title,
        nivel: nextLevel,
        rango: currentTier.id,
        obtenidaEn: currentAcquisition.obtenidaEn,
        motivo: currentAcquisition.motivo,
        historial: history,
        actualizadaEn: awardedAt,
      }, { merge: true });
    }))
      .then(() => evolving.forEach(badge => badgeAwardingRef.current.delete(badge.id)))
      .catch(() => evolving.forEach(badge => badgeAwardingRef.current.delete(badge.id)));
  }, [badgeCatalog, badgeRecords, soloLectura, userData?.chapasPerfil, userData?.uid]);

  useEffect(() => {
    if (soloLectura || !userData?.uid || legacyCleanupRef.current) return;
    const legacy = userData.chapasPerfil || {};
    if (!Object.keys(legacy).length) return;
    const targets = legacyBadgeTargets(legacy);
    if (targets.some(id => !badgeRecords[id])) return;
    legacyCleanupRef.current = true;
    updateDoc(doc(db, 'usuarios', userData.uid), { chapasPerfil: deleteField() }).catch(() => {
      legacyCleanupRef.current = false;
    });
  }, [badgeRecords, soloLectura, userData?.chapasPerfil, userData?.uid]);

  if (!userData) return <View style={styles.root}><StatusBar hidden /><ExpoImage source={require('../assets/temporadas/neutral.png')} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /></View>;

  const d = userData;
  const nivelPerfil = 1 + Math.floor(d.exp / 100);
  const progresoPerfil = d.exp % 100;
  const avatar = d.iconoLocalId === 'ardilla_bellota' ? require('../assets/inicio/iconos/icono-ardilla-bellota.png') : d.iconoUrl || d.photoURL || ICONO_DEFAULT;
  const animal = ANIMALITOS_POR_ID[d.animalito] || null;
  const animalState = animal ? (animalStates[animal.id] || d.animalitos?.[animal.id] || {}) : {};
  const animalLevel = Math.max(1, Number(animalState.nivel) || 1);
  const animalCards = Math.max(0, Number(animalState.cartas ?? animalState.copias) || 0) + d.cartasAnimalitos;
  const animalNeeded = (2 * animalLevel) + 1;
  const animalProgress = Math.min(100, (animalCards / animalNeeded) * 100);
  const idAmor = `#${d.uid.slice(0, 4).toUpperCase()}-${d.uid.slice(-4).toUpperCase()}`;
  const requestedFrame = FRAME_OPTIONS.some(frame => frame.id === d.marcoPerfil) ? d.marcoPerfil : 'corazon';
  const activeFrame = requestedFrame === 'corazon' || d.marcosDesbloqueados?.[requestedFrame] ? requestedFrame : 'corazon';

  const volver = () => { if (!navigation?.goBack?.()) navigation?.navigate?.('main'); };
  const seleccionarMarco = async frame => {
    if (soloLectura || frameActionRef.current) return;
    frameActionRef.current = true;
    setBusyFrameId(frame.id);
    try {
      const result = await runTransaction(db, async transaction => {
        const userRef = doc(db, 'usuarios', d.uid);
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists()) throw new Error('USUARIO_NO_ENCONTRADO');
        const current = snapshot.data() || {};
        const unlocked = frame.precio === 0 || Boolean(current.marcosComprados?.[frame.id]);
        const money = Math.max(0, Number(current.dinero) || 0);
        if (!unlocked) {
          const frameIndex = FRAME_OPTIONS.findIndex(item => item.id === frame.id);
          const missingPrevious = FRAME_OPTIONS.slice(1, frameIndex).find(item => !current.marcosComprados?.[item.id]);
          if (missingPrevious) {
            const error = new Error('MARCO_ANTERIOR_PENDIENTE');
            error.code = 'MARCO_ANTERIOR_PENDIENTE';
            error.previousName = missingPrevious.nombre;
            throw error;
          }
        }
        if (!unlocked && money < frame.precio) {
          const error = new Error('MONEDAS_INSUFICIENTES');
          error.code = 'MONEDAS_INSUFICIENTES';
          throw error;
        }
        const purchasedMap = { ...(current.marcosComprados || {}), ...(frame.precio > 0 ? { [frame.id]: true } : {}) };
        const unlockedMap = { corazon: true, ...purchasedMap };
        const nextMoney = unlocked ? money : money - frame.precio;
        transaction.update(userRef, { dinero: nextMoney, marcoPerfil: frame.id, marcosComprados: purchasedMap });
        return { purchased: !unlocked, nextMoney, purchasedMap, unlockedMap };
      });
      setUserData(current => current ? { ...current, dinero: result.nextMoney, marcoPerfil: frame.id, marcosComprados: result.purchasedMap, marcosDesbloqueados: result.unlockedMap } : current);
      global.showToast?.({ type: 'success', text1: result.purchased ? 'Marco desbloqueado' : 'Marco equipado', text2: result.purchased ? `${frame.nombre} es tuyo para siempre` : frame.nombre });
    } catch (error) {
      if (error?.code === 'MONEDAS_INSUFICIENTES' || error?.message === 'MONEDAS_INSUFICIENTES') {
        global.showToast?.({ type: 'info', text1: 'Te faltan monedas', text2: `${frame.nombre} cuesta ${numero(frame.precio)}` });
      } else if (error?.code === 'MARCO_ANTERIOR_PENDIENTE' || error?.message === 'MARCO_ANTERIOR_PENDIENTE') {
        global.showToast?.({ type: 'info', text1: 'Todavía no llegaste a este marco', text2: `Primero desbloquea ${error.previousName || 'el marco anterior'}` });
      } else {
        global.showToast?.({ type: 'error', text1: 'No pudimos guardar el marco', text2: 'Tus monedas no fueron modificadas' });
      }
    } finally {
      frameActionRef.current = false;
      setBusyFrameId(null);
    }
  };

  const guardarRinconcito = async draft => {
    if (soloLectura || rinconSaveRef.current || !d.uid) return;
    const safeConfig = normalizeRinconConfig(draft, d, ownedAnimals, animalStates);
    rinconSaveRef.current = true;
    setRinconSaving(true);
    try {
      const savedConfig = { ...safeConfig, actualizadoEn: new Date() };
      await setDoc(doc(db, 'usuarios', d.uid), { rinconcito: savedConfig }, { merge: true });
      setUserData(current => current ? { ...current, rinconcito: savedConfig } : current);
      setSeccionPerfil('principal');
      global.showToast?.({ type: 'success', text1: 'Tu rinconcito quedó precioso', text2: 'Ya se puede ver en tu perfil' });
    } catch {
      global.showToast?.({ type: 'error', text1: 'No pudimos guardar tu rinconcito', text2: 'Tus cambios siguen aquí para que vuelvas a intentar' });
    } finally {
      rinconSaveRef.current = false;
      setRinconSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <ExpoImage source={require('../assets/temporadas/neutral.png')} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      <TabButtons onExit={volver} userMoney={soloLectura ? undefined : d.dinero} onAddSticker={soloLectura ? undefined : () => navigation?.navigate?.('coleccion')} showResources={!soloLectura} />

      <Animated.View style={[styles.book, { opacity: contentReveal }]}>
        <View pointerEvents="none" style={styles.bookTopLight} />
        {seccionPerfil === 'principal' && <View pointerEvents="none" style={styles.bookSpine} />}
        {seccionPerfil === 'marcos' ? <FrameBookPage onBack={() => setSeccionPerfil('principal')} avatar={avatar} selectedFrame={activeFrame} unlockedFrames={d.marcosDesbloqueados} readOnly={soloLectura} onSelect={seleccionarMarco} busyFrameId={busyFrameId} /> : seccionPerfil === 'coleccion' ? <CollectionBookPage onBack={() => setSeccionPerfil('principal')} animals={ANIMALITOS} ownedAnimals={ownedAnimals} animalStates={animalStates} user={d} /> : seccionPerfil === 'rinconcito' && !soloLectura ? <RinconcitoBookPage onBack={() => setSeccionPerfil('principal')} config={rinconConfig} ownedAnimals={ownedAnimals} animalStates={animalStates} user={d} onSave={guardarRinconcito} saving={rinconSaving} /> : <>
        <View style={styles.leftPage}>
          <View style={styles.identityRow}>
            <View style={styles.portraitColumn}>
              <ProfileFrame avatar={avatar} frameId={activeFrame} />
              <NamePlate name={d.nombre} frameId={activeFrame} />
              <Text style={styles.profileQuote}>{legendary ? 'Una leyenda que dejó su marca en Hilito.' : 'Colecciono momentos, no cosas.'}</Text>
            </View>
            <View style={styles.dataCard}>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Nombre</Text><Text style={styles.dataValue}>{d.nombre}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Correo</Text><Text style={styles.dataValue} numberOfLines={1}>{d.correo}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Versión de Amor</Text><Text style={styles.dataValue}>{d.appVersion ? `v${d.appVersion}` : 'Sin registrar'}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>ID de Amor</Text><Text style={styles.dataValue}>{idAmor}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Sexo</Text><Text style={styles.dataValue}>{generoCorto(d.genero)}</Text></View>
              <View style={[styles.dataRow, styles.dataRowLast]}><Text style={styles.dataLabel}>Estado</Text><View style={styles.activeChip}><Text style={styles.activeChipText}>{d.estado === 'activo' ? 'VIGENTE' : String(d.estado).toUpperCase()}</Text></View></View>
            </View>
          </View>

          <LinearGradient colors={['#76509e', '#9c70bd', '#68468e']} style={styles.statsPanel}>
            <Stat icon="pets" value={ownedAnimals.length} label="ANIMALITOS" color="#ffe080" />
            <View style={styles.statSeparator} />
            <Stat icon="star" value={numero(d.exp)} label="EXP TOTAL" color="#ffe080" />
            <View style={styles.statSeparator} />
            <Stat emoji="🪙" value={numero(d.dinero)} label="MONEDAS" />
            <View style={styles.statSeparator} />
            <Stat icon="diamond" value={numero(d.diamantes)} label="DIAMANTES" color="#62ddf0" />
          </LinearGradient>

          <RinconcitoPreview config={rinconConfig} readOnly={soloLectura} ownerName={d.nombre} onPress={() => setSeccionPerfil('rinconcito')} />
        </View>

        <View style={styles.rightPage}>
          <View style={styles.sectionHeaderPink}><Text style={styles.sectionHeaderText}>MIS CHAPAS</Text><View style={styles.headerPaw}><MaterialIcons name="pets" size={11} color="#fff1d7" /></View></View>
          <View style={styles.badgesGrid}>
            {badgeCatalog.map(badge => {
              const persisted = badgeRecords[badge.id] || legacyBadgeRecord(d.chapasPerfil, badge.id);
              const persistedLevel = Math.max(0, Number(persisted?.nivel) || 0);
              const effectiveLevel = Math.max(badge.targetLevel, persistedLevel);
              const effectiveTier = effectiveLevel > 0 ? BADGE_TIERS[Math.min(effectiveLevel, BADGE_TIERS.length) - 1] : null;
              const milestone = effectiveLevel > 0 ? badge.thresholds[Math.min(effectiveLevel, badge.thresholds.length) - 1] : null;
              const obtained = persistedLevel >= effectiveLevel ? persisted : effectiveLevel > 0 ? { nivel: effectiveLevel, rango: effectiveTier?.id, obtenidaEn: milestone?.obtenidaEn || null, motivo: milestone?.motivo } : null;
              return <ProfileBadge key={badge.id} {...badge} obtained={obtained} earnedReason={milestone?.motivo} expanded={openBadgeId === badge.id} onExpandedChange={open => setOpenBadgeId(open ? badge.id : null)} targetLevel={effectiveLevel} tierName={effectiveTier?.nombre || 'Sin rango'} colors={effectiveTier?.colors || badge.colors} legendary={effectiveLevel >= BADGE_TIERS.length} detail={effectiveTier ? `${effectiveTier.nombre} · ${badge.displayValue || `${badge.value} ${badge.unit}`}` : badge.detail} />;
            })}
          </View>

          <View style={styles.styleHeader}><MaterialIcons name="brush" size={14} color="#fff4db" /><Text style={styles.styleHeaderText}>MI ESTILO</Text><Text style={styles.styleHint}>Toca una tarjeta para cambiarla</Text></View>
          <View style={styles.styleRow}>
            <TouchableOpacity style={styles.styleCard} onPress={() => !soloLectura && navigation?.navigate?.('iconos')} disabled={soloLectura} activeOpacity={0.82}>
              <Text style={styles.styleLabel}>ICONO</Text><ExpoImage source={sourceFor(avatar)} style={styles.styleAvatar} contentFit="cover" cachePolicy="memory-disk" /><View style={styles.styleAction}><Text style={styles.styleValue}>{soloLectura ? 'Actual' : 'Cambiar'}</Text><MaterialIcons name="chevron-right" size={10} color="#8b6348" /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.styleCard} onPress={() => setSeccionPerfil('marcos')} activeOpacity={0.82}>
              <Text style={styles.styleLabel}>MARCO</Text><ProfileFrame avatar={avatar} frameId={activeFrame} compact /><Text style={styles.styleValue} numberOfLines={1}>{FRAME_OPTIONS.find(frame => frame.id === activeFrame)?.nombre}</Text>
            </TouchableOpacity>
            <View style={styles.styleCard}><Text style={styles.styleLabel}>NIVEL DE PERFIL</Text><View style={styles.profileLevelCircle}><Text style={styles.profileLevelNumber}>{nivelPerfil}</Text></View><View style={styles.levelTrack}><View style={[styles.levelFill, { width: `${progresoPerfil}%` }]} /></View></View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.favoriteAnimalCard}>
              <View style={styles.blueRibbon}><Text style={styles.ribbonText}>ANIMALITO EQUIPADO</Text></View>
              <Player uid={d.uid} containerStyle={styles.favoriteAnimalContainer} imageStyle={styles.favoriteAnimalImage} placeholder={<SinAnimal />} />
              <View style={styles.favoriteInfo}><Text style={styles.favoriteName}>{animal?.nombre || 'Sin equipar'}</Text><Text style={styles.favoriteNature}>{animal ? `${animal.rareza} · ${String(animal.temporada).toUpperCase()}` : 'Elige un compañero'}</Text><View style={styles.animalLevelRow}><View style={styles.animalLevelBadge}><Text style={styles.animalLevelText}>{animalLevel}</Text></View><View style={styles.animalProgressWrap}><View style={styles.animalTrack}><View style={[styles.animalFill, { width: `${animalProgress}%` }]} /></View><Text style={styles.animalCards}>{animal ? `${animalCards}/${animalNeeded} cartas` : '—'}</Text></View></View></View>
            </View>
            <TouchableOpacity style={styles.collectionAccess} onPress={() => setSeccionPerfil('coleccion')} activeOpacity={0.84}>
              <LinearGradient colors={['#f2cd75', '#ca8e37']} style={styles.collectionIcon}><MaterialIcons name="pets" size={22} color="#fff8dc" /></LinearGradient>
              <View style={styles.collectionText}><Text style={styles.collectionEyebrow}>MI COLECCIÓN</Text><Text style={styles.collectionTitle}>{ownedAnimals.length} Animalito{ownedAnimals.length === 1 ? '' : 's'}</Text><Text style={styles.collectionSubtitle}>Ver compañeros y trajes</Text></View>
              <MaterialIcons name="chevron-right" size={17} color="#9b6630" />
            </TouchableOpacity>
          </View>
        </View>
        </>}
      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#30251f' },
  backgroundGlow: { position: 'absolute', top: -160, left: '17%', width: 520, height: 300, borderRadius: 260, backgroundColor: 'rgba(255,205,129,0.12)' },
  backgroundLeafOne: { position: 'absolute', left: -55, bottom: -65, width: 180, height: 125, borderRadius: 90, backgroundColor: 'rgba(70,107,72,0.27)', transform: [{ rotate: '24deg' }] },
  backgroundLeafTwo: { position: 'absolute', right: -40, top: 60, width: 130, height: 90, borderRadius: 70, backgroundColor: 'rgba(149,81,82,0.18)', transform: [{ rotate: '-28deg' }] },
  book: { position: 'absolute', top: 38, bottom: 7, left: 56, right: 13, flexDirection: 'row', borderRadius: 15, overflow: 'hidden', backgroundColor: '#f6e6c3', borderWidth: 4, borderColor: '#80502f', shadowColor: '#100a07', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.72, shadowRadius: 14, elevation: 20 },
  bookTopLight: { position: 'absolute', top: 2, left: 8, right: 8, height: 8, zIndex: 4, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: 'rgba(255,255,255,0.42)' },
  bookSpine: { position: 'absolute', zIndex: 8, left: '49.65%', top: 0, bottom: 0, width: 8, backgroundColor: 'rgba(130,79,43,0.16)', borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(112,67,36,0.18)', shadowColor: '#6a3e26', shadowOpacity: 0.3, shadowRadius: 5 },
  leftPage: { width: '50%', paddingHorizontal: 9, paddingTop: 10, paddingBottom: 8, backgroundColor: '#f9ebcc', borderRightWidth: 1, borderRightColor: 'rgba(132,86,49,0.24)' },
  rightPage: { width: '50%', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8, backgroundColor: '#f7e7c7' },
  identityRow: { height: 118, flexDirection: 'row', gap: 8 },
  portraitColumn: { width: '36%', alignItems: 'center' },
  frameWrap: { width: 82, height: 80, padding: 1 },
  frameWrapCompact: { width: 34, height: 34, padding: 0 },
  frameWrapCatalog: { width: 56, height: 53, padding: 1 },
  frameOuter: { flex: 1, padding: 4, justifyContent: 'center', alignItems: 'center', shadowColor: '#4b281c', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.45, shadowRadius: 5, elevation: 7 },
  frameOuterCompact: { padding: 2, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 },
  frameOuterCatalog: { padding: 3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3 },
  frameOuter_corazon: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, borderWidth: 1.5, borderColor: '#963c58' },
  frameOuter_bosque: { borderTopLeftRadius: 26, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 24, borderWidth: 1.5, borderColor: '#315b3d' },
  frameOuter_noche: { borderRadius: 7, borderTopLeftRadius: 18, borderBottomRightRadius: 18, borderWidth: 1.5, borderColor: '#303265' },
  frameOuter_aurora: { borderTopLeftRadius: 6, borderTopRightRadius: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 6, borderWidth: 1.5, borderColor: '#5375a8' },
  frameOuter_jardin: { borderRadius: 23, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 1.5, borderColor: '#8a426d' },
  frameOuter_marea: { borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 27, borderBottomRightRadius: 27, borderWidth: 1.5, borderColor: '#28637c' },
  frameOuter_sakura: { borderTopLeftRadius: 27, borderTopRightRadius: 27, borderBottomLeftRadius: 5, borderBottomRightRadius: 18, borderWidth: 1.5, borderColor: '#a45c76' },
  frameOuter_llama: { borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, borderWidth: 2, borderColor: '#8f2d20' },
  frameOuter_esmeralda: { borderRadius: 4, borderTopLeftRadius: 19, borderBottomRightRadius: 19, borderWidth: 2, borderColor: '#165141' },
  frameOuter_lavanda: { borderRadius: 28, borderWidth: 1.5, borderColor: '#634783' },
  frameOuter_eclipse: { borderTopLeftRadius: 5, borderTopRightRadius: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 5, borderWidth: 2, borderColor: '#3e3240' },
  frameOuter_infinito: { borderRadius: 11, borderWidth: 2, borderColor: '#28265e' },
  frameOuterCompact_corazon: { borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
  frameOuterCompact_bosque: { borderTopLeftRadius: 13, borderTopRightRadius: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 12 },
  frameOuterCompact_noche: { borderRadius: 4, borderTopLeftRadius: 9, borderBottomRightRadius: 9 },
  frameOuterCompact_aurora: { borderTopLeftRadius: 3, borderTopRightRadius: 13, borderBottomLeftRadius: 13, borderBottomRightRadius: 3 },
  frameOuterCompact_jardin: { borderRadius: 12, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  frameOuterCompact_marea: { borderTopLeftRadius: 3, borderTopRightRadius: 3, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  frameOuterCompact_sakura: { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 3, borderBottomRightRadius: 9 },
  frameOuterCompact_llama: { borderTopLeftRadius: 3, borderTopRightRadius: 3, borderBottomLeftRadius: 13, borderBottomRightRadius: 13 },
  frameOuterCompact_esmeralda: { borderRadius: 2, borderTopLeftRadius: 10, borderBottomRightRadius: 10 },
  frameOuterCompact_lavanda: { borderRadius: 15 },
  frameOuterCompact_eclipse: { borderTopLeftRadius: 3, borderTopRightRadius: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 3 },
  frameOuterCompact_infinito: { borderRadius: 6 },
  frameInner: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#efb6ae', borderWidth: 1.5, borderColor: 'rgba(255,248,220,0.86)' },
  frameInnerCompact: { borderWidth: 1 },
  frameInnerCatalog: { borderWidth: 1.2 },
  frameInner_corazon: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 11, borderBottomRightRadius: 11 },
  frameInner_bosque: { borderTopLeftRadius: 20, borderTopRightRadius: 5, borderBottomLeftRadius: 5, borderBottomRightRadius: 18 },
  frameInner_noche: { borderRadius: 4, borderTopLeftRadius: 13, borderBottomRightRadius: 13, borderColor: 'rgba(224,224,255,0.9)' },
  frameInner_aurora: { borderTopLeftRadius: 3, borderTopRightRadius: 19, borderBottomLeftRadius: 19, borderBottomRightRadius: 3, borderColor: '#e5ffff' },
  frameInner_jardin: { borderRadius: 18, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, borderColor: '#ffe7e9' },
  frameInner_marea: { borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 21, borderBottomRightRadius: 21, borderColor: '#e8ffff' },
  frameInner_sakura: { borderTopLeftRadius: 21, borderTopRightRadius: 21, borderBottomLeftRadius: 3, borderBottomRightRadius: 13, borderColor: '#fff1e9' },
  frameInner_llama: { borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 19, borderBottomRightRadius: 19, borderColor: '#fff0ae' },
  frameInner_esmeralda: { borderRadius: 2, borderTopLeftRadius: 14, borderBottomRightRadius: 14, borderColor: '#e5ffc5' },
  frameInner_lavanda: { borderRadius: 22, borderColor: '#f9eaff' },
  frameInner_eclipse: { borderTopLeftRadius: 3, borderTopRightRadius: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 3, borderColor: '#fff0ad' },
  frameInner_infinito: { borderRadius: 7, borderColor: '#dce3ff' },
  frameInnerCompact_corazon: { borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  frameInnerCompact_bosque: { borderTopLeftRadius: 10, borderTopRightRadius: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 9 },
  frameInnerCompact_noche: { borderRadius: 2, borderTopLeftRadius: 7, borderBottomRightRadius: 7 },
  frameInnerCompact_aurora: { borderTopLeftRadius: 2, borderTopRightRadius: 9, borderBottomLeftRadius: 9, borderBottomRightRadius: 2 },
  frameInnerCompact_jardin: { borderRadius: 9, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  frameInnerCompact_marea: { borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  frameInnerCompact_sakura: { borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 2, borderBottomRightRadius: 7 },
  frameInnerCompact_llama: { borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
  frameInnerCompact_esmeralda: { borderRadius: 1, borderTopLeftRadius: 7, borderBottomRightRadius: 7 },
  frameInnerCompact_lavanda: { borderRadius: 11 },
  frameInnerCompact_eclipse: { borderTopLeftRadius: 2, borderTopRightRadius: 11, borderBottomLeftRadius: 11, borderBottomRightRadius: 2 },
  frameInnerCompact_infinito: { borderRadius: 4 },
  frameImage: { width: '100%', height: '100%' },
  frameHeartSeal: { position: 'absolute', top: -7, alignSelf: 'center', width: 25, height: 20, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d65272', borderWidth: 1.5, borderColor: '#ffe0c2', shadowColor: '#7d2844', shadowOpacity: 0.55, shadowRadius: 3, elevation: 8 },
  frameSealCompact: { top: -4, width: 13, height: 11, borderRadius: 7, borderWidth: 0.8 },
  frameHeartJewel: { position: 'absolute', bottom: 2, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ffd9df', borderWidth: 1, borderColor: '#a94462', shadowColor: '#fff1e7', shadowOpacity: 0.8, shadowRadius: 2 },
  frameHeartJewelLeft: { left: 13 },
  frameHeartJewelRight: { right: 13 },
  frameHeartDot: { position: 'absolute', bottom: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffd9bd', borderWidth: 1, borderColor: '#9d3f5b' },
  frameForestLeaf: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4c7d4d', borderWidth: 1, borderColor: '#dbeaaf', shadowColor: '#23462d', shadowOpacity: 0.5, shadowRadius: 2, elevation: 7 },
  frameForestLeafTop: { top: -5, left: 5, width: 23, height: 18, borderTopLeftRadius: 13, borderBottomRightRadius: 13, transform: [{ rotate: '-8deg' }] },
  frameForestLeafBottom: { right: 4, bottom: -4, width: 21, height: 16, borderTopLeftRadius: 12, borderBottomRightRadius: 12, transform: [{ rotate: '8deg' }] },
  frameLeafCompact: { top: -3, left: 2, width: 13, height: 10, borderTopLeftRadius: 7, borderBottomRightRadius: 7, borderWidth: 0.7 },
  frameForestKnot: { position: 'absolute', bottom: 2, left: 8, width: 7, height: 5, borderRadius: 4, borderWidth: 1, borderColor: '#d7e9aa', backgroundColor: '#527649' },
  frameMoonSeal: { position: 'absolute', top: -7, left: 5, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#414577', borderWidth: 1.5, borderColor: '#ddd8ff', shadowColor: '#27264e', shadowOpacity: 0.65, shadowRadius: 3, elevation: 8 },
  frameNightStar: { position: 'absolute', width: 5, height: 5, backgroundColor: '#fff0aa', transform: [{ rotate: '45deg' }], shadowColor: '#fff2a2', shadowOpacity: 0.9, shadowRadius: 3, elevation: 7 },
  frameNightStarOne: { top: 2, right: 7 },
  frameNightStarTwo: { top: 7, right: 19, width: 3, height: 3 },
  frameNightStarThree: { bottom: -2, left: 18, width: 4, height: 4 },
  frameCornerSealCompact: { top: -3, right: 1, width: 13, height: 11, borderRadius: 4, borderWidth: 0.8 },
  frameAuroraSeal: { position: 'absolute', top: -6, right: 4, width: 24, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5d86b8', borderWidth: 1.5, borderColor: '#e4ffff', shadowColor: '#583d87', shadowOpacity: 0.65, shadowRadius: 4, elevation: 9 },
  frameAuroraShard: { position: 'absolute', width: 7, height: 7, backgroundColor: '#d9ffff', borderWidth: 1, borderColor: '#6d5aa8', transform: [{ rotate: '45deg' }] },
  frameAuroraShardOne: { left: 4, bottom: -2 },
  frameAuroraShardTwo: { left: 16, bottom: 1, width: 4, height: 4 },
  frameAuroraShardThree: { right: 7, top: 13, width: 4, height: 4 },
  frameGardenSeal: { position: 'absolute', top: -7, alignSelf: 'center', width: 25, height: 21, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b64f7c', borderWidth: 1.5, borderColor: '#ffe6ca', shadowColor: '#6f2c58', shadowOpacity: 0.6, shadowRadius: 3, elevation: 9 },
  frameGardenPetal: { position: 'absolute', width: 6, height: 4, borderRadius: 4, backgroundColor: '#ffd9e3', borderWidth: 0.7, borderColor: '#a94b72' },
  frameGardenPetalOne: { left: 6, top: 7, transform: [{ rotate: '-28deg' }] },
  frameGardenPetalTwo: { right: 7, top: 10, transform: [{ rotate: '30deg' }] },
  frameGardenPetalThree: { alignSelf: 'center', bottom: -2 },
  frameGardenPetalFour: { left: 17, bottom: 2, width: 4, height: 6, transform: [{ rotate: '18deg' }] },
  frameTideSeal: { position: 'absolute', bottom: -6, alignSelf: 'center', width: 25, height: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#347fa0', borderWidth: 1.5, borderColor: '#e9ffff', shadowColor: '#153f59', shadowOpacity: 0.65, shadowRadius: 3, elevation: 9 },
  frameTideSealCompact: { bottom: -3, width: 13, height: 11, borderRadius: 6, borderWidth: 0.8 },
  framePearl: { position: 'absolute', top: -3, right: 7, width: 11, height: 11, borderRadius: 6, backgroundColor: '#ecffff', borderWidth: 1, borderColor: '#4a829a', elevation: 7 },
  framePearlLight: { position: 'absolute', top: 2, left: 2, width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' },
  frameBubble: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(224,253,255,0.75)', borderWidth: 0.8, borderColor: '#3d829f' },
  frameBubbleOne: { left: 6, top: 5 },
  frameBubbleTwo: { left: 16, top: 1, width: 4, height: 4 },
  frameBubbleThree: { right: 6, bottom: 12, width: 4, height: 4 },
  frameSakuraSeal: { position: 'absolute', top: -6, right: 4, width: 23, height: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d56f91', borderWidth: 1.5, borderColor: '#fff0dc', shadowColor: '#74405e', shadowOpacity: 0.55, shadowRadius: 3, elevation: 9 },
  frameSakuraPetal: { position: 'absolute', width: 6, height: 4, borderRadius: 4, backgroundColor: '#fff0ec', borderWidth: 0.7, borderColor: '#c36d89' },
  frameSakuraPetalOne: { left: 8, bottom: 4, transform: [{ rotate: '-25deg' }] },
  frameSakuraPetalTwo: { left: 27, top: 2, transform: [{ rotate: '18deg' }] },
  frameSakuraPetalThree: { right: 7, bottom: 3, transform: [{ rotate: '38deg' }] },
  frameSakuraPetalFour: { left: 17, bottom: 9, width: 4, height: 6, transform: [{ rotate: '-12deg' }] },
  frameFlameSeal: { position: 'absolute', bottom: -7, alignSelf: 'center', width: 27, height: 22, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c64928', borderWidth: 1.5, borderColor: '#ffe6a1', shadowColor: '#711d16', shadowOpacity: 0.75, shadowRadius: 4, elevation: 10 },
  frameEmber: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff09b', shadowColor: '#ffb32d', shadowOpacity: 1, shadowRadius: 3, elevation: 8 },
  frameEmberOne: { top: -2, left: 8 },
  frameEmberTwo: { top: 4, right: 8, width: 3, height: 3 },
  frameEmberThree: { top: 12, left: 4, width: 3, height: 3 },
  frameEmberFour: { bottom: 12, right: 5, width: 4, height: 4 },
  frameEmeraldSeal: { position: 'absolute', top: -8, alignSelf: 'center', width: 28, height: 23, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#27775c', borderWidth: 1.5, borderColor: '#eaffb5', shadowColor: '#123f33', shadowOpacity: 0.75, shadowRadius: 4, elevation: 10 },
  frameEmeraldMiniGem: { position: 'absolute', top: 5, width: 7, height: 7, backgroundColor: '#caffb8', borderWidth: 1, borderColor: '#1b5b48', transform: [{ rotate: '45deg' }] },
  frameEmeraldMiniGemLeft: { left: 5 },
  frameEmeraldMiniGemRight: { right: 5 },
  frameEmeraldGem: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 10, height: 10, backgroundColor: '#bdffb1', borderWidth: 1.5, borderColor: '#17513f', transform: [{ rotate: '45deg' }], elevation: 8 },
  frameLavenderSeal: { position: 'absolute', top: -7, alignSelf: 'center', width: 26, height: 20, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c5aa5', borderWidth: 1.5, borderColor: '#f8e5ff', shadowColor: '#493366', shadowOpacity: 0.65, shadowRadius: 4, elevation: 9 },
  frameLavenderSpark: { position: 'absolute', width: 5, height: 5, backgroundColor: '#fff0ff', transform: [{ rotate: '45deg' }], shadowColor: '#f5d9ff', shadowOpacity: 1, shadowRadius: 3 },
  frameLavenderSparkOne: { left: 5, top: 17 },
  frameLavenderSparkTwo: { right: 5, bottom: 16 },
  frameLavenderOrb: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#f3ddff', elevation: 7 },
  frameEclipseSeal: { position: 'absolute', top: -6, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#d3a64f', borderWidth: 1.5, borderColor: '#fff0a7', shadowColor: '#161423', shadowOpacity: 0.85, shadowRadius: 5, elevation: 10 },
  frameEclipseSun: { position: 'absolute', top: 4, left: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#ffe78a' },
  frameEclipseMoon: { position: 'absolute', top: 2, left: 8, width: 14, height: 14, borderRadius: 7, backgroundColor: '#29263d' },
  frameEclipseGem: { position: 'absolute', bottom: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff0a0', borderWidth: 1, borderColor: '#413240' },
  frameEclipseGemLeft: { left: 14 },
  frameEclipseGemRight: { right: 14 },
  frameEclipseHalo: { position: 'absolute', left: 4, bottom: 9, width: 12, height: 12, borderRadius: 6, backgroundColor: '#2c293d', borderWidth: 2, borderColor: '#f0c969', shadowColor: '#ffe28b', shadowOpacity: 0.75, shadowRadius: 4 },
  frameInfinitySeal: { position: 'absolute', top: -8, alignSelf: 'center', width: 31, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3e438e', borderWidth: 1.5, borderColor: '#e3e8ff', shadowColor: '#161743', shadowOpacity: 0.85, shadowRadius: 5, elevation: 10 },
  frameConstellationStar: { position: 'absolute', width: 6, height: 6, backgroundColor: '#f2e7ff', transform: [{ rotate: '45deg' }], shadowColor: '#d8dfff', shadowOpacity: 1, shadowRadius: 4, elevation: 9 },
  frameConstellationOne: { top: 4, left: 6 },
  frameConstellationTwo: { top: 15, right: 6, width: 4, height: 4 },
  frameConstellationThree: { bottom: 5, left: 13, width: 4, height: 4 },
  frameInfinityPlate: { position: 'absolute', bottom: -5, alignSelf: 'center', width: 27, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#363a82', borderWidth: 1.2, borderColor: '#e2e6ff', elevation: 9 },
  namePlateWrap: { width: '96%', height: 25, marginTop: -1, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  namePlateShadow: { position: 'absolute', left: 5, right: 5, bottom: 0, height: 20, borderRadius: 9, backgroundColor: 'rgba(83,45,30,0.38)', transform: [{ translateY: 2 }], elevation: 3 },
  namePlateBody: { width: '100%', height: 22, padding: 2, borderRadius: 8, borderWidth: 1.3, shadowColor: '#4d291c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.34, shadowRadius: 2, elevation: 5 },
  namePlateInner: { flex: 1, minWidth: 0, paddingHorizontal: 4, borderRadius: 6, borderWidth: 0.8, borderColor: 'rgba(255,245,213,0.72)', flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(105,55,45,0.08)' },
  namePlateAccent: { width: 13, height: 13, borderRadius: 7, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 0.8 },
  namePlateText: { flex: 1, minWidth: 0, color: '#6b392c', fontSize: 10.2, lineHeight: 13, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(255,246,215,0.74)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0.8 },
  namePlateJewel: { position: 'absolute', bottom: -3, alignSelf: 'center', width: 7, height: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 0.8, transform: [{ rotate: '45deg' }] },
  namePlateJewelCore: { width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: '#fff3c6' },
  profileQuote: { marginTop: 3, color: '#805a3f', fontSize: 6.1, lineHeight: 7.5, fontWeight: '800', textAlign: 'center' },
  dataCard: { flex: 1, height: 115, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(168,114,67,0.32)', backgroundColor: 'rgba(255,248,226,0.66)' },
  dataRow: { flex: 1, minHeight: 17, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.8, borderBottomColor: 'rgba(171,125,76,0.18)', gap: 5 },
  dataRowLast: { borderBottomWidth: 0 },
  dataLabel: { width: '40%', color: '#a4673b', fontSize: 6.7, fontWeight: '900' },
  dataValue: { flex: 1, color: '#3f2b20', fontSize: 7.2, fontWeight: '800' },
  activeChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#dce8bc', borderWidth: 0.8, borderColor: '#a5be72' },
  activeChipText: { color: '#648440', fontSize: 6.1, fontWeight: '900', letterSpacing: 0.5 },
  statsPanel: { height: 55, marginTop: 4, marginLeft: '10%', marginRight: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderWidth: 1.5, borderColor: '#624083', shadowColor: '#50356c', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.34, shadowRadius: 4, elevation: 5 },
  bigStat: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  statSeparator: { width: 1, height: 31, backgroundColor: 'rgba(255,255,255,0.24)' },
  statEmoji: { fontSize: 14, lineHeight: 17 },
  bigStatValue: { maxWidth: '94%', color: '#fff8df', fontSize: 9.5, lineHeight: 11, fontWeight: '900', textShadowColor: 'rgba(48,28,72,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  bigStatLabel: { color: '#f3e4ff', fontSize: 5, fontWeight: '900', letterSpacing: 0.25 },
  sectionHeaderPink: { alignSelf: 'center', minWidth: 140, height: 24, marginBottom: 5, paddingHorizontal: 16, borderRadius: 7, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d7647c', borderWidth: 1, borderColor: '#a9435b', shadowColor: '#8f4353', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 2, elevation: 3 },
  headerPaw: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(126,42,65,0.35)' },
  sectionHeaderText: { color: '#fff4dc', fontSize: 8, fontWeight: '900', letterSpacing: 0.35 },
  rinconPreview: { flex: 1, minHeight: 82, position: 'relative', overflow: 'hidden', marginTop: 5, marginHorizontal: 1, borderRadius: 11, borderWidth: 1.4, borderColor: '#785435', shadowColor: '#55331f', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.34, shadowRadius: 4, elevation: 5 },
  rinconScene: { flex: 1, minHeight: 78, position: 'relative', overflow: 'hidden', borderRadius: 9, borderWidth: 0.7 },
  rinconSceneLarge: { minHeight: 190, borderRadius: 13, borderWidth: 1.2 },
  rinconSun: { position: 'absolute', top: 10, right: '13%', width: 28, height: 28, borderRadius: 14, opacity: 0.72, shadowColor: '#fff4a5', shadowOpacity: 0.7, shadowRadius: 8, elevation: 2 },
  rinconSunLarge: { top: 18, width: 48, height: 48, borderRadius: 24, shadowRadius: 12 },
  rinconCloud: { position: 'absolute', width: 65, height: 17, borderRadius: 12, backgroundColor: 'rgba(255,255,246,0.28)' },
  rinconCloudLeft: { left: -12, top: 27, transform: [{ rotate: '-5deg' }] },
  rinconCloudRight: { right: -19, top: 42, transform: [{ rotate: '7deg' }] },
  rinconCloudLarge: { width: 115, height: 28, borderRadius: 18 },
  rinconHillBack: { position: 'absolute', left: -30, right: '32%', bottom: 9, height: 50, borderTopRightRadius: 85, transform: [{ rotate: '4deg' }] },
  rinconHillBackLarge: { left: -45, bottom: 14, height: 105, borderTopRightRadius: 145 },
  rinconHillFront: { position: 'absolute', left: '24%', right: -35, bottom: -26, height: 75, borderTopLeftRadius: 100, transform: [{ rotate: '-3deg' }] },
  rinconHillFrontLarge: { right: -55, bottom: -42, height: 145, borderTopLeftRadius: 180 },
  rinconSpark: { position: 'absolute', width: 3, height: 3, borderRadius: 2, opacity: 0.72 },
  rinconSparkLarge: { width: 5, height: 5, borderRadius: 3 },
  rinconDecoration: { position: 'absolute', zIndex: 2, bottom: 17, width: 30, height: 32, alignItems: 'center', justifyContent: 'flex-end' },
  rinconDecorationLarge: { bottom: 27, width: 57, height: 62 },
  rinconDecorationLeft: { left: '12%' },
  rinconDecorationRight: { right: '12%' },
  rinconDecorationShadow: { position: 'absolute', bottom: 0, width: 28, height: 7, borderRadius: 10, backgroundColor: 'rgba(49,37,28,0.25)' },
  rinconDecorationShadowLarge: { width: 50, height: 11 },
  rinconDecorationMedal: { width: 26, height: 26, marginBottom: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,247,214,0.72)', transform: [{ rotate: '-3deg' }], shadowColor: '#4d3022', shadowOpacity: 0.28, shadowRadius: 2, elevation: 3 },
  rinconDecorationMedalLarge: { width: 48, height: 48, marginBottom: 5, borderRadius: 16, borderWidth: 1.5, shadowRadius: 4 },
  rinconPlatform: { position: 'absolute', zIndex: 1, bottom: 9, alignSelf: 'center', width: 105, height: 17, borderRadius: 55, borderWidth: 1, transform: [{ scaleY: 0.45 }], shadowColor: '#432e24', shadowOpacity: 0.35, shadowRadius: 3, elevation: 2 },
  rinconPlatformLarge: { bottom: 15, width: 185, height: 30, borderWidth: 1.5, shadowRadius: 5 },
  rinconAnimal: { position: 'absolute', zIndex: 3, bottom: 7, alignSelf: 'center', width: 98, height: 76 },
  rinconAnimalLarge: { bottom: 15, width: 190, height: 158 },
  rinconNoAnimal: { position: 'absolute', zIndex: 3, bottom: 20, alignSelf: 'center', alignItems: 'center' },
  rinconNoAnimalLarge: { bottom: 48 },
  rinconNoAnimalText: { marginTop: 1, color: 'rgba(255,250,229,0.9)', fontSize: 5.4, fontWeight: '900' },
  rinconNoAnimalTextLarge: { marginTop: 4, fontSize: 7 },
  rinconAnimalName: { position: 'absolute', zIndex: 5, right: 7, bottom: 22, maxWidth: 76, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(255,247,220,0.84)', borderWidth: 0.7, borderColor: 'rgba(110,72,43,0.3)', alignItems: 'center' },
  rinconAnimalNameLarge: { right: 12, bottom: 32, maxWidth: 108, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 11 },
  rinconAnimalNameText: { color: '#533722', fontSize: 6.1, lineHeight: 7, fontWeight: '900' },
  rinconAnimalNameTextLarge: { fontSize: 9.5, lineHeight: 11 },
  rinconSkinName: { color: '#8d6749', fontSize: 4.7, lineHeight: 6, fontWeight: '800' },
  rinconSkinNameLarge: { fontSize: 6.2, lineHeight: 8 },
  rinconPreviewTop: { position: 'absolute', zIndex: 8, top: 0, left: 0, right: 0, height: 34, paddingHorizontal: 9, paddingTop: 5, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  rinconPreviewEyebrow: { color: '#f8ddae', fontSize: 4.7, lineHeight: 6, fontWeight: '900', letterSpacing: 0.65 },
  rinconPreviewTitle: { color: '#fff9e4', fontSize: 10.2, lineHeight: 12, fontWeight: '900', textShadowColor: 'rgba(42,25,17,0.65)', textShadowRadius: 2 },
  rinconEditChip: { height: 18, marginTop: 1, paddingHorizontal: 7, borderRadius: 9, flexDirection: 'row', gap: 3, alignItems: 'center', backgroundColor: 'rgba(255,240,199,0.92)', borderWidth: 0.8, borderColor: 'rgba(112,72,39,0.55)' },
  rinconEditChipText: { color: '#6b4327', fontSize: 4.8, fontWeight: '900', letterSpacing: 0.35 },
  rinconPreviewBottom: { position: 'absolute', zIndex: 8, left: 5, right: 5, bottom: 4, minHeight: 18, paddingLeft: 7, paddingRight: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(60,44,31,0.7)', borderWidth: 0.7, borderColor: 'rgba(255,244,216,0.34)' },
  rinconPreviewHint: { flex: 1, color: '#fff4dc', fontSize: 5.5, lineHeight: 7, fontWeight: '800' },
  badgesGrid: { height: 84, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: 'rgba(150,102,60,0.17)' },
  badgeItem: { width: '24%', height: 82, position: 'relative' },
  badgeFace: { ...StyleSheet.absoluteFillObject, alignItems: 'center', backfaceVisibility: 'hidden' },
  badgeFront: { width: '100%', height: '100%', alignItems: 'center' },
  badgeBack: { width: 55, height: 55, position: 'relative', justifyContent: 'flex-start', alignItems: 'center' },
  badgeBackMedal: { width: 51, height: 51, borderRadius: 26, paddingHorizontal: 3, paddingVertical: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#f8df9c', shadowColor: '#6d4932', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.36, shadowRadius: 3, elevation: 5 },
  badgeBackMedalLegend: { width: 53, height: 53, borderRadius: 27, marginTop: -2, shadowColor: '#f3bd39', shadowOpacity: 0.85, shadowRadius: 7, elevation: 9 },
  badgeBackTier: { color: '#fff1c6', fontSize: 4.2, lineHeight: 5, fontWeight: '900', letterSpacing: 0.35 },
  badgeBackTitle: { marginTop: 1, color: '#fff7df', fontSize: 3.8, lineHeight: 4.4, fontWeight: '900', textAlign: 'center' },
  badgeBackReason: { marginTop: 1, color: '#fff4dd', fontSize: 3.3, lineHeight: 3.9, fontWeight: '700', textAlign: 'center' },
  badgeQuestion: { position: 'absolute', top: -3, right: -1, width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff7dc', borderWidth: 1, borderColor: 'rgba(92,54,35,0.55)', shadowColor: '#47291b', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 1.5, elevation: 4 },
  badgeQuestionActive: { backgroundColor: '#f4ca6b', borderColor: '#81502b' },
  badgeQuestionText: { color: '#744a2d', fontSize: 7, lineHeight: 8, fontWeight: '900' },
  badgeWing: { position: 'absolute', top: 15, width: 22, height: 12, borderRadius: 9, backgroundColor: '#d7af66', borderWidth: 1, borderColor: '#9d6e30' },
  badgeWingLeft: { left: 5, transform: [{ rotate: '-28deg' }] },
  badgeWingRight: { right: 5, transform: [{ rotate: '28deg' }] },
  badgeWingLegend: { backgroundColor: '#ffe28a', borderColor: '#b97818' },
  badgeLocked: { opacity: 0.48, backgroundColor: '#9a9085', borderColor: '#716860' },
  badgeMedal: { width: 47, height: 47, borderRadius: 24, padding: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#f8df9c', shadowColor: '#6d4932', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.36, shadowRadius: 3, elevation: 5 },
  badgeMedalLegend: { width: 51, height: 51, borderRadius: 26, marginTop: -2, shadowColor: '#f3bd39', shadowOpacity: 0.85, shadowRadius: 7, elevation: 9 },
  badgeInnerRing: { width: '100%', height: '100%', borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: 'rgba(255,248,218,0.72)', backgroundColor: 'rgba(69,34,29,0.15)' },
  badgeGem: { position: 'absolute', bottom: -4, width: 13, height: 8, borderRadius: 4, backgroundColor: '#fff0b4', borderWidth: 1, borderColor: '#9d6a2a' },
  badgeCrown: { position: 'absolute', top: -11, fontSize: 15, color: '#fff0a0', textShadowColor: '#8b5114', textShadowRadius: 3 },
  badgeTitle: { width: '100%', marginTop: 5, color: '#4c3021', fontSize: 6.4, fontWeight: '900', textAlign: 'center' },
  badgeTitleLegend: { color: '#8a5715' },
  badgeDetail: { width: '100%', color: '#856148', fontSize: 5.2, fontWeight: '700', textAlign: 'center' },
  badgeEvolution: { height: 5, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  badgeEvolutionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#d6c5ad', borderWidth: 0.5, borderColor: '#aa9276' },
  styleHeader: { height: 22, marginTop: 5, borderRadius: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#8b67b4', borderWidth: 1, borderColor: '#68488d' },
  styleHeaderText: { color: '#fff4db', fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },
  styleHint: { marginLeft: 'auto', color: '#efe1f7', fontSize: 6.1, fontWeight: '700' },
  styleRow: { height: 64, flexDirection: 'row', gap: 5, marginTop: 4 },
  styleCard: { flex: 1, minWidth: 0, borderRadius: 8, paddingVertical: 3, alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,248,228,0.7)', borderWidth: 1, borderColor: 'rgba(166,113,66,0.28)' },
  styleLabel: { color: '#865a3b', fontSize: 5.8, fontWeight: '900' },
  styleAvatar: { width: 31, height: 31, borderRadius: 8, borderWidth: 1.5, borderColor: '#c56a7e' },
  styleAction: { flexDirection: 'row', alignItems: 'center' },
  styleValue: { maxWidth: 85, color: '#69503d', fontSize: 5.5, fontWeight: '800', textAlign: 'center' },
  profileLevelCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9b95f', borderWidth: 2, borderColor: '#a47829' },
  profileLevelNumber: { color: '#fff8dd', fontSize: 13, fontWeight: '900' },
  levelTrack: { width: '72%', height: 4, borderRadius: 3, overflow: 'hidden', backgroundColor: '#d9c5a5' },
  levelFill: { height: '100%', borderRadius: 3, backgroundColor: '#759f4d' },
  bottomRow: { flex: 1, minHeight: 76, flexDirection: 'row', gap: 6, marginTop: 5 },
  favoriteAnimalCard: { flex: 1.25, minWidth: 0, position: 'relative', borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,248,225,0.76)', borderWidth: 1, borderColor: 'rgba(147,101,60,0.32)' },
  blueRibbon: { position: 'absolute', zIndex: 3, top: 0, left: 8, right: 8, height: 20, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#607fbd', borderWidth: 1, borderTopWidth: 0, borderColor: '#405f9a' },
  ribbonText: { color: '#fff5df', fontSize: 6.7, fontWeight: '900', letterSpacing: 0.25 },
  favoriteAnimalContainer: { position: 'absolute', left: 2, bottom: -6, width: 80, height: 66 },
  favoriteAnimalImage: { width: '100%', height: '100%', top: 0, left: 0 },
  favoriteInfo: { position: 'absolute', top: 25, left: 79, right: 7, bottom: 4, justifyContent: 'center' },
  favoriteName: { color: '#4b3021', fontSize: 8.8, fontWeight: '900' },
  favoriteNature: { color: '#6e6b3f', fontSize: 5.5, fontWeight: '800', marginTop: 1 },
  animalLevelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  animalLevelBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#6e9f4d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4e7934' },
  animalLevelText: { color: '#fffbe8', fontSize: 7, fontWeight: '900' },
  animalProgressWrap: { flex: 1, minWidth: 0 },
  animalTrack: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: '#cbb38c' },
  animalFill: { height: '100%', borderRadius: 3, backgroundColor: '#77a64f' },
  animalCards: { marginTop: 1, color: '#826347', fontSize: 5, fontWeight: '800', textAlign: 'right' },
  cardOpenIcon: { position: 'absolute', right: 5, top: 25 },
  collectionAccess: { flex: 0.95, minWidth: 0, borderRadius: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,246,216,0.78)', borderWidth: 1, borderColor: 'rgba(166,112,56,0.35)' },
  collectionIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: '#a86d28', shadowColor: '#8e5e28', shadowOpacity: 0.25, shadowRadius: 3, elevation: 3 },
  collectionText: { flex: 1, minWidth: 0 },
  collectionEyebrow: { color: '#ad7432', fontSize: 5.3, fontWeight: '900', letterSpacing: 0.5 },
  collectionTitle: { color: '#543824', fontSize: 8.2, fontWeight: '900' },
  collectionSubtitle: { color: '#826348', fontSize: 5.4, fontWeight: '700' },
});

const subpage = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10, backgroundColor: '#f8e8c7' },
});

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,18,14,0.79)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  frameCard: { width: '82%', maxWidth: 650, height: 252, borderRadius: 17, padding: 14, backgroundColor: '#f8e8c7', borderWidth: 3, borderColor: '#8b5834', shadowColor: '#100a06', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.7, shadowRadius: 14, elevation: 24 },
  collectionCard: { width: '88%', maxWidth: 700, height: 286, borderRadius: 17, padding: 13, backgroundColor: '#f8e8c7', borderWidth: 3, borderColor: '#8b5834', shadowColor: '#100a06', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.7, shadowRadius: 14, elevation: 24 },
  modalHeader: { height: 48, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(144,91,48,0.2)' },
  eyebrow: { color: '#b2693c', fontSize: 6.2, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#50321f', fontSize: 15, lineHeight: 17, fontWeight: '900' },
  subtitle: { color: '#856247', fontSize: 6.8, fontWeight: '700' },
  close: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0d7a8', borderWidth: 1, borderColor: '#bd8a53' },
  frameHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  frameEquippedChip: { width: 119, height: 38, paddingHorizontal: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,247,222,0.78)', borderWidth: 1, borderColor: '#d6b27d' },
  frameEquippedLabel: { color: '#b0723d', fontSize: 4.8, lineHeight: 6, fontWeight: '900', letterSpacing: 0.6 },
  frameEquippedName: { width: 69, color: '#543722', fontSize: 6.1, lineHeight: 8, fontWeight: '900' },
  frameGridScroll: { flex: 1, marginTop: 2 },
  frameGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 7, paddingTop: 4, paddingBottom: 18 },
  frameGridCard: { width: '18.7%', height: 117, position: 'relative', overflow: 'hidden', borderRadius: 11, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 3, alignItems: 'center', backgroundColor: '#fff4d9', borderWidth: 1.2, borderColor: '#d8b47e', shadowColor: '#79502f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  frameOptionActive: { borderWidth: 2, borderColor: '#c56678', backgroundColor: '#fff0d5' },
  frameOptionBusy: { opacity: 0.78, borderColor: '#c18a43' },
  frameWaiting: { opacity: 0.5, backgroundColor: '#eee2cc', borderColor: '#bba98f' },
  frameNext: { borderWidth: 2, borderColor: '#d69a38', shadowColor: '#e4a840', shadowOpacity: 0.52, shadowRadius: 5, elevation: 6 },
  frameCatalogPreview: { width: 61, height: 61, alignItems: 'center', justifyContent: 'center' },
  frameCatalogLock: { position: 'absolute', width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(72,59,48,0.82)', borderWidth: 1, borderColor: 'rgba(255,246,222,0.75)', elevation: 8 },
  frameOptionName: { width: '100%', marginTop: 2, color: '#573822', fontSize: 6.5, lineHeight: 8, fontWeight: '900', textAlign: 'center' },
  frameOptionDetail: { width: '100%', marginTop: 1, color: '#9b714e', fontSize: 4.8, lineHeight: 6, fontWeight: '900', textAlign: 'center', letterSpacing: 0.25 },
  frameNextText: { color: '#9b5b1d' },
  frameBuyButton: { minWidth: 47, height: 14, marginTop: 2, paddingHorizontal: 6, borderRadius: 7, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 0.8, borderColor: '#ae7028', elevation: 3 },
  frameBuyText: { color: '#613a18', fontSize: 5.7, fontWeight: '900' },
  frameFuturePrice: { height: 11, marginTop: 1, flexDirection: 'row', gap: 2, alignItems: 'center', justifyContent: 'center' },
  frameFuturePriceText: { color: '#87694d', fontSize: 4.9, fontWeight: '900' },
  frameGridTag: { position: 'absolute', top: 3, left: 3, zIndex: 8, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5, overflow: 'hidden', color: '#fff2c4', backgroundColor: '#805028', fontSize: 3.7, fontWeight: '900', letterSpacing: 0.25 },
  rinconEditorBody: { flex: 1, flexDirection: 'row', gap: 12, paddingTop: 8 },
  rinconPreviewColumn: { width: '47%', minWidth: 0 },
  rinconPreviewFrame: { flex: 1, minHeight: 190, padding: 3, borderRadius: 16, backgroundColor: '#f2d8a8', borderWidth: 1.5, borderColor: '#a87140', shadowColor: '#714626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 5, elevation: 5 },
  rinconPreviewNote: { height: 42, marginTop: 7, paddingHorizontal: 8, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,246,217,0.78)', borderWidth: 1, borderColor: '#d4b584' },
  rinconPreviewNoteIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8d6a9e', borderWidth: 1, borderColor: '#6b4d7f' },
  rinconPreviewNoteText: { flex: 1, minWidth: 0 },
  rinconPreviewNoteTitle: { color: '#674128', fontSize: 6.3, fontWeight: '900', letterSpacing: 0.35 },
  rinconPreviewNoteSubtitle: { color: '#8b684c', fontSize: 5.4, lineHeight: 7, fontWeight: '700' },
  rinconControlsColumn: { flex: 1, minWidth: 0 },
  rinconControlsScroll: { flex: 1, minHeight: 0 },
  rinconControls: { paddingRight: 3, paddingBottom: 10 },
  rinconControlHeading: { minHeight: 28, marginTop: 3, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rinconStep: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c9c6d', borderWidth: 1, borderColor: '#547549' },
  rinconStepText: { color: '#fff8e2', fontSize: 8.5, fontWeight: '900' },
  rinconControlTitle: { color: '#654027', fontSize: 6.7, lineHeight: 8, fontWeight: '900', letterSpacing: 0.55 },
  rinconControlSubtitle: { color: '#947156', fontSize: 5.3, lineHeight: 7, fontWeight: '700' },
  rinconThemeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  rinconThemeCard: { width: '32%', height: 38, position: 'relative', padding: 3, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,248,227,0.76)', borderWidth: 1, borderColor: '#d7bb91' },
  rinconThemeSwatch: { width: 28, height: 29, flexShrink: 0, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 0.8, borderColor: 'rgba(100,70,44,0.28)' },
  rinconThemeInfo: { flex: 1, minWidth: 0 },
  rinconOptionName: { color: '#5a3924', fontSize: 5.8, lineHeight: 7, fontWeight: '900' },
  rinconOptionDetail: { color: '#957258', fontSize: 4.5, lineHeight: 5.5, fontWeight: '700' },
  rinconOptionActive: { borderWidth: 1.8, borderColor: '#6c955f', backgroundColor: '#f3f2d7', shadowColor: '#648b58', shadowOpacity: 0.24, shadowRadius: 3, elevation: 3 },
  rinconCheck: { position: 'absolute', zIndex: 5, top: -3, right: -3, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6f995e', borderWidth: 1, borderColor: '#fff5da' },
  rinconChoiceRail: { gap: 5, paddingTop: 1, paddingRight: 5 },
  rinconAnimalChoice: { width: 73, height: 61, position: 'relative', padding: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: 'rgba(255,248,228,0.76)', borderWidth: 1, borderColor: '#d6ba90' },
  rinconAnimalChoiceImage: { width: 55, height: 44, position: 'absolute', top: 0 },
  rinconSkinChoice: { width: 77, height: 68, position: 'relative', padding: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: 'rgba(255,248,228,0.76)', borderWidth: 1, borderColor: '#d6ba90' },
  rinconSkinChoiceImage: { width: 58, height: 48, position: 'absolute', top: 0 },
  rinconChoiceName: { maxWidth: '96%', color: '#563821', fontSize: 5.5, lineHeight: 6.5, fontWeight: '900', textAlign: 'center' },
  rinconChoiceRarity: { fontSize: 4.5, lineHeight: 5.5, fontWeight: '900' },
  rinconEmptyChoice: { minHeight: 38, paddingHorizontal: 9, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(229,216,194,0.7)', borderWidth: 1, borderStyle: 'dashed', borderColor: '#bda98c' },
  rinconEmptyChoiceText: { flex: 1, color: '#8b6b51', fontSize: 5.8, fontWeight: '800' },
  rinconDecorationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  rinconDecorationChoice: { width: '32%', height: 37, position: 'relative', paddingHorizontal: 4, borderRadius: 9, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(255,248,228,0.76)', borderWidth: 1, borderColor: '#d6ba90' },
  rinconDecorationChoiceIcon: { width: 27, height: 27, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 0.8, borderColor: 'rgba(255,247,220,0.7)' },
  rinconSaveWrap: { height: 42, marginTop: 5, borderRadius: 11, overflow: 'hidden', shadowColor: '#426040', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.32, shadowRadius: 4, elevation: 5 },
  rinconSaveDisabled: { opacity: 0.72, shadowOpacity: 0, elevation: 0 },
  rinconSaveButton: { flex: 1, paddingHorizontal: 12, borderRadius: 11, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: 'rgba(62,84,53,0.75)' },
  rinconSaveText: { color: '#fff8df', fontSize: 7.3, lineHeight: 9, fontWeight: '900', letterSpacing: 0.35 },
  rinconSaveHint: { color: '#e9f0d3', fontSize: 5.2, lineHeight: 6.5, fontWeight: '700' },
  collectionBody: { flex: 1, flexDirection: 'row', paddingTop: 9, gap: 10 },
  animalRail: { width: 154, borderRightWidth: 1, borderRightColor: 'rgba(143,91,49,0.2)', paddingRight: 9 },
  railTitle: { color: '#9a6138', fontSize: 6.3, fontWeight: '900', letterSpacing: 0.55, marginBottom: 5 },
  animalRailContent: { gap: 5, paddingBottom: 7 },
  animalRailCard: { height: 64, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, backgroundColor: 'rgba(255,249,232,0.7)', borderWidth: 1, borderColor: '#ddc298' },
  animalRailCardActive: { borderWidth: 2, borderColor: '#759b5f', backgroundColor: '#edf2d7' },
  animalRailCardLocked: { opacity: 0.76, backgroundColor: '#e8dcc8', borderColor: '#bca991' },
  animalRailImageWrap: { width: 55, height: 55, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  animalRailImage: { width: 55, height: 55 },
  animalLockBadge: { position: 'absolute', width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(78,63,51,0.84)', borderWidth: 1, borderColor: 'rgba(255,247,224,0.78)', elevation: 5 },
  animalRailInfo: { flex: 1, minWidth: 0 },
  animalRailName: { color: '#4f3322', fontSize: 8.4, fontWeight: '900' },
  animalRailRarity: { fontSize: 5.8, fontWeight: '900' },
  equippedDot: { position: 'absolute', right: 4, top: 4, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6d9b55' },
  animalDetail: { flex: 1, minWidth: 0 },
  animalShowcase: { height: 112, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#d6b989', backgroundColor: '#fff5dc' },
  animalHero: { position: 'absolute', left: 5, bottom: -4, width: 145, height: 115 },
  animalHeroInfo: { position: 'absolute', left: 150, right: 10, top: 15 },
  animalSeason: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, color: '#fff7df', backgroundColor: '#6e9360', fontSize: 5.7, fontWeight: '900' },
  animalHeroName: { marginTop: 4, color: '#4a3020', fontSize: 16, fontWeight: '900' },
  animalHeroRarity: { fontSize: 7, fontWeight: '900' },
  animalAbility: { marginTop: 6, color: '#856447', fontSize: 6.2, fontWeight: '800' },
  skinSection: { flex: 1, paddingTop: 7 },
  skinHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skinTitle: { color: '#8f5d37', fontSize: 6.4, fontWeight: '900', letterSpacing: 0.6 },
  skinCount: { color: '#9d795b', fontSize: 6, fontWeight: '900' },
  skinList: { gap: 6, paddingTop: 5, paddingBottom: 4 },
  skinCard: { width: 88, height: 84, borderRadius: 10, padding: 4, alignItems: 'center', backgroundColor: '#fff7e1', borderWidth: 1.2, borderColor: '#d8bc90' },
  skinCardLocked: { opacity: 0.78, backgroundColor: '#eadfce', borderColor: '#bba891' },
  skinImageWrap: { width: 58, height: 51, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  skinImage: { width: 58, height: 51 },
  skinLockOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(68,55,47,0.78)', borderWidth: 0.8, borderColor: 'rgba(255,247,226,0.74)' },
  skinLockText: { marginTop: 1, color: '#fff7e3', fontSize: 3.8, lineHeight: 5, fontWeight: '900', letterSpacing: 0.35 },
  skinName: { width: '100%', color: '#513622', fontSize: 5.9, fontWeight: '900', textAlign: 'center' },
  rarityPill: { marginTop: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  rarityText: { color: '#fff9e9', fontSize: 4.8, fontWeight: '900' },
  skinEquipped: { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6c9a55' },
  lockedCollectionEmpty: { alignItems: 'center', justifyContent: 'center' },
  lockedCollectionIcon: { width: 48, height: 48, marginBottom: 7, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ead8bb', borderWidth: 1.5, borderColor: '#bd9d75' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyPaw: { fontSize: 38, opacity: 0.45 },
  emptyTitle: { color: '#563a28', fontSize: 12, fontWeight: '900' },
  emptyText: { color: '#927056', fontSize: 7, fontWeight: '700' },
});

export default Perfil;
