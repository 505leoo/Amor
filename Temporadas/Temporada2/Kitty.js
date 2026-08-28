import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, StatusBar, TouchableOpacity, Modal,
  ScrollView, Animated, Text, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as DocumentPicker from 'expo-document-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../firebaseConfig';

const STORAGE_BUCKET = 'amor-9df0d.firebasestorage.app';
const pausarVideoSeguro = player => {
  try {
    const resultado = player?.pause?.();
    resultado?.catch?.(() => {});
  } catch (_) {
    // El reproductor nativo puede haberse liberado durante el cierre.
  }
};

const uploadSvgRest = async (svgString, path) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  const fullPath = path;
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(fullPath)}?uploadType=media`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'image/svg+xml', Authorization: `Bearer ${token}` },
    body: svgString,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(fullPath)}?alt=media`;
};
import TabButtons from '../../components/TabButtons';
import Loading from '../../components/Loading';
import { MaterialIcons } from '@expo/vector-icons';
import { useMusicPlayer } from '../../MusicContext';

const THUMB_COUNT = 5;
const INFORMACION_EPISODIOS = {
  1: {
    titulo: 'El Regalo Perfecto',
    descripcion: 'Kitty quiere sorprender a My Melody con el regalo perfecto. Mientras busca sin revelar para quién es, termina encontrando una idea especial: un brazalete pintado de rosa, el color favorito de My Melody.',
  },
  2: {
    titulo: 'Haz tu propia suerte',
    descripcion: 'Keroppi tiene un día muy desafortunado. Una actitud positiva y un pequeño regalo de Kitty lo ayudan a cambiar su suerte.',
  },
  3: {
    titulo: 'El Mal Día de Kuromi',
    descripcion: 'Todo el mundo tiene días malos, y hoy Kuromi se despertó de mal humor. Mientras intenta seguir con su día, su actitud hace que todo parezca todavía más difícil y sus amigos buscan una forma de acompañarla.',
  },
  4: {
    titulo: 'La Garra',
    descripcion: 'Badtz-Maru es conocido por ser muy competitivo. Cuando aparece un nuevo desafío, se entusiasma por demostrar que puede ganar, aunque pronto descubrirá que divertirse y compartir también forman parte del juego.',
  },
  5: {
    titulo: 'Detective Hello Kitty',
    descripcion: 'En este episodio de estilo noir, My Melody entra en pánico al darse cuenta de que su agenda ha desaparecido. Hello Kitty, Pompompurin y Keroppi la ayudarán a seguir las pistas para resolver el misterio de la agenda perdida.',
  },
  6: {
    titulo: 'Llegó el Invierno',
    descripcion: 'Badtz-Maru y Keroppi encuentran la colina perfecta para hacer snowboard. Con la llegada del invierno, los dos amigos se preparan para disfrutar una aventura llena de nieve, velocidad y diversión.',
  },
  7: {
    titulo: 'Misión Invisible',
    descripcion: 'Kuromi es conocida por ser dura, pero esta vez se embarca en una aventura secreta para comprar su libro favorito sin que nadie se dé cuenta. Tendrá que moverse con cuidado para completar su misión invisible.',
  },
  8: {
    titulo: 'Teléfono Roto',
    descripcion: 'Badtz-Maru es un pingüino travieso al que le encanta gastar bromas. En una partida de Teléfono Roto, engaña a Keroppi, My Melody, Kuromi, Pompompurin y Hello Kitty para hacer circular divertidos mensajes por toda la ciudad.',
  },
};
const COLORES_VIDEOS = [
  { fondo: '#ffe4ee', suave: '#fff1f6', borde: '#e58aaa', texto: '#a84f72' },
  { fondo: '#eee6ff', suave: '#f7f2ff', borde: '#aa8cdd', texto: '#7355a4' },
  { fondo: '#dff3ff', suave: '#eef9ff', borde: '#77b9dc', texto: '#397c9f' },
  { fondo: '#ffe9d8', suave: '#fff5ed', borde: '#e8a36e', texto: '#a96535' },
  { fondo: '#e0f5e9', suave: '#effaf3', borde: '#75bb91', texto: '#43815b' },
  { fondo: '#fff3c9', suave: '#fff9e8', borde: '#dbb85b', texto: '#967528' },
  { fondo: '#e4edff', suave: '#f1f5ff', borde: '#89a9e2', texto: '#5274b2' },
  { fondo: '#ffe2df', suave: '#fff0ee', borde: '#e3918a', texto: '#a95751' },
  { fondo: '#f3e2f0', suave: '#fbf0f8', borde: '#c58bb9', texto: '#895c80' },
];

function KittyBackground() {
  const bandas = Array.from({ length: 18 }, (_, index) => 16 + (index * 48));
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 800 450" preserveAspectRatio="none">
      <Defs>
        <SvgLinearGradient id="kittyBase" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fffafd" />
          <Stop offset="0.52" stopColor="#fbe5ef" />
          <Stop offset="1" stopColor="#f1c5d8" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="800" height="450" fill="url(#kittyBase)" />
      {bandas.map((x, index) => <React.Fragment key={index}>
        <Rect x={x} y="0" width="8" height="450" fill="#8b4c6a" opacity="0.07" />
        <Rect x={x + 8} y="0" width="1" height="450" fill="#ffffff" opacity="0.55" />
      </React.Fragment>)}
      <Path d="M105 78 C95 65 75 72 75 89 C75 107 105 123 105 123 C105 123 135 107 135 89 C135 72 115 65 105 78 Z" fill="#fffaff" opacity="0.6" />
      <Path d="M690 322 C682 311 665 316 665 331 C665 346 690 359 690 359 C690 359 715 346 715 331 C715 316 698 311 690 322 Z" fill="#d9799c" opacity="0.18" />
      <Path d="M270 90 l4 10 10 4-10 4-4 10-4-10-10-4 10-4 Z" fill="#fff" opacity="0.7" />
      <Path d="M585 350 l3 8 8 3-8 3-3 8-3-8-8-3 8-3 Z" fill="#c66f91" opacity="0.22" />
      <Rect x="0" y="0" width="800" height="2" fill="#ffffff" opacity="0.8" />
      <Rect x="0" y="448" width="800" height="2" fill="#9d5374" opacity="0.15" />
    </Svg>
  );
}

const obtenerInformacionVideo = (video, indice = 0) => {
  const informacionBase = INFORMACION_EPISODIOS[Number(video?.episode)] || {};
  return {
    titulo: video?.titulo || video?.title || informacionBase.titulo || `Videíto ${video?.episode || indice + 1}`,
    descripcion: video?.descripcion || video?.description || informacionBase.descripcion || 'Una pequeña pausa bonita para compartir con Aurora.',
  };
};

// Type selector modal (SuperCute / Clasica)
const TypeModal = ({ visible, onCancel, onSelect }) => (
  <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
    <View style={styles.uploadOverlay}>
      <View style={[styles.uploadSheet, { alignItems: 'center', paddingVertical: 14 }] }>
        <Text style={[styles.uploadTitle, { marginBottom: 10 }]}>Elegir tipo de miniatura</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[styles.smallBtn, { minWidth: 140 }]} onPress={() => onSelect('SuperCute')}>
            <Text style={styles.smallBtnText}>SuperCute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, { minWidth: 140 }]} onPress={() => onSelect('Clasica')}>
            <Text style={styles.smallBtnText}>Clasica</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onCancel} style={[styles.headerBtn, { marginTop: 12 }]}><Text style={styles.headerBtnText}>Cancelar</Text></TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Upload / Pick modal ─────────────────────────────────────────────────────
const UploadModal = ({ asset, visible, onCancel, onConfirm }) => {
  const player = useVideoPlayer(asset?.uri, p => { pausarVideoSeguro(p); });
  
  const [thumbLocal, setThumbLocal] = useState(null);
  const [localThumbs, setLocalThumbs] = useState([]);
  const [selectedThumbIdx, setSelectedThumbIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [selectedTime, setSelectedTime] = useState(0); // seconds

  useEffect(() => {
    if (!visible) return;
    pausarVideoSeguro(player);
    setThumbLocal(null);
    setSelectedTime(0);
  }, [visible]);

  

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const getStableCurrentTime = async (attempts = 6, delay = 120) => {
    let last = (player.currentTime != null) ? player.currentTime : 0;
    for (let i = 0; i < attempts; i++) {
      await new Promise(r => setTimeout(r, delay));
      const now = (player.currentTime != null) ? player.currentTime : last;
      if (Math.abs(now - last) < 0.06) return now;
      last = now;
    }
    return last;
  };

  const generatePreviewFromTime = async (timeSeconds) => {
    setGenerating(true);
    try {
      const timeMs = Math.round(timeSeconds * 1000);
      const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: timeMs, quality: 0.85 });
      setThumbLocal(uri);
    } catch (e) {
      // ignore preview errors
    }
    setGenerating(false);
  };

  const nudgeTime = async (deltaSeconds) => {
    try {
      const dur = player.duration ? (player.duration > 1000 ? player.duration / 1000 : player.duration) : 0;
      const raw = (player.currentTime != null) ? ((player.currentTime > 1000) ? player.currentTime / 1000 : player.currentTime) : selectedTime;
      let next = raw + deltaSeconds;
      if (dur > 0) next = clamp(next, 0, dur);
      setSelectedTime(next);
      try { player.currentTime = next; } catch (_) {}
      await new Promise(r => setTimeout(r, 220));
      await generatePreviewFromTime(next);
    } catch (_) {}
  };

  const captureFrame = async () => {
    setGenerating(true);
    try {
      // Ensure paused and use selectedTime (set via pause or nudges)
      pausarVideoSeguro(player);
      // If selectedTime is not set, poll player.currentTime until stable
      let seconds = selectedTime;
      if (!seconds && seconds !== 0) {
        const raw = await getStableCurrentTime();
        seconds = raw > 1000 ? raw / 1000 : raw;
      } else {
        // ensure player seeks to selectedTime
        try { player.currentTime = seconds; } catch (_) {}
        await new Promise(r => setTimeout(r, 260));
        const raw = await getStableCurrentTime();
        seconds = raw > 1000 ? raw / 1000 : raw;
      }
      seconds = Math.max(0, seconds || 0);

      const timeMs = Math.round(seconds * 1000);
      const offset = 80; // ms around target to try
      const times = [Math.max(0, timeMs - offset), timeMs, timeMs + offset];
      const generated = [];
      for (const t of times) {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: t, quality: 0.95 });
          generated.push(uri);
        } catch (_) {
          generated.push(null);
        }
      }
      const firstValid = generated.findIndex(u => !!u);
      const sel = firstValid >= 0 ? firstValid : 1;
      setLocalThumbs(generated);
      setSelectedThumbIdx(sel);
      setThumbLocal(generated[sel]);
      setSelectedTime(seconds);
    } catch (e) {
      Alert.alert('Error', e.message || String(e));
    }
    setGenerating(false);
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.uploadOverlay}>
        <View style={styles.uploadSheet}>
          <View style={styles.uploadHeader}>
            <TouchableOpacity onPress={onCancel} style={styles.headerBtn}><Text style={styles.headerBtnText}>Cancelar</Text></TouchableOpacity>
            <Text style={[styles.uploadTitle, { flex: 1, textAlign: 'center' }]}>Preview y miniatura</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {!thumbLocal ? (
                <TouchableOpacity onPress={() => onConfirm({ asset, thumbLocal })} disabled={!thumbLocal} style={styles.headerBtn}>
                  <Text style={[styles.headerBtnText, { color: thumbLocal ? '#fff' : '#666' }]}>Usar y subir</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPress={() => { setThumbLocal(null); setLocalThumbs([]); setSelectedThumbIdx(0); setSelectedTime(0); }} style={styles.headerBtn}>
                    <Text style={styles.headerBtnText}>Reintentar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onConfirm({ asset, thumbLocal })} style={[styles.headerBtn, { backgroundColor: '#e91e8c' }] }>
                    <Text style={[styles.headerBtnText, { color: '#fff' }]}>Subir</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={[styles.previewWrap, styles.previewLarge, thumbLocal ? { height: 360 } : {}]}>
            {thumbLocal ? (
              <Image source={{ uri: thumbLocal }} style={styles.preview} contentFit="cover" />
            ) : (
              <VideoView player={player} style={styles.preview} contentFit="cover" nativeControls={true} />
            )}
            {generating && (
              <View style={styles.thumbLoadingOverlay}><ActivityIndicator size="large" color="#fff" /></View>
            )}
          </View>

          {localThumbs && localThumbs.length > 0 && (
            <View style={styles.thumbSelectorRow}>
              {localThumbs.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => { if (uri) { setSelectedThumbIdx(i); setThumbLocal(uri); } }} style={[styles.selectorThumbWrap, selectedThumbIdx === i && styles.selectorThumbActive]}>
                  {uri ? <Image source={{ uri }} style={styles.selectorThumb} contentFit="cover" /> : <View style={styles.selectorThumbPlaceholder}><Text style={{color:'#777'}}>—</Text></View>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!thumbLocal && (
            <>
              <View style={[styles.controlsRow, { justifyContent: 'center' }]}>
                <TouchableOpacity style={[styles.smallBtn, styles.captureBtn, { minWidth: 120 }]} onPress={captureFrame} disabled={generating}>
                  {generating ? <ActivityIndicator color="#fff" /> : <Text style={[styles.smallBtnText, { color: '#fff' }]}>Capturar</Text>}
                </TouchableOpacity>
              </View>

              <View style={styles.controlsRow}>
                <View style={styles.nudgeContainer}>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => nudgeTime(-1)}>
                    <Text style={styles.smallBtnText}>-1s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => nudgeTime(-0.1)}>
                    <Text style={styles.smallBtnText}>-0.1s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => nudgeTime(0.1)}>
                    <Text style={styles.smallBtnText}>+0.1s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => nudgeTime(1)}>
                    <Text style={styles.smallBtnText}>+1s</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ justifyContent: 'center' }}>
                  <Text style={styles.timeBadge}>{(selectedTime || 0).toFixed(2)}s</Text>
                </View>
              </View>
            </>
          )}

          {/* header contains Cancel / Reintentar / Subir or Usar y subir */}
        </View>
      </View>
    </Modal>
  );
};

// ─── Fullscreen Player ────────────────────────────────────────────────────────
const FullscreenPlayer = ({ item, onClose, onComplete }) => {
  const { pause: pauseMusic, play: playMusic, enabled: musicWasEnabled } = useMusicPlayer();
  const player = useVideoPlayer(item.url, p => { p.loop = false; p.muted = false; });
  useEffect(() => {
    pauseMusic();
    player.play();
    const completionSubscription = player.addListener('playToEnd', () => onComplete?.(item.id));
    return () => {
      try { completionSubscription?.remove?.(); } catch (_) {}
      pausarVideoSeguro(player);
      if (musicWasEnabled) playMusic();
    };
  }, []);
  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.fsContainer}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls />
        <TouchableOpacity style={styles.fsClose} onPress={onClose} activeOpacity={0.8}>
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ─── Video card sin thumbUrl guardada ────────────────────────────────────────
const VideoItemWithPlayer = ({ item, gestion, activoId, setActivoId, onEliminar, onComplete, theme, featured = false }) => {
  const player = useVideoPlayer(item.url, p => { pausarVideoSeguro(p); p.currentTime = 0; });
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <View style={[styles.videoCard, featured && styles.featuredVideoCard, theme && { borderColor: theme.borde }]}>
      <View style={[styles.video, { backgroundColor: theme?.fondo || '#ffe8f0', justifyContent: 'center', alignItems: 'center' }]}>
        {featured
          ? <Image source={require('../../assets/temporadas/libro/Temporada2/logokitty.png')} style={styles.featuredLogo} contentFit="contain" />
          : <><MaterialIcons name="videocam" size={34} color="#df83a6" /><Text style={{ color: '#a85b79', fontSize: 8, fontWeight: '900', marginTop: 4 }}>VIDEÍTO</Text></>}
        <View style={styles.videoSparkles}><Text style={styles.videoSparkleText}>✦</Text><Text style={styles.videoSparkleText}>♡</Text></View>
      </View>
      <View pointerEvents="none" style={styles.episodeBadge}><Text style={styles.episodeBadgeText}>{item.episode ? `EP. ${item.episode}` : 'HELLO KITTY'}</Text></View>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => {
        if (gestion) { onEliminar(item); return; }
        setFullscreen(true);
      }} activeOpacity={0.8}>
        <View style={styles.videoOverlay}>
          <MaterialIcons name="play-circle-filled" size={36} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>
      {gestion && (
        <View style={styles.gestionActions} pointerEvents="box-none">
          <TouchableOpacity onPress={() => onEliminar(item)} style={styles.gestionBtn}>
            <MaterialIcons name="delete" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {fullscreen && <FullscreenPlayer item={item} onClose={() => setFullscreen(false)} onComplete={onComplete} />}
    </View>
  );
};

// ─── Video card con thumbUrl ──────────────────────────────────────────────────
const VideoItem = ({ item, gestion, activoId, setActivoId, onEliminar, onComplete, theme, featured = false }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const shouldHideLegacyThumb = !!item.thumbUrl && /EP\d|EP[A-Z]/i.test(item.thumbUrl);
  if (!item.thumbUrl || shouldHideLegacyThumb) return <VideoItemWithPlayer item={item} gestion={gestion} activoId={activoId} setActivoId={setActivoId} onEliminar={onEliminar} onComplete={onComplete} theme={theme} featured={featured} />;
  return (
    <View style={[styles.videoCard, featured && styles.featuredVideoCard, theme && { borderColor: theme.borde }]}>
      <View style={[styles.video, { backgroundColor: '#fff', justifyContent: 'flex-end', alignItems: 'flex-start', paddingBottom: 8, paddingLeft: 8 }] }>
          <Image source={{ uri: item.thumbUrl }} style={styles.video} contentFit="cover" cachePolicy="memory-disk" />
        </View>
      <View pointerEvents="none" style={styles.episodeBadge}><Text style={styles.episodeBadgeText}>{item.episode ? `EP. ${item.episode}` : 'HELLO KITTY'}</Text></View>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => {
        if (gestion) { onEliminar(item); return; }
        setFullscreen(true);
      }} activeOpacity={0.8}>
        <View style={styles.videoOverlay}>
          <MaterialIcons name="play-circle-filled" size={36} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>
      {gestion && activoId === item.id && (
        <View style={styles.gestionActions}>
          <TouchableOpacity onPress={() => onEliminar(item)} style={styles.gestionBtn}>
            <Text style={{ color: '#fff' }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}
      {fullscreen && <FullscreenPlayer item={item} onClose={() => setFullscreen(false)} onComplete={onComplete} />}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Kitty({ navigation, route }) {
  const destinoSalida = route?.params?.from === 'main' ? 'main' : 'temporada2';
  const loadingRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [videosCargados, setVideosCargados] = useState(false);
  const [mostrarVacio, setMostrarVacio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videosVistos, setVideosVistos] = useState({});
  const emptyOpacity = useRef(new Animated.Value(0)).current;
  const vistosStorageKey = `kitty_videos_vistos_${auth.currentUser?.uid || 'invitado'}`;

  useEffect(() => { loadingRef.current?.fadeOut(); }, []);

  useEffect(() => {
    AsyncStorage.getItem(vistosStorageKey)
      .then(value => setVideosVistos(value ? JSON.parse(value) : {}))
      .catch(() => setVideosVistos({}));
  }, [vistosStorageKey]);

  useEffect(() => {
    getDocs(query(collection(db, 'kitty_videos'), orderBy('createdAt', 'asc')))
      .then(snap => {
        setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setVideosCargados(true);
      })
      .catch(() => setVideosCargados(false));
  }, []);

  useEffect(() => {
    if (!videosCargados || videos.length > 0 || uploading) {
      setMostrarVacio(false);
      emptyOpacity.setValue(0);
      return undefined;
    }
    const timer = setTimeout(() => {
      setMostrarVacio(true);
      Animated.timing(emptyOpacity, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    }, 1000);
    return () => clearTimeout(timer);
  }, [videosCargados, videos.length, uploading, emptyOpacity]);

  const [pickedAsset, setPickedAsset] = useState(null);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [gestion, setGestion] = useState(false);
  const [activoId, setActivoId] = useState(null);
  const [videoSeleccionadoId, setVideoSeleccionadoId] = useState(null);

  const ADMIN_EMAIL = 'admin@gmail.com';

  const uploadFile = useCallback(async (localUri, path, onProgress) => {
    const token = await auth.currentUser?.getIdToken();
    const url = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`;
    const result = await new Promise((resolve, reject) => {
      const task = FileSystem.createUploadTask(url, localUri, { httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'video/mp4' }, sessionType: FileSystem.FileSystemSessionType.BACKGROUND }, ({ totalBytesSent, totalBytesExpectedToSend }) => onProgress?.(totalBytesExpectedToSend ? totalBytesSent / totalBytesExpectedToSend : 0));
      task.uploadAsync().then(resolve).catch(reject);
    });
    if (!result || result.status < 200 || result.status >= 300) throw new Error(`No se pudo subir el video (${result?.status || 'sin respuesta'}).`);
    return getDownloadURL(ref(storage, path));
  }, []);

  const handleAddVideo = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPickedAsset(asset);
    setTypeModalVisible(true);
  }, []);

  const toggleGestion = () => {
    setGestion(prev => !prev);
    setActivoId(null);
  };

  const marcarVideoVisto = useCallback(videoId => {
    if (!videoId) return;
    setVideosVistos(previous => {
      if (previous[videoId]) return previous;
      const next = { ...previous, [videoId]: true };
      AsyncStorage.setItem(vistosStorageKey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [vistosStorageKey]);

  const handleEliminar = (video) => {
    Alert.alert('Eliminar', `¿Eliminar episodio ${video.episode || ''}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'kitty_videos', video.id));
          setVideos(prev => prev.filter(v => v.id !== video.id));
          setActivoId(null);
        } catch (e) { console.error('Error eliminando video:', e); }
      } },
    ]);
  };

  const handleTypeSelect = useCallback(async (type) => {
    setTypeModalVisible(false);
    if (!pickedAsset) return;
    const asset = pickedAsset;
    try {
      // count existing episodes for this type
      const q = query(collection(db, 'kitty_videos'), where('type', '==', type));
      const snap = await getDocs(q);
      const episode = snap.size + 1;

      const ts = Date.now();
      setUploading(true);
      const videoUrl = await uploadFile(asset.uri, `kitty_videos/${ts}.mp4`, setUploadProgress);
      const doc = await addDoc(collection(db, 'kitty_videos'), {
        url: videoUrl,
        type,
        episode,
        createdAt: serverTimestamp(),
      });
      setVideos(prev => [...prev, { id: doc.id, url: videoUrl, type, episode }]);
    } catch (e) {
      Alert.alert('Error', e.message || String(e));
    } finally {
      setPickedAsset(null);
      setUploading(false);
      setUploadProgress(0);
    }
  }, [pickedAsset, uploadFile]);
 

  const handleUploaded = useCallback((newVideo) => {
    setVideos(prev => [...prev, newVideo]);
  }, []);

  const superCuteVideos = videos;
  const videoSeleccionado = superCuteVideos.find(video => video.id === videoSeleccionadoId) || superCuteVideos[0];
  const indiceSeleccionado = Math.max(0, superCuteVideos.findIndex(video => video.id === videoSeleccionado?.id));
  const videosParaElegir = superCuteVideos;
  const informacionSeleccionada = obtenerInformacionVideo(videoSeleccionado, indiceSeleccionado);
  const temaSeleccionado = COLORES_VIDEOS[indiceSeleccionado % COLORES_VIDEOS.length];

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <KittyBackground />
      <TabButtons
        onExit={() => navigation?.navigate?.(destinoSalida)}
        customAddButton={(
          <View style={{ flexDirection: 'row' }}>
            {auth.currentUser?.email === ADMIN_EMAIL && (
              <TouchableOpacity onPress={toggleGestion} activeOpacity={0.7} style={{ marginRight: 8 }}>
                <View style={[{ width: 52, height: 52, backgroundColor: gestion ? '#e91e8c' : '#8a5a6a', justifyContent: 'center', alignItems: 'center', borderRadius: 6 }]}>
                  <MaterialIcons name={gestion ? 'close' : 'list'} size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleAddVideo} activeOpacity={0.7}>
              <View style={[{ width: 52, height: 52, backgroundColor: '#f39c12', justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialIcons name="add" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      />

      {superCuteVideos.length > 0 && (
        <View style={styles.listWrap}>
          <View style={[styles.clubPanel, videosParaElegir.length === 0 && styles.clubPanelSingle]}>
            <View style={styles.clubHeader}>
              <View style={styles.clubBow}><Text style={styles.clubBowText}>🎀</Text></View>
              <View style={styles.clubHeaderCopy}>
                <Text style={styles.clubEyebrow}>HELLO KITTY VIDEO CLUB</Text>
                <Text style={styles.clubTitle}>Elegí nuestro próximo videíto</Text>
              </View>
              <View style={styles.clubCounter}><Text style={styles.clubCounterNumber}>{superCuteVideos.length}</Text><Text style={styles.clubCounterLabel}>VIDEOS</Text></View>
            </View>

            <View style={styles.showcaseRow}>
              <VideoItem item={videoSeleccionado} gestion={gestion} activoId={activoId} setActivoId={setActivoId} onEliminar={handleEliminar} onComplete={marcarVideoVisto} theme={temaSeleccionado} featured />
              <View style={[styles.showcaseInfo, { backgroundColor: temaSeleccionado.suave, borderColor: temaSeleccionado.borde }]}>
                <View style={styles.showcaseStatusRow}>
                  <Text style={styles.showcaseKicker}>AHORA ELEGIDO</Text>
                  <View style={[styles.watchStatus, videosVistos[videoSeleccionado?.id] ? styles.watchStatusSeen : styles.watchStatusNew]}>
                    <MaterialIcons name={videosVistos[videoSeleccionado?.id] ? 'check' : 'fiber-new'} size={8} color={videosVistos[videoSeleccionado?.id] ? '#fff' : '#a85b79'} />
                    <Text style={[styles.watchStatusText, videosVistos[videoSeleccionado?.id] && styles.watchStatusTextSeen]}>{videosVistos[videoSeleccionado?.id] ? 'VISTO' : 'NUEVO'}</Text>
                  </View>
                </View>
                <Text style={[styles.showcaseTitle, { color: temaSeleccionado.texto }]} numberOfLines={2}>{informacionSeleccionada.titulo}</Text>
                <Text style={styles.showcaseText} numberOfLines={4}>{informacionSeleccionada.descripcion}</Text>
                <View style={styles.showcaseHint}><MaterialIcons name="play-arrow" size={13} color="#fff" /><Text style={styles.showcaseHintText}>TOCÁ PARA VER</Text></View>
                <Text style={styles.showcaseDecor}>♡  ·  ✦  ·  ♡</Text>
              </View>
            </View>

            {videosParaElegir.length > 0 && <>
            <View style={styles.selectorHeader}><Text style={styles.selectorTitle}>VIDEÍTOS</Text><Text style={styles.selectorCount}>Deslizá y elegí</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {videosParaElegir.map(item => {
                const index = superCuteVideos.findIndex(video => video.id === item.id);
                const seleccionado = item.id === videoSeleccionado?.id;
                const temaVideo = COLORES_VIDEOS[index % COLORES_VIDEOS.length];
                const tieneMiniatura = Boolean(item.thumbUrl) && !/EP\d|EP[A-Z]/i.test(item.thumbUrl);
                return (
                  <TouchableOpacity key={item.id} style={[styles.selectorCard, { borderColor: temaVideo.borde }, seleccionado && styles.selectorCardActive]} onPress={() => setVideoSeleccionadoId(item.id)} activeOpacity={0.8}>
                    {tieneMiniatura
                      ? <Image source={{ uri: item.thumbUrl }} style={styles.selectorThumb} contentFit="cover" cachePolicy="memory-disk" />
                      : <View style={[styles.selectorCover, { backgroundColor: temaVideo.fondo }]}><Text style={styles.selectorCoverBow}>🎀</Text><Text style={[styles.selectorCoverNumber, { color: temaVideo.texto }]}>{String(item.episode || index + 1).padStart(2, '0')}</Text></View>}
                    <View style={styles.selectorShade} />
                    <Text style={styles.selectorEpisode}>ELEGIR</Text>
                    {seleccionado && <View style={styles.selectorCurrentDot} />}
                    <View style={[styles.selectorWatchStatus, videosVistos[item.id] ? styles.selectorWatchSeen : styles.selectorWatchNew]}>
                      <MaterialIcons name={videosVistos[item.id] ? 'check' : 'fiber-new'} size={7} color={videosVistos[item.id] ? '#fff' : '#a85b79'} />
                      <Text style={[styles.selectorWatchText, videosVistos[item.id] && styles.selectorWatchTextSeen]}>{videosVistos[item.id] ? 'VISTO' : 'NUEVO'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            </>}
          </View>
        </View>
      )}
      {mostrarVacio && <Animated.View style={[styles.emptyState, { opacity: emptyOpacity }]}><Text style={styles.emptyBow}>🎀</Text><Text style={styles.emptyEyebrow}>KAWAII VIDEO CLUB</Text><Text style={styles.emptyTitle}>El rincón de Kitty</Text><Text style={styles.emptyText}>Todavía no hay videitos. Subí el primero para compartir una tarde bonita con Aurora.</Text><Text style={styles.emptyRule}>♡　✦　♡</Text></Animated.View>}
      {uploading && <View style={styles.uploadStatus}><View style={styles.uploadStatusIcon}><MaterialIcons name="cloud-upload" size={20} color="#fff" /></View><View style={styles.uploadStatusCopy}><Text style={styles.uploadStatusTitle}>Guardando un videíto…</Text><Text style={styles.uploadStatusText}>Preparándolo para Aurora</Text><View style={styles.uploadTrack}><View style={[styles.uploadFill, { width: `${Math.max(3, uploadProgress * 100)}%` }]} /></View></View><Text style={styles.uploadPercent}>{Math.round(uploadProgress * 100)}%</Text></View>}

      {pickedAsset && (
        <TypeModal
          visible={typeModalVisible}
          onCancel={() => { setTypeModalVisible(false); setPickedAsset(null); }}
          onSelect={handleTypeSelect}
        />
      )}

      <Loading ref={loadingRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyState: { position: 'absolute', top: 145, left: 28, right: 28, alignItems: 'center', padding: 22, borderRadius: 24, backgroundColor: '#fffafd', borderWidth: 1.5, borderColor: '#f3c4d5', shadowColor: '#d889a5', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 9, elevation: 3 },
  emptyBow: { fontSize: 30 }, emptyEyebrow: { color: '#d57d9c', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 7 }, emptyTitle: { color: '#75445b', fontSize: 21, fontWeight: '900', marginTop: 4 }, emptyText: { color: '#a07082', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 8 }, emptyRule: { color: '#e58aaa', fontSize: 17, marginTop: 13 },
  uploadStatus: { position: 'absolute', left: 22, right: 22, bottom: 28, minHeight: 68, padding: 10, borderRadius: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#f0adc4', shadowColor: '#bd6687', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 }, uploadStatusIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e68aaa' }, uploadStatusCopy: { flex: 1, marginLeft: 9 }, uploadStatusTitle: { color: '#714158', fontSize: 11, fontWeight: '900' }, uploadStatusText: { color: '#a07082', fontSize: 8, marginTop: 2 }, uploadTrack: { height: 5, marginTop: 7, borderRadius: 5, overflow: 'hidden', backgroundColor: '#f7dce6' }, uploadFill: { height: '100%', backgroundColor: '#d86f96' }, uploadPercent: { color: '#c65d83', fontSize: 10, fontWeight: '900', marginLeft: 8 },
  listWrap: { position: 'absolute', top: 44, left: 103, right: 117, alignItems: 'center' },
  clubPanel: { width: '100%', maxWidth: 560, height: 302, padding: 11, borderRadius: 24, backgroundColor: 'rgba(255,250,252,0.97)', borderWidth: 1.5, borderColor: '#f1b4ca', shadowColor: '#bd6687', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  clubPanelSingle: { height: 218 },
  clubHeader: { height: 42, flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f7dce6' },
  clubBow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#ffe5ef', borderWidth: 1, borderColor: '#f3bfd2' },
  clubBowText: { fontSize: 18 },
  clubHeaderCopy: { flex: 1, marginLeft: 8 },
  clubEyebrow: { color: '#d57d9c', fontSize: 6.5, fontWeight: '900', letterSpacing: 1.4 },
  clubTitle: { color: '#75445b', fontSize: 13, fontWeight: '900', marginTop: 1 },
  clubCounter: { minWidth: 39, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#fff0f5', borderWidth: 1, borderColor: '#efbfd0' },
  clubCounterNumber: { color: '#c35f84', fontSize: 12, lineHeight: 13, fontWeight: '900' },
  clubCounterLabel: { color: '#b77a90', fontSize: 4.5, fontWeight: '900', letterSpacing: 0.7 },
  showcaseRow: { width: '100%', height: 145, flexDirection: 'row', gap: 10, marginTop: 9 },
  showcaseInfo: { flex: 1, paddingHorizontal: 8, paddingVertical: 8, alignItems: 'flex-start', justifyContent: 'center', borderRadius: 16, backgroundColor: '#fff1f6', borderWidth: 1, borderColor: '#f1c7d6' },
  showcaseStatusRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  showcaseKicker: { color: '#d57d9c', fontSize: 5.5, fontWeight: '900', letterSpacing: 1.1 },
  watchStatus: { height: 15, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, borderRadius: 7, borderWidth: 1 },
  watchStatusNew: { backgroundColor: '#fff', borderColor: '#edb8cb' },
  watchStatusSeen: { backgroundColor: '#78aa83', borderColor: '#5d8d67' },
  watchStatusText: { color: '#a85b79', fontSize: 4.5, fontWeight: '900', letterSpacing: 0.3 },
  watchStatusTextSeen: { color: '#fff' },
  showcaseTitle: { color: '#75445b', fontSize: 12, lineHeight: 14, fontWeight: '900', marginTop: 2 },
  showcaseText: { color: '#997082', fontSize: 6.2, lineHeight: 8.5, fontWeight: '600', marginTop: 3 },
  showcaseHint: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5, paddingHorizontal: 8, borderRadius: 7, backgroundColor: '#d9789b' },
  showcaseHintText: { color: '#fff', fontSize: 5.5, fontWeight: '900', letterSpacing: 0.5 },
  showcaseDecor: { alignSelf: 'center', color: '#dc8eaa', fontSize: 8, marginTop: 5 },
  selectorHeader: { width: '100%', height: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 2 },
  selectorTitle: { color: '#a85b79', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.9 },
  selectorCount: { color: '#c4869d', fontSize: 6.5, fontWeight: '700' },
  selectorRow: { gap: 7, paddingTop: 5, paddingBottom: 7, paddingHorizontal: 2 },
  selectorCard: { width: 70, height: 50, overflow: 'hidden', borderRadius: 11, backgroundColor: '#ffe8f0', borderWidth: 1.5, borderColor: '#efbfd0' },
  selectorCardActive: { borderWidth: 2.5, borderColor: '#6eaf7b', shadowColor: '#6eaf7b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 4, elevation: 4 },
  selectorThumb: { width: '100%', height: '100%' },
  selectorCover: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 3, paddingLeft: 6, paddingRight: 32, backgroundColor: '#ffe4ee' },
  selectorCoverBow: { fontSize: 12 },
  selectorCoverNumber: { color: '#b35e7d', fontSize: 15, fontWeight: '900' },
  selectorShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(91,42,65,0.12)' },
  selectorEpisode: { position: 'absolute', left: 5, bottom: 4, color: '#fff', fontSize: 4.8, fontWeight: '900', letterSpacing: 0.4, textShadowColor: 'rgba(73,30,49,0.8)', textShadowRadius: 2 },
  selectorCurrentDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#6eaf7b', borderWidth: 1, borderColor: '#fff' },
  selectorWatchStatus: { position: 'absolute', right: 3, bottom: 3, height: 14, flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: 4, borderRadius: 7, borderWidth: 1 },
  selectorWatchNew: { backgroundColor: 'rgba(255,250,252,0.94)', borderColor: '#efbfd0' },
  selectorWatchSeen: { backgroundColor: '#78aa83', borderColor: '#fff' },
  selectorWatchText: { color: '#a85b79', fontSize: 4.2, fontWeight: '900' },
  selectorWatchTextSeen: { color: '#fff' },
  videoCard: { width: 100, height: 100, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff4f8', borderWidth: 2, borderColor: '#f3b7cd', shadowColor: '#c86c91', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 },
  featuredVideoCard: { width: 255, height: 145, borderRadius: 19, borderWidth: 2.5, borderColor: '#e58aaa', shadowOpacity: 0.3, shadowRadius: 8 },
  featuredLogo: { width: '78%', height: '68%' },
  video: { width: '100%', height: '100%' },
  videoOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(95,42,70,0.28)' },
  episodeBadge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(255,250,252,0.9)', borderWidth: 1, borderColor: '#f2b5ca' },
  episodeBadgeText: { color: '#a85b79', fontSize: 5.5, fontWeight: '900', letterSpacing: 0.5 },
  videoSparkles: { position: 'absolute', right: 7, bottom: 7, flexDirection: 'row', gap: 3 },
  videoSparkleText: { color: '#e78bab', fontSize: 12, fontWeight: '900' },
  fsContainer: { flex: 1, backgroundColor: '#000' },
  fsClose: { position: 'absolute', top: 40, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 4, zIndex: 10 },

  // FAB
  uploadFab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#f39c12',
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },

  // Upload modal
  uploadOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  uploadSheet: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  uploadTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  pickBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  pickText: { color: '#aaa', fontSize: 15 },

  previewWrap: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', marginBottom: 12, justifyContent: 'center', alignSelf: 'center', marginVertical: 8 },
  preview: { width: '100%', height: '100%' },
  previewPlaceholder: { flex: 1, backgroundColor: '#1d1d1d', justifyContent: 'center', alignItems: 'center' },
  thumbLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },

  progressWrap: { height: 20, backgroundColor: '#333', borderRadius: 10, overflow: 'hidden', marginBottom: 12, justifyContent: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#e91e8c', borderRadius: 10 },
  progressText: { color: '#fff', fontSize: 11, textAlign: 'center' },

  uploadActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  changeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#555', alignItems: 'center' },
  changeBtnText: { color: '#ccc', fontWeight: '600' },
  confirmBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#e91e8c', alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Compact controls used in modal
  previewLarge: { height: 260 },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { color: '#ccc', fontWeight: '600', fontSize: 12 },
  captureBtn: { backgroundColor: '#e91e8c', borderColor: 'transparent' },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  nudgeContainer: { flexDirection: 'row', gap: 8 },
  timeBadge: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 6, marginLeft: 6, borderRadius: 8 },
  headerBtnText: { color: '#fff', fontWeight: '700' },
  thumbSelectorRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 },
  selectorThumbWrap: { width: 72, height: 72, borderRadius: 6, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  selectorThumb: { width: '100%', height: '100%' },
  selectorThumbActive: { borderColor: '#e91e8c' },
  selectorThumbPlaceholder: { width: 72, height: 72, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  gestionActions: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', gap: 6, zIndex: 200 },
  gestionBtn: { minWidth: 40, height: 36, borderRadius: 6, backgroundColor: '#e91e8c', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  // removed videoCardGestion to avoid visual side-effects when toggling gestion
});
