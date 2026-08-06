import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Svg, Ellipse, Circle, Rect, Path, Line } from 'react-native-svg';
import TabButtons from '../components/TabButtons';
import TrophyIcon, { getTrophyRank, getTrophyColors } from '../components/TrophyIcon';

const generoCorto = (g) => {
  if (g === 'masculino') return 'M';
  if (g === 'femenino') return 'F';
  if (g) return String(g).slice(0, 3);
  return '—';
};

const Torta = () => (
  <View style={tk.wrap}>
    {/* Velas encima de la torta */}
    <View style={tk.velasRow}>
      {[0,1,2].map(i => (
        <View key={i} style={tk.velaWrap}>
          <View style={tk.llamita} />
          <View style={[tk.vela, { backgroundColor: i === 0 ? '#FF69B4' : i === 1 ? '#a78bfa' : '#60d394' }]} />
        </View>
      ))}
    </View>
    {/* Crema top */}
    <View style={tk.cremaTop}>
      {[0,1,2,3].map(i => (
        <View key={i} style={[tk.cremaPico, { left: i * 5 }]} />
      ))}
    </View>
    {/* Capa 1 */}
    <View style={tk.capa1}>
      <View style={tk.capa1Deco} />
      <View style={[tk.capa1Deco, { left: 8 }]} />
      <View style={[tk.capa1Deco, { left: 16 }]} />
    </View>
    {/* Plato */}
    <View style={tk.plato} />
  </View>
);

const tk = StyleSheet.create({
  wrap: { alignItems: 'center' },
  velasRow: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', marginBottom: 0 },
  velaWrap: { alignItems: 'center' },
  llamita: {
    width: 3, height: 4, borderRadius: 2,
    backgroundColor: '#fbbf24',
    shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 2, elevation: 3,
  },
  vela: { width: 2.5, height: 6, borderRadius: 1 },
  cremaTop: {
    width: 24, height: 4,
    flexDirection: 'row', overflow: 'hidden',
  },
  cremaPico: {
    position: 'absolute',
    width: 6, height: 4, borderRadius: 3,
    backgroundColor: '#fff8f0',
    bottom: 0,
  },
  capa1: {
    width: 26, height: 12, borderRadius: 2,
    backgroundColor: '#f9a8c9',
    justifyContent: 'center', overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  capa1Deco: {
    position: 'absolute', left: 2,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  plato: {
    width: 30, height: 2.5, borderRadius: 2,
    backgroundColor: '#e8d5c4',
  },
});

const Luna = () => (
  <View style={ln.wrap}>
    {/* Estrellitas */}
    <View style={[ln.star, { top: 0, right: 2, width: 3, height: 3, borderRadius: 1.5 }]} />
    <View style={[ln.star, { top: 7, right: 0, width: 2, height: 2, borderRadius: 1 }]} />
    <View style={[ln.star, { bottom: 2, right: 1, width: 2.5, height: 2.5, borderRadius: 1.5 }]} />
    <View style={[ln.star, { top: 0, left: 4, width: 2, height: 2, borderRadius: 1 }]} />
    <View style={[ln.star, { bottom: 5, left: 0, width: 1.5, height: 1.5, borderRadius: 1 }]} />
    {/* Luna llena */}
    <View style={ln.luna}>
      <View style={ln.anillo} />
      <View style={ln.brillo1} />
      <View style={ln.brillo2} />
      <View style={ln.brillo3} />
      <View style={ln.crater1} />
      <View style={ln.crater2} />
      <View style={ln.crater3} />
    </View>
  </View>
);

const ln = StyleSheet.create({
  wrap: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  star: {
    position: 'absolute',
    backgroundColor: '#e8e8f8',
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 3, elevation: 2,
  },
  luna: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#e8edf8',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#a0b4d4', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 7, elevation: 6,
    overflow: 'hidden',
  },
  anillo: {
    position: 'absolute', top: 1, left: 1,
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
  },
  brillo1: {
    position: 'absolute', top: 2, left: 3,
    width: 7, height: 3.5, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  brillo2: {
    position: 'absolute', top: 6, left: 2,
    width: 3, height: 2, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  brillo3: {
    position: 'absolute', top: 3, right: 4,
    width: 2, height: 2, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  crater1: {
    position: 'absolute', bottom: 4, left: 4,
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(150,168,200,0.35)',
    borderWidth: 0.5, borderColor: 'rgba(130,150,185,0.3)',
  },
  crater2: {
    position: 'absolute', bottom: 7, right: 3,
    width: 3.5, height: 3.5, borderRadius: 2,
    backgroundColor: 'rgba(150,168,200,0.3)',
    borderWidth: 0.5, borderColor: 'rgba(130,150,185,0.25)',
  },
  crater3: {
    position: 'absolute', top: 9, right: 3,
    width: 2.5, height: 2.5, borderRadius: 1.5,
    backgroundColor: 'rgba(150,168,200,0.25)',
  },
});

const Flor = () => (
  <View style={fl.wrap}>
    {/* Pétalos */}
    {[0,45,90,135,180,225,270,315].map(deg => (
      <View key={deg} style={[fl.petalo, { transform: [{ rotate: `${deg}deg` }, { translateY: -7 }] }]} />
    ))}
    {/* Centro */}
    <View style={fl.centro}>
      <View style={fl.centroBrello} />
    </View>
  </View>
);

const fl = StyleSheet.create({
  wrap: { width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  petalo: {
    position: 'absolute',
    width: 7, height: 9, borderRadius: 4,
    backgroundColor: '#ffb7d5',
    shadowColor: '#FF69B4', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 2, elevation: 1,
  },
  centro: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#fdd835',
    borderWidth: 1, borderColor: 'rgba(255,200,50,0.6)',
    shadowColor: '#f5a623', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 3, elevation: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  centroBrello: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    position: 'absolute', top: 2, left: 2,
  },
});

const HelloKitty = () => (
  <Svg width={36} height={28} viewBox="0 0 36 28">
    {/* Sombra/base del moño */}
    <Ellipse cx="18" cy="15" rx="16" ry="7" fill="rgba(120,0,20,0.12)" />

    {/* Ala izquierda — capa trasera más oscura */}
    <Path d="M18 14 C15 8 8 6 5 9 C3 11 5 16 10 17 C13 18 16 16 18 14 Z"
      fill="#b0001e" stroke="#800015" strokeWidth="0.4" />
    {/* Ala derecha — capa trasera */}
    <Path d="M18 14 C21 8 28 6 31 9 C33 11 31 16 26 17 C23 18 20 16 18 14 Z"
      fill="#b0001e" stroke="#800015" strokeWidth="0.4" />

    {/* Ala izquierda — capa principal */}
    <Path d="M18 13.5 C15 7 7 5 4 8.5 C2 11 4 16.5 10 17.5 C14 18.5 17 16 18 13.5 Z"
      fill="#e8002a" stroke="#a00020" strokeWidth="0.5" />
    {/* Ala derecha — capa principal */}
    <Path d="M18 13.5 C21 7 29 5 32 8.5 C34 11 32 16.5 26 17.5 C22 18.5 19 16 18 13.5 Z"
      fill="#e8002a" stroke="#a00020" strokeWidth="0.5" />

    {/* Pliegues ala izquierda */}
    <Path d="M7 7.5 C9 10 12 12.5 18 13.5" stroke="#c0001f" strokeWidth="0.6" fill="none" strokeLinecap="round" />
    <Path d="M5 11 C7 12.5 11 13.5 16 13.8" stroke="#c0001f" strokeWidth="0.4" fill="none" strokeLinecap="round" />
    {/* Pliegues ala derecha */}
    <Path d="M29 7.5 C27 10 24 12.5 18 13.5" stroke="#c0001f" strokeWidth="0.6" fill="none" strokeLinecap="round" />
    <Path d="M31 11 C29 12.5 25 13.5 20 13.8" stroke="#c0001f" strokeWidth="0.4" fill="none" strokeLinecap="round" />

    {/* Brillo ala izquierda */}
    <Path d="M7 8 C9 9 11 10 14 11" stroke="rgba(255,180,180,0.5)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    {/* Brillo ala derecha */}
    <Path d="M29 8 C27 9 25 10 22 11" stroke="rgba(255,180,180,0.5)" strokeWidth="1.2" fill="none" strokeLinecap="round" />

    {/* Nudo central — capa trasera */}
    <Ellipse cx="18" cy="13.5" rx="3.8" ry="3" fill="#a00020" stroke="#800015" strokeWidth="0.4" />
    {/* Nudo central — capa principal */}
    <Ellipse cx="18" cy="13" rx="3.2" ry="2.5" fill="#d40028" stroke="#a00020" strokeWidth="0.5" />
    {/* Pliegue nudo */}
    <Path d="M15.5 12 C16.5 13 17 14 15.5 15" stroke="#a00020" strokeWidth="0.5" fill="none" strokeLinecap="round" />
    <Path d="M20.5 12 C19.5 13 19 14 20.5 15" stroke="#a00020" strokeWidth="0.5" fill="none" strokeLinecap="round" />
    {/* Brillo nudo */}
    <Ellipse cx="17" cy="11.8" rx="1.2" ry="0.7" fill="rgba(255,200,200,0.55)" />
    <Circle cx="17.2" cy="11.5" r="0.4" fill="rgba(255,255,255,0.4)" />
  </Svg>
);

const Sol = () => {
  const rayos = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <View style={sol.wrap}>
      <View style={sol.rayosWrap}>
        {rayos.map(deg => (
          <View key={deg} style={[sol.rayo, { transform: [{ rotate: `${deg}deg` }, { translateY: -10 }] }]} />
        ))}
      </View>
      <View style={sol.circulo}>
        <View style={sol.brillo} />
      </View>
    </View>
  );
};

const sol = StyleSheet.create({
  wrap: { width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  rayosWrap: { position: 'absolute', width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  rayo: {
    position: 'absolute',
    width: 2,
    height: 5,
    borderRadius: 1,
    backgroundColor: '#f5a623',
  },
  circulo: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#fdd835',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  brillo: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    position: 'absolute',
    top: 2,
    left: 2,
  },
});

const Row = ({ label, value }) => (
  <View style={s.rowWrap}>
    <Text style={s.label}>{label}</Text>
    <Text style={s.value}>{value}</Text>
  </View>
);

const MiniRow = ({ label, value, children }) => (
  <View style={s.miniWrap}>
    <Text style={s.label}>{label}</Text>
    {children ?? <Text style={s.value}>{value}</Text>}
  </View>
);

const Stat = ({ label, value }) => (
  <View style={s.statCell}>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const Perfil = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const unsub = onSnapshot(
      doc(db, 'usuarios', user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setUserData({
            nombre: d.datosCompletos?.nombre || d.nombre || user.displayName || 'Usuario',
            dni: typeof d.dni === 'string' ? d.dni.trim() : null,
            correo: d.correo || user.email || '—',
            edad: d.edad ?? null,
            fechaNacimiento: d.fechaNacimiento || null,
            genero: d.genero ?? null,
            photoURL: d.photoURL || null,
            dinero: typeof d.dinero === 'number' ? d.dinero : 0,
            nivel: typeof d.nivel === 'number' ? d.nivel : 1,
            exp: typeof d.exp === 'number' ? d.exp : 0,
            racha: typeof d.racha === 'number' ? d.racha : 0,
            estado: d.estado || 'activo',
            uid: user.uid,
          });
        } else {
          setUserData({
            nombre: user.displayName || 'Usuario',
            dni: null, correo: user.email || '—',
            edad: null, fechaNacimiento: null, genero: null,
            photoURL: null, dinero: 0, nivel: 1, exp: 0, racha: 0, estado: '—', uid: user.uid,
          });
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const d = userData;
  const nivel = d?.nivel ?? 1;
  const trophyRank = getTrophyRank(nivel);
  const trophyColors = getTrophyColors(nivel);

  return (
    <View style={s.root}>
      <StatusBar hidden />
      <ExpoImage
        source={require('../assets/temporadas/neutral.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <TabButtons
        onExit={() => navigation?.navigate('main')}
        userMoney={userData?.dinero ?? 0}
        onAddSticker={() => navigation?.navigate?.('coleccion')}
      />

      <View style={s.center}>
        <ExpoImage
          source={require('../assets/temporadas/libro/panel2.png')}
          style={s.panelImg}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
        <View style={s.box}>
          {loading ? (
            <Text style={s.loadingText}>Cargando…</Text>
          ) : d ? (
            <View style={s.inner}>

              {/* Columna izquierda: avatar + trofeo */}
              <View style={s.leftCol}>
                <View style={s.photoShell}>
                  {d.photoURL
                    ? <ExpoImage source={{ uri: d.photoURL }} style={s.photoImg} contentFit="cover" cachePolicy="memory-disk" />
                    : <View style={s.photoFallback}><Text style={s.photoLetter}>{(d.nombre || '?')[0].toUpperCase()}</Text></View>
                  }
                </View>
                <View style={s.trophyBlock}>
                  <View style={s.trophyClip}>
                    <TrophyIcon nivel={nivel} scale={0.2} />
                  </View>
                  <Text style={[s.trophyRank, { color: trophyColors[0] }]}>{trophyRank}</Text>
                  <Text style={s.nivelText}>NV. {nivel}</Text>
                </View>
              </View>

              <View style={s.dividerV} />

              {/* Columna datos */}
              <View style={s.rightCol}>
                <Text style={s.nombre}>{d.nombre}</Text>
                <View style={s.dividerH} />
                <Row label="DOCUMENTO" value={d.dni || '···-···-···'} />
                <Row label="CORREO" value={d.correo} />
                <View style={s.rowFields}>
                  {d.edad != null && <MiniRow label="EDAD" value={`${d.edad} años`} />}
                  <MiniRow label="SEXO" value={generoCorto(d.genero)} />
                  <MiniRow label="ESTADO">
                    <View style={s.chip}>
                      <MaterialIcons name="verified" size={8} color="#1565C0" />
                      <Text style={s.chipText}>
                        {d.estado === 'activo' ? 'VIGENTE' : String(d.estado).toUpperCase()}
                      </Text>
                    </View>
                  </MiniRow>
                </View>
                {d.fechaNacimiento ? <Row label="NACIMIENTO" value={d.fechaNacimiento} /> : null}
                <View style={s.dividerH} />
                <View style={s.statsRow}>
                  <Stat label="RACHA" value={`${d.racha}d`} />
                  <View style={s.statDiv} />
                  <Stat label="EXP" value={d.exp} />
                  <View style={s.statDiv} />
                  <Stat label="MONEDAS" value={d.dinero} />
                </View>
              </View>

              <View style={s.dividerV} />

              {/* Columna extra */}
              <View style={s.extraCol}>
                <Text style={s.extraText}>Chau</Text>
                <View style={s.extraDivider} />
                <View style={[s.extraBottom, { marginLeft: -10 }]}>
                  <View style={s.iconItem}>
                    <Sol />
                    <Text style={s.holaX}>✕</Text>
                  </View>
                  <View style={s.iconItem}>
                    <Torta />
                    <Text style={s.holaX}>✕</Text>
                  </View>
                  <View style={s.iconItem}>
                    <Luna />
                    <Text style={s.holaX}>✕</Text>
                  </View>
                  <View style={s.iconItem}>
                    <Flor />
                    <Text style={s.holaX}>✕</Text>
                  </View>
                </View>
                <View style={[s.extraBottom, { marginTop: 6, marginLeft: -15 }]}>
                  <View style={s.iconItem}>
                    <HelloKitty />
                    <Text style={s.holaX}>✕</Text>
                  </View>
                </View>
              </View>

            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingLeft: 220 },

  box: {
    width: 520,
    height: 280,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.03)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 4,
    left: -90,
  },

  panelImg: {
    position: 'absolute',
    width: 650,
    height: 650,
    opacity: 0.85,
    left: 100,
  },

  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 20 },

  inner: {
    flex: 1,
    flexDirection: 'row',
    padding: 53,
    paddingLeft: 40,
    gap: 20,
  },

  leftCol: { alignItems: 'center', width: 100, justifyContent: 'space-between' },
  photoShell: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 2,
    top: -7,
    borderColor: '#c9748f',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImg: { width: '100%', height: '100%' },
  photoFallback: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(201,116,143,0.2)' },
  photoLetter: { fontSize: 32, fontWeight: '800', color: '#c9748f' },

  trophyBlock: { alignItems: 'center', marginTop: 8 },
  trophyClip: { width: 38, height: 38, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  trophyRank: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
  nivelText: { fontSize: 7, fontWeight: '700', color: '#8a5a6a', letterSpacing: 1, marginTop: 1 },

  dividerV: { width: 1, backgroundColor: 'rgba(90,42,58,0.2)', marginVertical: 4 },
  dividerH: { height: 1, backgroundColor: 'rgba(90,42,58,0.15)', marginVertical: 8 },

  rightCol: { flex: 1, justifyContent: 'center' },
  nombre: { fontSize: 22, fontWeight: '800', color: '#5a2a3a', letterSpacing: 0.5, marginBottom: 2 },

  rowWrap: { marginBottom: 5 },
  label: { fontSize: 7, color: '#c9748f', fontWeight: '700', letterSpacing: 1.2, marginBottom: 1 },
  value: { fontSize: 11, color: '#3a1a2a', fontWeight: '600', letterSpacing: 0.3 },

  rowFields: { flexDirection: 'row', gap: 16, marginBottom: 5 },
  miniWrap: { minWidth: 50 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(21,101,192,0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(21,101,192,0.25)',
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 7, fontWeight: '800', color: '#1565C0', letterSpacing: 0.4 },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '800', color: '#5a2a3a' },
  statLabel: { fontSize: 6, fontWeight: '700', color: '#c9748f', letterSpacing: 1, marginTop: 1 },
  statDiv: { width: 1, height: 22, backgroundColor: 'rgba(90,42,58,0.15)' },

  extraCol: { width: 80, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 0 },
  extraText: { fontSize: 10, color: '#5a2a3a', fontWeight: '600' },
  extraDivider: { height: 1, backgroundColor: 'rgba(90,42,58,0.15)', marginVertical: 8, width: '160%', marginLeft: '-9%' },
  holaX: { fontSize: 7, color: '#F44336', fontWeight: '800', marginTop: 2 },
  extraBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginLeft: -15 },
  iconItem: { alignItems: 'center' },
});

export default Perfil;
