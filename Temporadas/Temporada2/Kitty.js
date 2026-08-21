import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, StatusBar, TouchableOpacity, Modal,
  ScrollView, Animated, Text, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as DocumentPicker from 'expo-document-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../firebaseConfig';

const STORAGE_BUCKET = 'amor-9df0d.firebasestorage.app';

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

const THUMB_COUNT = 5;

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
  const player = useVideoPlayer(asset?.uri, p => { p.pause(); });
  
  const [thumbLocal, setThumbLocal] = useState(null);
  const [localThumbs, setLocalThumbs] = useState([]);
  const [selectedThumbIdx, setSelectedThumbIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [selectedTime, setSelectedTime] = useState(0); // seconds

  useEffect(() => {
    if (!visible) return;
    player.pause();
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
      try { player.pause(); } catch (_) {}
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
const FullscreenPlayer = ({ item, onClose }) => {
  const player = useVideoPlayer(item.url, p => { p.loop = true; p.play(); });
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
const VideoItemWithPlayer = ({ item, gestion, activoId, setActivoId, onEliminar }) => {
  const player = useVideoPlayer(item.url, p => { p.pause(); p.currentTime = 0; });
  const [fullscreen, setFullscreen] = useState(false);
  const [thumbs, setThumbs] = useState([]);
  const [thumbIdx, setThumbIdx] = useState(0);
  const thumbOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sub = player.addListener('statusChange', async ({ status }) => {
      if (status === 'readyToPlay') {
        player.pause();
        player.currentTime = 0;
        try {
          const dur = player.duration;
          if (dur > 0) {
            const times = Array.from({ length: THUMB_COUNT }, (_, i) => (dur / (THUMB_COUNT + 1)) * (i + 1));
            try {
              const generated = await Promise.all(times.map(async t => {
                const timeMs = t > 1000 ? Math.round(t) : Math.round(t * 1000);
                const r = await VideoThumbnails.getThumbnailAsync(item.url, { time: timeMs, quality: 0.6 });
                return r.uri || r;
              }));
              setThumbs(generated);
            } catch (_) {}
          }
        } catch (_) {}
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (thumbs.length < 2) return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(thumbOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(thumbOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      setThumbIdx(i => (i + 1) % thumbs.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [thumbs]);

  return (
    <View style={styles.videoCard}>
      {thumbs.length > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: thumbOpacity }]}>
          <Image source={thumbs[thumbIdx]} style={styles.video} contentFit="cover" />
        </Animated.View>
      ) : (
        <View style={[styles.video, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }] }>
          <MaterialIcons name="play-circle-outline" size={36} color="#888" />
        </View>
      )}
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
      {fullscreen && <FullscreenPlayer item={item} onClose={() => setFullscreen(false)} />}
    </View>
  );
};

// ─── Video card con thumbUrl ──────────────────────────────────────────────────
const VideoItem = ({ item, gestion, activoId, setActivoId, onEliminar }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const shouldHideLegacyThumb = !!item.thumbUrl && /EP\d|EP[A-Z]/i.test(item.thumbUrl);
  if (!item.thumbUrl || shouldHideLegacyThumb) return <VideoItemWithPlayer item={item} gestion={gestion} activoId={activoId} setActivoId={setActivoId} onEliminar={onEliminar} />;
  return (
    <View style={styles.videoCard}>
      <View style={[styles.video, { backgroundColor: '#fff', justifyContent: 'flex-end', alignItems: 'flex-start', paddingBottom: 8, paddingLeft: 8 }] }>
          <Image source={{ uri: item.thumbUrl }} style={styles.video} contentFit="cover" cachePolicy="memory-disk" />
        </View>
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
      {fullscreen && <FullscreenPlayer item={item} onClose={() => setFullscreen(false)} />}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Kitty({ navigation, route }) {
  const destinoSalida = route?.params?.from === 'main' ? 'main' : 'temporada2';
  const loadingRef = useRef(null);
  const [videos, setVideos] = useState([]);

  useEffect(() => { loadingRef.current?.fadeOut(); }, []);

  useEffect(() => {
    getDocs(query(collection(db, 'kitty_videos'), orderBy('createdAt', 'asc')))
      .then(snap => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const [pickedAsset, setPickedAsset] = useState(null);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [gestion, setGestion] = useState(false);
  const [activoId, setActivoId] = useState(null);

  const ADMIN_EMAIL = 'admin@gmail.com';

  const uploadFile = useCallback(async (localUri, path) => {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob);
      task.on('state_changed',
        () => {},
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });
  }, []);

  const uploadBlob = useCallback(async (blob, path) => {
    const storageRef = ref(storage, path);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob);
      task.on('state_changed', () => {}, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
    });
  }, []);

  const kittyLogoUrlRef = useRef(null);

  const ensureKittyLogoUrl = useCallback(async () => {
    if (kittyLogoUrlRef.current) return kittyLogoUrlRef.current;

    const source = Image.resolveAssetSource(require('../../assets/temporadas/libro/Temporada2/logokitty.png'));
    const response = await fetch(source.uri);
    const blob = await response.blob();
    kittyLogoUrlRef.current = await uploadBlob(blob, 'kitty_brand/logokitty.png');
    return kittyLogoUrlRef.current;
  }, [uploadBlob]);

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

      // use the Kitty logo directly as the default thumbnail so it definitely renders in the list
      const logoUrl = await ensureKittyLogoUrl();
      const thumbUrl = logoUrl;

      const ts = Date.now();
      const videoUrl = await uploadFile(asset.uri, `kitty_videos/${ts}.mp4`);
      const doc = await addDoc(collection(db, 'kitty_videos'), {
        url: videoUrl,
        thumbUrl,
        type,
        episode,
        createdAt: serverTimestamp(),
      });
      setVideos(prev => [...prev, { id: doc.id, url: videoUrl, thumbUrl, type, episode }]);
    } catch (e) {
      Alert.alert('Error', e.message || String(e));
    } finally {
      setPickedAsset(null);
    }
  }, [pickedAsset, uploadBlob, uploadFile]);
 

  const handleUploaded = useCallback((newVideo) => {
    setVideos(prev => [...prev, newVideo]);
  }, []);

  const superCuteVideos = videos.filter(item => item.type === 'SuperCute');
  const filas = [];
  for (let i = 0; i < superCuteVideos.length; i += 5) filas.push(superCuteVideos.slice(i, i + 5));

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image
        source={require('../../assets/temporadas/libro/Temporada2/fondo2.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory"
      />
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
        <>
          <View style={styles.logoHeader}>
            <Image
              source={require('../../assets/temporadas/libro/Temporada2/logokitty.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
          <View style={styles.listWrap}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filas.map((fila, fi) => (
                <View key={fi} style={styles.row}>
                  {fila.map(item => (
                    <VideoItem
                      key={item.id}
                      item={item}
                      gestion={gestion}
                      activoId={activoId}
                      setActivoId={setActivoId}
                      onEliminar={handleEliminar}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </>
      )}

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
  container: { flex: 1 },
  listWrap: { position: 'absolute', top: 120, left: 125, maxHeight: '80%' },
  logoHeader: {
    position: 'absolute',
    top: 52,
    left: 132,
    width: 180,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  logoImage: { width: 180, height: 58 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  videoCard: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  videoOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
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
