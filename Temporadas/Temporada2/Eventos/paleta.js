import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Defs, LinearGradient, Stop, Circle, Ellipse, Path, G, Line } from 'react-native-svg';
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
import TabButtons from '../../../components/TabButtons';
import Loading from '../../../components/Loading';
import { db, auth } from '../../../firebaseConfig';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, getDoc, setDoc, increment } from 'firebase/firestore';

// Paleta (Balloons) themed event for Temporada2

const GOLD  = '#ffd66b';
const GOLD2 = '#ffb347';
const PINK  = '#ff9bb3';
const TEAL  = '#8fe3e6';
const LILA  = '#cda6ff';

// Probabilidades de explosión por intento (cada intento es independiente)
const EXPLOSION_PROBABILITIES = [
  { intento: 1, probabilidad: 0.05 },   // 5% en el primer intento
  { intento: 2, probabilidad: 0.10 },   // 10% en el segundo
  { intento: 3, probabilidad: 0.20 },   // 20% en el tercero
  { intento: 4, probabilidad: 0.35 },   // 35% en el cuarto
  { intento: 5, probabilidad: 0.55 },   // 55% en el quinto
  { intento: 6, probabilidad: 0.75 },   // 75% en el sexto
  { intento: 7, probabilidad: 0.85 },   // 85% en el séptimo
];

// Calcular probabilidades relativas que sumen 100%
const calcularProbabilidadesRelativas = () => {
  const total = EXPLOSION_PROBABILITIES.reduce((sum, item) => sum + item.probabilidad, 0);
  return EXPLOSION_PROBABILITIES.map(item => ({
    ...item,
    probabilidadRelativa: (item.probabilidad / total * 100).toFixed(1)
  }));
};

const PROBABILIDADES_DISPLAY = calcularProbabilidadesRelativas();

// ── Misiones del evento Paleta ────────────────────────────────────────────────
// Usa el contexto global — misiones externas al juego que dan globos como recompensa.

// ── Probabilidades de recompensas por explosión ────────────────────────────
// Básica: siempre cae, rango 25-50 mon/exp
// Extra temprano: 3% por explosión (garantizado en 50)
// Menor temprano: 1.5% por explosión (garantizado en 75)
// Mayor temprano: 0.5% por explosión (garantizado en 100)
const PROB_EXTRA_TEMPRANO  = 0.03;   // 3%
const PROB_MENOR_TEMPRANO  = 0.015;  // 1.5%
const PROB_MAYOR_TEMPRANO  = 0.005;  // 0.5%

const RECOMPENSAS_INFO = [
  { id: 'basica',  emoji: '🪙', label: 'Básica',        sub: '25–50 🪙  25–50 ⏏️',  prob: 100,  color: '#ff9bb3' },
  { id: 'extra',   emoji: '✨', label: 'Extra',          sub: '+250 🪙  +100 ⏏️',    prob: 3,    color: '#cda6ff' },
  { id: 'menor',   emoji: '🔒', label: 'Menor',          sub: '+2500 🪙',             prob: 1.5,  color: '#ffd66b' },
  { id: 'mayor',   emoji: '🎈', label: 'Mayor',          sub: 'Icono exclusivo',      prob: 0.5,  color: '#8fe3e6' },
];

// ── Componente de Premio ───────────────────────────────────────────────────
function PremioCard({ tipo, iconoUrl }) {
  const isMayor = tipo === 'mayor';
  const isMenor = tipo === 'menor';
  const isExtra = tipo === 'extra';
  
  if (isExtra) {
    return (
      <View style={sp.premioExtra}>
        <Text style={sp.premioExtraLabel}>Premios Extra</Text>
        <View style={sp.premioExtraItems}>
          <View style={sp.premioExtraItemLeft}>
            <Text style={sp.premioExtraEmoji}>🪙</Text>
            <Text style={sp.premioExtraValorTexto}>250</Text>
          </View>
          <View style={sp.premioExtraDivider} />
          <View style={sp.premioExtraItemRight}>
            <Text style={sp.premioExtraEmoji}>⏏️</Text>
            <Text style={sp.premioExtraValorTexto}>100</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[sp.premioCard, isMayor && sp.premioMayor, isMenor && sp.premioMenor]}>
      {/* Premio Mayor: imagen de fondo */}
      {isMayor && iconoUrl && (
        <ExpoImage
          source={{ uri: iconoUrl }}
          style={sp.premioImagenFull}
          contentFit="cover"
          cachePolicy="memory"
        />
      )}
      {/* Premio Menor: "2500 🪙" grande como fondo */}
      {isMenor && (
        <View style={sp.premioMenorFondo}>
          <Text style={sp.premioMenorFondoTexto}>2500</Text>
          <Text style={sp.premioMenorFondoEmoji}>🪙</Text>
        </View>
      )}
      {/* Capa de opacidad oscura encima del fondo */}
      <View style={sp.premioOverlayCapa} />
      {/* Candado y label encima de todo */}
      <Text style={sp.candadoEmoji}>🔒</Text>
      <Text style={sp.premioLabel}>{isMayor ? 'PREMIO MAYOR' : 'PREMIO MENOR'}</Text>
    </View>
  );
}

// ── Globo Gigante con SVG existente ────────────────────────────────────────
const GloboGigante = ({ scale, burst }) => {
  const floatY = useRef(new Animated.Value(0)).current;
  const floatX = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Flotación vertical suave
    const floatYAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { 
          toValue: -15, 
          duration: 3200, 
          useNativeDriver: true,
          easing: (t) => 0.5 - 0.5 * Math.cos(t * Math.PI)
        }),
        Animated.timing(floatY, { 
          toValue: 0, 
          duration: 3200, 
          useNativeDriver: true,
          easing: (t) => 0.5 - 0.5 * Math.cos(t * Math.PI)
        }),
      ])
    );
    
    // Flotación horizontal sutil
    const floatXAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatX, { 
          toValue: 5, 
          duration: 3800, 
          useNativeDriver: true,
          easing: (t) => 0.5 - 0.5 * Math.cos(t * Math.PI)
        }),
        Animated.timing(floatX, { 
          toValue: 0, 
          duration: 3800, 
          useNativeDriver: true,
          easing: (t) => 0.5 - 0.5 * Math.cos(t * Math.PI)
        }),
      ])
    );
    
    floatYAnim.start();
    floatXAnim.start();
    
    return () => {
      floatYAnim.stop();
      floatXAnim.stop();
    };
  }, []);

  if (burst) {
    // Explosión
    return (
      <Animated.View style={{ 
        transform: [
          { scale }, 
          { translateY: floatY },
          { translateX: floatX }
        ] 
      }}>
        <Svg width={220} height={240} viewBox="0 0 220 240">
          <G>
            <Circle cx={110} cy={120} r={20} fill="#fffef0" />
            <Circle cx={110} cy={120} r={14} fill="#fff9e6" />
            
            <Circle cx={110} cy={120} r={45} fill="none" stroke="#ffeb3b" strokeWidth={7} opacity={0.95} strokeDasharray="12 7" strokeLinecap="round" />
            <Circle cx={110} cy={120} r={70} fill="none" stroke="#ffd740" strokeWidth={6} opacity={0.8} strokeDasharray="10 6" strokeLinecap="round" />
            <Circle cx={110} cy={120} r={95} fill="none" stroke="#ffc869" strokeWidth={5} opacity={0.65} strokeDasharray="8 5" strokeLinecap="round" />
            
            <Circle cx={60} cy={70} r={8} fill="#ffeb3b" opacity={0.95} />
            <Circle cx={160} cy={80} r={7} fill="#ffd740" opacity={0.9} />
            <Circle cx={70} cy={170} r={7} fill="#ffc869" opacity={0.85} />
            <Circle cx={150} cy={165} r={7.5} fill="#ffb74d" opacity={0.9} />
            
            <Path d="M 60 63 L 60 77 M 53 70 L 67 70" stroke="#fff9c4" strokeWidth={3} opacity={0.9} strokeLinecap="round" />
            <Path d="M 160 72 L 160 88 M 152 80 L 168 80" stroke="#fffde7" strokeWidth={2.5} opacity={0.85} strokeLinecap="round" />
          </G>
        </Svg>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ 
      transform: [
        { scale }, 
        { translateY: floatY },
        { translateX: floatX }
      ] 
    }}>
      <ExpoImage
        source={require('../../../assets/temporadas/libro/Temporada2/globo.svg')}
        style={{ width: 180, height: 240 }}
        contentFit="contain"
      />
    </Animated.View>
  );
};

// ── Botón Vamos con emoji ──────────────────────────────────────────────────
function BtnVamos({ onPress, disabled }) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePress = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6,  duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 80, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      ])
    ]).start(() => onPress && onPress());
  };
  
  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity onPress={handlePress} disabled={disabled} activeOpacity={0.82} style={[sv.boton, disabled && sv.botonOff]}>
        <Text style={{ fontSize: 18 }}>🎈</Text>
        <Text style={sv.num}>1</Text>
        <Text style={sv.texto}>VAMOS</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function Paleta({ navigation, route }) {
  const destinoSalida = route?.params?.from === 'main' ? 'main' : 'temporadas';
  const [paletas, setPaletas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [iconoPremioMayor, setIconoPremioMayor] = useState(null);
  const [premiando, setPremiando] = useState(false);
  const loadingRef = useRef(null);
  const megaScale = useRef(new Animated.Value(1)).current;
  const [intentos, setIntentos] = useState(0);
  const [isGrowing, setIsGrowing] = useState(false);
  const [burst, setBurst] = useState(false);
  const [intentoExplosion, setIntentoExplosion] = useState(0);
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const infoScale = useRef(new Animated.Value(0.8)).current;
  const shakeIntento = useRef(new Animated.Value(0)).current;

  // Contadores de pity (cuántos giros faltan para el garantizado)
  const [pityMayor, setPityMayor] = useState(100);
  const [pityMenor, setPityMenor] = useState(75);
  const [pityExtra, setPityExtra] = useState(50);
  const [paginaModal, setPaginaModal] = useState(1); // 1 = explosión, 2 = recompensas

  useEffect(() => {
    // Cargar icono del premio mayor (icono_e_1)
    const cargarIconoPremio = async () => {
      try {
        const q = query(collection(db, 'iconos'), where('nombre', '==', 'icono_e_1'));
        const snap = await getDocs(q);
        if (!snap.empty) setIconoPremioMayor(snap.docs[0].data().url);
      } catch (e) { console.error('Error cargando icono premio:', e); }
    };
    cargarIconoPremio();
  }, []);

  useEffect(() => {
    // Cargar globos desde Firestore
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'usuarios', uid);
    
    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data = snap.data();
      
      // Si no tiene el campo "globos", crearlo con 0
      if (data.globos === undefined) {
        try {
          await updateDoc(userRef, { globos: 0 });
          setPaletas(0);
        } catch (error) {
          console.error('Error creando campo globos:', error);
          setPaletas(0);
        }
      } else {
        setPaletas(data.globos || 0);
      }

      // Cargar pity desde Firestore (si no existe, usar defaults)
      setPityMayor(data.pityMayor ?? 100);
      setPityMenor(data.pityMenor ?? 75);
      setPityExtra(data.pityExtra ?? 50);
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (showInfo) {
      setPaginaModal(1);
      Animated.parallel([
        Animated.timing(infoOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(infoScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(infoOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(infoScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [showInfo]);

  const procesarRecompensas = async (pityCurrent) => {
    if (premiando) return;
    setPremiando(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const userRef = doc(db, 'usuarios', uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      // ── Recompensas básicas (siempre al explotar) ──────────────────────
      const monBasico = Math.floor(Math.random() * 26) + 25; // 25–50
      const expBasico = Math.floor(Math.random() * 26) + 25; // 25–50

      let monTotal = monBasico;
      let expTotal = expBasico;
      let toastParts = [`+${monBasico} 🪙  +${expBasico} ⏏️`];

      // ── Calcular nuevo pity ────────────────────────────────────────────
      const nuevoMayor = Math.max(pityCurrent.mayor - 1, 0);
      const nuevoMenor = Math.max(pityCurrent.menor - 1, 0);
      const nuevoExtra = Math.max(pityCurrent.extra - 1, 0);

      // Garantizado si llegó a 0, o probabilidad temprana si no
      const resetExtra = nuevoExtra <= 0 || Math.random() < PROB_EXTRA_TEMPRANO;
      const resetMenor = nuevoMenor <= 0 || Math.random() < PROB_MENOR_TEMPRANO;
      const resetMayor = nuevoMayor <= 0 || Math.random() < PROB_MAYOR_TEMPRANO;

      // ── Premio Extra ───────────────────────────────────────────────────
      if (resetExtra) {
        monTotal += 250;
        expTotal += 100;
        toastParts.push('+250 🪙 +100 ⏏️ Extra');
      }

      // ── Premio Menor ───────────────────────────────────────────────────
      if (resetMenor) {
        monTotal += 2500;
        toastParts.push('+2500 🪙 Menor');
      }

      // ── Guardar en Firestore ───────────────────────────────────────────
      await updateDoc(userRef, {
        dinero:    (data.dinero || 0) + monTotal,
        exp:       (data.exp    || 0) + expTotal,
        pityMayor: resetMayor ? 100 : nuevoMayor,
        pityMenor: resetMenor ? 75  : nuevoMenor,
        pityExtra: resetExtra ? 50  : nuevoExtra,
      });

      global.showToast?.({ message: toastParts.join('  ·  '), type: 'success' });
    } catch (e) {
      console.error('Error procesando recompensas:', e);
    } finally {
      setPremiando(false);
    }
  };

  const shakeIntentoNumber = () => {
    Animated.sequence([
      Animated.timing(shakeIntento, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeIntento, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeIntento, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeIntento, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeIntento, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleVamos = async () => {
    if (isGrowing) return;
    if (paletas <= 0) return;
    
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setIsGrowing(true);
    
    const nuevoIntento = intentos + 1;
    setIntentos(nuevoIntento);

    // Snapshot del pity antes de decrementar (para pasarlo a procesarRecompensas)
    const pityCurrent = { mayor: pityMayor, menor: pityMenor, extra: pityExtra };

    // Actualizar globos en Firestore
    try {
      const userRef = doc(db, 'usuarios', uid);
      await updateDoc(userRef, { globos: paletas - 1 });
    } catch (error) {
      console.error('Error actualizando globos:', error);
      setIsGrowing(false);
      return;
    }
    
    // Calcular nuevo tamaño
    const incremento = 0.2 / 6;
    const newScale = 1 + (nuevoIntento * incremento);
    
    // Probabilidad de explosión
    const probData = EXPLOSION_PROBABILITIES.find(p => p.intento === nuevoIntento) || { probabilidad: 0.85 };
    const debeExplotar = Math.random() < probData.probabilidad;
    
    if (debeExplotar) {
      setIntentoExplosion(nuevoIntento);
      shakeIntentoNumber();
      
      Animated.timing(megaScale, { 
        toValue: Math.min(newScale + 0.1, 1.3), 
        duration: 500, 
        useNativeDriver: true 
      }).start(() => {
        setBurst(true);
        
        Animated.sequence([
          Animated.timing(megaScale, { toValue: 0.1, duration: 150, useNativeDriver: true }),
          Animated.timing(megaScale, { toValue: 1,   duration: 300, useNativeDriver: true }),
        ]).start(() => {
          setTimeout(() => { 
            setBurst(false); 
            setIsGrowing(false);
            setIntentos(0);
            setIntentoExplosion(0);
            // Procesar todas las recompensas en una sola llamada
            procesarRecompensas(pityCurrent);
          }, 400);
        });
      });
    } else {
      Animated.spring(megaScale, { 
        toValue: Math.min(newScale, 1.2),
        useNativeDriver: true,
        tension: 40,
        friction: 7
      }).start(() => {
        setIsGrowing(false);
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <Loading ref={loadingRef} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <TabButtons onExit={() => navigation?.navigate?.(destinoSalida)} customAddButton={<View />} chicles={paletas} chicleIcono={<Text style={{ fontSize: 12 }}>🎈</Text>} />
      
      <ExpoImage
        source={require('../../../assets/temporadas/libro/Temporada2/fondo2.png')}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        contentFit="cover"
        cachePolicy="memory"
      />
      {/* Capa de oscurecimiento mínimo sobre el fondo */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.18)' }]} />

      {/* Globo gigante central */}
      <View style={s.globoWrap}>
        <GloboGigante scale={megaScale} burst={burst} />
      </View>

      {/* Botón de información */}
      <TouchableOpacity onPress={() => setShowInfo(true)} style={s.infoButton} activeOpacity={0.7}>
        <Text style={s.infoButtonText}>!</Text>
      </TouchableOpacity>
      
      {/* Contador de intentos */}
      <Animated.View style={[s.contadorWrap, { transform: [{ translateX: shakeIntento }] }]}>
        <Text style={s.contadorNumero}>{intentoExplosion || intentos}</Text>
        <Text style={s.contadorTexto}>{intentos === 1 ? 'intento' : 'intentos'}</Text>
      </Animated.View>

      {/* Columna de premios + botones alineados */}
      <View style={s.columnaBotones}>
        {/* Premios Mayor y Menor */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><PremioCard tipo="mayor" iconoUrl={iconoPremioMayor} /></View>
          <View style={{ flex: 1 }}><PremioCard tipo="menor" /></View>
        </View>
        <View style={{ height: 8 }} />
        {/* Premio Extra — mismo ancho que la fila de arriba */}
        <PremioCard tipo="extra" />
        <View style={{ height: 8 }} />
        {/* Botones */}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <BtnVamos onPress={handleVamos} disabled={paletas <= 0} />
        </View>
      </View>

      {/* Garantías — pestañas pegadas al lado derecho */}
      <View style={s.garantiasWrap}>
        <View style={[s.garantiaTab, s.garantiaTabMayor]}>
          <Text style={s.garantiaTabEmoji}>🎈</Text>
          <View style={s.garantiaTabTextos}>
            <Text style={s.garantiaTabTitulo}>MAYOR</Text>
            <Text style={s.garantiaTabSub}>en <Text style={s.garantiaTabNum}>{pityMayor}</Text> giros</Text>
          </View>
        </View>
        <View style={[s.garantiaTab, s.garantiaTabMenor]}>
          <Text style={s.garantiaTabEmoji}>🔒</Text>
          <View style={s.garantiaTabTextos}>
            <Text style={s.garantiaTabTitulo}>MENOR</Text>
            <Text style={s.garantiaTabSub}>en <Text style={s.garantiaTabNum}>{pityMenor}</Text> giros</Text>
          </View>
        </View>
        <View style={[s.garantiaTab, s.garantiaTabExtra]}>
          <Text style={s.garantiaTabEmoji}>✨</Text>
          <View style={s.garantiaTabTextos}>
            <Text style={s.garantiaTabTitulo}>EXTRA</Text>
            <Text style={s.garantiaTabSub}>en <Text style={s.garantiaTabNum}>{pityExtra}</Text> giros</Text>
          </View>
        </View>
      </View>

      {/* Modal de información compacto */}
      <Modal visible={showInfo} transparent animationType="none" onRequestClose={() => setShowInfo(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowInfo(false)}>
          <Animated.View style={[s.modalContent, { opacity: infoOpacity, transform: [{ scale: infoScale }], flexDirection: 'column' }]} onStartShouldSetResponder={() => true}>

            {/* Cabecera: x · título · › */}
            <View style={s.modalHeader}>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowInfo(false)} activeOpacity={0.7}>
                <Text style={s.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>
                {paginaModal === 1 ? '🎈 Explosión' : '✨ Recompensas'}
              </Text>
              <TouchableOpacity
                style={s.modalNavBtn}
                onPress={() => setPaginaModal(p => p === 1 ? 2 : 1)}
                activeOpacity={0.7}
              >
                <Text style={s.modalNavBtnText}>{paginaModal === 1 ? '›' : '‹'}</Text>
              </TouchableOpacity>
            </View>

            {/* Indicador de página */}
            <View style={s.modalPaginaDots}>
              <View style={[s.modalDot, paginaModal === 1 && s.modalDotActivo]} />
              <View style={[s.modalDot, paginaModal === 2 && s.modalDotActivo]} />
            </View>

            {/* ── Página 1: explosión ── */}
            {paginaModal === 1 && (
              <View style={s.probabilidadesList}>
                {PROBABILIDADES_DISPLAY.map((item) => (
                  <View key={item.intento} style={s.probItem}>
                    <View style={s.probItemLeft}>
                      <Text style={s.probEmoji}>🎈</Text>
                      <Text style={s.probIntento}>
                        {item.intento === 1
                          ? 'En el 1er pinchazo'
                          : `A los ${item.intento} pinchazos`}
                      </Text>
                    </View>
                    <View style={s.probItemRight}>
                      <Text style={s.probPorcentaje}>{item.probabilidadRelativa}%</Text>
                      <View style={s.probBar}>
                        <View style={[s.probBarFill, { width: `${parseFloat(item.probabilidadRelativa)}%` }]} />
                      </View>
                    </View>
                  </View>
                ))}
                <Text style={s.modalNota}>Cada pinchazo es independiente. Cuantos más pinchazos sin explotar, mayor la chance de que explote.</Text>
              </View>
            )}

            {/* ── Página 2: recompensas ── */}
            {paginaModal === 2 && (
              <View style={s.probabilidadesList}>
                {RECOMPENSAS_INFO.map((item) => (
                  <View key={item.id} style={[s.probItem, { borderColor: `${item.color}33` }]}>
                    <View style={s.probItemLeft}>
                      <Text style={s.probEmoji}>{item.emoji}</Text>
                      <View>
                        <Text style={[s.probIntento, { color: item.color }]}>{item.label}</Text>
                        <Text style={s.probSubLabel}>{item.sub}</Text>
                      </View>
                    </View>
                    <View style={s.probItemRight}>
                      <Text style={[s.probPorcentaje, { color: item.color }]}>{item.prob}%</Text>
                      <View style={[s.probBar, { backgroundColor: `${item.color}22` }]}>
                        <View style={[s.probBarFill, { width: `${Math.min(item.prob, 100)}%`, backgroundColor: item.color }]} />
                      </View>
                    </View>
                  </View>
                ))}
                <Text style={s.modalNota}>La básica cae siempre al explotar. Los demás tienen su propia probabilidad por explosión, y si no caen antes, se garantizan al llegar al límite de giros.</Text>
              </View>
            )}

          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Loading ref={loadingRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

const s = StyleSheet.create({
  globoWrap: { 
    position: 'absolute', 
    right: 60, 
    top: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  columnaBotones: {
    position: 'absolute',
    bottom: 28,
    left: 120,
  },
  garantiasWrap: {
    position: 'absolute',
    bottom: 0,
    left: 400,
    flexDirection: 'row',
    gap: 4,
  },
  garantiaTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  garantiaTabMayor: {
    backgroundColor: '#2a1330',
    borderBottomWidth: 2,
    borderBottomColor: '#ff9bb3',
  },
  garantiaTabMenor: {
    backgroundColor: '#1e1028',
    borderBottomWidth: 2,
    borderBottomColor: '#ffd66b',
  },
  garantiaTabExtra: {
    backgroundColor: '#221535',
    borderBottomWidth: 2,
    borderBottomColor: '#cda6ff',
  },
  garantiaTabEmoji: {
    fontSize: 9,
  },
  garantiaTabTextos: {
    gap: 0,
  },
  garantiaTabTitulo: {
    fontFamily: 'Omori',
    fontSize: 7,
    color: '#fff',
    letterSpacing: 0.5,
  },
  garantiaTabSub: {
    fontFamily: 'Omori',
    fontSize: 6,
    color: 'rgba(255,240,228,0.5)',
  },
  garantiaTabNum: {
    fontFamily: 'Omori',
    fontSize: 6,
    color: '#cda6ff',
  },
  // Mantenidos por si acaso pero ya no en uso directo
  premioExtraWrap: {
    display: 'none',
  },
  premiosWrap: {
    display: 'none',
  },
  botonesWrap: { 
    display: 'none',
  },
  infoButton: {
    position: 'absolute',
    top: 50,
    right: 40,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,155,179,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoButtonText: {
    fontFamily: 'Omori',
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  contadorWrap: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  contadorNumero: {
    fontFamily: 'Omori',
    fontSize: 56,
    color: '#ff4757',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  contadorTexto: {
    fontFamily: 'Delius',
    fontSize: 14,
    color: '#ff4757',
    fontWeight: '600',
    marginTop: -12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,10,15,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '78%',
    maxWidth: 330,
    height: 310,
    backgroundColor: '#fdf0f4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,155,179,0.4)',
    shadowColor: '#ff9bb3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: 'Omori',
    fontSize: 13,
    color: '#e8607a',
    textAlign: 'center',
    letterSpacing: 0.5,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  modalCloseBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(232,96,122,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontFamily: 'Omori',
    fontSize: 9,
    color: '#e8607a',
  },
  modalNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ff8fa8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  modalNavBtnText: {
    fontFamily: 'Omori',
    fontSize: 16,
    color: '#fff',
    lineHeight: 20,
    textAlign: 'center',
  },
  modalPaginaDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 10,
  },
  modalDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(232,96,122,0.25)',
  },
  modalDotActivo: {
    backgroundColor: '#e8607a',
  },
  probSubLabel: {
    fontFamily: 'Omori',
    fontSize: 7,
    color: 'rgba(232,96,122,0.6)',
    marginTop: 1,
  },
  modalNota: {
    fontFamily: 'Omori',
    fontSize: 6.5,
    color: 'rgba(232,96,122,0.5)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 10,
  },
  probabilidadesList: {
    gap: 4,
    marginBottom: 8,
    flex: 1,
  },
  probItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7f9',
    borderRadius: 7,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,143,168,0.2)',
  },
  probItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  probEmoji: {
    fontSize: 11,
  },
  probIntento: {
    fontFamily: 'Omori',
    fontSize: 8.5,
    color: '#e8607a',
  },
  probItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'flex-end',
  },
  probBar: {
    width: 50,
    height: 4,
    backgroundColor: 'rgba(255,143,168,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  probBarFill: {
    height: '100%',
    backgroundColor: '#ff8fa8',
    borderRadius: 2,
  },
  probPorcentaje: {
    fontFamily: 'Omori',
    fontSize: 9,
    color: '#e8607a',
    minWidth: 28,
    fontWeight: 'bold',
  },
});

const sv = StyleSheet.create({
  boton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2a1330',
    borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 12,
    borderLeftWidth: 3, borderLeftColor: '#ff9bb3',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 4, elevation: 5,
  },
  botonOff: { opacity: 0.45 },
  num:   { fontFamily: 'Omori', fontSize: 9, color: '#ffd1a8', marginLeft: -2 },
  texto: { fontFamily: 'Omori', fontSize: 10, color: '#fdf0e0', letterSpacing: 1 },
});

const sp = StyleSheet.create({
  premioCard: {
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    height: 100,
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a1330',
  },
  premioMayor: {
    shadowColor: '#000',
  },
  premioMenor: {
    backgroundColor: '#ffffff',
  },
  premioImagenFull: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  // Fondo del Premio Menor: "2500 🪙" grande y centrado
  premioMenorFondo: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  premioMenorFondoTexto: {
    fontFamily: 'Omori',
    fontSize: 28,
    color: '#ffd1a8',
    fontWeight: 'bold',
    opacity: 0.9,
  },
  premioMenorFondoEmoji: {
    fontSize: 24,
    opacity: 0.9,
  },
  // Capa oscura de opacidad sobre el fondo (igual que la imagen del Mayor)
  premioOverlayCapa: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(42,19,48,0.65)',
    opacity: 0.65,
  },
  premioImagenWrap: {
    display: 'none',
  },
  premioContenido: { display: 'none' },
  premioOverlay: { display: 'none' },
  candadoEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  premioLabel: {
    fontFamily: 'Omori',
    fontSize: 8,
    color: '#fff',
    letterSpacing: 0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  premioEmojiGrande: {
    fontSize: 16,
  },
  premioInfo: {
    alignItems: 'center',
  },
  premioTitulo: {
    fontFamily: 'Omori',
    fontSize: 6,
    color: '#e8607a',
    letterSpacing: 0.3,
  },
  premioSubtitulo: {
    fontFamily: 'Omori',
    fontSize: 7.5,
    color: '#e8607a',
    fontWeight: 'bold',
    marginTop: -1,
    marginBottom: 2,
  },
  premioValor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,155,179,0.15)',
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  premioValorEmoji: {
    fontSize: 8,
  },
  premioValorTexto: {
    fontFamily: 'Omori',
    fontSize: 8,
    color: '#ff8fa8',
    fontWeight: 'bold',
  },
  // Premio Extra - horizontal, mismo ancho que la fila de premios abajo
  premioExtra: {
    backgroundColor: '#fdf0f4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    height: 52,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9bb3',
  },
  premioExtraLabel: {
    fontFamily: 'Omori',
    fontSize: 8,
    color: '#e8607a',
    letterSpacing: 0.6,
    marginRight: 10,
  },
  premioExtraItems: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premioExtraItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  premioExtraItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  premioExtraDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(90,42,58,0.15)',
    borderRadius: 1,
    marginHorizontal: 8,
  },
  premioExtraEmoji: {
    fontSize: 18,
  },
  premioExtraValorTexto: {
    fontFamily: 'Omori',
    fontSize: 13,
    color: '#e8607a',
    fontWeight: 'bold',
  },
});
