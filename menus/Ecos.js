import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import TabButtons from '../components/TabButtons';
import { auth, db } from '../firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';


const TOTAL_WEEKS = 3; // Cambiar si el número total de semanas varía

const Ecos = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('Preguntas');

  const currentUid = auth.currentUser?.uid;
  const currentName = auth.currentUser?.displayName || 'Tú';

  const [friendId, setFriendId] = useState(null);
  const [friendName, setFriendName] = useState('Tu amor');
  const [currentQuestion, setCurrentQuestion] = useState({
    pregunta: 'Cargando pregunta...', // Valor predeterminado para evitar que quede vacío
  });
  const [myAnswer, setMyAnswer] = useState('');
  const [friendAnswer, setFriendAnswer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState('');
  const [weekDisplayIndex, setWeekDisplayIndex] = useState(1);

  const gradientToUse = ['#071029', '#0b1b2b'];

  useEffect(() => {
    if (!currentUid || !db) return;
    const meDoc = doc(db, 'usuarios', currentUid);
    const unsub = onSnapshot(meDoc, snap => {
      const data = snap.data() || {};
      const amigos = data.amigos || [];
      if (amigos.length > 0) setFriendId(amigos[0]);
    });
    return () => unsub();
  }, [currentUid]);

  useEffect(() => {
    if (!friendId || !db) return;
    const friendDoc = doc(db, 'usuarios', friendId);
    const unsub = onSnapshot(friendDoc, snap => {
      const data = snap.data() || {};
      setFriendName(data.nombre || 'Tu amor');
    });
    return () => unsub();
  }, [friendId]);

  const getWeekInfo = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    // Mapear día a nombre legible usado por los documentos (si aplica)
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayIndex = dayOfWeek; // 0..6
    const dayName = dayNames[dayIndex];
    return { weekNum, dayIndex, dayName };
  };

  useEffect(() => {
    if (!currentUid || !friendId || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { weekNum, dayIndex, dayName } = getWeekInfo();

    // Obtener todas las preguntas de la semana y seleccionar la del día actual si existe
    const q = query(collection(db, 'avaEcos'), where('semana', '==', weekNum));
    const unsub = onSnapshot(q, async snap => {
      let qData = null;
      if (snap.empty) {
        qData = {
          id: `default-${weekNum}-${dayName}`,
          pregunta: '¿Qué es lo que ahora hago diferente gracias a vos?',
          semana: weekNum,
          tipo: dayName,
          respuestas: {},
          isDefault: true,
        };
      } else {
        // Intentar encontrar documento que coincida con el nombre del día
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const match = docs.find(d => d.tipo === dayName) || docs[0];
        qData = match ? match : { id: `default-${weekNum}-${dayName}`, pregunta: '¿Qué es lo que ahora hago diferente gracias a vos?', semana: weekNum, tipo: dayName, respuestas: {}, isDefault: true };
      }
      const miRespuesta = qData.respuestas?.[currentUid];
      const suRespuesta = qData.respuestas?.[friendId];
      setCurrentQuestion(qData);
      setMyAnswer(miRespuesta?.texto || '');
      setQuestionSubmitted(!!miRespuesta);
      setFriendAnswer(suRespuesta?.texto || null);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUid, friendId]);

  // Calcular progreso del ciclo de semanas: contar semanas completadas en el ciclo actual
  useEffect(() => {
    if (!currentUid || !friendId || !db) return;
    const { weekNum } = getWeekInfo();
    const cycleStart = weekNum - ((weekNum - 1) % TOTAL_WEEKS);
    const cycleEndExclusive = cycleStart + TOTAL_WEEKS;
    const qCycle = query(collection(db, 'avaEcos'), where('semana', '>=', cycleStart), where('semana', '<', cycleEndExclusive));
    const unsub = onSnapshot(qCycle, snap => {
      const weeksMap = {};
      snap.docs.forEach(d => {
        const data = d.data() || {};
        const sem = data.semana;
        const respuestas = data.respuestas || {};
        const done = !!(respuestas[currentUid] || respuestas[friendId]);
        weeksMap[sem] = weeksMap[sem] || done;
      });
      let completed = 0;
      for (let i = 0; i < TOTAL_WEEKS; i++) {
        const sem = cycleStart + i;
        if (weeksMap[sem]) completed++;
      }
      const display = Math.min(completed + 1, TOTAL_WEEKS);
      setWeekDisplayIndex(display);
    });
    return () => unsub();
  }, [currentUid, friendId]);

  // Cuenta regresiva hasta la próxima pregunta a las 7:00 AM (hora local)
  useEffect(() => {
    const getNext7AM = () => {
      const now = new Date();
      const today7 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0, 0);
      if (now < today7) return today7;
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 7, 0, 0, 0);
    };

    const updateCountdown = () => {
      const next = getNext7AM();
      const now = new Date();
      let diff = Math.max(0, next - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * (1000 * 60 * 60 * 24);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * (1000 * 60 * 60);
      const minutes = Math.floor(diff / (1000 * 60));
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      setNextQuestionCountdown(parts.join(' '));
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 60 * 1000); // actualizar cada minuto
    return () => clearInterval(id);
  }, []);

  const handleSubmitAnswer = async () => {
    if (!myAnswer.trim() || !currentQuestion) return;
    setIsSending(true);
    try {
      if (currentQuestion.isDefault) {
        const { weekNum, dayName } = getWeekInfo();
        const docRef = await addDoc(collection(db, 'avaEcos'), {
          semana: weekNum,
          tipo: dayName,
          pregunta: currentQuestion.pregunta,
          respuestas: { [currentUid]: { texto: myAnswer.trim(), respondedAt: serverTimestamp() } },
          createdAt: serverTimestamp(),
        });
        setCurrentQuestion(prev => ({ ...prev, id: docRef.id, isDefault: false }));
      } else {
        const qRef = doc(db, 'avaEcos', currentQuestion.id);
        await updateDoc(qRef, {
          [`respuestas.${currentUid}`]: { texto: myAnswer.trim(), respondedAt: serverTimestamp() },
        });
      }
      setQuestionSubmitted(true);
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSwipe = (direction) => {
    if (direction === 'left' && currentPage < 2) {
      setCurrentPage(currentPage + 1);
    } else if (direction === 'right' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const renderCurrentPage = () => {
    if (currentPage === 0) {
      return (
        <View style={styles.page1Content}>
          <Text style={styles.weekCounter}>{`${weekDisplayIndex}/${TOTAL_WEEKS}`}</Text>
          <Text style={styles.page1Label}>esta semana</Text>
          <View style={styles.horizontalSection}>
            <View style={styles.questionBox}>
              <Text style={styles.page1QuestionText}>{currentQuestion.pregunta}</Text>
              {nextQuestionCountdown ? <Text style={styles.nextQuestionText}>{`Siguiente pregunta en ${nextQuestionCountdown}`}</Text> : null}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Sobre esto</Text>
              <Text style={styles.infoText}>
                Cada semana compartimos una pregunta especial diseñada para acercarnos.
                Responde con sinceridad; tu respuesta se guarda y aparecerá cuando tu pareja responda.
              </Text>
            </View>
          </View>
          <Text style={styles.page1Hint}>desliza → para responder</Text>
        </View>
      );
    }
    
    if (currentPage === 1) {
      return (
        <View style={styles.pageContent}>
          <Text style={styles.label}>{currentName.split(' ')[0]}</Text>
          {!questionSubmitted ? (
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Escribe tu respuesta..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={myAnswer}
                  onChangeText={setMyAnswer}
                  multiline
                  maxLength={300}
                  editable={!isSending}
                />
                {myAnswer.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setMyAnswer('')}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete-outline" size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.footer}>
                <Text style={styles.counter}>{myAnswer.length}/300</Text>
                <TouchableOpacity
                  style={[styles.sendBtn, !myAnswer.trim() && styles.sendBtnDisabled]}
                  onPress={handleSubmitAnswer}
                  disabled={isSending || !myAnswer.trim()}
                >
                  {isSending ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.sendText}>Enviar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.responseBox}>
              <Text style={styles.responseText}>{myAnswer}</Text>
              <Text style={styles.badge}>✓ Enviado</Text>
            </View>
          )}
        </View>
      );
    }
    
    if (currentPage === 2) {
      return (
        <View style={styles.pageContent}>
          <Text style={[styles.label, { color: 'rgba(255, 150, 200, 0.95)' }]}>{friendName.split(' ')[0]}</Text>
          {friendAnswer ? (
            <View style={styles.responseBox}>
              <Text style={styles.responseText}>{friendAnswer}</Text>
              <Text style={styles.badge}>✓ Respondió</Text>
            </View>
          ) : (
            <View style={styles.waitingBox}>
              <Text style={styles.waitingEmoji}>💭</Text>
              <Text style={styles.waitingText}>Esperando su respuesta</Text>
            </View>
          )}
        </View>
      );
    }
  };

  const renderPreguntasTab = () => {
    if (loading) return <View style={styles.centerContent}><ActivityIndicator size="large" color="#fff" /></View>;
    if (!currentQuestion) return <View style={styles.centerContent}><Text style={styles.noQuestion}>Sin pregunta</Text></View>;

    let startX = 0;

    return (
      <View style={styles.container}>
        <View 
          style={styles.swipeContainer}
          onTouchStart={(e) => {
            startX = e.nativeEvent.pageX;
          }}
          onTouchEnd={(e) => {
            const endX = e.nativeEvent.pageX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) {
              if (diff > 0) {
                handleSwipe('left');
              } else {
                handleSwipe('right');
              }
            }
          }}
        >
          {renderCurrentPage()}
        </View>

        <View style={styles.indicators}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[
              styles.indicator,
              currentPage === i && styles.indicatorActive
            ]} />
          ))}
        </View>
      </View>
    );
  };

  const renderHistorialTab = () => (
    <View style={styles.centerContent}>
      <Text style={styles.comingSoon}>Próximamente...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <LinearGradient
        colors={gradientToUse}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        
        <TabButtons key={layoutReady ? 'ready' : 'init'} onExit={() => navigation?.navigate('main')} />
        
        <KeyboardAvoidingView 
          style={styles.content} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {selectedTab === 'Preguntas' ? (
            <View onLayout={() => setLayoutReady(true)} style={{flex: 1}}>
              {renderPreguntasTab()}
            </View>
          ) : renderHistorialTab()}
        </KeyboardAvoidingView>

        <View style={styles.subTabContainer}>
          {['Preguntas', 'Historial'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.7}
              style={styles.subTabButton}
            >
              <Text style={[styles.subTabText, selectedTab === tab && styles.subTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 70,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  pageContent: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  page1Content: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    // justifyContent: 'flex-start',
    // flex: 1,
  },
  horizontalSection: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  questionBox: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 0.45,
    paddingRight: 8,
    left: -4,
  },
  infoBox: {
    flex: 0.6,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 20,
    // expandir hacia la derecha (no desplazar a la izquierda)
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoTitle: {
    color: '#222222',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  infoText: {
    color: '#333333',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },
  // explanationText removed
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  page1Label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  weekCounter: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  page1QuestionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'left',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 0.1,
    letterSpacing: 0.4,
    flexWrap: 'wrap', // Ajustar el texto dentro del espacio
    flexShrink: 1,
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  page1Hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontWeight: '400',
    top: 10,
    marginRight: 30,
    letterSpacing: 0.5,
  },

  nextQuestionText: {
    marginTop: 13,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'left',
    opacity: 0.95,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    padding: 20,
    paddingRight: 50,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  counter: {
    color: '#fff',
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sendBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  sendText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  responseBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  responseText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    color: 'rgba(46,204,113,0.9)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingBox: {
    alignItems: 'center',
    padding: 40,
  },
  waitingEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  waitingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  indicatorActive: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    width: 24,
  },
  noQuestion: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    textAlign: 'center',
  },
  comingSoon: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    textAlign: 'center',
  },
  subTabContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 8,
  },
  subTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  subTabTextActive: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tabButtons: {
    width: '100%',
    paddingHorizontal: 10,
    alignItems: 'center',
    overflow: 'hidden', // Evitar cortes visuales
    minHeight: 50, // Asegurar altura mínima
    zIndex: 50,
    elevation: 50,
  },
});

export default Ecos;