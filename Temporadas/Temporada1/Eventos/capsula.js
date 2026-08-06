import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import TabButtons from '../../../components/TabButtons';
import RecompensaOverlay from '../../../components/RecompensaOverlay';
import Svg, { Circle, Path, G, Image as SvgImage, AnimateTransform } from 'react-native-svg';
import { db, auth, storage } from '../../../firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

// ── Helpers ──────────────────────────────────────────────────
const getMesAnio = () => {
  const ahora = new Date();
  return `${ahora.toLocaleString('es-ES', { month: 'long' })}-${ahora.getFullYear()}`;
};

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomOptions(pool, count) {
  return shuffleArray(pool).slice(0, Math.min(count, pool.length));
}

const POOL_LLAVES = [
  { id: 'fotos',     icono: '📷', nombre: 'Fotos',      desc: 'Una polaroid con tu foto' },
  { id: 'flores',    icono: '🌸', nombre: 'Flores',     desc: 'Una flor para decorar' },
  { id: 'chancho',   icono: '🐷', nombre: 'Chancho',    desc: 'Monedas simbólicas' },
  { id: 'carta',     icono: '✉️', nombre: 'Carta',      desc: 'Un testamento pegado' },
  { id: 'permivisa', icono: '🎟️', nombre: 'Permivisa',  desc: 'Válido por: ...' },
  { id: 'deseo',     icono: '🌠', nombre: 'Deseo',      desc: 'Un deseo sellado' },
];

// ── SVG Camino ────────────────────────────────────────────────
const W = 160, H = 320;
const CPS = [
  { x: W*0.78, y: H*0.93 }, { x: W*0.22, y: H*0.78 },
  { x: W*0.85, y: H*0.60 }, { x: W*0.18, y: H*0.43 },
  { x: W*0.75, y: H*0.26 }, { x: W*0.30, y: H*0.07 },
];

function rand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function puntosEnCurva(a, b, segIdx) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const margin = 20;
  const tS = Math.min(1, margin/dist), tE = Math.max(0, 1 - margin/dist);
  const aS = { x: a.x+dx*tS, y: a.y+dy*tS };
  const bS = { x: a.x+dx*tE, y: a.y+dy*tE };
  const cx1 = aS.x+(bS.x-aS.x)*0.1, cy1 = aS.y+(bS.y-aS.y)*0.5;
  const cx2 = aS.x+(bS.x-aS.x)*0.9, cy2 = aS.y+(bS.y-aS.y)*0.5;
  const SAMPLES = 60;
  const pts = Array.from({ length: SAMPLES+1 }, (_, k) => {
    const t = k/SAMPLES, mt = 1-t;
    return { x: mt*mt*mt*aS.x+3*mt*mt*t*cx1+3*mt*t*t*cx2+t*t*t*bS.x,
             y: mt*mt*mt*aS.y+3*mt*mt*t*cy1+3*mt*t*t*cy2+t*t*t*bS.y };
  });
  const lens = [0];
  for (let k = 1; k <= SAMPLES; k++) {
    const ddx = pts[k].x-pts[k-1].x, ddy = pts[k].y-pts[k-1].y;
    lens.push(lens[k-1]+Math.sqrt(ddx*ddx+ddy*ddy));
  }
  const totalLen = lens[SAMPLES];
  const cantidad = Math.min(5, Math.max(4, Math.round(totalLen/16)));
  return Array.from({ length: cantidad }, (_, i) => {
    const target = totalLen*(i+1)/(cantidad+1);
    let lo = 0, hi = SAMPLES;
    while (hi-lo > 1) { const mid = (lo+hi)>>1; if (lens[mid] < target) lo=mid; else hi=mid; }
    const frac = (target-lens[lo])/(lens[hi]-lens[lo]||1);
    const bx = pts[lo].x+(pts[hi].x-pts[lo].x)*frac;
    const by = pts[lo].y+(pts[hi].y-pts[lo].y)*frac;
    const seed = segIdx*13+i;
    return { x: bx+(rand(seed)-0.5)*3, y: by+(rand(seed+7)-0.5)*3 };
  });
}

function Heart({ cx, cy, size, filled, dark, pulsing, onPress }) {
  const s = size;
  const d = `M ${cx} ${cy+s*0.4} C ${cx-s*0.1} ${cy+s*0.15},${cx-s*1.2} ${cy-s*0.4},${cx-s*1.0} ${cy-s*1.05} C ${cx-s*0.82} ${cy-s*1.65},${cx-s*0.1} ${cy-s*1.55},${cx} ${cy-s*0.95} C ${cx+s*0.1} ${cy-s*1.55},${cx+s*0.82} ${cy-s*1.65},${cx+s*1.0} ${cy-s*1.05} C ${cx+s*1.2} ${cy-s*0.4},${cx+s*0.1} ${cy+s*0.15},${cx} ${cy+s*0.4} Z`;
  const fill = dark ? 'rgba(140,20,50,0.95)' : filled ? 'rgba(255,140,160,0.92)' : 'rgba(20,10,8,0.6)';
  const stroke = dark ? '#8c1432' : filled ? '#ff8fa8' : 'rgba(255,255,255,0.42)';
  return (
    <Path d={d} fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round">
      {pulsing && (
        <AnimateTransform
          attributeName="transform"
          type="scale"
          values="1;1.2;1"
          dur="0.85s"
          repeatCount="indefinite"
          additive="sum"
          origin={`${cx}, ${cy}`}
        />
      )}
    </Path>
  );
}

function CaminoSvg({ miProgress = 0, miCirculitos = 0, parejaProgress = 0, parejaCirculitos = 0, miAvatar, parejaAvatar, miReclamados = [], onCheckpointPress = () => {} }) {
  const maxProgress = Math.max(miProgress, parejaProgress);
  const miSegmento = Math.min(miProgress, CPS.length - 1);
  const parejaSegmento = Math.min(parejaProgress, CPS.length - 1);

  return (
    <Svg width={W} height={H}>
      {CPS.map((p, i) => {
        if (i === 0) return null;
        const segmentDots = puntosEnCurva(CPS[i-1], p, i);
        const totalDots = segmentDots.length;
        // segmento completado = ya pasamos ese checkpoint (i <= miProgress-1, es decir i < miProgress)
        const completadoMi = i < miProgress;
        const completadoPareja = i < parejaProgress;
        const miDotsFilled = i === miSegmento ? Math.min(miCirculitos, totalDots) : 0;
        const parejaDotsFilled = i === parejaSegmento ? Math.min(parejaCirculitos, totalDots) : 0;
        return segmentDots.map((d, j) => {
          const rosasMi = completadoMi || (i === miSegmento && j < miDotsFilled);
          const rosasPareja = completadoPareja || (i === parejaSegmento && j < parejaDotsFilled);
          const visible = rosasMi || rosasPareja;
          return (
            <G key={`d${i}${j}`}>
              <Circle cx={d.x} cy={d.y} r={5} fill="rgba(0,0,0,0.12)" />
              <Circle cx={d.x} cy={d.y} r={3.8}
                fill={visible ? 'rgba(255,100,130,0.35)' : 'rgba(255,255,255,0.18)'}
                stroke={visible ? '#ff8fa8' : 'rgba(255,255,255,0.28)'}
                strokeWidth={1.2} />
              {i === miSegmento && j === miDotsFilled - 1 && miCirculitos > 0 && miAvatar ? (
                <SvgImage x={d.x - 12} y={d.y + 18} width={24} height={24}
                  preserveAspectRatio="xMidYMid slice" href={{ uri: miAvatar }} />
              ) : null}
              {i === parejaSegmento && j === parejaDotsFilled - 1 && parejaCirculitos > 0 && parejaAvatar ? (
                <SvgImage x={d.x - 12} y={d.y - 38} width={24} height={24}
                  preserveAspectRatio="xMidYMid slice" href={{ uri: parejaAvatar }} />
              ) : null}
            </G>
          );
        });
      })}
      {CPS.map((p, i) => {
        const alcanzado = i === 0 || i < maxProgress;
        const reclamado = miReclamados.includes(i);
        const pendiente = (i === 0 ? !reclamado : i < miProgress && !reclamado);
        return (
          <G key={`cp${i}`}>
            <Circle cx={p.x} cy={p.y} r={20}
              fill={reclamado ? 'rgba(120,10,40,0.25)' : pendiente ? 'rgba(255,180,190,0.12)' : 'rgba(255,255,255,0.05)'}
              stroke={reclamado ? 'rgba(120,10,40,0.6)' : pendiente ? 'rgba(255,160,180,0.5)' : 'rgba(255,255,255,0.08)'}
              strokeWidth={1} />
            <Heart cx={p.x} cy={p.y+6} size={alcanzado ? 8.5 : 7.5}
              filled={alcanzado} dark={reclamado} pulsing={pendiente} />
            {i === miSegmento && miCirculitos === 0 && miAvatar ? (
              <SvgImage x={p.x - 12} y={p.y + 24} width={24} height={24}
                preserveAspectRatio="xMidYMid slice" href={{ uri: miAvatar }} />
            ) : null}
            {i === parejaSegmento && parejaCirculitos === 0 && parejaAvatar ? (
              <SvgImage x={p.x - 12} y={p.y - 38} width={24} height={24}
                preserveAspectRatio="xMidYMid slice" href={{ uri: parejaAvatar }} />
            ) : null}
            {/* círculo transparente encima de todo para capturar el toque */}
            <Circle cx={p.x} cy={p.y} r={28} fill="rgba(0,0,0,0.01)" onPress={() => onCheckpointPress(i)} />
          </G>
        );
      })}
    </Svg>
  );
}

// ── Estado: Sin cápsula ───────────────────────────────────────
function SinCapsula({ onCrear }) {
  return (
    <View style={s.centrado}>
      <Text style={s.capsulaIcono}>⏳</Text>
      <Text style={s.sinCapTitulo}>Sin cápsula activa</Text>
      <Text style={s.sinCapSub}>Crea una nueva cápsula del tiempo{'\n'}con tu pareja este mes</Text>
      <TouchableOpacity style={s.btnCrear} onPress={onCrear} activeOpacity={0.85}>
        <Text style={s.btnCrearText}>✦ Crear nueva cápsula</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Estado: Elegir llaves ─────────────────────────────────────
function ElegirLlaves({ onConfirmar, llavesOtro }) {
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [opciones, setOpciones] = useState(() => randomOptions(POOL_LLAVES, 3));
  const disponibles = opciones;

  const cambiarOpcion = (id) => {
    const otrasIds = opciones.filter(o => o.id !== id).map(o => o.id);
    const candidatos = POOL_LLAVES.filter(l => !otrasIds.includes(l.id) && l.id !== id);
    if (candidatos.length === 0) return;
    const nueva = candidatos[Math.floor(Math.random() * candidatos.length)];
    setOpciones(opciones.map(o => (o.id === id ? nueva : o)));
    setSeleccionadas(seleccionadas.map(x => (x === id ? nueva.id : x)));
  };

  const toggle = (id) => {
    if (seleccionadas.includes(id)) {
      cambiarOpcion(id);
      return;
    }
    if (seleccionadas.length < 3) {
      setSeleccionadas([...seleccionadas, id]);
    }
  };

  return (
    <View style={s.centrado}>
      <Text style={s.elegirTitulo}>Elige tus 3 llaves</Text>
      <Text style={s.elegirSub}>Cada llave desbloquea un elemento{'\n'}especial en tu cápsula</Text>
      <View style={s.llavesGrid}>
        {disponibles.map(l => {
          const sel = seleccionadas.includes(l.id);
          return (
            <TouchableOpacity key={l.id} style={[s.llaveCard, sel && s.llaveCardSel]} onPress={() => toggle(l.id)} activeOpacity={0.8}>
              <Text style={s.llaveIcono}>{l.icono}</Text>
              <Text style={s.llaveNombre}>{l.nombre}</Text>
              <Text style={s.llaveDesc}>{l.desc}</Text>
              {sel && <View style={s.llaveCheck}><Text style={s.llaveCheckText}>✓</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.elegirContador}>{seleccionadas.length} / 3 seleccionadas</Text>
      <TouchableOpacity
        style={[s.btnCrear, seleccionadas.length < 3 && s.btnDisabled]}
        onPress={() => seleccionadas.length === 3 && onConfirmar(seleccionadas)}
        activeOpacity={0.85}
        disabled={seleccionadas.length < 3}>
        <Text style={s.btnCrearText}>Confirmar llaves ✦</Text>
      </TouchableOpacity>
      <Text style={s.elegirNota}>Toca dos veces una llave seleccionada para cambiarla.</Text>
    </View>
  );
}

// ── Estado: Esperando pareja ──────────────────────────────────
function EsperandoPareja({ llavesPropia, parejaListo }) {
  return (
    <View style={s.centrado}>
      <Text style={s.capsulaIcono}>💌</Text>
      <Text style={s.sinCapTitulo}>{parejaListo ? 'Tu pareja ya eligió' : 'Esperando a tu pareja'}</Text>
      <Text style={s.sinCapSub}>{parejaListo ? 'Tu pareja ya terminó de elegir. La cápsula comenzará pronto.' : 'Ya elegiste tus llaves. Cuando tu pareja elija las suyas, la cápsula comenzará.'}</Text>
      <View style={s.llavesResumen}>
        {llavesPropia?.map(id => {
          const l = POOL_LLAVES.find(x => x.id === id);
          return l ? (
            <View key={id} style={s.llaveResumenItem}>
              <Text style={s.llaveIcono}>{l.icono}</Text>
              <Text style={s.llaveNombre}>{l.nombre}</Text>
            </View>
          ) : null;
        })}
      </View>
    </View>
  );
}

// ── Tipos de llaves ──────────────────────────────────────────
const TIPO_LLAVE = {
  fotos:     'foto',
  flores:    'flor',
  chancho:   'chancho',
  carta:     'nota',
  permivisa: 'nota',
  deseo:     'nota',
};

const COLORES_FLOR = ['#ff8fa8','#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c77dff','#ff9a3c','#f5e6c0'];

// Flor SVG con 3 formas
function FlorSvg({ tipo = 0, color = '#ff8fa8', size = 60 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.18, tr = size * 0.28;
  if (tipo === 0) {
    // Pétalos redondos
    const petals = Array.from({ length: 5 }, (_, i) => {
      const a = (i * 72 - 90) * Math.PI / 180;
      return { x: cx + Math.cos(a) * tr, y: cy + Math.sin(a) * tr };
    });
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r * 0.7} fill="#ffe066" />
        {petals.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={r} fill={color} opacity={0.9} />)}
        <Circle cx={cx} cy={cy} r={r * 0.55} fill="#ffe066" />
      </Svg>
    );
  }
  if (tipo === 1) {
    // Pétalos puntiagudos (margarita)
    const petals = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45) * Math.PI / 180;
      const x1 = cx + Math.cos(a) * r * 0.5, y1 = cy + Math.sin(a) * r * 0.5;
      const x2 = cx + Math.cos(a) * tr * 1.1, y2 = cy + Math.sin(a) * tr * 1.1;
      const perp = a + Math.PI / 2;
      const w = r * 0.35;
      return `M ${cx} ${cy} C ${x1 + Math.cos(perp)*w} ${y1 + Math.sin(perp)*w} ${x2 + Math.cos(perp)*w*0.5} ${y2 + Math.sin(perp)*w*0.5} ${x2} ${y2} C ${x2 - Math.cos(perp)*w*0.5} ${y2 - Math.sin(perp)*w*0.5} ${x1 - Math.cos(perp)*w} ${y1 - Math.sin(perp)*w} ${cx} ${cy} Z`;
    });
    return (
      <Svg width={size} height={size}>
        {petals.map((d, i) => <Path key={i} d={d} fill={color} opacity={0.88} />)}
        <Circle cx={cx} cy={cy} r={r * 0.6} fill="#ffe066" />
      </Svg>
    );
  }
  // tipo 2: tulipán
  const d = `M ${cx} ${cy + size*0.3} C ${cx - size*0.22} ${cy + size*0.1} ${cx - size*0.28} ${cy - size*0.15} ${cx} ${cy - size*0.3} C ${cx + size*0.28} ${cy - size*0.15} ${cx + size*0.22} ${cy + size*0.1} ${cx} ${cy + size*0.3} Z`;
  return (
    <Svg width={size} height={size}>
      <Path d={d} fill={color} opacity={0.9} />
      <Path d={`M ${cx} ${cy + size*0.3} C ${cx - size*0.1} ${cy + size*0.1} ${cx - size*0.12} ${cy - size*0.05} ${cx} ${cy - size*0.1}`} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

async function subirFotoCapsula(uri, uid, capId) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.split('.').pop() || 'jpg';
  const ref = storageRef(storage, `capsulas/${capId}/${uid}_${Date.now()}.${ext}`);
  const task = uploadBytesResumable(ref, blob);
  return new Promise((resolve, reject) => {
    task.on('state_changed', null, reject, async () => {
      resolve(await getDownloadURL(task.snapshot.ref));
    });
  });
}

// ── Estado: Editar cápsula ───────────────────────────────────
function CapsulaEditar({ llaves = [], llavesOtro = [], ediciones = {}, onSave, onCancel, capId, uid, dineroProp = 0 }) {
  const todasLlaves = [...new Set([...llaves, ...llavesOtro])];
  const [valores, setValores] = useState(() => {
    const v = {};
    todasLlaves.forEach(id => { v[id] = ediciones[id] || {}; });
    return v;
  });
  const [uploading, setUploading] = useState(null);
  const [enviado, setEnviado] = useState(ediciones.__enviado === true);
  const [dineroRegalado, setDineroRegalado] = useState(
    todasLlaves.includes('chancho') ? (ediciones['chancho']?.dinero ?? 0) : 0
  );

  const set = (id, v) => setValores(prev => ({ ...prev, [id]: v }));

  const pickFoto = async (id) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled) return;
    setUploading(id);
    try {
      const url = await subirFotoCapsula(result.assets[0].uri, uid, capId);
      set(id, { ...valores[id], url });
    } catch { Alert.alert('Error', 'No se pudo subir la foto.'); }
    setUploading(null);
  };

  const guardar = async (enviar = false) => {
    const nuevas = {};
    todasLlaves.forEach(id => { nuevas[id] = valores[id] || {}; });
    if (todasLlaves.includes('chancho')) nuevas['chancho'] = { dinero: dineroRegalado };
    if (enviar) nuevas.__enviado = true;
    await onSave(nuevas, enviar ? dineroRegalado : 0);
    if (enviar) setEnviado(true);
  };

  return (
    <View style={se.root}>
      <View style={se.topBar}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={se.topX}>x</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => guardar(false)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={se.topGuardar}>guardar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => !enviado && guardar(true)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={[se.topEnviar, enviado && se.topEnviado]}>{enviado ? 'enviada' : 'enviar'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={se.fila}>
        {todasLlaves.map(id => {
          const tipo = TIPO_LLAVE[id] || 'nota';
          const val = valores[id] || {};
          const llave = POOL_LLAVES.find(x => x.id === id);

          if (tipo === 'foto') return (
            <TouchableOpacity key={id} onPress={() => pickFoto(id)} activeOpacity={0.9}>
              <View style={se.polaroid}>
                {val.url
                  ? <ExpoImage source={{ uri: val.url }} style={se.polaroidImg} contentFit="cover" cachePolicy="memory" />
                  : <View style={se.polaroidVacio}>
                      {uploading === id
                        ? <ActivityIndicator color="#c9a87a" />
                        : <Text style={se.polaroidVacioIcono}>+</Text>}
                    </View>
                }
                <TextInput
                  style={se.polaroidPie}
                  value={val.nota || ''}
                  onChangeText={t => set(id, { ...val, nota: t })}
                  placeholder="nota..."
                  placeholderTextColor="#c9a87a"
                  maxLength={28}
                  textAlign="center"
                />
              </View>
            </TouchableOpacity>
          );

          if (tipo === 'flor') return (
            <View key={id} style={se.florWrap}>
              <TouchableOpacity onPress={() => set(id, { ...val, tipo: ((val.tipo ?? 0) + 1) % 3 })} activeOpacity={0.8}>
                <FlorSvg tipo={val.tipo ?? 0} color={val.color || '#ff8fa8'} size={90} />
              </TouchableOpacity>
              <View style={se.colorRow}>
                {COLORES_FLOR.map(c => (
                  <TouchableOpacity key={c}
                    style={[se.colorDot, { backgroundColor: c }, (val.color || '#ff8fa8') === c && se.colorDotSel]}
                    onPress={() => set(id, { ...val, color: c })} />
                ))}
              </View>
            </View>
          );

          if (tipo === 'chancho') return (
            <View key={id} style={se.chanchoWrap}>
              <Text style={se.chanchoEmoji}>🐷</Text>
              <Text style={se.chanchoCantidad}>{dineroRegalado}</Text>
              <Text style={se.chanchoMoneda}>🪙</Text>
              <View style={se.chanchoControles}>
                {[-10, -1, 1, 10].map(n => (
                  <TouchableOpacity key={n} onPress={() => setDineroRegalado(d => Math.min(dineroProp, Math.max(0, d + n)))}>
                    <Text style={[se.chanchoCtrl, n > 0 && se.chanchoCtrlPos]}>{n > 0 ? '+' + n : '' + n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={se.chanchoSaldo}>{dineroProp} disp.</Text>
            </View>
          );

          return (
            <View key={id} style={se.notaWrap}>
              <Text style={se.notaIcono}>{llave?.icono}</Text>
              <TextInput
                style={se.notaInput}
                value={val.texto || ''}
                onChangeText={t => set(id, { ...val, texto: t })}
                placeholder="..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                multiline
                textAlignVertical="top"
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Estado: Cápsula activa ────────────────────────────────────
function CapsulaActiva({ capsula, uid, progreso, parejaProgress, ediciones, miAvatar, parejaAvatar, reclamados, onCheckpointPress, onEdit, onCloseCapsula, parejaCompletado }) {
  const diasRestantes = capsula?.diasRestantes ?? 60;
  const misionIdx = progreso?.checkpoints ?? 0;
  const circulitos = progreso?.circulitos ?? 0;

  const MISIONES = [
    { titulo: 'El Primer Recuerdo',  texto: 'Escribí algo que te gusta de él/ella hoy.' },
    { titulo: 'Nuestra Canción',     texto: 'Elijan una canción que los represente esta semana.' },
    { titulo: 'Momento Favorito',    texto: 'Describan su mejor momento juntos hasta ahora.' },
    { titulo: 'Una Foto Juntos',     texto: 'Tómense una foto juntos hoy y guárdenla.' },
    { titulo: 'Carta Secreta',       texto: 'Escribile una carta corta que leerá al abrir la cápsula.' },
    { titulo: 'El Cierre',           texto: '¿Qué desean para el próximo mes juntos?' },
  ];

  const mision = MISIONES[misionIdx] || null;
  const pct = Math.round((misionIdx / 6) * 100);
  const mesAnio = capsula?.id?.replace('-', ' de ') ?? '';

  const completarMision = async () => {
    const uid_ = auth.currentUser?.uid;
    if (!uid_) return;
    const capId = getMesAnio();
    const segIdx = Math.min(misionIdx, CPS.length - 1);
    const dotsEnSegmento = segIdx > 0
      ? puntosEnCurva(CPS[segIdx - 1], CPS[segIdx], segIdx).length
      : puntosEnCurva(CPS[0], CPS[1], 1).length;
    const nuevosCirculitos = circulitos + 1;
    const avanzaCheckpoint = nuevosCirculitos > dotsEnSegmento;
    const nuevosCheckpoints = avanzaCheckpoint ? misionIdx + 1 : misionIdx;
    const nuevosDias = avanzaCheckpoint ? Math.max(0, diasRestantes - 10) : diasRestantes;
    await setDoc(doc(db, 'capsulas', capId), {
      [`progreso_${uid_}`]: { circulitos: avanzaCheckpoint ? 0 : nuevosCirculitos, checkpoints: nuevosCheckpoints },
      diasRestantes: nuevosDias,
    }, { merge: true }).catch(() => {});
  };

  return (
    <View style={s.layout}>
      {/* Info */}
      <View style={[s.seccion, s.info]}>
        <View style={s.infoWrap}>
          <Text style={s.infoIcono}>⏳</Text>
          <Text style={s.infoTitulo}>Cápsula</Text>
          <Text style={s.infoSubtitulo}>{mesAnio}</Text>
          <View style={s.infoSep} />
          <Text style={s.infoProgLabel}>PROGRESO</Text>
          <View style={s.infoBarBg}>
            <View style={[s.infoBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.infoProgNum}>{misionIdx} / 6</Text>
          <View style={s.infoSep} />
          <Text style={s.infoAperturaLabel}>SE ABRE EN</Text>
          <Text style={s.infoAperturaFecha}>{diasRestantes} días</Text>
          <Text style={s.infoCandado}>{misionIdx >= 6 ? '🔓' : '🔒'}</Text>
        </View>
      </View>

      {/* Cap */}
      <View style={[s.seccion, s.cap]}>
        <View style={s.capWrap}>
          <Text style={s.capTitulo}>✦ Misión Diaria</Text>
          <View style={s.capSep} />
          {mision ? (
            <View style={s.capMisionCard}>
              <Text style={s.capMisionSemana}>Semana {misionIdx + 1}</Text>
              <Text style={s.capMisionTitulo}>{mision.titulo}</Text>
              <Text style={s.capMisionTexto}>{mision.texto}</Text>
              <Text style={s.capMisionStatus}>Avance compartido en el camino de la derecha.</Text>
              <TouchableOpacity style={s.capBtn} onPress={completarMision} activeOpacity={0.8}>
                <Text style={s.capBtnText}>Completar misión ✓</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.capBtn, s.capEditBtn]} onPress={onEdit} activeOpacity={0.8}>
                <Text style={[s.capBtnText, s.capEditBtnText]}>Editar cápsula</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.capMisionCard}>
              <Text style={s.capCompletadoIcon}>🎉</Text>
              <Text style={s.capCompletadoText}>¡Cápsula completa!{'\n'}Esperando a tu pareja...</Text>
            </View>
          )}
          <TouchableOpacity style={[s.capBtn, s.capCerrarBtn, s.capCerrarBtnBottom]} onPress={onCloseCapsula} activeOpacity={0.8}>
            <Text style={s.capBtnText}>Cerrar cápsula</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camino */}
      <View style={[s.seccion, s.camino]}>
        <CaminoSvg
          miProgress={misionIdx}
          miCirculitos={circulitos}
          parejaProgress={parejaProgress?.checkpoints || 0}
          parejaCirculitos={parejaProgress?.circulitos || 0}
          miAvatar={miAvatar}
          parejaAvatar={parejaAvatar}
          miReclamados={reclamados}
          onCheckpointPress={onCheckpointPress}
        />
      </View>
    </View>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Capsula({ navigation }) {
  const [estado, setEstado] = useState('cargando'); // cargando | sin_capsula | eligiendo | esperando | activa | editar
  const [capsula, setCapsula] = useState(null);
  const [llavesOtro, setLlavesOtro] = useState(null);
  const [llavesPropia, setLlavesPropia] = useState(null);
  const [progreso, setProgreso] = useState({ circulitos: 0, checkpoints: 0 });
  const [parejaProgreso, setParejaProgreso] = useState({ circulitos: 0, checkpoints: 0 });
  const [ediciones, setEdiciones] = useState({});
  const [parejaEdiciones, setParejaEdiciones] = useState({});
  const [parejaListo, setParejaListo] = useState(false);
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);
  const [rewardTitulo, setRewardTitulo] = useState('');
  const [rewardTexto, setRewardTexto] = useState('');
  const [reclamados, setReclamados] = useState([]);
  const [pendingReclamar, setPendingReclamar] = useState(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const capId = getMesAnio();

    const unsub = onSnapshot(doc(db, 'capsulas', capId), async (snap) => {
      if (!snap.exists()) { setEstado('sin_capsula'); return; }
      const data = snap.data();
      setCapsula({ ...data, id: capId, dineroProp: 0 });

      const miLlaves = data[`llaves_${uid}`];
      const parejaUid = await getParejaUid(uid);
      // cargar dinero del usuario
      const userSnap = await getDoc(doc(db, 'usuarios', uid)).catch(() => null);
      const dineroUsuario = userSnap?.data()?.dinero ?? 0;
      setCapsula({ ...data, id: capId, dineroProp: dineroUsuario });
      const llavesP = parejaUid ? data[`llaves_${parejaUid}`] : null;
      const progresoPareja = parejaUid ? data[`progreso_${parejaUid}`] : { circulitos: 0, checkpoints: 0 };
      const misEdiciones = data[`ediciones_${uid}`] || {};
      const edicionesPareja = parejaUid ? data[`ediciones_${parejaUid}`] || {} : {};

      setLlavesOtro(llavesP || null);
      setLlavesPropia(miLlaves || null);
      const progresoMio = data[`progreso_${uid}`] || { circulitos: 0, checkpoints: 0 };
      setProgreso(progresoMio);
      setReclamados(data[`reclamados_${uid}`] || []);
      setParejaProgreso(progresoPareja);
      setEdiciones(misEdiciones);
      setParejaEdiciones(edicionesPareja);
      setParejaListo(!!llavesP);

      if (!miLlaves) { setEstado('eligiendo'); return; }
      if (!llavesP)  { setEstado('esperando'); return; }
      setEstado('activa');
    });
    return () => unsub();
  }, [uid]);

  const getParejaUid = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'usuarios', uid));
      return snap.data()?.pareja || null;
    } catch { return null; }
  };

  const handleCrear = async () => {
    const capId = getMesAnio();
    await setDoc(doc(db, 'capsulas', capId), {
      creadaPor: uid,
      diasRestantes: 60,
      creadaEn: new Date(),
      [`progreso_${uid}`]: { circulitos: 0, checkpoints: 1 },
    }, { merge: true }).catch(() => {});
    setEstado('eligiendo');
  };

  const handleConfirmarLlaves = async (llaves) => {
    const capId = getMesAnio();
    await setDoc(doc(db, 'capsulas', capId), {
      [`llaves_${uid}`]: llaves,
    }, { merge: true }).catch(() => {});
  };

  const handleCheckpointPress = (checkpointIndex) => {
    const alcanzado = checkpointIndex === 0 || progreso?.checkpoints > checkpointIndex;
    const yaReclamado = reclamados.includes(checkpointIndex);

    if (!alcanzado) {
      const partnerClaimed = parejaProgreso?.checkpoints > checkpointIndex;
      setRewardTitulo(`Checkpoint ${checkpointIndex + 1}`);
      setRewardTexto(partnerClaimed
        ? 'Tu pareja ya alcanzó este checkpoint. Sigue avanzando para reclamarlo tú también.'
        : 'Aún no has alcanzado este checkpoint. Completa tu siguiente misión para desbloquearlo.');
      setPendingReclamar(null);
      setShowRewardOverlay(true);
      return;
    }

    const todasLlaves = [...(llavesPropia || []), ...(llavesOtro || [])];
    const llaveId = todasLlaves[checkpointIndex] || null;
    const llave = llaveId ? POOL_LLAVES.find(x => x.id === llaveId) : null;
    setRewardTitulo(llave ? `${llave.icono} ${llave.nombre}` : `Checkpoint ${checkpointIndex + 1}`);
    setRewardTexto(llave ? llave.desc : 'Recompensa desbloqueada.');
    setPendingReclamar(yaReclamado ? null : checkpointIndex);
    setShowRewardOverlay(true);
  };

  const handleCerrarCapsula = async () => {
    const capId = getMesAnio();
    await deleteDoc(doc(db, 'capsulas', capId)).catch(() => {});
    setEstado('sin_capsula');
    setCapsula(null);
    setLlavesPropia(null);
    setLlavesOtro(null);
    setProgreso({ circulitos: 0, checkpoints: 0 });
    setParejaProgreso({ circulitos: 0, checkpoints: 0 });
    setEdiciones({});
    setParejaEdiciones({});
    setParejaListo(false);
  };

  const handleSaveEdiciones = async (nuevasEdiciones, dineroRegalado = 0) => {
    const capId = getMesAnio();
    const updates = { [`ediciones_${uid}`]: nuevasEdiciones };
    if (dineroRegalado > 0) {
      // descontar dinero al usuario y guardar en la capsula
      const userSnap = await getDoc(doc(db, 'usuarios', uid)).catch(() => null);
      const dineroActual = userSnap?.data()?.dinero ?? 0;
      const nuevosDinero = Math.max(0, dineroActual - dineroRegalado);
      await setDoc(doc(db, 'usuarios', uid), { dinero: nuevosDinero }, { merge: true }).catch(() => {});
      updates[`dineroRegalado_${uid}`] = dineroRegalado;
    }
    await setDoc(doc(db, 'capsulas', capId), updates, { merge: true }).catch(() => {});
    setEdiciones(nuevasEdiciones);
    setEstado('activa');
  };

  const handleEdit = () => {
    setEstado('editar');
  };

  const handleCloseReward = async () => {
    setShowRewardOverlay(false);
    if (pendingReclamar !== null) {
      const nuevosReclamados = [...reclamados, pendingReclamar];
      setReclamados(nuevosReclamados);
      setPendingReclamar(null);
      const capId = getMesAnio();
      await setDoc(doc(db, 'capsulas', capId), {
        [`reclamados_${uid}`]: nuevosReclamados,
      }, { merge: true }).catch(() => {});
    }
  };

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <ExpoImage
        source={require('../../../assets/temporadas/libro/Temporada1/fondo1.png')}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        contentFit="cover" cachePolicy="memory"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
      <TabButtons onExit={() => navigation?.navigate?.('temporada1')} customAddButton={<View />} />

      {estado === 'cargando'    && <View style={s.centrado}><ActivityIndicator color="#fff" /></View>}
      {estado === 'sin_capsula' && <SinCapsula onCrear={handleCrear} />}
      {estado === 'eligiendo'   && <ElegirLlaves onConfirmar={handleConfirmarLlaves} llavesOtro={llavesOtro} />}
      {estado === 'esperando'   && <EsperandoPareja llavesPropia={llavesPropia} parejaListo={parejaListo} />}
      {estado === 'activa' && <CapsulaActiva capsula={capsula} uid={uid} progreso={progreso} parejaProgress={parejaProgreso} ediciones={ediciones} miAvatar={auth.currentUser?.photoURL} parejaAvatar={capsula?.parejaAvatar || null} reclamados={reclamados} onCheckpointPress={handleCheckpointPress} onEdit={handleEdit} onCloseCapsula={handleCerrarCapsula} parejaCompletado={progreso.checkpoints >= 6 && parejaProgreso.checkpoints >= 6} />}
      {estado === 'editar' && <CapsulaEditar llaves={llavesPropia || []} llavesOtro={llavesOtro || []} ediciones={ediciones} onSave={handleSaveEdiciones} onCancel={() => setEstado('activa')} capId={getMesAnio()} uid={uid} dineroProp={capsula?.dineroProp ?? 0} />}
      <RecompensaOverlay visible={showRewardOverlay} titulo={rewardTitulo} texto={rewardTexto} onClose={handleCloseReward} />
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────
const PINK  = '#ff8fa8';
const CREAM = '#f5e6c0';
const DIM   = 'rgba(255,255,255,0.45)';

const s = StyleSheet.create({
  container: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, gap: 12 },

  // Sin cápsula
  capsulaIcono: { fontSize: 48, marginBottom: 4 },
  sinCapTitulo: { fontFamily: 'Omori', fontSize: 18, color: CREAM, textAlign: 'center' },
  sinCapSub:    { fontFamily: 'Delius', fontSize: 11, color: DIM, textAlign: 'center', lineHeight: 18 },
  btnCrear: {
    marginTop: 8, backgroundColor: 'rgba(255,143,168,0.2)', borderRadius: 12,
    borderWidth: 1, borderColor: PINK, paddingVertical: 10, paddingHorizontal: 28,
  },
  btnCrearText: { fontFamily: 'Delius', fontSize: 12, color: PINK, fontWeight: '700' },
  btnDisabled:  { opacity: 0.4 },

  // Elegir llaves
  elegirTitulo:   { fontFamily: 'Omori', fontSize: 16, color: CREAM },
  elegirSub:      { fontFamily: 'Delius', fontSize: 10, color: DIM, textAlign: 'center', lineHeight: 16 },
  elegirContador: { fontFamily: 'Delius', fontSize: 10, color: PINK },
  llavesGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 8 },
  llaveCard: {
    width: 100, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 10, alignItems: 'center', gap: 4,
  },
  llaveCardSel:  { borderColor: PINK, backgroundColor: 'rgba(255,143,168,0.15)' },
  llaveIcono:    { fontSize: 22 },
  llaveNombre:   { fontFamily: 'Omori', fontSize: 10, color: CREAM },
  llaveDesc:     { fontFamily: 'Delius', fontSize: 8, color: DIM, textAlign: 'center' },
  llaveCheck:    { position: 'absolute', top: 4, right: 6 },
  llaveCheckText:{ color: PINK, fontSize: 12, fontWeight: '700' },

  // Esperando
  llavesResumen:    { flexDirection: 'row', gap: 14, marginTop: 8 },
  llaveResumenItem: { alignItems: 'center', gap: 4 },

  // Layout activa
  layout: { position: 'absolute', top: 48, left: 0, right: 0, bottom: 0 },
  seccion: { position: 'absolute', top: 0, bottom: 0, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  info:   { left: '5%',  right: '65%', top: '12%', bottom: '8%', borderColor: 'rgba(255,0,0,0.3)' },
  cap:    { left: '35%', right: '33%', borderColor: 'rgba(0,0,255,0.3)' },
  camino: { left: '67%', right: '2%',  top: '-12%', borderColor: 'rgba(0,255,0,0.3)' },

  // Info
  infoWrap:         { alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  infoIcono:        { fontSize: 28, marginBottom: 2 },
  infoTitulo:       { fontFamily: 'Omori', fontSize: 13, color: CREAM, letterSpacing: 1 },
  infoSubtitulo:    { fontFamily: 'Delius', fontSize: 9, color: DIM, letterSpacing: 1, textTransform: 'capitalize' },
  infoSep:          { width: '70%', height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 6 },
  infoProgLabel:    { fontFamily: 'Delius', fontSize: 7, color: DIM, letterSpacing: 2 },
  infoBarBg:        { width: '80%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  infoBarFill:      { height: '100%', backgroundColor: PINK, borderRadius: 2 },
  infoProgNum:      { fontFamily: 'Delius', fontSize: 9, color: PINK, marginTop: 3 },
  infoAperturaLabel:{ fontFamily: 'Delius', fontSize: 7, color: DIM, letterSpacing: 2 },
  infoAperturaFecha:{ fontFamily: 'Omori', fontSize: 14, color: CREAM, marginTop: 2 },
  infoCandado:      { fontSize: 20, marginTop: 6 },

  // Cap
  capWrap:           { paddingHorizontal: 14, paddingVertical: 10, width: '100%' },
  capTitulo:         { fontFamily: 'Omori', fontSize: 11, color: CREAM, textAlign: 'center', letterSpacing: 1 },
  capSep:            { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 8 },
  capMisionCard:     { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,143,168,0.25)', padding: 12, alignItems: 'center' },
  capMisionSemana:   { fontFamily: 'Delius', fontSize: 8, color: PINK, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  capMisionTitulo:   { fontFamily: 'Omori', fontSize: 13, color: CREAM, textAlign: 'center', marginBottom: 6 },
  capMisionTexto:    { fontFamily: 'Delius', fontSize: 10, color: DIM, textAlign: 'center', lineHeight: 15 },
  capProgWrap:       { flexDirection: 'row', gap: 5, marginVertical: 10 },
  capProgDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  capProgDotFill:    { backgroundColor: PINK, borderColor: PINK },
  capMisionStatus:   { fontFamily: 'Delius', fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginVertical: 10 },
  capBtn:            { marginTop: 6, backgroundColor: 'rgba(255,143,168,0.2)', borderRadius: 8, borderWidth: 1, borderColor: PINK, paddingVertical: 6, paddingHorizontal: 18 },
  capEditBtn:        { backgroundColor: 'rgba(142,240,184,0.22)', borderColor: '#8ef0b8', borderWidth: 1 },
  capBtnText:        { fontFamily: 'Delius', fontSize: 10, color: PINK, fontWeight: '700' },
  capEditBtnText:    { color: '#8ef0b8' },
  capCompletadoIcon: { fontSize: 28, marginBottom: 6 },
  capCompletadoText: { fontFamily: 'Delius', fontSize: 11, color: CREAM, textAlign: 'center', lineHeight: 17 },
  elegirNota:        { fontFamily: 'Delius', fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
  capCerrarBtn:     { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: '#f7b2c7' },
  capCerrarBtnBottom:{ marginTop: 12 },
  checkpointButton:  { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  checkpointButtonText: { fontFamily: 'Delius', fontSize: 9, color: CREAM, letterSpacing: 0.5 },
});

// ── Estilos editor cápsula ──────────────────────────────────────────
const se = StyleSheet.create({
  root:    { flex: 1, paddingTop: 52 },
  topBar:  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, paddingHorizontal: 20, marginBottom: 8 },
  topX:       { fontFamily: 'Delius', fontSize: 18, color: 'rgba(255,255,255,0.35)' },
  topGuardar: { fontFamily: 'Delius', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 },
  topEnviar:  { fontFamily: 'Delius', fontSize: 10, color: PINK, letterSpacing: 1 },
  topEnviado: { color: '#6bcb77' },

  fila: { alignItems: 'center', paddingHorizontal: 24, gap: 32, paddingVertical: 16 },

  // Polaroid
  polaroid: {
    backgroundColor: '#fff8ee',
    padding: 8, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
    width: 160,
  },
  polaroidImg:       { width: 144, height: 144 },
  polaroidVacio:     { width: 144, height: 144, backgroundColor: '#ede0c8', justifyContent: 'center', alignItems: 'center' },
  polaroidVacioIcono:{ fontSize: 40, color: '#c9a87a' },
  polaroidPie: {
    position: 'absolute', bottom: 6, left: 8, right: 8,
    fontFamily: 'Delius', fontSize: 11, color: '#8a6a4a', textAlign: 'center',
    backgroundColor: 'transparent',
  },

  // Flor
  florWrap:   { alignItems: 'center', gap: 12 },
  colorRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  colorDot:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'transparent' },
  colorDotSel:{ borderColor: CREAM },

  // Chancho
  chanchoWrap:     { alignItems: 'center', gap: 4 },
  chanchoEmoji:    { fontSize: 56 },
  chanchoCantidad: { fontFamily: 'Omori', fontSize: 38, color: CREAM, lineHeight: 44 },
  chanchoMoneda:   { fontSize: 22 },
  chanchoControles:{ flexDirection: 'row', gap: 14, marginTop: 6 },
  chanchoCtrl:     { fontFamily: 'Delius', fontSize: 13, color: 'rgba(255,100,100,0.8)' },
  chanchoCtrlPos:  { color: 'rgba(107,203,119,0.9)' },
  chanchoSaldo:    { fontFamily: 'Delius', fontSize: 9, color: DIM, marginTop: 2 },

  // Nota
  notaWrap:  { alignItems: 'center', gap: 8 },
  notaIcono: { fontSize: 36 },
  notaInput: {
    color: CREAM, fontFamily: 'Delius', fontSize: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,143,168,0.3)',
    width: 160, minHeight: 80, textAlignVertical: 'top', paddingVertical: 4,
  },
});
