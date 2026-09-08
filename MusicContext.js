import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

const MusicContext = createContext(null);
const UKELELE = require('./assets/sounds/ukelele.mp3');
const CLICK = require('./assets/sounds/click.mp3');
const ENTER = require('./assets/sounds/enter.mp3');
const VOLUMEN_GLOBAL = 0.22;
const CLICK_COOLDOWN_MS = 120;

export const useMusicPlayer = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusicPlayer must be used within a MusicProvider');
  return context;
};

// Los estados del reproductor se actualizan periódicamente. Mantenerlos en un
// hijo aislado evita que cada pulso de audio vuelva a reconciliar toda la app.
const PlaybackController = ({ player, enterPlayer, enabled, appActiva }) => {
  const status = useAudioPlayerStatus(player);
  const enterStatus = useAudioPlayerStatus(enterPlayer);
  const entradaReproducida = useRef(false);

  useEffect(() => {
    if (!enterStatus.isLoaded || entradaReproducida.current) return;
    entradaReproducida.current = true;
    enterPlayer.seekTo(0).then(() => enterPlayer.play()).catch(() => {});
  }, [enterPlayer, enterStatus.isLoaded]);

  useEffect(() => {
    if (!status.isLoaded) return;
    if (enabled && appActiva.current) {
      if (!status.playing) player.play();
    } else if (status.playing) player.pause();
  }, [enabled, player, status.isLoaded, status.playing, appActiva]);

  return null;
};

export const MusicProvider = ({ children, onVisualClick }) => {
  const player = useAudioPlayer(UKELELE, { downloadFirst: true, updateInterval: 500 });
  const clickPlayer = useAudioPlayer(CLICK, { downloadFirst: true, updateInterval: 1000 });
  const enterPlayer = useAudioPlayer(ENTER, { downloadFirst: true, updateInterval: 1000 });
  const [habilitada, setHabilitada] = useState(true);
  const appActiva = useRef(AppState.currentState === 'active');
  const toqueInicial = useRef(null);
  const ultimoClick = useRef(0);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(error => console.warn('[Music] No se pudo configurar el audio', error?.message || error));
  }, []);

  useEffect(() => {
    player.loop = true;
    player.volume = VOLUMEN_GLOBAL;
    clickPlayer.volume = 0.42;
    enterPlayer.volume = 0.5;
  }, [clickPlayer, enterPlayer, player]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      appActiva.current = nextState === 'active';
      if (appActiva.current && habilitada) player.play();
      else player.pause();
    });
    return () => subscription.remove();
  }, [habilitada, player]);

  const pausar = useCallback(() => { setHabilitada(false); player.pause(); }, [player]);
  const reproducir = useCallback(() => { setHabilitada(true); if (appActiva.current) player.play(); }, [player]);
  const alternar = useCallback(() => habilitada ? pausar() : reproducir(), [habilitada, pausar, reproducir]);
  const reproducirClick = useCallback(() => {
    const ahora = Date.now();
    if (ahora - ultimoClick.current < CLICK_COOLDOWN_MS) return;
    ultimoClick.current = ahora;
    clickPlayer.seekTo(0).then(() => clickPlayer.play()).catch(() => {});
  }, [clickPlayer]);

  const comenzarToque = useCallback(event => {
    const touch = event.nativeEvent;
    toqueInicial.current = { x: touch.pageX, y: touch.pageY, at: Date.now() };
  }, []);
  const terminarToque = useCallback(event => {
    const inicio = toqueInicial.current;
    toqueInicial.current = null;
    if (!inicio) return;
    const touch = event.nativeEvent;
    const distancia = Math.hypot((touch.pageX || 0) - inicio.x, (touch.pageY || 0) - inicio.y);
    if (distancia <= 10 && Date.now() - inicio.at <= 360) {
      onVisualClick?.(touch.pageX || inicio.x, touch.pageY || inicio.y);
      reproducirClick();
    }
  }, [onVisualClick, reproducirClick]);

  const value = useMemo(() => ({
    player, status: null, isPlaying: habilitada && appActiva.current, enabled: habilitada,
    currentMusicUrl: UKELELE, trackName: 'Ukelele',
    pause: pausar, play: reproducir, toggle: alternar, playClick: reproducirClick,
  }), [alternar, habilitada, pausar, player, reproducir, reproducirClick]);

  return <MusicContext.Provider value={value}>
    <PlaybackController player={player} enterPlayer={enterPlayer} enabled={habilitada} appActiva={appActiva} />
    <View
      style={{ flex: 1 }}
      onTouchStart={comenzarToque}
      onTouchEnd={terminarToque}
    >
      {children}
    </View>
  </MusicContext.Provider>;
};
