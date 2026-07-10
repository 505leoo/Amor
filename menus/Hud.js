import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, getDocs, collection, query, where, limit, updateDoc } from 'firebase/firestore';
import { useTheme } from '../ThemeContext';
import { useSeason } from '../SeasonContext';
import ThemeParticles from '../components/ThemeParticles';

const generarMiniBarcode = () => {
  const bars = [];
  for (let i = 0; i < 12; i++) {
    const isThick = i === 0 || i === 1 || i === 10 || i === 11 || Math.random() < 0.4;
    bars.push({ w: isThick ? 1.5 : 1, h: isThick ? 8 : 6, opacity: isThick ? 1 : 0.8 });
  }
  return bars;
};

const Hud = ({ navigation }) => {
  const openPerfil = () => navigation?.navigate?.('perfil');
  const bars = generarMiniBarcode();
  const { currentTheme, themes } = useTheme();
  const { getDisplaySeason } = useSeason();
  const theme = themes[currentTheme];
  const displaySeason = getDisplaySeason();
  const gradientColors = displaySeason ? displaySeason.gradient : theme?.gradient;
  const particlesType = displaySeason ? displaySeason.particles : theme?.particles;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    (async () => {
      try {
        const ref = doc(db, 'usuarios', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const dni = snap.data().dni;
        if (typeof dni === 'string' && /^\d{2}-\d{3}-\d{3}$/.test(dni.trim())) return;
        const gen = () => { const r = n => Math.floor(n + Math.random() * n); return `${r(10)}-${r(100)}-${r(100)}`; };
        for (let i = 0; i < 24; i++) {
          const c = gen();
          const taken = await getDocs(query(collection(db, 'usuarios'), where('dni', '==', c), limit(1)));
          if (taken.empty) { await updateDoc(ref, { dni: c }); return; }
        }
      } catch (e) {}
    })();
  }, []);

  return (
    <Pressable onPress={openPerfil} style={styles.pressable}>
      <View style={styles.container}>
        <LinearGradient
          colors={gradientColors || ['#4a1a10', '#7a1f06', '#8f2d0e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientShell}
        >
          <ThemeParticles particleType={particlesType} />
          <View style={styles.seasonBadge}>
            <Text style={styles.seasonBadgeText}>{displaySeason?.icon || '✦'}</Text>
          </View>
          <View style={styles.dniMini}>
            {/* Banda superior */}
            <LinearGradient
              colors={['#4a1a10', '#7a1f06', '#8f2d0e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.band}
            >
              <View style={styles.bandRow}>
                <Text style={styles.bandCountry}>LOVE</Text>
                <View style={styles.bandAccent}>
                  <Text style={styles.bandAccentText}>DNI</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Cuerpo */}
            <View style={styles.dniBody}>
              <View style={styles.mainRow}>
                {/* Foto simulada */}
                <View style={styles.photoShell}>
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoText}>ID</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.infoCol}>
                  <View style={styles.fakeTextLine} />
                  <View style={styles.fakeTextLineShort} />
                  <View style={styles.fakeTextLineLong} />
                </View>
              </View>

              {/* Línea divisoria */}
              <View style={styles.sectionDivider} />

              {/* Barcode mini */}
              <View style={styles.barcodeRow}>
                {bars.map((bar, i) => (
                  <View key={i} style={[styles.barcodeBar, { width: bar.w, height: bar.h, opacity: bar.opacity }]} />
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    position: 'absolute',
    bottom: 125,
    left: 200,
    zIndex: 50,
  },
  container: {
    width: 41,
    height: 26,
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1,
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  gradientShell: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seasonBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  seasonBadgeText: {
    fontSize: 3,
    color: 'rgba(255,255,255,0.9)',
  },
  dniMini: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 30, 0.9)',
  },
  band: {
    paddingTop: 2,
    paddingBottom: 1,
    paddingHorizontal: 3,
  },
  bandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandCountry: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 4,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bandAccent: {
    borderWidth: 0.5,
    borderColor: 'rgba(232, 197, 71, 0.8)',
    paddingHorizontal: 2,
    paddingVertical: 0.5,
    borderRadius: 1,
  },
  bandAccentText: {
    color: '#e8c547',
    fontSize: 4,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dniBody: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 3,
    paddingTop: 1,
    paddingBottom: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  photoShell: {
    width: 6,
    height: 8,
    borderRadius: 1,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#3e2723',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e2d8',
    marginRight: 2,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    fontSize: 3,
    fontWeight: '800',
    color: '#6d4c41',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 3,
    color: '#8d6e63',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 0.5,
  },
  nombre: {
    fontSize: 5,
    fontWeight: '800',
    color: '#1a0f0a',
    lineHeight: 6,
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  fakeTextLine: {
    marginTop: 0.5,
    height: 2,
    width: '80%',
    backgroundColor: 'rgba(240,240,240,0.85)',
    borderColor: 'rgba(180,180,180,0.8)',
    borderWidth: 0.5,
    borderRadius: 1,
  },
  fakeTextLineShort: {
    marginTop: 0.5,
    height: 2,
    width: '60%',
    backgroundColor: 'rgba(240,240,240,0.85)',
    borderColor: 'rgba(180,180,180,0.8)',
    borderWidth: 0.5,
    borderRadius: 1,
  },
  fakeTextLineLong: {
    marginTop: 0.5,
    height: 2,
    width: '90%',
    backgroundColor: 'rgba(240,240,240,0.85)',
    borderColor: 'rgba(180,180,180,0.8)',
    borderWidth: 0.5,
    borderRadius: 1,
  },
  idDigits: {
    fontSize: 4.5,
    fontWeight: '700',
    color: '#1a0f0a',
    letterSpacing: 1,
  },
  sectionDivider: {
    height: 0.5,
    backgroundColor: 'rgba(62, 39, 35, 0.2)',
    marginVertical: 1,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 8,
  },
  barcodeBar: {
    backgroundColor: '#1a1a1a',
    borderRadius: 0,
  },
});

export default Hud;
