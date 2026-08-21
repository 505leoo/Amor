import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, db } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';


const PIN_LENGTH = 6;

const BubbleKey = React.memo(({ label, onPress, isDel }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const bg = useRef(new Animated.Value(0)).current;
  const interval = useRef(null);
  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.82, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    Animated.timing(bg, { toValue: 1, duration: 60, useNativeDriver: false }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
    Animated.timing(bg, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    if (interval.current) { clearInterval(interval.current); interval.current = null; }
  };
  const handleLongPress = () => {
    if (!isDel) return;
    onPress('⌫');
    interval.current = setInterval(() => onPress('⌫'), 80);
  };
  const bgColor = bg.interpolate({
    inputRange: [0, 1],
    outputRange: isDel ? ['rgba(255,100,100,0.15)', 'rgba(255,100,100,0.5)'] : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.42)'],
  });
  return (
    <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} onLongPress={handleLongPress} delayLongPress={300} activeOpacity={1}>
      <Animated.View style={[kb.bubble, isDel && kb.deleteBubble, { backgroundColor: bgColor }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={[kb.bubbleText, isDel && kb.deleteText]}>{label}</Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const PIN_KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

const PinKeyboard = React.memo(({ onPress }) => (
  <View style={kb.wrap}>
    {PIN_KEYS.map((row, ri) => (
      <View key={ri} style={kb.row}>
        {row.map((key, ki) => {
          if (key === '') return <View key={`${ri}-empty`} style={kb.empty} />;
          return <BubbleKey key={`${ri}-${key}`} label={key} onPress={() => onPress(key)} isDel={key === '⌫'} />;
        })}
      </View>
    ))}
  </View>
));

const PinDot = ({ filled }) => {
  const scale = useRef(new Animated.Value(filled ? 1 : 0.7)).current;
  const opacity = useRef(new Animated.Value(filled ? 1 : 0.3)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: filled ? 1 : 0.7, useNativeDriver: true, speed: 40, bounciness: 8 }),
      Animated.timing(opacity, { toValue: filled ? 1 : 0.3, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [filled]);
  return (
    <Animated.View style={[pd.dot, filled && pd.dotFilled, { transform: [{ scale }], opacity }]} />
  );
};

const PinDots = ({ length, filled }) => (
  <View style={pd.row}>
    {Array.from({ length }).map((_, i) => <PinDot key={i} filled={i < filled} />)}
  </View>
);

const KeyButton = React.memo(({ label, onPress, style, textStyle, isDel }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const bg = useRef(new Animated.Value(0)).current;
  const interval = useRef(null);
  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    Animated.timing(bg, { toValue: 1, duration: 60, useNativeDriver: false }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
    Animated.timing(bg, { toValue: 0, duration: 120, useNativeDriver: false }).start();
    if (interval.current) { clearInterval(interval.current); interval.current = null; }
  };
  const handleLongPress = () => {
    if (!isDel) return;
    onPress('⌫');
    interval.current = setInterval(() => onPress('⌫'), 80);
  };
  const bgColor = bg.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.38)'] });
  return (
    <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} onLongPress={handleLongPress} delayLongPress={300} activeOpacity={1}>
      <Animated.View style={[lk.key, style, { backgroundColor: bgColor }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={[lk.keyText, textStyle]}>{label}</Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const LETTER_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m','⌫'],
  ['á','é','í','ó','ú','ü','ñ',' '],
];

const LetterKeyboard = React.memo(({ onPress }) => {
  const [caps, setCaps] = useState(false);
  const handlePress = useCallback((key) => {
    if (key === '⌫' || key === ' ') { onPress(key); return; }
    onPress(caps ? key.toUpperCase() : key);
    if (caps) setCaps(false);
  }, [caps, onPress]);
  return (
    <View style={lk.wrap}>
      {LETTER_ROWS.map((row, ri) => (
        <View key={ri} style={lk.row}>
          {ri === 2 && (
            <KeyButton
              label="⇧"
              onPress={() => setCaps(c => !c)}
              style={[lk.capsKey, caps && lk.capsActive]}
              textStyle={caps && lk.capsActiveText}
            />
          )}
          {row.map((key, ki) => {
            const isDel = key === '⌫';
            const isSpace = key === ' ';
            const label = isDel ? '⌫' : isSpace ? 'espacio' : (caps ? key.toUpperCase() : key);
            return (
              <KeyButton
                key={ki}
                label={label}
                onPress={() => handlePress(key)}
                isDel={isDel}
                style={isDel ? lk.delKey : isSpace ? lk.spaceKey : lk.key}
                textStyle={isDel ? lk.delText : null}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
});

const STEPS = ['correo', 'pin', 'nombre', 'foto', 'genero'];

export default function Register({ navigation, temporada = 't1' }) {
  const temporadaActual = temporada;
  const fondoLocal = temporadaActual === 't2' ? require('../assets/temporadas/libro/Temporada2/fondo2.png') : require('../assets/temporadas/libro/Temporada1/fondo1.png');
  const gradientColors = ['transparent', 'transparent', 'transparent'];

  const [step, setStep] = useState(0); // 0=correo, 1=pin, 2=nombre, 3=genero
  const [emailPrefix, setEmailPrefix] = useState('');
  const [pin, setPin] = useState('');
  const [nombre, setNombre] = useState('');
  const [genero, setGenero] = useState('');
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailKey = useCallback((key) => {
    if (key === '⌫') { setEmailPrefix(p => p.slice(0, -1)); return; }
    setEmailPrefix(p => p + key);
  }, []);

  const handlePinKey = useCallback((key) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (pin.length < PIN_LENGTH) setPin(p => p + key);
  }, [pin]);

  const handleNombreKey = useCallback((key) => {
    if (key === '⌫') { setNombre(p => p.slice(0, -1)); return; }
    setNombre(p => p + key);
  }, []);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permiso denegado'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const handleNext = () => {
    setError('');
    if (step === 0) {
      if (emailPrefix.trim().length < 3) { setError('Correo muy corto'); return; }
      setStep(1);
    } else if (step === 1) {
      if (pin.length < PIN_LENGTH) { setError(`El PIN debe tener ${PIN_LENGTH} dígitos`); return; }
      setStep(2);
    } else if (step === 2) {
      if (nombre.trim().length < 2) { setError('Nombre muy corto'); return; }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleRegister = async () => {
    if (!genero || loading) return;
    setLoading(true);
    const email = `${emailPrefix.trim()}@gmail.com`;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pin);
      let photoURL = null;
      if (foto) {
        const base64 = await FileSystem.readAsStringAsync(foto, { encoding: FileSystem.EncodingType.Base64 });
        const token = await cred.user.getIdToken();
        const fullPath = `avatars/${cred.user.uid}`;
        const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/amor-9df0d.firebasestorage.app/o/${encodeURIComponent(fullPath)}?uploadType=media`;
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg', 'Authorization': `Bearer ${token}` },
          body: Buffer.from(base64, 'base64'),
        });
        if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.status}`);
        photoURL = `https://firebasestorage.googleapis.com/v0/b/amor-9df0d.firebasestorage.app/o/${encodeURIComponent(fullPath)}?alt=media`;
      }
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        correo: email,
        nombre: nombre.trim(),
        displayName: nombre.trim(),
        genero,
        photoURL,
        fechaRegistro: new Date().toISOString(),
        ultimaConexion: new Date().toISOString(),
        estado: 'activo',
        dinero: 0, nivel: 1, exp: 0, racha: 1,
        ultimaActividad: new Date().toISOString(),
        fechaUltimaRacha: new Date().toISOString(),
        ownedStickers: [],
        tutorial: 'no',
        tutorialPaso: 0,
      });
      await setDoc(doc(db, 'buzon', `bienvenida-${cred.user.uid}`), {
        para: cred.user.uid,
        tipo: 'bienvenida_menta',
        creadoEn: serverTimestamp(),
        leido: false,
        texto: 'Bienvenida a Menta. Este pequeño mundo también es tuyo.',
      });
      navigation?.navigate('login');
    } catch (e) {
      console.log('register error:', e.code, e.message);
      setError(e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado' : 'Error al registrarse');
      setLoading(false);
    }
  };

  const canContinue = [
    emailPrefix.trim().length >= 3,
    pin.length === PIN_LENGTH,
    nombre.trim().length >= 2,
    true,
    !!genero,
  ][step];

  const titles = ['¿Cuál es tu correo?', 'Crea tu PIN', '¿Cómo te llamas?', 'Foto de perfil', '¿Cuál es tu género?'];
  const subtitles = ['Usaremos @gmail.com', `${PIN_LENGTH} dígitos numéricos`, 'Tu nombre en la app', 'Opcional', 'Selecciona una opción'];

  return (
    <View style={s.root}>
      <StatusBar hidden />
      <RNImage source={fondoLocal} style={s.background} resizeMode="cover" onLoad={() => console.log('[Register] Fondo local cargado', temporadaActual)} onError={error => console.warn('[Register] Error cargando fondo local', error?.nativeEvent || error)} />
      <LinearGradient colors={gradientColors} style={s.overlay} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step === 0 ? navigation?.navigate('login') : setStep(s => s - 1)} style={s.backBtn}>
          <Text style={s.backBtnText}>{step === 0 ? 'Iniciar sesión' : '← Atrás'}</Text>
        </TouchableOpacity>
        {step < 4 && (
          <TouchableOpacity onPress={handleNext} style={[s.nextBtn, canContinue && s.nextBtnActive]} activeOpacity={0.78}>
            <Text style={[s.nextBtnText, canContinue && s.nextBtnTextActive]}>Continuar</Text>
          </TouchableOpacity>
        )}
        {step === 4 && (
          <TouchableOpacity onPress={handleRegister} style={[s.nextBtn, genero && s.nextBtnActive]} disabled={!genero || loading}>
            <Text style={[s.nextBtnText, genero && s.nextBtnTextActive]}>{loading ? '...' : 'Crear cuenta'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicador de pasos */}
      <View style={s.stepsRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.stepDot, i <= step && s.stepDotActive]} />
        ))}
      </View>

      <View style={s.body}>
        <Text style={s.title}>{titles[step]}</Text>
        <Text style={s.subtitle}>{subtitles[step]}</Text>

        {/* Paso 0: correo */}
        {step === 0 && (
          <>
            <View style={s.emailBox}>
              <Text style={emailPrefix ? s.emailText : s.placeholder}>{emailPrefix || 'tunombre'}</Text>
              <Text style={s.emailSuffix}>@gmail.com</Text>
            </View>
            {error ? <Text style={s.error}>{error}</Text> : null}
            <LetterKeyboard onPress={handleEmailKey} />
          </>
        )}

        {/* Paso 1: PIN */}
        {step === 1 && (
          <>
            <PinDots length={PIN_LENGTH} filled={pin.length} />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <PinKeyboard onPress={handlePinKey} />
          </>
        )}

        {/* Paso 2: nombre */}
        {step === 2 && (
          <>
            <View style={s.nombreBox}>
              <Text style={s.nombreText}>{nombre || <Text style={s.placeholder}>Tu nombre</Text>}</Text>
            </View>
            {error ? <Text style={s.error}>{error}</Text> : null}
            <LetterKeyboard onPress={handleNombreKey} />
          </>
        )}

        {/* Paso 3: foto */}
        {step === 3 && (
          <View style={s.fotoWrap}>
            <TouchableOpacity style={s.fotoCircle} onPress={handlePickPhoto} activeOpacity={0.8}>
              {foto
                ? <Image source={{ uri: foto }} style={s.fotoImg} contentFit="cover" />
                : <Text style={s.fotoInitial}>{nombre.trim()[0]?.toUpperCase() || '?'}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.fotoBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
              <Text style={s.fotoBtnText}>{foto ? 'Cambiar foto' : 'Elegir foto'}</Text>
            </TouchableOpacity>
            {error ? <Text style={s.error}>{error}</Text> : null}
          </View>
        )}

        {/* Paso 4: género */}
        {step === 4 && (
          <View style={s.generoWrap}>
            {['Femenino', 'Masculino', 'Otro'].map(g => (
              <TouchableOpacity
                key={g}
                style={[s.generoBtn, genero === g.toLowerCase() && s.generoBtnActive]}
                onPress={() => setGenero(g.toLowerCase())}
                activeOpacity={0.8}
              >
                <Text style={[s.generoText, genero === g.toLowerCase() && s.generoTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
            {error ? <Text style={s.error}>{error}</Text> : null}
          </View>
        )}
      </View>
    </View>
  );
}

const BUBBLE = 44;

const s = StyleSheet.create({
  background: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, backgroundColor: '#f2c4bd' },
  root: { flex: 1, zIndex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  header: {
    zIndex: 10,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '500' },
  nextBtn: {
    zIndex: 11,
    elevation: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  nextBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'transparent',
  },
  nextBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },
  nextBtnTextActive: { color: '#111' },

  stepsRow: {
    zIndex: 0,
    elevation: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
    top: -45,
    marginBottom: -40,
  },
  stepDot: {
    width: 6,
    height: 7,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: { backgroundColor: 'rgba(255,255,255,0.85)', width: 18 },

  body: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 0, zIndex: 2 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  error: { color: '#ff6b6b', fontSize: 13, fontWeight: '600', marginTop: 10 },

  // Correo
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    minWidth: 260,
  },
  emailText: { color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: '500', flex: 1 },
  emailSuffix: { color: 'rgba(187, 165, 165, 0.55)', fontSize: 16 },
  placeholder: { color: 'rgba(187, 165, 165, 0.55)', fontSize: 18, fontWeight: '500' },

  // Foto
  fotoWrap: { alignItems: 'center', gap: 20, marginTop: 8 },
  fotoCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  fotoImg: { width: 110, height: 110 },
  fotoInitial: { fontSize: 42, color: '#fff', fontWeight: '300' },
  fotoBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10,
  },
  fotoBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  // Nombre
  nombreBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 12,
    minWidth: 260,
    alignItems: 'center',
  },
  nombreText: { color: '#fff', fontSize: 20, fontWeight: '500' },

  // Género
  generoWrap: { gap: 14, width: '70%', marginTop: 8 },
  generoBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generoBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  generoText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },
  generoTextActive: { color: '#fff' },
});

const pd = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  dotFilled: {
    backgroundColor: '#fff', borderColor: '#fff',
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
  },
});

const kb = StyleSheet.create({
  wrap: { marginTop: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  bubble: {
    width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  deleteBubble: { backgroundColor: 'rgba(255,100,100,0.15)', borderColor: 'rgba(255,100,100,0.3)' },
  bubbleText: { color: '#fff', fontSize: 22, fontWeight: '400', letterSpacing: 0.5 },
  deleteText: { color: 'rgba(255,150,150,0.9)', fontSize: 20 },
  empty: { width: BUBBLE, height: BUBBLE },
});

const lk = StyleSheet.create({
  wrap: { marginTop: 6, gap: 6, width: '100%', paddingHorizontal: 4 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 5, flexWrap: 'wrap' },
  key: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8, minWidth: 32, height: 38,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6,
  },
  capsKey: { minWidth: 44, backgroundColor: 'rgba(255,255,255,0.08)' },
  capsActive: { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.5)' },
  capsActiveText: { color: '#fff', fontWeight: '700' },
  spaceKey: { minWidth: 120 },
  keyText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  delKey: { backgroundColor: 'rgba(255,100,100,0.15)', borderColor: 'rgba(255,100,100,0.3)', minWidth: 44 },
  delText: { color: 'rgba(255,150,150,0.9)' },
});
