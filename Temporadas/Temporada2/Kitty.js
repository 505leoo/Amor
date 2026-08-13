import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text, Modal, Alert, ScrollView, Animated } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { ref, deleteObject } from 'firebase/storage';
import { collection, addDoc, getDocs, deleteDoc, query, orderBy, doc } from 'firebase/firestore';
import { auth, db, storage } from '../../firebaseConfig';
import TabButtons from '../../components/TabButtons';
import Loading from '../../components/Loading';
import { MaterialIcons } from '@expo/vector-icons';

const BUCKET = 'amor-9df0d.firebasestorage.app';
const ADMIN_EMAIL = 'admin@gmail.com';

const parseSeconds = (str) => {
  const parts = str.split(':');
  if (parts.length === 2) return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  return parseInt(str) || 0;
};

const formatTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const ThumbPickerModal = ({ uri, onConfirm, onCancel }) => {
  const [timeStr, setTimeStr] = useState('00:00');
  const [thumbUri, setThumbUri] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(uri, p => { p.pause(); p.currentTime = 0; });
  const isPlayingRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const sub1 = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setReady(true);
    });
    const sub2 = player.addListener('playingChange', ({ isPlaying }) => {
      isPlayingRef.current = isPlaying;
    });
    intervalRef.current = setInterval(() => {
      if (isPlayingRef.current) setTimeStr(formatTime(player.currentTime));
    }, 250);
    return () => {
      sub1.remove();
      sub2.remove();
      clearInterval(intervalRef.current);
      try { player.pause(); } catch (_) {}
    };
  }, []);

  const seek = (delta) => {
    const next = Math.max(0, player.currentTime + delta);
    player.currentTime = next;
    setTimeStr(formatTime(next));
  };

  const handleCapture = async () => {
    if (!ready) return;
    setGenerating(true);
    try {
      const secs = Math.max(0.1, parseSeconds(timeStr));
      const { uri: tUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: Math.round(secs * 1000), quality: 1 });
      setThumbUri(tUri);
    } catch (e) { console.error('thumb error:', e?.message); }
    setGenerating(false);
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent transparent>
      <View style={styles.tpOverlay}>
        <View style={styles.tpBox}>
          <Text style={styles.tpTitle}>Elegir miniatura</Text>
          <View style={styles.tpVideoWrap}>
            <VideoView player={player} style={styles.tpVideo} contentFit="cover" nativeControls={false} />
            {thumbUri && (
              <View style={StyleSheet.absoluteFill}>
                <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <TouchableOpacity style={styles.tpThumbRemove} onPress={() => setThumbUri(null)} activeOpacity={0.8}>
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.tpRow}>
            <TouchableOpacity style={styles.tpSeekBtn} onPress={() => seek(-1)} activeOpacity={0.8}>
              <MaterialIcons name="replay" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tpPlayBtn} onPress={() => player.playing ? player.pause() : player.play()} activeOpacity={0.8}>
              <MaterialIcons name={player.playing ? 'pause' : 'play-arrow'} size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tpSeekBtn} onPress={() => seek(1)} activeOpacity={0.8}>
              <MaterialIcons name="forward" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.tpTime}>{timeStr}</Text>
            <TouchableOpacity style={[styles.tpGenBtn, !ready && styles.tpBtnDisabled]} onPress={handleCapture} activeOpacity={0.8} disabled={!ready}>
              <Text style={styles.tpGenTxt}>{generating ? '...' : !ready ? 'Cargando' : 'Capturar'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tpActions}>
            <TouchableOpacity style={styles.tpCancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.tpCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tpConfirmBtn, !thumbUri && styles.tpBtnDisabled]}
              onPress={() => thumbUri && onConfirm(thumbUri)}
              activeOpacity={0.8}
              disabled={!thumbUri}
            >
              <Text style={styles.tpConfirmTxt}>Subir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const uploadVideo = async (uri, titulo, thumbLocalUri, onDone) => {
  const token = await auth.currentUser.getIdToken();
  const ext = uri.split('.').pop()?.toLowerCase() || 'mp4';
  const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
  const fullPath = `kitty_videos/${titulo}`;
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(fullPath)}?uploadType=media`;
  global.showToast?.({ text1: 'Subiendo video', text2: '0%', type: 'info', duration: 99999 });
  try {
    const task = FileSystem.createUploadTask(
      uploadUrl, uri,
      {
        httpMethod: 'POST',
        headers: { 'Content-Type': mime, Authorization: `Bearer ${token}` },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      },
      ({ totalBytesSent, totalBytesExpectedToSend }) => {
        if (totalBytesExpectedToSend > 0) {
          const pct = Math.round((totalBytesSent / totalBytesExpectedToSend) * 100);
          global.showToast?.({ text1: 'Subiendo video', text2: `${pct}%`, type: 'info', duration: 99999 });
        }
      }
    );
    const res = await task.uploadAsync();
    if (!res || res.status < 200 || res.status >= 300) throw new Error(`Upload failed: ${res?.status}`);
    const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(fullPath)}?alt=media`;

    let thumbUrl = null;
    if (thumbLocalUri) {
      try {
        const thumbPath = `kitty_thumbs/${titulo}.jpg`;
        const thumbUploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(thumbPath)}?uploadType=media`;
        const thumbTask = FileSystem.createUploadTask(
          thumbUploadUrl, thumbLocalUri,
          { httpMethod: 'POST', headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${token}` }, uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT }
        );
        const thumbRes = await thumbTask.uploadAsync();
        if (thumbRes?.status >= 200 && thumbRes?.status < 300) {
          thumbUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(thumbPath)}?alt=media`;
        }
      } catch (_) {}
    }

    await addDoc(collection(db, 'kitty_videos'), { titulo, url, thumbUrl, createdAt: Date.now() });
    global.showToast?.({ text1: 'Video subido', text2: '¡Listo! 🎉', type: 'success' });
    onDone?.();
  } catch (e) {
    console.error(e);
    global.showToast?.({ text1: 'Error al subir', text2: 'Intenta de nuevo', type: 'error' });
  }
};

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

const THUMB_COUNT = 5;

const VideoItem = ({ item, gestion, activo, onPress, onEliminar }) => {
  const player = useVideoPlayer(item.url, p => { p.pause(); p.currentTime = 0; });
  const [fullscreen, setFullscreen] = useState(false);
  const [thumbs, setThumbs] = useState([]);
  const [thumbIdx, setThumbIdx] = useState(0);
  const thumbOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (item.thumbUrl) return;
    const sub = player.addListener('statusChange', async ({ status }) => {
      if (status === 'readyToPlay') {
        player.pause();
        player.currentTime = 0;
        try {
          const dur = player.duration;
          if (dur > 0) {
            const times = Array.from({ length: THUMB_COUNT }, (_, i) => (dur / (THUMB_COUNT + 1)) * (i + 1));
            const generated = await player.generateThumbnailsAsync(times, { maxWidth: 400, maxHeight: 400 });
            setThumbs(generated);
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
    <View style={styles.itemWrap}>
      {gestion && activo && (
        <View style={styles.acciones}>
          <TouchableOpacity onPress={onEliminar} style={styles.accionBtn}>
            <Text style={styles.accionEmoji}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.videoCard}>
        {item.thumbUrl ? (
          <Image source={{ uri: item.thumbUrl }} style={styles.video} contentFit="cover" />
        ) : thumbs.length > 0 ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: thumbOpacity }]}>
            <Image source={thumbs[thumbIdx]} style={styles.video} contentFit="cover" />
          </Animated.View>
        ) : (
          <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
        )}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => gestion ? onPress() : setFullscreen(true)}
          activeOpacity={0.8}
        >
          {!gestion && (
            <View style={styles.videoOverlay}>
              <MaterialIcons name="play-circle-filled" size={36} color="rgba(255,255,255,0.9)" />
            </View>
          )}
          {gestion && activo && <View style={styles.videoOverlayActivo} />}
        </TouchableOpacity>
      </View>
      {fullscreen && <FullscreenPlayer item={item} onClose={() => setFullscreen(false)} />}
    </View>
  );
};

export default function Kitty({ navigation }) {
  const loadingRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [gestion, setGestion] = useState(false);
  const [activoId, setActivoId] = useState(null);
  const [pendingUri, setPendingUri] = useState(null);
  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;

  useEffect(() => { loadingRef.current?.fadeOut(); }, []);
  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    const snap = await getDocs(query(collection(db, 'kitty_videos'), orderBy('createdAt', 'asc')));
    setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleUpload = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const srcUri = result.assets[0].uri;
    const ext = srcUri.split('.').pop()?.split('?')[0] || 'mp4';
    const localUri = FileSystem.cacheDirectory + `pending_video_${Date.now()}.${ext}`;
    try {
      await FileSystem.copyAsync({ from: srcUri, to: localUri });
      requestAnimationFrame(() => requestAnimationFrame(() => setPendingUri(localUri)));
    } catch (_) {
      requestAnimationFrame(() => requestAnimationFrame(() => setPendingUri(srcUri)));
    }
  }, []);

  const handleThumbConfirm = useCallback((thumbLocalUri) => {
    const uri = pendingUri;
    setPendingUri(null);
    const titulo = `kitty-video${videos.length + 1}`;
    uploadVideo(uri, titulo, thumbLocalUri, fetchVideos);
  }, [pendingUri, videos.length]);

  const handleEliminar = (video) => {
    Alert.alert('Eliminar', `¿Eliminar "${video.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'kitty_videos', video.id));
            try { await deleteObject(ref(storage, `kitty_videos/${video.titulo}`)); } catch (_) {}
            try { await deleteObject(ref(storage, `kitty_thumbs/${video.titulo}.jpg`)); } catch (_) {}
            setVideos(prev => prev.filter(v => v.id !== video.id));
            setActivoId(null);
          } catch (e) { console.error(e); }
        },
      },
    ]);
  };

  const toggleGestion = () => { setGestion(prev => !prev); setActivoId(null); };

  const filas = [];
  for (let i = 0; i < videos.length; i += 5) filas.push(videos.slice(i, i + 5));

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
        onExit={() => navigation?.navigate?.('temporada2')}
        customAddButton={
          isAdmin ? (
            <View style={[styles.topBtns, { pointerEvents: 'auto' }]}>
              <TouchableOpacity onPress={toggleGestion} activeOpacity={0.7} style={[styles.manageBtn, gestion && styles.btnActivo]}>
                <MaterialIcons name="list" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpload} activeOpacity={0.7} style={styles.addBtn}>
                <MaterialIcons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : <View />
        }
      />

      {videos.length > 0 && (
        <View style={styles.listWrap}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filas.map((fila, fi) => (
              <View key={fi} style={styles.row}>
                {fila.map(item => (
                  <VideoItem
                    key={item.id}
                    item={item}
                    gestion={gestion}
                    activo={activoId === item.id}
                    onPress={() => setActivoId(activoId === item.id ? null : item.id)}
                    onEliminar={() => handleEliminar(item)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {pendingUri && (
        <ThumbPickerModal
          uri={pendingUri}
          onConfirm={handleThumbConfirm}
          onCancel={() => setPendingUri(null)}
        />
      )}

      <Loading ref={loadingRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBtns: { flexDirection: 'row' },
  manageBtn: { width: 44, height: 44, backgroundColor: '#8a5a6a', justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 44, height: 44, backgroundColor: '#4CAF50', borderBottomLeftRadius: 25, justifyContent: 'center', alignItems: 'center' },
  btnActivo: { backgroundColor: '#5a2a3a' },
  listWrap: { position: 'absolute', top: 80, left: 125, maxHeight: '80%' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  itemWrap: { alignItems: 'center' },
  acciones: { flexDirection: 'row', gap: 2, marginBottom: 2 },
  accionBtn: { padding: 1 },
  accionEmoji: { fontSize: 14 },
  videoCard: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  videoOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  videoOverlayActivo: { flex: 1, backgroundColor: 'rgba(201,116,143,0.35)' },
  tpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tpBox: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, width: '100%', maxWidth: 380, gap: 12 },
  tpTitle: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  tpVideoWrap: { width: '100%', height: 180, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' },
  tpVideo: { width: '100%', height: 180 },
  tpThumbRemove: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: 3 },
  tpRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tpSeekBtn: { backgroundColor: '#2a2a3e', borderRadius: 8, padding: 8 },
  tpPlayBtn: { backgroundColor: '#8a5a6a', borderRadius: 8, padding: 8 },
  tpTime: { flex: 1, color: '#fff', fontSize: 16, letterSpacing: 2, textAlign: 'center' },
  tpGenBtn: { backgroundColor: '#8a5a6a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  tpGenTxt: { color: '#fff', fontWeight: '600' },
  tpActions: { flexDirection: 'row', gap: 8 },
  tpCancelBtn: { flex: 1, backgroundColor: '#333', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  tpCancelTxt: { color: '#aaa', fontWeight: '600' },
  tpConfirmBtn: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  tpConfirmTxt: { color: '#fff', fontWeight: '600' },
  tpBtnDisabled: { backgroundColor: '#555' },
  fsContainer: { flex: 1, backgroundColor: '#000' },
  fsClose: { position: 'absolute', top: 40, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 4, zIndex: 10 },
});
