import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import TabButtons from '../../../components/TabButtons';
import RecompensaOverlay from '../../../components/RecompensaOverlay';
import Svg, { Circle, Path, G, Image as SvgImage, AnimateTransform } from 'react-native-svg';
import { db, auth } from '../../../firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ── Helpers ──────────────────────────────────────────────────
const getMesAnio = () => {
  const ahora = new Date();
  return `${ahora.toLocaleString('es-ES', { month: 'long' })}-${ahora.getFullYear()}`;
// Simplified flow: no separate "SinCapsula"/"ElegirLlaves"/"EsperandoPareja" components
// Capsule now uses coin-based unlocking; the final checkpoint accepts a pasted text
// which is sent to the partner when the user taps "Enviar cápsula".
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
  seccion: { position: 'absolute', top: 0, bottom: 0, borderWidth: 0, justifyContent: 'center', alignItems: 'center' },
  info:   { left: '5%',  right: '65%', top: '12%', bottom: '8%', borderColor: 'transparent' },
  cap:    { left: '35%', right: '33%', borderColor: 'transparent' },
  camino: { left: '67%', right: '2%',  top: '-12%', borderColor: 'transparent' },

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
