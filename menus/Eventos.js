import React, { memo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTemporadaActual } from '../hooks/useTemporadaActual';

const EVENTOS_POR_TEMPORADA = {
  t1: {
    evento: { id: 'chicles', categoria: 'EVENTOS', titulo: 'CHICLES', destino: 'capsula1', descripcion: 'Resuelve misiones, completa el camino compartiendo chicles.', imagen: require('../assets/inicio/eventos/eventochicle.png') },
  },
  t2: {
    historia: { id: 'rutaAurora', categoria: 'EVENTO DE HISTORIA', titulo: 'RUTAS', destino: 'rutas', descripcion: 'Acompañá a Aurora durante su día y guardá cada momento como un recuerdo.', imagen: require('../assets/inicio/eventos/eventorutas.png'), tema: 'blanco' },
    evento: { id: 'paleta', categoria: 'EVENTOS', titulo: 'GLOBOS', destino: 'paleta', descripcion: 'Una aventura entre globos te espera. Completa sus desafíos y consigue recompensas.', imagen: require('../assets/inicio/eventos/eventoglobo.png'), tema: 'carmesi' },
    secundario: { id: 'kitty', categoria: 'EVENTO SECUNDARIO', titulo: 'VIDEITOS', destino: 'kitty', descripcion: 'Mirá videitos de Hello Kitty y sus amigos, preparados para compartir un ratito lindo.', imagen: require('../assets/inicio/eventos/eventokitty.png'), tema: 'blanco' },
  },
};
const obtenerEventosDeTemporada = temporada => { const c = EVENTOS_POR_TEMPORADA[temporada] || EVENTOS_POR_TEMPORADA.t1; return [c.historia && { ...c.historia, esHistoria: true }, c.evento && { ...c.evento, esHistoria: false }, c.secundario && { ...c.secundario, esHistoria: false }].filter(Boolean); };

const Eventos = memo(({ navigation, temporada, soloEvento = false }) => {
  const temporadaActualHook = useTemporadaActual();
  const temporadaActual = temporada || temporadaActualHook;
  const eventosConfigurados = obtenerEventosDeTemporada(temporadaActual);
  const eventos = soloEvento ? eventosConfigurados.filter(evento => !evento.esHistoria).slice(0, 1) : eventosConfigurados;
  const [eventoActivo, setEventoActivo] = useState(0);
  const eventoSwipeStart = useRef(null);
  const eventoActual = eventos[eventoActivo] || eventos[0];
  useEffect(() => setEventoActivo(0), [temporadaActual]);
  const navegarAlEvento = () => eventoActual && navigation?.navigate(eventoActual.destino, { from: 'main', ...(eventoActual.params || {}) });
  return <View style={[styles.eventoWrap, styles.eventoWrapAjuste]}>
    <View style={styles.eventoBtn} onStartShouldSetResponder={() => true} onResponderGrant={({ nativeEvent }) => { eventoSwipeStart.current = nativeEvent.pageX; }} onResponderRelease={({ nativeEvent }) => { const inicio = eventoSwipeStart.current; const distancia = inicio == null ? 0 : nativeEvent.pageX - inicio; if (Math.abs(distancia) > 25 && eventos.length > 1) setEventoActivo(actual => distancia < 0 ? (actual + 1) % eventos.length : (actual - 1 + eventos.length) % eventos.length); else navegarAlEvento(); eventoSwipeStart.current = null; }} accessibilityRole="button" accessibilityLabel={`Ver evento ${eventoActual?.titulo || ''}`}>
      {eventoActual?.imagen ? <Image source={eventoActual.imagen} style={styles.eventoImagen} contentFit="cover" cachePolicy="memory-disk" /> : <View style={styles.eventoPlaceholder} />}
      <View style={styles.eventoInfo} pointerEvents="none"><Text style={styles.eventoCategoria}>{eventoActual?.categoria}</Text><Text style={[styles.eventoTitulo, eventoActual?.tema === 'blanco' && styles.eventoTituloBlanco, eventoActual?.tema === 'carmesi' && styles.eventoTituloCarmesi]}>{eventoActual?.titulo}</Text><Text style={[styles.eventoDescripcion, eventoActual?.tema === 'blanco' && styles.eventoDescripcionBlanco, eventoActual?.tema === 'carmesi' && styles.eventoDescripcionCarmesi]}>{eventoActual?.descripcion}</Text></View>
    </View>
    <TouchableOpacity style={styles.eventoVerBtn} activeOpacity={0.75} onPress={navegarAlEvento} accessibilityLabel="Ver evento"><Text style={styles.eventoVer}>VER EVENTO</Text></TouchableOpacity>
    {eventos.length > 1 && <View style={styles.eventoIndicadores} pointerEvents="none">{eventos.map((evento, index) => <View key={evento.id} style={[styles.eventoIndicador, eventoActivo === index && styles.eventoIndicadorActivo]} />)}</View>}
  </View>;
});

const styles = StyleSheet.create({
  eventoWrapAjuste: { left: 25 },
  eventoWrap: { position: 'absolute', left: 17, bottom: 12, zIndex: 10 }, eventoBtn: { width: 217, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1e1bd', borderWidth: 5, borderColor: '#dfcf9b', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 8, elevation: 12 }, eventoImagen: { width: '100%', height: '100%' }, eventoPlaceholder: { flex: 1, backgroundColor: '#efd3dd' }, eventoInfo: { position: 'absolute', top: 5, left: 8, right: 8, alignItems: 'center' }, eventoCategoria: { color: '#a36b42', fontFamily: 'Delius', fontSize: 5.5, fontWeight: '900', letterSpacing: 0.7, marginBottom: 1 }, eventoTitulo: { color: '#ff57a0', fontFamily: 'Delius', fontSize: 11.5, fontWeight: '900', letterSpacing: 0.6, textShadowColor: 'rgba(255, 248, 220, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }, eventoTituloBlanco: { color: '#684052', textShadowColor: 'rgba(255, 248, 235, 0.8)', textShadowRadius: 2 }, eventoTituloCarmesi: { color: '#fff0c9', textShadowColor: 'rgba(92, 18, 39, 0.72)', textShadowRadius: 3 }, eventoDescripcion: { width: 156, color: '#b45c86', fontFamily: 'Delius', fontSize: 6.8, lineHeight: 8, fontWeight: '700', textAlign: 'center', marginTop: 2 }, eventoDescripcionBlanco: { color: '#8b5a68', textShadowColor: 'rgba(255, 248, 235, 0.72)', textShadowRadius: 2 }, eventoDescripcionCarmesi: { color: '#f8d9ae', textShadowColor: 'rgba(92, 18, 39, 0.7)', textShadowRadius: 3 }, eventoVerBtn: { position: 'absolute', top: 60, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 9, backgroundColor: '#f1e1bd', borderWidth: 1, borderColor: '#d0ad70', shadowColor: '#5f4428', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 }, eventoVer: { color: '#76552f', fontFamily: 'Delius', fontSize: 8.2, fontWeight: '900', letterSpacing: 0.5, textShadowColor: 'rgba(255, 248, 220, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }, eventoIndicadores: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6, zIndex: 30, elevation: 30 }, eventoIndicador: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 248, 220, 0.72)', borderWidth: 1, borderColor: 'rgba(92, 57, 49, 0.36)', shadowColor: '#4f2631', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.65, shadowRadius: 2, elevation: 3 }, eventoIndicadorActivo: { width: 14, backgroundColor: '#fff8dc', shadowOpacity: 0.9, shadowRadius: 3, elevation: 5 },
  eventoAjoloteFondo: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f7afd0' },
  ajoloteNubeUno: { position: 'absolute', left: -20, bottom: -24, width: 145, height: 76, borderRadius: 60, backgroundColor: '#ffe7f2', borderWidth: 1, borderColor: '#ef9bc2' },
  ajoloteNubeDos: { position: 'absolute', right: -24, top: -28, width: 134, height: 72, borderRadius: 60, backgroundColor: '#d9c2f1', opacity: 0.72 },
  ajoloteBrillos: { position: 'absolute', left: 15, top: 11, color: '#fff4a7', fontSize: 10, letterSpacing: 4 },
  eventoAjolotePersonaje: { position: 'absolute', right: 0, bottom: -9, width: 96, height: 96 },
  eventoInfoAjolote: { left: 10, right: 92, top: 9, alignItems: 'flex-start' },
  eventoCategoriaAjolote: { color: '#834568', fontSize: 5.2 },
  eventoTituloAjolote: { color: '#71345d', fontSize: 9.2, lineHeight: 11, textAlign: 'left', textShadowColor: '#ffeafa', textShadowRadius: 3 },
  eventoDescripcionAjolote: { width: 108, color: '#8a5273', fontSize: 6.1, lineHeight: 7.3, textAlign: 'left', textShadowColor: '#ffeafa', textShadowRadius: 2 },
  eventoVerBtnAjolote: { left: 23, alignSelf: 'flex-start', backgroundColor: '#ffe9f3', borderColor: '#d47ba5' },
  eventoErizoFondo: { ...StyleSheet.absoluteFillObject, backgroundColor: '#392544' },
  erizoLuna: { position: 'absolute', right: -17, top: -24, width: 106, height: 106, borderRadius: 53, backgroundColor: '#a986bd', opacity: 0.42, borderWidth: 1, borderColor: '#d8b7ea' },
  erizoCacao: { position: 'absolute', left: -31, bottom: -41, width: 151, height: 89, borderRadius: 62, backgroundColor: '#6f402d', opacity: 0.78 },
  erizoBrillos: { position: 'absolute', left: 13, top: 9, color: '#f2c568', fontSize: 9, letterSpacing: 3 },
  eventoErizoPersonaje: { position: 'absolute', right: -1, bottom: -8, width: 98, height: 98 },
  eventoInfoErizo: { left: 10, right: 91, top: 9, alignItems: 'flex-start' },
  eventoCategoriaErizo: { color: '#e8c672', fontSize: 5.2 },
  eventoTituloErizo: { color: '#fff0c4', fontSize: 9, lineHeight: 10.5, textAlign: 'left', textShadowColor: '#25142e', textShadowRadius: 4 },
  eventoDescripcionErizo: { width: 108, color: '#e0cbe9', fontSize: 6, lineHeight: 7.2, textAlign: 'left', textShadowColor: '#25142e', textShadowRadius: 3 },
  eventoVerBtnErizo: { left: 23, alignSelf: 'flex-start', backgroundColor: '#f1d88e', borderColor: '#815d2f' },
});
export default Eventos;
