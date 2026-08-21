import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Dimensions, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';



const { width } = Dimensions.get('window');

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
  return <Animated.View style={[pd.dot, filled && pd.dotFilled, { transform: [{ scale }], opacity }]} />;
};

// Indicadores de PIN — círculos con glow
const PinDots = ({ length, filled }) => (
  <View style={pd.row}>
    {Array.from({ length }).map((_, i) => <PinDot key={i} filled={i < filled} />)}
  </View>
);

export default function Login({ navigation, temporada = 't1' }) {
  const temporadaActual = temporada;
  const fondoLocal = temporadaActual === 't2' ? require('../assets/temporadas/libro/Temporada2/fondo2.png') : require('../assets/temporadas/libro/Temporada1/fondo1.png');
  const gradientColors = ['transparent', 'transparent', 'transparent'];

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const profileFade = useRef(new Animated.Value(0)).current;
  const pinFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        const all = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        const isAdmin = u => u.correo === 'admin@gmail.com' || u.email === 'admin@gmail.com' || u.nombre === 'Admin' || u.displayName === 'Administración';
        const hasName = u => Boolean(String(u.displayName || u.datosCompletos?.nombre || u.nombre || '').trim());
        const regular = all.filter(u => !isAdmin(u) && hasName(u)).slice(0, 2);
        const admin = all.find(isAdmin);
        const list = admin ? [...regular, { ...admin, _isAdmin: true }] : regular;
        setUsers(list);
        Animated.timing(profileFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } catch {
        global.showToast({ type: 'error', text1: 'Sin conexión', text2: 'No se pudieron cargar los perfiles', duration: 3000 });
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPin('');
    Animated.timing(pinFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = useCallback(async (key) => {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      return;
    }
    const next = pin + key;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      setLoading(true);
      try {
        const email = selectedUser.correo || selectedUser.email || `${selectedUser.displayName?.toLowerCase().replace(/\s/g, '')}@gmail.com`;
        const credential = await signInWithEmailAndPassword(auth, email, next);
        // Esperar el token antes de navegar: las funciones protegidas necesitan
        // que Firebase ya haya restaurado por completo la sesión.
        await credential.user.getIdToken(true);
        console.log('[Auth/Login] Sesión confirmada', { uid: credential.user.uid });
        global.showToast({ type: 'success', text1: `Hola, ${displayName || 'bienvenid@'} 🌸`, text2: 'Iniciando sesión...', duration: 1500 });
        setTimeout(() => navigation?.navigate('intro'), 400);
      } catch {
        global.showToast({ type: 'error', text1: 'PIN incorrecto', text2: 'Vuelve a intentarlo', duration: 2000 });
        shake();
        setPin('');
      } finally {
        setLoading(false);
      }
    }
  }, [pin, selectedUser, navigation]);

  const avatarUrl = selectedUser?.selectedSticker?.imageUrl || selectedUser?.currentStickerUrl || selectedUser?.photoURL || null;
  const displayName = selectedUser?.displayName || selectedUser?.datosCompletos?.nombre || selectedUser?.nombre || '';

  return (
    <View style={s.root}>
      <StatusBar hidden />
      <RNImage source={fondoLocal} style={s.background} resizeMode="cover" onLoad={() => console.log('[Login] Fondo local cargado', temporadaActual)} onError={error => console.warn('[Login] Error cargando fondo local', error?.nativeEvent || error)} />
      <LinearGradient colors={gradientColors} style={s.overlay} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      {!selectedUser ? (
        // — Pantalla de selección de perfil —
        <Animated.View style={[s.center, { opacity: profileFade }]}>
          <Text style={s.question}>{!loadingUsers && users.length === 0 ? '¡Bienvenido!' : '¿Eres tú?'}</Text>
          {!loadingUsers && users.length === 0 ? (
            <Text style={s.emptyText}>Crea tu cuenta para comenzar esta aventura 🌸</Text>
          ) : (
          <View style={s.profilesRow}>
            {users.map(user => {
              const name = user._isAdmin ? 'Admin' : (user.displayName || user.datosCompletos?.nombre || user.nombre || '');
              const avatar = !user._isAdmin && (user.selectedSticker?.imageUrl || user.currentStickerUrl || user.photoURL || null);
              return (
                <TouchableOpacity key={user.uid} style={s.profileCard} onPress={() => handleSelectUser(user)} activeOpacity={0.8}>
                  <View style={[s.avatarWrap, user._isAdmin && s.avatarWrapAdmin]}>
                    {avatar
                      ? <Image source={{ uri: avatar }} style={s.avatar} contentFit="cover" />
                      : <View style={[s.avatarPlaceholder, user._isAdmin && s.avatarPlaceholderAdmin]}><Text style={s.avatarInitial}>{name[0]?.toUpperCase()}</Text></View>
                    }
                  </View>
                  {name ? <Text style={s.profileName}>{name}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          )}

          <TouchableOpacity onPress={() => navigation?.navigate('register')} style={s.registerLink}>
            <Text style={s.registerLinkText}>Crear cuenta nueva</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        // — Pantalla de PIN —
        <>
          <TouchableOpacity
            onPress={() => { setSelectedUser(null); pinFade.setValue(0); }}
            activeOpacity={0.7}
            style={s.exitBtn}
          >
            <LinearGradient colors={['#6c757d', '#5a6268']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.exitGradient}>
              <Text style={s.exitText}>Salir</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Animated.View style={[s.centerPin, { opacity: pinFade }]}>
            <View style={s.sideColCard}>
              <View style={s.miniAvatarWrap}>
                {avatarUrl
                  ? <Image source={{ uri: avatarUrl }} style={s.miniAvatar} contentFit="contain" />
                  : <View style={s.miniAvatarPlaceholder}><Text style={s.miniInitial}>{displayName[0]?.toUpperCase()}</Text></View>
                }
              </View>
              <Text style={s.miniName}>{displayName}</Text>
            </View>

            {/* Centro: PIN */}
            <View style={s.pinCol}>
              <Text style={s.pinLabel}>Ingresa tu PIN</Text>
              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <PinDots length={PIN_LENGTH} filled={pin.length} />
              </Animated.View>
              <View style={s.errorSlot} />
              <PinKeyboard onPress={handleKeyPress} />
            </View>

            {/* Derecha: huella */}
            <View style={s.sideCol}>
              <Text style={s.huellaText}>Huella</Text>
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const BUBBLE = 48;

const s = StyleSheet.create({
  background: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, backgroundColor: '#f2c4bd' },
  root: { flex: 1, zIndex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  centerPin: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 100 },

  // Selección de perfil
  question: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 36,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  profilesRow: {
    flexDirection: 'row',
    gap: 28,
    marginBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: 110, height: 110 },
  avatarWrapAdmin: {
    borderColor: '#4a90e2',
    backgroundColor: '#1a4a8a',
  },
  avatarPlaceholderAdmin: {
    backgroundColor: '#1a4a8a',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarInitial: { fontSize: 42, color: '#fff', fontWeight: '700' },
  profileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },

  registerLink: { marginTop: 8 },
  registerLinkText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
    lineHeight: 22,
  },

  // PIN
  pinCol: { alignItems: 'center' },
  sideCol: { alignItems: 'center', gap: 8, minWidth: 100 },
  sideColCard: {
    alignItems: 'center',
    gap: 10,
    minWidth: 100,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  miniAvatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  miniAvatar: { width: 80, height: 80 },
  miniAvatarPlaceholder: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  miniInitial: { fontSize: 30, color: '#fff', fontWeight: '700' },
  miniName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 0,
  },
  huellaText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  pinLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  errorSlot: { height: 16, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  exitBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 100,
    elevation: 10,
  },
  exitGradient: {
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  exitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

});

// PIN dots
const pd = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  dotFilled: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
});

// Keyboard
const kb = StyleSheet.create({
  wrap: { marginTop: 6, gap: 6 },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteBubble: {
    backgroundColor: 'rgba(255,100,100,0.15)',
    borderColor: 'rgba(255,100,100,0.3)',
  },
  bubbleText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  deleteText: {
    color: 'rgba(255,150,150,0.9)',
    fontSize: 16,
  },
  empty: { width: BUBBLE, height: BUBBLE },
});
