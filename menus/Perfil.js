import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../ThemeContext';
import { useSeason } from '../SeasonContext';
import ThemeParticles from '../components/ThemeParticles';
import TabButtons from '../components/TabButtons';
import Player from '../Player';
import TrophyIcon, { getTrophyRank, getTrophyColors } from '../components/TrophyIcon';

const generoCorto = (g) => {
  if (g === 'masculino') return 'M';
  if (g === 'femenino') return 'F';
  if (g) return String(g).slice(0, 3);
  return '—';
};

const generarCodigoBarras = (dni) => {
  const digits = (dni || '').replace(/-/g, '').replace(/\D/g, '');
  const seed =
    digits
      .split('')
      .reduce((acc, ch, idx) => acc + (parseInt(ch || '0', 10) + 1) * (idx + 13), 0) +
    digits.length * 997;

  const count = 40;
  const bars = [];
  let x = seed || 123456;

  for (let i = 0; i < count; i++) {
    x = (Math.imul(x, 1103515245) + 12345) % 2147483647;
    const r = x % 1000;
    const isGuard = i === 0 || i === 1 || i === count - 1 || i === count - 2;
    const isThick = isGuard || r < 300 || i % 7 === 0;
    bars.push({ i, w: isThick ? 2.5 : 1.5, h: isThick ? 24 : 17, opacity: isThick ? 1 : 0.7 });
  }
  return bars;
};

const Perfil = ({ navigation }) => {
  const { currentTheme, themes } = useTheme();
  const { getDisplaySeason } = useSeason();
  const theme = themes[currentTheme];
  const displaySeason = getDisplaySeason();
  const gradientColors = displaySeason?.gradient || theme?.gradient || ['#1a1a2e', '#16213e'];
  const particlesType = displaySeason ? displaySeason.particles : theme?.particles;

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
            dinero: 0, nivel: 1, exp: 0, racha: 0, estado: '—', uid: user.uid,
          });
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const d = userData;
  const mrzDni = (d?.dni || '--------').replace(/-/g, '');
  const barcodeBars = generarCodigoBarras(d?.dni);
  const nivel = d?.nivel ?? 1;
  const trophyRank = getTrophyRank(nivel);
  const trophyColors = getTrophyColors(nivel);

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <StatusBar hidden />
      {particlesType ? <ThemeParticles particleType={particlesType} /> : null}

      <TabButtons
        onExit={() => navigation?.navigate('main')}
        userMoney={userData?.dinero ?? 0}
        onAddSticker={() => navigation?.navigate?.('coleccion')}
      />

      <View style={styles.contentWrap}>
        {loading ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingPulse} />
            <Text style={styles.loadingText}>Cargando…</Text>
          </View>
        ) : d ? (
          <View style={styles.cardOuter}>
            {/* Header band */}
            <LinearGradient
              colors={['#4a1a10', '#7a1f06', '#8f2d0e']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.cardBand}
            >
              <View style={styles.bandRow}>
                <View>
                  <Text style={styles.bandCountry}>REPÚBLICA DE LOVE</Text>
                  <Text style={styles.bandTitle}>DOCUMENTO NACIONAL DE IDENTIDAD</Text>
                </View>
                <View style={styles.bandAccent}>
                  <Text style={styles.bandAccentText}>LOVE</Text>
                </View>
              </View>
              <View style={styles.bandDivider} />
            </LinearGradient>

            {/* Body */}
            <View style={styles.cardBody}>

              {/* ZONA 1: foto + trofeo | nombre + DNI + estado */}
              <View style={styles.mainRow}>

                {/* Columna izquierda: foto arriba, trofeo+nivel abajo */}
                <View style={styles.leftCol}>
                  <View style={styles.photoShell}>
                    <View style={styles.photoScaleBox}>
                      <Player
                        centered
                        showNameTag={false}
                        onSelectSticker={() => navigation?.navigate?.('coleccion')}
                      />
                    </View>
                  </View>
                  <Text style={styles.photoHint}>TOCA PARA CAMBIAR</Text>

                  <View style={styles.trophyBlock}>
                    <View style={styles.trophyClip}>
                      <TrophyIcon nivel={nivel} scale={0.18} />
                    </View>
                    <Text style={[styles.trophyRankText, { color: trophyColors[0] }]}>{trophyRank}</Text>
                    <Text style={styles.nivelText}>NV. {nivel}</Text>
                  </View>
                </View>

                {/* Columna derecha: info principal */}
                <View style={styles.infoCol}>
                  <Text style={styles.fieldLabel}>APELLIDOS Y NOMBRE</Text>
                  <Text style={styles.nombre} numberOfLines={2}>{d.nombre}</Text>

                  <View style={styles.sectionDividerLight} />

                  <Text style={styles.fieldLabel}>NÚMERO DE DOCUMENTO</Text>
                  <Text style={styles.idDigits}>{d.dni || '···-···-···'}</Text>

                  <View style={styles.sectionDividerLight} />

                  <View style={styles.rowFields}>
                    {d.edad != null && (
                      <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>EDAD</Text>
                        <Text style={styles.fieldValue}>{d.edad} años</Text>
                      </View>
                    )}
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>SEXO</Text>
                      <Text style={styles.fieldValue}>{generoCorto(d.genero)}</Text>
                    </View>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>ESTADO</Text>
                      <View style={styles.chip}>
                        <MaterialIcons name="verified" size={9} color="#1565C0" style={styles.chipIcon} />
                        <Text style={styles.chipText}>
                          {d.estado === 'activo' ? 'VIGENTE' : String(d.estado).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {d.fechaNacimiento ? (
                    <>
                      <Text style={styles.fieldLabel}>FECHA DE NACIMIENTO</Text>
                      <Text style={styles.fieldValue}>{d.fechaNacimiento}</Text>
                    </>
                  ) : null}

                  <Text style={styles.fieldLabel}>CORREO</Text>
                  <Text style={styles.correo} numberOfLines={1}>{d.correo}</Text>
                </View>
              </View>

              {/* ZONA 2: barcode + MRZ */}
              <View style={styles.sectionDivider} />
              <View style={styles.barcodeRow}>
                <View style={styles.barcodeLeft}>
                  <Text style={styles.barcodeLabel}>LOV-DNI</Text>
                  <View style={styles.barcodeInner}>
                    {barcodeBars.map((b) => (
                      <View
                        key={b.i}
                        style={[styles.barcodeBar, { width: b.w, height: b.h, opacity: b.opacity }]}
                      />
                    ))}
                  </View>
                  <Text style={styles.barcodeDigits} numberOfLines={1}>
                    {d?.dni || '···-···-···'}
                  </Text>
                </View>
                <View style={styles.barcodeRight}>
                  <Text style={styles.mrzLabel}>ZONA DE LECTURA MECÁNICA</Text>
                  <Text style={styles.mrz} numberOfLines={1}>
                    {`I<LOV${mrzDni}${(d.nombre || 'X').replace(/\s/g, '<').slice(0, 12)}<<`}
                  </Text>
                  <Text style={styles.mrz} numberOfLines={1}>
                    {`${mrzDni.padEnd(9, '<')}${String(d.edad ?? '00').padStart(2, '0')}${generoCorto(d.genero)}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer strip */}
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>VÁLIDO EN TODO EL TERRITORIO LOVE · NO TRANSFERIBLE</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  contentWrap: {
    flex: 1,
    alignItems: 'stretch',
    paddingLeft: 0,
    paddingRight: 36,
    paddingTop: 14,
    paddingBottom: 10,
  },
  loadingCard: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 24,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
  },
  loadingPulse: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: 8,
  },
  loadingText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },

  /* Card */
  cardOuter: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 160, 30, 0.7)',
    backgroundColor: '#f5f0e8',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 500,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  /* Band */
  cardBand: {
    paddingTop: 9,
    paddingBottom: 7,
    paddingHorizontal: 14,
  },
  bandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandCountry: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  bandTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginTop: 1,
  },
  bandAccent: {
    borderWidth: 1.5,
    borderColor: 'rgba(232, 197, 71, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  bandAccentText: {
    color: '#e8c547',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  bandDivider: {
    height: 1.5,
    marginTop: 7,
    backgroundColor: 'rgba(232, 197, 71, 0.6)',
  },

  /* Body */
  cardBody: {
    backgroundColor: '#fdfbf6',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
  },

  /* Main row */
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftCol: {
    alignItems: 'center',
    width: 88,
    marginRight: 14,
  },
  trophyBlock: {
    alignItems: 'center',
    marginTop: 10,
  },
  trophyClip: {
    width: 36,
    height: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyRankText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  nivelText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#6d4c41',
    letterSpacing: 1,
    marginTop: 1,
  },
  photoShell: {
    width: 82,
    height: 100,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3e2723',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e2d8',
  },
  photoScaleBox: {
    width: 140,
    height: 160,
    transform: [{ scale: 0.5 }],
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    marginTop: 4,
    fontSize: 6,
    color: '#795548',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Info */
  infoCol: { flex: 1, minWidth: 0 },
  sectionDividerLight: {
    height: 1,
    backgroundColor: 'rgba(62, 39, 35, 0.07)',
    marginVertical: 3,
  },
  fieldLabel: {
    fontSize: 7,
    color: '#8d6e63',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 1,
    marginTop: 3,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a0f0a',
    lineHeight: 19,
    letterSpacing: 0.3,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldBlock: { flex: 1 },
  idDigits: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a0f0a',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  fieldValue: {
    fontSize: 9,
    color: '#3e2723',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(21, 101, 192, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(21, 101, 192, 0.2)',
  },
  chipIcon: { marginRight: 3 },
  chipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0D47A1',
    letterSpacing: 0.4,
  },
  correo: {
    fontSize: 8,
    color: '#6d4c41',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 26, 16, 0.05)',
    borderRadius: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a0f0a',
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 6,
    fontWeight: '700',
    color: '#8d6e63',
    letterSpacing: 1,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(62, 39, 35, 0.15)',
  },

  /* Divider */
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(62, 39, 35, 0.12)',
    marginVertical: 7,
  },

  /* Barcode row */
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  barcodeLeft: {
    flex: 1,
    maxWidth: 140,
  },
  barcodeLabel: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 2,
    color: 'rgba(62, 39, 35, 0.6)',
    marginBottom: 4,
  },
  barcodeInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
    height: 24,
  },
  barcodeBar: {
    backgroundColor: '#1a1a1a',
    borderRadius: 0,
  },
  barcodeDigits: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(62, 39, 35, 0.7)',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  barcodeRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  mrzLabel: {
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(62, 39, 35, 0.45)',
    marginBottom: 3,
  },
  mrz: {
    fontFamily: 'monospace',
    fontSize: 7,
    color: '#4e342e',
    opacity: 0.65,
    letterSpacing: 0.5,
  },

  /* Footer */
  cardFooter: {
    backgroundColor: 'rgba(74, 26, 16, 0.06)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(62, 39, 35, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(62, 39, 35, 0.45)',
  },
});

export default Perfil;
