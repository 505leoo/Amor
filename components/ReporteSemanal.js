import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, PanResponder, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Timestamp, collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export const RASGOS_SEMANALES = [
  { id: 'carino', label: 'Cariño', icon: 'favorite', color: '#e87891' },
  { id: 'amor', label: 'Amor', icon: 'volunteer-activism', color: '#bd79c9' },
  { id: 'alegria', label: 'Alegría', icon: 'wb-sunny', color: '#d7a83b' },
  { id: 'enojo', label: 'Enojo', icon: 'thunderstorm', color: '#8b7b9b' },
  { id: 'divertido', label: 'Diversión', icon: 'celebration', color: '#69a6a0' },
  { id: 'atento', label: 'Atención', icon: 'visibility', color: '#7193c7' },
  { id: 'companero', label: 'Compañerismo', icon: 'groups', color: '#c4835d' },
  { id: 'confianza', label: 'Confianza', icon: 'handshake', color: '#8ba56f' },
  { id: 'paciencia', label: 'Paciencia', icon: 'spa', color: '#c28aaa' },
];

export const semanaActual = (date = new Date()) => {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  const distanciaALunes = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - distanciaALunes);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
};

const parejaKey = (uid, parejaUid) => [uid, parejaUid].sort().join('_');
export const reporteId = (uid, parejaUid, semana) => `${parejaKey(uid, parejaUid)}_${semana}`;
const valoresIniciales = () => Object.fromEntries(RASGOS_SEMANALES.map(({ id }) => [id, 0]));
const FALTAS_SEMANALES = [
  { id: 'comunicacion', label: 'Comunicación', icon: 'forum', color: '#7193c7', text: 'Hablar y escucharse mejor.' },
  { id: 'confianza_faltante', label: 'Seguridad', icon: 'handshake', color: '#8ba56f', text: 'Sentirse más seguros.' },
  { id: 'fidelidad', label: 'Fidelidad', icon: 'favorite-border', color: '#d48787', text: 'Más calma y compromiso.' },
  { id: 'tiempo', label: 'Tiempo juntos', icon: 'schedule', color: '#c28aaa', text: 'Compartir más momentos.' },
  { id: 'calma', label: 'Calma', icon: 'spa', color: '#c28a63', text: 'Un poco más de calma.' },
  { id: 'sorpresas', label: 'Sorpresas', icon: 'card-giftcard', color: '#d8a845', text: 'Un gesto especial.' },
];
const porcentaje = valor => Math.round((Number(valor || 0) / 5) * 100);

const fechaSemana = key => {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
};

function BarrasReporte({ valores, compacto = false }) {
  return (
    <View style={compacto ? styles.barrasCompactas : styles.barras}>
      {RASGOS_SEMANALES.map(rasgo => {
        const value = porcentaje(valores?.[rasgo.id]);
        return (
          <View key={rasgo.id} style={styles.barraRow}>
            <MaterialIcons name={rasgo.icon} size={compacto ? 13 : 15} color={rasgo.color} />
            <Text style={[styles.barraLabel, compacto && styles.barraLabelCompacta]}>{rasgo.label}</Text>
            <View style={styles.barraTrack}><View style={[styles.barraFill, { width: `${value}%`, backgroundColor: rasgo.color }]} /></View>
            <Text style={[styles.barraValue, compacto && styles.barraValueCompacta]}>{value}%</Text>
          </View>
        );
      })}
    </View>
  );
}

function Estrellas() {
  return (
    <View pointerEvents="none" style={styles.estrellas}>
      {[
        { top: 42, left: '11%', size: 13, color: '#e9bd72' },
        { top: 95, right: '13%', size: 10, color: '#e7a4b5' },
        { bottom: 70, left: '9%', size: 9, color: '#9ac3c0' },
        { bottom: 42, right: '10%', size: 14, color: '#c9a1e7' },
        { top: '45%', left: '4%', size: 7, color: '#e9bd72' },
      ].map((star, index) => <MaterialIcons key={index} name="star" size={star.size} color={star.color} style={star} />)}
      <View style={[styles.decorShape, styles.decorShapeOne]} />
      <View style={[styles.decorShape, styles.decorShapeTwo]} />
      <View style={[styles.decorShape, styles.decorShapeThree]} />
      <MaterialIcons name="star" size={18} color="#e2b254" style={styles.decorSparkOne} />
      <MaterialIcons name="star" size={13} color="#d98a79" style={styles.decorSparkTwo} />
    </View>
  );
}

function ProgresoPasos({ actual }) {
  return (
    <View style={styles.progreso}>
      {[0, 1, 2].map(paso => <View key={paso} style={[styles.progresoPunto, paso <= actual && styles.progresoPuntoActivo]} />)}
    </View>
  );
}

function CerrarReporte({ onPress }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.42, duration: 850, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return <Animated.View pointerEvents="box-none" style={[styles.reportCloseLayer, { opacity }]}><TouchableOpacity style={styles.reportClose} onPress={onPress} hitSlop={10} accessibilityLabel="Cerrar reporte"><Text style={styles.reportCloseText}>×</Text></TouchableOpacity></Animated.View>;
}

export function ReporteSemanal({ onTerminado }) {
  const user = auth.currentUser;
  const semana = useMemo(() => semanaActual(), []);
  const [parejaUid, setParejaUid] = useState(null);
  const [nombrePareja, setNombrePareja] = useState('tu pareja');
  const [reporte, setReporte] = useState(null);
  const [valores, setValores] = useState(valoresIniciales);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [paso, setPaso] = useState(0);
  const [faltaIndex, setFaltaIndex] = useState(0);
  const [faltas, setFaltas] = useState({});
  const faltaTouchStart = useRef(null);
  const guardarPulse = useRef(new Animated.Value(1)).current;
  const rasgosCompletos = RASGOS_SEMANALES.slice(0, 6).every(item => Number(valores[item.id]) >= 1);
  const faltasCompletas = FALTAS_SEMANALES.every(item => Number(faltas[item.id]) >= 1);

  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, []);

  const faltaResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => paso === 2,
    onPanResponderGrant: event => { faltaTouchStart.current = event.nativeEvent.pageX; },
    onPanResponderRelease: event => {
      const distancia = event.nativeEvent.pageX - faltaTouchStart.current;
      if (Math.abs(distancia) < 18) return;
      setFaltaIndex(actual => Math.max(0, Math.min(FALTAS_SEMANALES.length - 1, actual + (distancia < 0 ? 1 : -1))));
    },
  }).panHandlers;

  useEffect(() => {
    if (paso !== 2 || !faltasCompletas) {
      guardarPulse.stopAnimation();
      guardarPulse.setValue(1);
      return undefined;
    }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(guardarPulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      Animated.timing(guardarPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [paso, faltasCompletas, guardarPulse]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return onSnapshot(doc(db, 'usuarios', user.uid), snap => {
      const data = snap.data() || {};
      setParejaUid(data.pareja || null);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!parejaUid) return undefined;
    return onSnapshot(doc(db, 'usuarios', parejaUid), snap => {
      const data = snap.data() || {};
      setNombrePareja(data.datosCompletos?.nombre || data.nombre || data.displayName || 'tu pareja');
    });
  }, [parejaUid]);

  useEffect(() => {
    if (!user?.uid || !parejaUid) return undefined;
    return onSnapshot(doc(db, 'reportes_semanales', reporteId(user.uid, parejaUid, semana)), snap => {
      setReporte(snap.exists() ? snap.data() : null);
    });
  }, [user?.uid, parejaUid, semana]);

  const propio = reporte?.reportes?.[user?.uid];
  const parejaRespondio = parejaUid && reporte?.reportes?.[parejaUid];
  const revelado = Boolean(reporte?.revelado && propio && parejaRespondio);

  const enviar = async () => {
    if (!user?.uid || !parejaUid || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const ref = doc(db, 'reportes_semanales', reporteId(user.uid, parejaUid, semana));
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(ref);
        const actual = snap.exists() ? snap.data() : {};
        const reportes = { ...(actual.reportes || {}) };
        reportes[user.uid] = {
          sobre: parejaUid,
          rasgos: valores,
          enviadoEn: Timestamp.now(),
        };
        transaction.set(ref, {
          semana,
          participantes: [user.uid, parejaUid].sort(),
          reportes,
          revelado: Boolean(reportes[user.uid] && reportes[parejaUid]),
          actualizadoEn: serverTimestamp(),
          faltas: { ...(actual.faltas || {}), [user.uid]: faltas },
          creadoEn: actual.creadoEn || serverTimestamp(),
        }, { merge: true });
      });
    } catch (e) {
      setError('No pudimos guardar tu reporte. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };


  if (!parejaUid) {
    return <View style={styles.state}><CerrarReporte onPress={onTerminado} /><MaterialIcons name="favorite-border" size={36} color="#e8b7c4" /><Text style={styles.stateTitle}>Este reporte es para dos</Text><Text style={styles.stateText}>Cuando tengas una pareja conectada, podrán mirarse con nuevos ojos cada semana.</Text></View>;
  }

  if (false && revelado) {
    const suyoSobreTi = reporte.reportes[parejaUid];
    return (
      <View style={styles.reveal}><CerrarReporte onPress={onTerminado} />
        <Estrellas />
        <Text style={styles.eyebrow}>REPORTE DE LA SEMANA</Text>
        <Text style={styles.title}>Ya pueden mirarlo</Text>
        <Text style={styles.subtitle}>Ambos respondieron sin ver al otro. Así percibió {nombrePareja} esta semana.</Text>
        <BarrasReporte valores={suyoSobreTi.rasgos} />
        <Text style={styles.revealNote}>Tu percepción sobre {nombrePareja} también quedó guardada en su perfil.</Text>
        <TouchableOpacity style={styles.doneButton} onPress={onTerminado} activeOpacity={0.8}><Text style={styles.doneButtonText}>Guardar este momento</Text></TouchableOpacity>
      </View>
    );
  }

  if (propio) {
    return (
      <View style={styles.state}><CerrarReporte onPress={onTerminado} />
        <MaterialIcons name="lock-clock" size={40} color="#e6c06c" />
        <Text style={styles.stateTitle}>Enviado</Text>
        <Text style={styles.stateText}>{parejaRespondio ? 'Los dos enviaron el reporte. Podrán verlo desde el perfil de cada usuario.' : `Tu reporte quedó guardado. Falta que ${nombrePareja} complete el suyo.`}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  const rasgosDelPaso = paso === 1 ? RASGOS_SEMANALES.slice(0, 6) : RASGOS_SEMANALES.slice(6);

  if (paso === 0) {
    return (
      <View style={styles.introScreen}><CerrarReporte onPress={onTerminado} />
        <Estrellas />
        <View style={styles.introHero}>
          <View style={styles.introHeading}>
            <MaterialIcons name="flare" size={20} color="#e3b449" />
            <Text style={styles.introTitle}>REPORTE</Text>
            <Text style={styles.introTitleAccent}>SEMANAL</Text>
            <MaterialIcons name="flare" size={20} color="#e3b449" />
          </View>
          <View style={styles.introRule} />
          <Text style={styles.introSubtitle}>Cada semana, describís cómo viviste a tu pareja. Después, cada uno podrá ver en su propio perfil lo que su pareja respondió sobre él.</Text>
        </View>
        <View style={styles.infoGrid}>
          {[
            { icon: 'edit-note', title: 'COMPLETÁ TU REPORTE', text: 'Respondé pensando en tu pareja: este reporte habla de cómo la percibiste vos.', color: '#d48762' },
            { icon: 'lock', title: 'ESPEREN A QUE AMBOS TERMINEN', text: 'Los reportes quedan ocultos hasta que los dos los envíen.', color: '#c59643' },
            { icon: 'mark-email-read', title: 'REPORTES REVELADOS', text: 'Cuando ambos terminen, podrán ver el reporte que hizo su pareja.', color: '#d4876b' },
            { icon: 'insert-chart', title: 'SE CONSTRUYE SU HISTORIA', text: 'Semana a semana se crea el retrato de su relación y cómo evolucionan juntos.', color: '#8d74bd' },
          ].map((item, index) => (
            <React.Fragment key={item.title}>
              <View style={styles.infoBlock}>
                <View style={styles.infoVisualRow}>
                  <View style={styles.infoIconWrap}>
                    <MaterialIcons name={item.icon} size={42} color={item.color} />
                    <View style={styles.infoNumber}><Text style={styles.infoNumberText}>{index + 1}</Text></View>
                  </View>
                </View>
                <Text style={styles.infoBlockTitle}>{item.title}</Text>
                <Text style={styles.infoBlockText}>{item.text}</Text>
              </View>
              {index < 3 && <MaterialIcons name="arrow-forward" size={19} color="#e0ad45" style={styles.workflowArrow} />}
            </React.Fragment>
          ))}
        </View>
        <TouchableOpacity style={styles.introStartButton} onPress={() => setPaso(1)} activeOpacity={0.8} accessibilityLabel="Comenzar reporte">
          <MaterialIcons name="arrow-forward" size={18} color="#76502d" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.stepScreen}><CerrarReporte onPress={onTerminado} />
      <Animated.View style={[styles.globalPulse, { opacity: (paso === 1 && !rasgosCompletos) || (paso === 2 && !faltasCompletas) ? 0.38 : guardarPulse }]}>
      <TouchableOpacity style={[styles.introStartButton, styles.globalNavButton, enviando && styles.submitDisabled]} disabled={enviando || (paso === 1 && !rasgosCompletos) || (paso === 2 && !faltasCompletas)} onPress={() => {
        if (paso === 1 && !rasgosCompletos) return;
        if (paso < 2) return setPaso(actual => actual + 1);
        if (faltaIndex < FALTAS_SEMANALES.length - 1) return setFaltaIndex(actual => actual + 1);
        return enviar();
      }} activeOpacity={0.65} accessibilityLabel="Continuar">
        {enviando ? <ActivityIndicator color="#76502d" /> : <Text style={styles.backButtonText}>›</Text>}
      </TouchableOpacity>
      </Animated.View>
      <TouchableOpacity style={[styles.introStartButton, styles.globalNavButton, styles.globalBackButton]} onPress={() => {
        if (paso === 2 && faltaIndex > 0) return setFaltaIndex(actual => actual - 1);
        return setPaso(actual => Math.max(0, actual - 1));
      }} activeOpacity={0.65} accessibilityLabel="Retroceder">
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>
      <Estrellas />
      <View style={styles.stepHeaderBlock}>
        <ProgresoPasos actual={paso} />
        <Text style={styles.eyebrow}>PASO {paso + 1} DE 3</Text>
        <Text style={styles.title}>{paso === 1 ? `El corazón de ${nombrePareja}` : 'Lo que pudo faltar'}</Text>
        <Text style={styles.subtitle}>{paso === 1 ? 'Piensa en cómo se sintieron estos días.' : 'Elegí qué faltó un poquito.'}</Text>
      </View>
      <View style={styles.stepContentBlock}>
        <View style={styles.stepIntroNote}>
          <MaterialIcons name="star" size={16} color="#d8a845" />
          <Text style={styles.stepIntroText}>
            Elegí cuánto sentiste cada rasgo esta semana. No hay respuestas correctas: lo importante es que sea sincero y hable de cómo vivieron estos días juntos.
          </Text>
          <MaterialIcons name="star" size={16} color="#d8a845" />
        </View>
        {paso === 2 ? (() => {
          const falta = FALTAS_SEMANALES[faltaIndex];
          const nivel = faltas[falta.id] || 0;
          return <View style={styles.faltaPager} {...faltaResponder}>
              <View style={styles.faltaCard}>
                <Text style={styles.faltaQuestion}>A mi pareja le faltó más...</Text>
                <Text style={[styles.faltaLabel, { color: falta.color }]}>{falta.label}</Text>
                <Text style={styles.faltaText}>{falta.text}</Text>
                <View style={styles.faltaStars}>{[1, 2, 3, 4, 5].map(value => <TouchableOpacity key={value} onPress={() => setFaltas(actual => ({ ...actual, [falta.id]: value }))} activeOpacity={0.7}><MaterialIcons name={nivel >= value ? 'star' : 'star-border'} size={28} color={nivel >= value ? falta.color : 'rgba(126,90,48,0.25)'} /></TouchableOpacity>)}</View>
                <View style={styles.faltaPages}>{FALTAS_SEMANALES.map((item, index) => <View key={item.id} style={[styles.faltaPage, index === faltaIndex && { backgroundColor: falta.color }]} />)}</View>
              </View>
          </View>;
        })() : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.traitsScroll}>
        <View style={styles.traits}>
          {rasgosDelPaso.map(rasgo => (
            <View key={rasgo.id} style={styles.traitRow}>
              <View style={styles.traitName}><MaterialIcons name={rasgo.icon} size={18} color={rasgo.color} /><Text style={styles.traitLabel}>{rasgo.label}</Text></View>
              <View style={styles.rating}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map(nivel => {
                    const activa = valores[rasgo.id] >= nivel;
                    return <TouchableOpacity key={nivel} onPress={() => setValores(actual => ({ ...actual, [rasgo.id]: nivel }))} activeOpacity={0.7}><MaterialIcons name={activa ? 'star' : 'star-border'} size={14} color={activa ? rasgo.color : 'rgba(126,90,48,0.34)'} /></TouchableOpacity>;
                  })}
                </View>
              </View>
            </View>
          ))}
        </View>
        </ScrollView>}
      </View>
      <View style={styles.stepFooterBlock}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {false && <View style={styles.stepActions}>
          <TouchableOpacity style={[styles.introStartButton, styles.stepNavButton]} onPress={() => setPaso(actual => Math.max(0, actual - 1))} activeOpacity={0.8} accessibilityLabel="Retroceder">
            <Text style={styles.backButtonText}>&lt;</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.introStartButton, styles.stepNavButton, enviando && styles.submitDisabled]} disabled={enviando} onPress={paso === 1 ? () => setPaso(2) : enviar} activeOpacity={0.8}>
            {enviando ? <ActivityIndicator color="#76502d" /> : <Text style={styles.backButtonText}>›</Text>}
          </TouchableOpacity>
        </View>}
      </View>
    </View>
  );
}

function PieChart({ title, values = {}, items = [] }) {
  const visibles = items.filter(item => Number(values[item.id] || 0) > 0).sort((a, b) => Number(values[b.id] || 0) - Number(values[a.id] || 0)).slice(0, 5);
  const radius = 31;
  const circumference = 2 * Math.PI * radius;
  const total = visibles.reduce((sum, item) => sum + Math.max(0, Number(values[item.id] || 0)), 0) || 1;
  let acumulado = 0;
  return <View style={styles.pieWrap}>
    <Text style={styles.pieTitle}>{title}</Text>
    <View style={styles.pieBody}>
      <Svg width="92" height="92" viewBox="0 0 92 92">
        <Circle cx="46" cy="46" r={radius} stroke="rgba(126,90,48,0.12)" strokeWidth="12" fill="none" />
        {visibles.map(item => {
        const valor = Math.max(0, Number(values[item.id] || 0));
        const largo = circumference * (valor / total);
        const offset = -acumulado;
        acumulado += largo;
        return <Circle key={item.id} cx="46" cy="46" r={radius} stroke={item.color} strokeWidth="12" fill="none" strokeDasharray={`${largo} ${circumference - largo}`} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 46 46)" />;
        })}
      </Svg>
      <View style={styles.pieCallouts}>{visibles.map(item => {
      const porcentajeItem = Math.round(Math.max(0, Math.min(5, Number(values[item.id] || 0))) * 10);
      return <View key={item.id} style={styles.pieCallout}><Text style={[styles.pieArrow, { color: item.color }]}>›</Text><View style={[styles.pieLegendDot, { backgroundColor: item.color }]} /><Text style={styles.pieLegendText} numberOfLines={1}>{item.label}</Text><Text style={styles.pieLegendValue}>{porcentajeItem}%</Text></View>;
      })}</View>
    </View>
  </View>;
}

export function HistorialReporteSemanal({ visible, onClose, targetUid, targetName }) {
  const [reportes, setReportes] = useState([]);
  const [pagina, setPagina] = useState(0);
  useEffect(() => { if (!visible) setPagina(0); }, [visible]);
  useEffect(() => {
    if (!visible || !targetUid) return undefined;
    const consulta = query(collection(db, 'reportes_semanales'), where('participantes', 'array-contains', targetUid));
    return onSnapshot(consulta, snap => {
      const filtrados = snap.docs.map(item => ({ id: item.id, ...item.data() }))
        .filter(item => item.revelado && Object.values(item.reportes || {}).some(reporte => reporte?.sobre === targetUid))
        .sort((a, b) => String(b.semana).localeCompare(String(a.semana)));
      setReportes(filtrados);
    });
  }, [visible, targetUid]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.historyBackdrop}>
        <View style={styles.historyCard}>
          <TouchableOpacity style={styles.historyClose} onPress={onClose}><MaterialIcons name="close" size={20} color="#805668" /></TouchableOpacity>
          <View style={styles.historyHeader}>
            <TouchableOpacity style={[styles.historyHeaderArrow, pagina === 0 && styles.historyPageArrowDisabled]} onPress={() => setPagina(0)} disabled={pagina === 0}><MaterialIcons name="chevron-left" size={20} color="#9d6178" /></TouchableOpacity>
            <Text style={styles.historyTitle}>Así te percibieron</Text>
            <TouchableOpacity style={[styles.historyHeaderArrow, pagina === 1 && styles.historyPageArrowDisabled]} onPress={() => setPagina(1)} disabled={pagina === 1}><MaterialIcons name="chevron-right" size={20} color="#9d6178" /></TouchableOpacity>
          </View>
          <Text style={styles.historySubtitle}>Acá ves lo que tu pareja respondió sobre vos, semana a semana. Tus respuestas sobre ella aparecen en su perfil.</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.historyList}>
            {reportes.length === 0 ? <Text style={styles.historyEmpty}>Todavía no hay reportes revelados.</Text> : reportes.map(item => {
              const reporte = Object.values(item.reportes || {}).find(value => value?.sobre === targetUid);
              const faltas = item.faltas?.[targetUid] || {};
              return <View key={item.id} style={styles.historyItem}>
                <Text style={styles.historyWeek}>Semana del {fechaSemana(item.semana)}</Text>
                <View style={styles.historyPage}>
                  <PieChart title={pagina === 0 ? 'Paso 2 · Cómo se sintió' : 'Paso 3 · Lo que pudo faltar'} values={pagina === 0 ? reporte?.rasgos : faltas} items={pagina === 0 ? RASGOS_SEMANALES : FALTAS_SEMANALES} />
                </View>
              </View>;
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, paddingHorizontal: 28, paddingTop: 54, paddingBottom: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5e7' },
  stepScreen: { flex: 1, paddingHorizontal: 8, paddingTop: 0, paddingBottom: 10, backgroundColor: '#fff5e7' },
  introScreen: { flex: 1, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 18, alignItems: 'center', backgroundColor: '#fff5e7' },
  reveal: { flex: 1, paddingHorizontal: 28, paddingTop: 54, paddingBottom: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5e7' },
  estrellas: { ...StyleSheet.absoluteFillObject },
  decorShape: { position: 'absolute', opacity: 0.9, borderWidth: 1.5 },
  decorShapeOne: { width: 76, height: 28, top: 30, left: -25, borderRadius: 50, borderColor: 'rgba(225,177,78,0.55)', transform: [{ rotate: '-25deg' }] },
  decorShapeTwo: { width: 58, height: 58, top: '35%', right: -27, borderRadius: 29, borderColor: 'rgba(222,137,117,0.42)' },
  decorShapeThree: { width: 42, height: 42, bottom: 77, left: -18, borderRadius: 21, borderColor: 'rgba(137,116,189,0.34)' },
  decorSparkOne: { position: 'absolute', top: '29%', left: '7%', opacity: 0.9 },
  decorSparkTwo: { position: 'absolute', bottom: '19%', right: '8%', opacity: 0.9 },
  stepHeaderBlock: { flex: 0, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 13, transform: [{ translateY: 8 }] },
  stepContentBlock: { flex: 0, justifyContent: 'flex-start', paddingTop: 4, alignItems: 'center', width: '100%', transform: [{ translateY: -4 }] },
  stepIntroNote: { width: '100%', maxWidth: 360, minHeight: 44, marginBottom: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(214,168,73,0.28)' },
  stepIntroText: { flex: 1, color: '#765a48', fontSize: 10.5, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  stepFooterBlock: { flex: 0, justifyContent: 'flex-start', alignItems: 'center', width: '100%', transform: [{ translateY: -8 }] },
  progreso: { flexDirection: 'row', gap: 6, marginBottom: 13 },
  progresoPunto: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'rgba(126,90,48,0.18)' },
  progresoPuntoActivo: { backgroundColor: '#c68b35' },
  ritualIcon: { width: 58, height: 58, marginBottom: 11, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,189,114,0.12)', borderWidth: 1, borderColor: 'rgba(233,189,114,0.42)' },
  introHero: { width: '100%', alignItems: 'center' },
  introHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  introTitle: { color: '#69452d', fontSize: 23, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' },
  introTitleAccent: { color: '#df816e', fontSize: 23, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' },
  introRule: { width: '58%', height: 1.5, marginTop: 5, backgroundColor: '#d7a64b' },
  introSubtitle: { maxWidth: 330, marginTop: 9, color: '#634733', fontSize: 11, lineHeight: 16, fontWeight: '600', textAlign: 'center' },
  infoGrid: { flex: 1, width: '88%', marginTop: 23, alignSelf: 'center', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-start', justifyContent: 'center', gap: 3 },
  infoBlock: { flex: 1, minWidth: 0, paddingHorizontal: 2, paddingVertical: 7, alignItems: 'center', justifyContent: 'flex-start' },
  infoVisualRow: { height: 58, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  infoIconWrap: { width: 48, height: 52, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  infoNumber: { position: 'absolute', left: -8, bottom: -1, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#f0c65b', borderWidth: 1, borderColor: '#c99128', zIndex: 1 },
  infoNumberText: { color: '#76501c', fontSize: 10, fontWeight: '900' },
  infoIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  workflowArrow: { marginTop: 29 },
  infoBlockTitle: { width: '100%', color: '#704a2f', fontSize: 7.4, lineHeight: 10, fontWeight: '900', textAlign: 'center' },
  infoBlockText: { marginTop: 6, color: '#765a48', fontSize: 8.5, lineHeight: 12, textAlign: 'center' },
  introStartButton: { position: 'absolute', top: 50, right: 13, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(255,239,201,0.94)', borderWidth: 1, borderColor: 'rgba(150,101,46,0.35)' },
  globalBackButton: { position: 'absolute', top: 87, right: 13 },
  globalPulse: { position: 'absolute', top: 50, right: 13, width: 34, height: 34, zIndex: 50, elevation: 50 },
  globalNavButton: { position: 'relative', top: 0, right: 0, minWidth: 34, minHeight: 34, borderWidth: 1.5, borderColor: '#d19a45', shadowColor: '#9b6b2e', shadowOpacity: 0.22, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, zIndex: 50, elevation: 50 },
  eyebrow: { color: '#bd8140', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { marginTop: 6, color: '#69452d', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { maxWidth: 330, marginTop: 7, color: '#876853', fontSize: 12, lineHeight: 17, textAlign: 'center', transform: [{ translateY: -9 }] },
  explanationTitle: { color: '#754c2c', fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 9 },
  explanationText: { maxWidth: 330, marginTop: 7, color: '#795f4e', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  secreto: { maxWidth: 300, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 7, backgroundColor: 'rgba(214,174,93,0.13)', borderWidth: 1, borderColor: 'rgba(188,138,50,0.28)' },
  secretoText: { flex: 1, color: '#80623f', fontSize: 10, lineHeight: 14 },
  traitsScroll: { paddingHorizontal: 8 },
  traits: { width: 'auto', marginTop: 12, flexDirection: 'row', flexWrap: 'nowrap', gap: 12 },
  traitRow: { flex: 0, width: 78, minHeight: 84, paddingHorizontal: 4, paddingVertical: 9, alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(182,137,72,0.2)', borderRadius: 8 },
  traitName: { minHeight: 32, alignItems: 'center', justifyContent: 'center', gap: 3 },
  traitLabel: { color: '#684a3b', fontSize: 8.5, fontWeight: '700', textAlign: 'center' },
  rating: { width: '100%', alignItems: 'center' },
  ratingStars: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  faltaPager: { width: '100%', minHeight: 150 },
  faltaCard: { width: '100%', minHeight: 120, paddingHorizontal: 8, paddingVertical: 0, alignItems: 'center', justifyContent: 'flex-start', transform: [{ translateY: -15 }] },
  faltaIcon: { width: 54, height: 54, marginBottom: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 27 },
  faltaQuestion: { color: '#76533e', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  faltaLabel: { marginTop: 1, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  faltaText: { maxWidth: 245, marginTop: 2, color: '#876853', fontSize: 9, lineHeight: 11, textAlign: 'center' },
  faltaStars: { flexDirection: 'row', gap: 4, marginTop: 7 },
  faltaPages: { flexDirection: 'row', gap: 5, marginTop: 5, marginBottom: 1 },
  faltaPage: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(126,90,48,0.18)' },
  point: { width: 14, height: 14 },
  submit: { width: '100%', maxWidth: 310, marginTop: 13, minHeight: 42, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', borderRadius: 7, backgroundColor: '#c58183', borderBottomWidth: 2, borderBottomColor: '#9d5b61' },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  error: { color: '#ffb4b4', marginTop: 10, fontSize: 11 },
  ratingHint: { color: '#9b7652', fontSize: 10, fontWeight: '700' },
  stepActions: { position: 'absolute', top: 54, right: 13, width: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 15, elevation: 15 },
  stepNavButton: { position: 'relative', top: 0, right: 0, width: 30, height: 30, marginTop: 0, borderRadius: 15 },
  backButtonText: { color: '#76502d', fontSize: 24, lineHeight: 25, fontWeight: '700' },
  state: { flex: 1, paddingHorizontal: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff5e7' },
  reportCloseLayer: { position: 'absolute', top: 14, right: 14, width: 34, height: 34, zIndex: 20 },
  reportClose: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center' },
  reportCloseText: { color: '#69452d', fontSize: 30, lineHeight: 29, fontWeight: '300' },
  stateTitle: { marginTop: 14, color: '#69452d', fontSize: 21, fontWeight: '800', textAlign: 'center' },
  stateText: { marginTop: 8, color: '#876853', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  barras: { width: '100%', maxWidth: 350, marginTop: 22, padding: 16, gap: 10, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(182,137,72,0.2)', borderRadius: 8 },
  barrasCompactas: { gap: 6 },
  barraRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barraLabel: { width: 85, color: '#684a3b', fontSize: 11, fontWeight: '700' },
  barraLabelCompacta: { width: 72, color: '#684756', fontSize: 9 },
  barraTrack: { flex: 1, height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.17)' },
  barraFill: { height: '100%', borderRadius: 4 },
  barraValue: { width: 32, color: '#684a3b', fontSize: 10, fontWeight: '800', textAlign: 'right' },
  barraValueCompacta: { color: '#805668', fontSize: 8 },
  revealNote: { marginTop: 18, color: '#876853', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  doneButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  doneButtonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  historyBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22, backgroundColor: 'rgba(9,5,10,0.7)' },
  historyCard: { width: '100%', maxWidth: 400, maxHeight: '90%', padding: 14, borderRadius: 8, backgroundColor: '#fff8f4' },
  historyClose: { position: 'absolute', top: 10, right: 10, padding: 6, zIndex: 1 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 },
  historyTitle: { color: '#603d4d', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  historySubtitle: { marginTop: 5, paddingHorizontal: 20, color: '#8a6271', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  historyList: { paddingTop: 4, gap: 5 },
  historyItem: { padding: 5, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(201,116,143,0.22)', backgroundColor: '#fffdfb' },
  historyWeek: { marginBottom: 2, color: '#ba6d85', fontSize: 10, fontWeight: '800' },
  historyPage: { minHeight: 155, alignItems: 'center', justifyContent: 'center' },
  historyHeaderArrow: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#f5e4e8', borderWidth: 1, borderColor: '#e6c3cd' },
  historyPageArrow: { width: 34, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#f2dce3' },
  historyPageArrowDisabled: { opacity: 0.35 },
  historyPageArrowText: { color: '#a45f76', fontSize: 25, lineHeight: 28, fontWeight: '800' },
  historyPageDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 3, marginBottom: 4 },
  historyPageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e0cbd1' },
  historyPageDotActive: { width: 15, backgroundColor: '#a45f76' },
  pieWrap: { width: 280, alignItems: 'center', justifyContent: 'center' },
  pieTitle: { minHeight: 20, color: '#76505d', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  pieBody: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  pieCallouts: { width: 130, gap: 3 },
  pieCallout: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pieArrow: { fontSize: 18, lineHeight: 16, fontWeight: '900' },
  pieLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pieLegendDot: { width: 6, height: 6, borderRadius: 3 },
  pieLegendText: { flex: 1, color: '#76505d', fontSize: 7.5 },
  pieLegendValue: { width: 28, color: '#9a7180', fontSize: 8, fontWeight: '800', textAlign: 'right' },
  historyEmpty: { paddingVertical: 36, color: '#9b7782', fontSize: 11, textAlign: 'center' },
});
