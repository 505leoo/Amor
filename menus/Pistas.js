import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const { width: screenWidth } = Dimensions.get('window');

const Pistas = ({ navigation }) => {
  const [selectedAnswer, setSelectedAnswer] = React.useState(null);
  const [isCorrect, setIsCorrect] = React.useState(false);
  const [attempts, setAttempts] = React.useState(2);
  const [showError, setShowError] = React.useState(false);
  
  // Pista 2 states
  const [currentWord, setCurrentWord] = React.useState('');
  const [attempts2, setAttempts2] = React.useState(8);
  const [isCorrect2, setIsCorrect2] = React.useState(false);
  const [showError2, setShowError2] = React.useState(false);
  const [wrongWords, setWrongWords] = React.useState([]);
  
  // Pista 3 states
  const [sequence, setSequence] = React.useState([]);
  const [userSequence, setUserSequence] = React.useState([]);
  const [attempts3, setAttempts3] = React.useState(4);
  const [isCorrect3, setIsCorrect3] = React.useState(false);
  const [showError3, setShowError3] = React.useState(false);
  const [isShowingSequence, setIsShowingSequence] = React.useState(false);
  const [gameStarted, setGameStarted] = React.useState(false);
  const [flashingColor, setFlashingColor] = React.useState(-1);
  const [countdown, setCountdown] = React.useState(0);
  const [showYa, setShowYa] = React.useState(false);
  const [sequenceLength, setSequenceLength] = React.useState(5);
  
  // Pista 4 states
  const [selectedAnswer4, setSelectedAnswer4] = React.useState(null);
  const [isCorrect4, setIsCorrect4] = React.useState(false);
  const [attempts4, setAttempts4] = React.useState(3);
  const [showError4, setShowError4] = React.useState(false);
  
  // Pista 5 states
  const [magicNumber, setMagicNumber] = React.useState('');
  const [isCorrect5, setIsCorrect5] = React.useState(false);
  const [attempts5, setAttempts5] = React.useState(1);
  const [showError5, setShowError5] = React.useState(false);
  
  // Pista 6 states
  const [selectedAnswer6, setSelectedAnswer6] = React.useState(null);
  const [isCorrect6, setIsCorrect6] = React.useState(false);
  const [attempts6, setAttempts6] = React.useState(1);
  const [showError6, setShowError6] = React.useState(false);
  
  // Pista 7 states
  const [isCorrect7, setIsCorrect7] = React.useState(false);
  
  // Scratch cards states
  const [scratchCards, setScratchCards] = React.useState([
    { id: 1, number: '3', isScratched: false, isUnlocked: false },
    { id: 2, number: '6', isScratched: false, isUnlocked: false },
    { id: 3, number: '2', isScratched: false, isUnlocked: false },
    { id: 4, number: '0', isScratched: false, isUnlocked: false },
    { id: 5, number: '4', isScratched: false, isUnlocked: false },
    { id: 6, number: '1', isScratched: false, isUnlocked: false },
  ]);
  const [isArranged, setIsArranged] = React.useState(false);
  // Global success overlay state
  const [showSuccessOverlay, setShowSuccessOverlay] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [overlayFadeAnim] = React.useState(new Animated.Value(0));
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [pistasOpacity] = React.useState(new Animated.Value(0));
  const [dataLoaded, setDataLoaded] = React.useState(false);
  
  // Firebase functions
  const savePistaProgress = async (pistaNumber, completed) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'usuarios', user.uid), {
          [`pista${pistaNumber}`]: completed
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error saving pista progress:', error);
    }
  };
  
  const loadPistasProgress = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pista1) setIsCorrect(true);
          if (data.pista2) setIsCorrect2(true);
          if (data.pista3) setIsCorrect3(true);
          if (data.pista4) setIsCorrect4(true);
          if (data.pista5) setIsCorrect5(true);
          if (data.pista6) setIsCorrect6(true);
          if (data.pista7) setIsCorrect7(true);
        }
      }
      
      // Marcar datos como cargados y activar fade
      setDataLoaded(true);
      Animated.timing(pistasOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading pistas progress:', error);
      // Activar fade incluso si hay error
      setDataLoaded(true);
      Animated.timing(pistasOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  };
  
  // Load progress on component mount
  React.useEffect(() => {
    loadPistasProgress();
  }, []);
  
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessOverlay(true);
    
    Animated.sequence([
      Animated.timing(overlayFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(overlayFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowSuccessOverlay(false);
    });
  };
  
  // Check which cards should be unlocked based on completed clues
  React.useEffect(() => {
    setScratchCards(prev => prev.map((card, index) => ({
      ...card,
      isUnlocked: [
        isCorrect,
        isCorrect2,
        isCorrect3,
        isCorrect4,
        isCorrect5,
        isCorrect6
      ][index] || false
    })));
  }, [isCorrect, isCorrect2, isCorrect3, isCorrect4, isCorrect5, isCorrect6]);
  
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
  const colorNames = ['Rosa', 'Menta', 'Azul', 'Verde', 'Vainilla'];
  
  const targetWord = 'BROCHA';
  const letters = ['A', 'M', 'B', 'L', 'R', 'N', 'O', 'S', 'C', 'E', 'H', 'I'];

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    if (answer === 6) {
      setIsCorrect(true);
      savePistaProgress(1, true);
    } else {
      setAttempts(prev => prev - 1);
      setShowError(true);
      setTimeout(() => setShowError(false), 1000);
    }
  };
  
  const handleLetterPress = (letter) => {
    if (isCorrect2 || attempts2 === 0) return;
    const newWord = currentWord + letter;
    setCurrentWord(newWord);
    setAttempts2(prev => prev - 1);
    
    if (newWord === targetWord) {
      setIsCorrect2(true);
      savePistaProgress(2, true);
    } else if (!targetWord.startsWith(newWord)) {
      setShowError2(true);
      setTimeout(() => {
        setShowError2(false);
        // Keep correct letters, remove wrong ones
        const correctPart = targetWord.substring(0, currentWord.length);
        setCurrentWord(correctPart);
      }, 1000);
    }
  };
  
  const generateSequence = () => {
    const availableColors = [0, 1, 2, 3, 4];
    const newSequence = [];
    for (let i = 0; i < sequenceLength; i++) {
      const randomIndex = Math.floor(Math.random() * availableColors.length);
      newSequence.push(availableColors[randomIndex]);
      availableColors.splice(randomIndex, 1);
    }
    setSequence(newSequence);
    setUserSequence([]);
    setGameStarted(true);
    
    // Start countdown
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setTimeout(() => showSequenceToUser(newSequence), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const showSequenceToUser = (seq) => {
    setIsShowingSequence(true);
    let currentIndex = 0;
    
    const showNextColor = () => {
      if (currentIndex < seq.length) {
        setFlashingColor(seq[currentIndex]);
        const flashDuration = currentIndex === 0 ? 1500 : 1000; // First color lasts longer
        setTimeout(() => {
          setFlashingColor(-1);
          setTimeout(() => {
            currentIndex++;
            showNextColor();
          }, 400);
        }, flashDuration);
      } else {
        setTimeout(() => {
          setIsShowingSequence(false);
          setShowYa(true);
          // YA stays until win or lose - don't remove it
        }, 400);
      }
    };
    
    showNextColor();
  };
  
  const handleColorPress = (colorIndex) => {
    if (isShowingSequence || isCorrect3 || attempts3 === 0 || countdown > 0) return;
    
    const newUserSequence = [...userSequence, colorIndex];
    setUserSequence(newUserSequence);
    
    if (newUserSequence.length === sequence.length) {
      if (JSON.stringify(newUserSequence) === JSON.stringify(sequence)) {
        setIsCorrect3(true);
        setShowYa(false);
        savePistaProgress(3, true);
        showSuccessMessage('¡Perfecto! Has encontrado tu regalo 🎁');
      } else {
        setAttempts3(prev => prev - 1);
        setShowError3(true);
        setShowYa(false); // Hide YA when losing
        setSequenceLength(prev => Math.max(3, prev - 1)); // Make easier
        setTimeout(() => {
          setShowError3(false);
          setUserSequence([]);
          // Restart with countdown and same sequence
          setCountdown(3);
          const countdownInterval = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                setTimeout(() => showSequenceToUser(sequence), 500);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, 1500);
      }
    }
  };
  
  const handleAnswer4 = (answer) => {
    setSelectedAnswer4(answer);
    if (answer === 'Familia') {
      setIsCorrect4(true);
      savePistaProgress(4, true);
      showSuccessMessage('¡Perfecto! Has encontrado tu cuarto regalo 🎁');
    } else {
      setAttempts4(prev => prev - 1);
      setShowError4(true);
      setTimeout(() => setShowError4(false), 1000);
    }
  };
  
  const handleMagicNumber = (number) => {
    setMagicNumber(number);
    if (number === '20') {
      setIsCorrect5(true);
      savePistaProgress(5, true);
      showSuccessMessage('¡Perfecto! El número mágico es correcto 💕');
    } else {
      setAttempts5(prev => prev - 1);
      setShowError5(true);
      setTimeout(() => setShowError5(false), 1000);
    }
  };
  
  const handleAnswer6 = (answer) => {
    setSelectedAnswer6(answer);
    setIsCorrect6(true);
    savePistaProgress(6, true);
    showSuccessMessage('¡Perfecto! Tu cariño es el mejor regalo 💕');
  };
  
  const handleAnswer7 = () => {
    setIsCorrect7(true);
    savePistaProgress(7, true);
    showSuccessMessage('¡Que comience tu aventura, mi amor! 💕');
  };
  
  const handleScratch = (cardId) => {
    setScratchCards(prev => prev.map(card => 
      card.id === cardId && card.isUnlocked
        ? { ...card, isScratched: true }
        : card
    ));
  };
  
  const handleArrange = () => {
    setScratchCards([
      { id: 1, number: '1', isScratched: true, isUnlocked: true },
      { id: 2, number: '6', isScratched: true, isUnlocked: true },
      { id: 3, number: '0', isScratched: true, isUnlocked: true },
      { id: 4, number: '3', isScratched: true, isUnlocked: true },
      { id: 5, number: '2', isScratched: true, isUnlocked: true },
      { id: 6, number: '4', isScratched: true, isUnlocked: true },
    ]);
    setIsArranged(true);
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  // Mostrar pantalla vacía mientras se cargan los datos
  if (!dataLoaded) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F3E5F5', '#E1BEE7']}
          style={styles.gradient}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F3E5F5', '#E1BEE7']}
        style={styles.gradient}
      >
        <Animated.View style={{ opacity: pistasOpacity, flex: 1 }}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={styles.scrollContent}
          >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('main')}
          >
            <MaterialIcons name="arrow-back" size={18} color="#333" />
            <Text style={styles.backButtonText}>Salir</Text>
          </TouchableOpacity>
          
          <View style={[styles.clueCard, { position: 'relative' }]}>
            <View style={[styles.clueHeader, showError && styles.errorHeader]}>
              <View style={[styles.clueNumber, showError && styles.errorNumber]}>
                <Text style={[styles.clueNumberText, showError && styles.errorNumberText]}>1</Text>
              </View>
              <Text style={styles.clueLabel}>Pegatinas de Hello Kitty</Text>
              <Text style={[styles.counterText, showError && styles.errorCounter]}>{attempts}/2</Text>
            </View>
            
            <View style={styles.clueContent}>
              <Text style={styles.clueDescription}>
                Tu primer regalo está esperándote. Son adorables pegatinas de Hello Kitty que encontrarás en la caja.
              </Text>
              <Text style={styles.clueQuestion}>
                Mirando bien todas las pegatinas que hay, ¿cuántas puedes contar en total?
              </Text>
            </View>
            
            <View style={styles.optionsContainer}>
              <Text style={styles.optionsTitle}>Selecciona tu respuesta:</Text>
              <View style={styles.optionsGrid}>
                {[4, 6, 8].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      selectedAnswer === option && styles.selectedOption,
                      isCorrect && selectedAnswer === option && styles.correctOption
                    ]}
                    onPress={() => handleAnswer(option)}
                    disabled={attempts === 0 && !isCorrect || isCorrect}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedAnswer === option && styles.selectedOptionText,
                      isCorrect && selectedAnswer === option && styles.correctOptionText
                    ]}>{option}</Text>
                    {isCorrect && selectedAnswer === option && (
                      <MaterialIcons name="check-circle" size={18} color="#fff" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {isCorrect && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.overlayText}>¡Correcto!</Text>
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.unlockDateContainer}>
            <Text style={styles.unlockDate}>← Desliza para explorar más →</Text>
          </View>
          
          {/* Pista 2 */}
          <View style={[styles.clueCard, styles.clueCard2, { position: 'relative' }]}>
            <View style={[styles.clueHeader, { backgroundColor: '#9C27B0' }, showError2 && styles.errorHeader]}>
              <View style={[styles.clueNumber, showError2 && styles.errorNumber]}>
                <Text style={[styles.clueNumberText, { color: '#9C27B0' }, showError2 && styles.errorNumberText]}>2</Text>
              </View>
              <Text style={styles.clueLabel}>Atado de pelo</Text>
              <Text style={[styles.counterText, showError2 && styles.errorCounter]}>{attempts2}/8</Text>
            </View>
            
            <View style={styles.clueContent2}>
              <Text style={styles.clueDescription2}>
                Tu segundo regalo te ayudará a lucir hermosa.
              </Text>
              <Text style={styles.clueQuestion2}>
                ¿Qué palabra describe este objeto para el cabello?
              </Text>
            </View>
            
            <View style={styles.optionsContainer2}>
              <View style={[styles.wordDisplay, isCorrect2 && styles.correctWordDisplay]}>
                <View style={styles.wordLetters}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <View key={i} style={styles.letterSlot}>
                      <Text style={[styles.slotText, showError2 && styles.errorWordText, isCorrect2 && styles.correctWordText]}>
                        {currentWord[i] || '_'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={styles.lettersGrid2}>
                {letters.map((letter, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.letterButton2}
                    onPress={() => handleLetterPress(letter)}
                    disabled={attempts2 === 0 || isCorrect2}
                  >
                    <Text style={styles.letterText2}>{letter}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {!isCorrect && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="lock" size={32} color="#666" />
                  <Text style={styles.overlayText}>Completa la misión anterior para seguir</Text>
                </View>
              </View>
            )}
            
            {isCorrect2 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.overlayText}>¡Correcto!</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Pista 3 */}
          <View style={[styles.clueCard, styles.clueCard3, { position: 'relative' }]}>
            <View style={[styles.clueHeader, { backgroundColor: '#E91E63' }, showError3 && styles.errorHeader]}>
              <View style={[styles.clueNumber, showError3 && styles.errorNumber]}>
                <Text style={[styles.clueNumberText, { color: '#E91E63' }, showError3 && styles.errorNumberText]}>3</Text>
              </View>
              <Text style={styles.clueLabel}>Perfume de Hello Kitty</Text>
              <Text style={[styles.counterText, showError3 && styles.errorCounter]}>{attempts3}/4</Text>
            </View>
            
            <View style={styles.clueContent3}>
              <Text style={styles.clueDescription3}>
                Tu tercer regalo huele divino. Mezcla los aromas correctos.
              </Text>
              <Text style={styles.clueQuestion3}>
                Memoriza y repite la secuencia de fragancias
              </Text>
            </View>
            
            <View style={styles.optionsContainer3}>
              <View style={styles.gameContainer}>
                <View style={styles.sequenceDisplay}>
                  <MaterialIcons name="visibility" size={20} color="#E91E63" />
                  <Text style={[styles.sequenceText, 
                    isCorrect3 && styles.successTextColor,
                    showError3 && styles.errorTextColor]}>
                    {countdown > 0 ? countdown : 
                     isShowingSequence ? 'Memoriza la secuencia...' : 
                     showYa ? '¡YA!' :
                     isCorrect3 ? '¡Perfecto! Has encontrado tu regalo 🎁' :
                     showError3 ? '¡Incorrecto! Inténtalo de nuevo' :
                     gameStarted ? '' : 'Presiona comenzar'}
                  </Text>
                  {gameStarted && !isCorrect3 && !showError3 && (
                    <View style={styles.progressIndicator}>
                      {sequence.map((_, index) => (
                        <View 
                          key={index} 
                          style={[
                            styles.progressDot,
                            userSequence.length > index && styles.progressDotActive
                          ]} 
                        />
                      ))}
                    </View>
                  )}
                </View>
                
                <View style={styles.colorsGrid}>
                  {colors.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        userSequence.includes(index) && styles.selectedColorButton,
                        flashingColor === index && styles.flashingColorButton
                      ]}
                      onPress={() => handleColorPress(index)}
                      disabled={isShowingSequence || attempts3 === 0 || isCorrect3 || countdown > 0}
                    >
                      <Text style={styles.colorButtonText}>{colorNames[index]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {!gameStarted && (
                  <View style={styles.overlay}>
                    <TouchableOpacity style={styles.startButton} onPress={generateSequence}>
                      <Text style={styles.startButtonText}>Comenzar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            
            {!isCorrect2 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="lock" size={32} color="#fff" />
                  <Text style={styles.overlayText}>Completa la misión anterior para seguir</Text>
                </View>
              </View>
            )}
            
            {isCorrect3 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.overlayText}>¡Correcto!</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Pista 4 */}
          <View style={[styles.clueCard, styles.clueCard4, { position: 'relative' }]}>
            <View style={[styles.clueHeader, { backgroundColor: '#2196F3' }, showError4 && styles.errorHeader]}>
              <View style={[styles.clueNumber, showError4 && styles.errorNumber]}>
                <Text style={[styles.clueNumberText, { color: '#2196F3' }, showError4 && styles.errorNumberText]}>4</Text>
              </View>
              <Text style={styles.clueLabel}>Peluche de Stitch</Text>
              <Text style={[styles.counterText, showError4 && styles.errorCounter]}>{attempts4}/3</Text>
            </View>
            
            <View style={styles.clueContent4}>
              <Text style={styles.clueDescription4}>
                Tu cuarto regalo es azul y muy tierno. Es el alien más adorable del universo.
              </Text>
              <Text style={styles.clueQuestion4}>
                Completa la frase famosa de Stitch
              </Text>
            </View>
            
            <View style={styles.optionsContainer4}>
              <View style={styles.phraseContainer}>
                <Text style={styles.phraseText}>"Ohana significa </Text>
                <View style={styles.blankSpace}>
                  <Text style={[styles.blankText, isCorrect4 && styles.correctBlankText]}>
                    {selectedAnswer4 || '____'}
                  </Text>
                </View>
                <Text style={styles.phraseText}>"</Text>
              </View>
              
              <View style={styles.optionsGrid4}>
                {['Familia', 'Amigos', 'Casa'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton4,
                      selectedAnswer4 === option && styles.selectedOption4,
                      isCorrect4 && selectedAnswer4 === option && styles.correctOption4
                    ]}
                    onPress={() => handleAnswer4(option)}
                    disabled={attempts4 === 0 || isCorrect4}
                  >
                    <Text style={[
                      styles.optionText4,
                      selectedAnswer4 === option && styles.selectedOptionText4,
                      isCorrect4 && selectedAnswer4 === option && styles.correctOptionText4
                    ]}>{option}</Text>
                    {isCorrect4 && selectedAnswer4 === option && (
                      <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {!isCorrect3 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="lock" size={32} color="#fff" />
                  <Text style={styles.overlayText}>Completa la misión anterior para seguir</Text>
                </View>
              </View>
            )}
            
            {isCorrect4 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.overlayText}>¡Correcto!</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Pista 5 */}
          <View style={[styles.clueCard, styles.clueCard5, { position: 'relative' }]}>
            <View style={[styles.clueHeader, { backgroundColor: '#FF9800' }, showError5 && styles.errorHeader]}>
              <View style={[styles.clueNumber, showError5 && styles.errorNumber]}>
                <Text style={[styles.clueNumberText, { color: '#FF9800' }, showError5 && styles.errorNumberText]}>5</Text>
              </View>
              <Text style={styles.clueLabel}>Collares con Dijes</Text>
              <Text style={[styles.counterText, showError5 && styles.errorCounter]}>Solo 1 intento</Text>
            </View>
            
            <View style={styles.clueContent5}>
              <Text style={styles.clueDescription5}>
                Tienes 2 collares y un dije de corazón que se puede partir en dos.
              </Text>
              <Text style={styles.clueQuestion5}>
                Arma los collares, pon los dijes de corazón en cada uno, ponle uno a Lelo y otro a ti, y Lelo dirá el número mágico
              </Text>
            </View>
            
            <View style={styles.optionsContainer5}>
              <View style={styles.instructionContainer}>
                <MaterialIcons name="favorite" size={20} color="#FF9800" />
                <Text style={styles.instructionText}>1. Arma los collares con los dijes</Text>
              </View>
              <View style={styles.instructionContainer}>
                <MaterialIcons name="people" size={20} color="#FF9800" />
                <Text style={styles.instructionText}>2. Ponle uno a Lelo y otro a ti</Text>
              </View>
              <View style={styles.instructionContainer}>
                <MaterialIcons name="record-voice-over" size={20} color="#FF9800" />
                <Text style={styles.instructionText}>3. Lelo dirá el número mágico</Text>
              </View>
              
              <View style={styles.numberInputContainer}>
                <Text style={styles.numberInputLabel}>¿Cuál es el número mágico? (Solo 1 intento)</Text>
                <View style={styles.numberOptions}>
                  {['15', '20', '25'].map((number) => (
                    <TouchableOpacity
                      key={number}
                      style={[
                        styles.numberButton,
                        magicNumber === number && styles.selectedNumber,
                        isCorrect5 && magicNumber === number && styles.correctNumber
                      ]}
                      onPress={() => handleMagicNumber(number)}
                      disabled={attempts5 === 0 || isCorrect5}
                    >
                      <Text style={[
                        styles.numberText,
                        magicNumber === number && styles.selectedNumberText,
                        isCorrect5 && magicNumber === number && styles.correctNumberText
                      ]}>{number}</Text>
                      {isCorrect5 && magicNumber === number && (
                        <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            {!isCorrect4 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="lock" size={32} color="#fff" />
                  <Text style={styles.overlayText}>Completa la misión anterior para seguir</Text>
                </View>
              </View>
            )}
            
            {isCorrect5 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.overlayText}>¡Correcto!</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Pista 6 */}
          <View style={[styles.clueCard, styles.clueCard6, { position: 'relative' }]}>
            <View style={[styles.clueHeader, { backgroundColor: '#9C27B0' }, showError6 && styles.errorHeader]}>
              <View style={[styles.clueNumber, showError6 && styles.errorNumber]}>
                <Text style={[styles.clueNumberText, { color: '#9C27B0' }, showError6 && styles.errorNumberText]}>6</Text>
              </View>
              <Text style={styles.clueLabel}>Arqueador de Pestañas</Text>
              <Text style={[styles.counterText, showError6 && styles.errorCounter]}>Solo 1 intento</Text>
            </View>
            
            <View style={styles.clueContent6}>
              <Text style={styles.clueDescription6}>
                Cuando me dijiste que ya no tenías arqueador de pestañas, decidí sorprenderte con uno nuevo.
              </Text>
              <Text style={styles.clueQuestion6}>
                Un arqueador de pestañas para que te sientas aún más hermosa. ¿Cómo quieres agradecerme?
              </Text>
            </View>
            
            <View style={styles.optionsContainer6}>
              <View style={styles.optionsGrid6}>
                {['Un beso', 'Darme una teta', 'Los dos'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton6,
                      selectedAnswer6 === option && styles.selectedOption6,
                      isCorrect6 && selectedAnswer6 === option && styles.correctOption6
                    ]}
                    onPress={() => handleAnswer6(option)}
                    disabled={attempts6 === 0 || isCorrect6}
                  >
                    <Text style={[
                      styles.optionText6,
                      selectedAnswer6 === option && styles.selectedOptionText6,
                      isCorrect6 && selectedAnswer6 === option && styles.correctOptionText6
                    ]}>{option}</Text>
                    {isCorrect6 && selectedAnswer6 === option && (
                      <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {!isCorrect5 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="lock" size={32} color="#fff" />
                  <Text style={styles.overlayText}>Completa la misión anterior para seguir</Text>
                </View>
              </View>
            )}
            
            {isCorrect6 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.overlayText}>¡Correcto!</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Pista 7 */}
          <View style={[styles.clueCard, styles.clueCard7, { position: 'relative' }]}>
            <View style={[styles.clueHeader, { backgroundColor: '#4CAF50' }]}>
              <View style={styles.clueNumber}>
                <Text style={[styles.clueNumberText, { color: '#4CAF50' }]}>7</Text>
              </View>
              <Text style={styles.clueLabel}>Misión Final</Text>
              <Text style={styles.counterText}>¡Última pista!</Text>
            </View>
            
            <View style={styles.clueContent7}>
              <Text style={styles.clueDescription7}>
                ¡Felicidades mi amor! Has encontrado todos los regalos que preparé para ti con tanto cariño. 
                Ahora Lelo te dará la libertad de explorar y descubrir las demás sorpresas por tu cuenta. 
                Esta será tu próxima misión: buscar, encontrar y disfrutar cada detalle que he dejado para ti.
              </Text>
              <Text style={styles.clueQuestion7}>
                ¿Estás lista para tu aventura final?
              </Text>
            </View>
            
            <View style={styles.optionsContainer7}>
              <TouchableOpacity
                style={[
                  styles.finalButton,
                  isCorrect7 && styles.correctFinalButton
                ]}
                onPress={handleAnswer7}
                disabled={isCorrect7}
              >
                <Text style={[
                  styles.finalButtonText,
                  isCorrect7 && styles.correctFinalButtonText
                ]}>¡Vale!</Text>
                {isCorrect7 && (
                  <MaterialIcons name="check-circle" size={18} color="#fff" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            </View>
            
            {!isCorrect6 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="lock" size={32} color="#fff" />
                  <Text style={styles.overlayText}>Completa la misión anterior para seguir</Text>
                </View>
              </View>
            )}
            
            {isCorrect7 && (
              <View style={styles.cardOverlay}>
                <View style={styles.overlayContent}>
                  <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
                  <Text style={styles.overlayText}>¡Correcto!</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Scratch Cards Section */}
          <View style={styles.scratchContainer}>
            <View style={styles.scratchGrid}>
              <View style={styles.scratchGroup}>
                {scratchCards.slice(0, 2).map((card, index) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.scratchCard,
                      !card.isUnlocked && styles.lockedCard,
                      card.isScratched && styles.scratchedCard
                    ]}
                    onPress={() => handleScratch(card.id)}
                    disabled={!card.isUnlocked || card.isScratched}
                  >
                    {!card.isUnlocked ? (
                      <View style={styles.lockedContent}>
                        <MaterialIcons name="lock" size={32} color="#666" />
                      </View>
                    ) : card.isScratched ? (
                      <View style={styles.revealedContent}>
                        <Text style={styles.revealedNumber}>{card.number}</Text>
                      </View>
                    ) : (
                      <View style={styles.scratchContent}>
                        <MaterialIcons name="touch-app" size={28} color="#fff" />
                        <Text style={styles.scratchText}>¡Rasca!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {isArranged && <Text style={styles.separator}>/</Text>}
              
              <View style={styles.scratchGroup}>
                {scratchCards.slice(2, 4).map((card, index) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.scratchCard,
                      !card.isUnlocked && styles.lockedCard,
                      card.isScratched && styles.scratchedCard
                    ]}
                    onPress={() => handleScratch(card.id)}
                    disabled={!card.isUnlocked || card.isScratched}
                  >
                    {!card.isUnlocked ? (
                      <View style={styles.lockedContent}>
                        <MaterialIcons name="lock" size={32} color="#666" />
                      </View>
                    ) : card.isScratched ? (
                      <View style={styles.revealedContent}>
                        <Text style={styles.revealedNumber}>{card.number}</Text>
                      </View>
                    ) : (
                      <View style={styles.scratchContent}>
                        <MaterialIcons name="touch-app" size={28} color="#fff" />
                        <Text style={styles.scratchText}>¡Rasca!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {isArranged && <Text style={styles.separator}>/</Text>}
              
              <View style={styles.scratchGroup}>
                {scratchCards.slice(4, 6).map((card, index) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.scratchCard,
                      !card.isUnlocked && styles.lockedCard,
                      card.isScratched && styles.scratchedCard
                    ]}
                    onPress={() => handleScratch(card.id)}
                    disabled={!card.isUnlocked || card.isScratched}
                  >
                    {!card.isUnlocked ? (
                      <View style={styles.lockedContent}>
                        <MaterialIcons name="lock" size={32} color="#666" />
                      </View>
                    ) : card.isScratched ? (
                      <View style={styles.revealedContent}>
                        <Text style={styles.revealedNumber}>{card.number}</Text>
                      </View>
                    ) : (
                      <View style={styles.scratchContent}>
                        <MaterialIcons name="touch-app" size={28} color="#fff" />
                        <Text style={styles.scratchText}>¡Rasca!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {scratchCards.every(card => card.isScratched) && !isArranged && (
              <TouchableOpacity style={styles.arrangeButton} onPress={handleArrange}>
                <Text style={styles.arrangeButtonText}>Arreglar</Text>
              </TouchableOpacity>
            )}
            
            {isArranged && (
              <Animated.View style={[styles.finalMessage, { opacity: fadeAnim }]}>
                <LinearGradient
                  colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.messageGradient}
                >
                  <Text style={styles.finalMessageText}>
                    El día que sin saberlo, te elegí para toda la vida... panzona :)
                  </Text>
                </LinearGradient>
              </Animated.View>
            )}
          </View>
          
          <View style={styles.spacer} />
          </ScrollView>
          
          {showSuccessOverlay && (
            <Animated.View style={[styles.successOverlay, { opacity: overlayFadeAnim }]}>
              <View style={styles.successOverlayContent}>
                <MaterialIcons name="celebration" size={32} color="#4CAF50" />
                <Text style={styles.successOverlayText}>{successMessage}</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
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
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 40,
    top: 30,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    paddingTop: -20,
    paddingLeft: 30,
    alignItems: 'flex-start',
  },
  clueCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 20,
    marginLeft: 20,
    marginRight: 40,
    marginTop: 23,
    minWidth: 320,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,105,180,0.1)',
  },
  clueCard2: {
    marginLeft: 200,
    marginTop: 50,
    minWidth: 280,
    maxWidth: 320,
  },
  clueCard3: {
    marginLeft: 60,
    marginTop: 30,
    minWidth: 320,
    maxWidth: 360,
  },
  clueCard4: {
    marginLeft: 40,
    marginTop: 40,
    minWidth: 300,
    maxWidth: 340,
  },
  clueCard5: {
    marginLeft: 60,
    marginTop: 18,
    minWidth: 320,
    maxWidth: 360,
  },
  clueCard6: {
    marginLeft: 100,
    marginTop: 40,
    minWidth: 300,
    maxWidth: 340,
  },
  clueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF69B4',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  clueNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clueNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  clueLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
    flex: 1,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  errorHeader: {
    backgroundColor: '#F44336',
  },
  errorNumber: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  errorNumberText: {
    color: '#F44336',
  },
  errorCounter: {
    backgroundColor: 'rgba(244,67,54,0.2)',
    color: '#F44336',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  clueContent: {
    padding: 10,
    alignItems: 'center',
  },
  clueIcon: {
    marginBottom: 4,
  },
  clueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 6,
    textAlign: 'center',
  },
  clueDescription: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  clueQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
    backgroundColor: 'rgba(255,105,180,0.05)',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF69B4',
  },
  optionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  optionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,105,180,0.3)',
    minWidth: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedOption: {
    backgroundColor: 'rgba(255,105,180,0.15)',
    borderColor: '#FF69B4',
    borderWidth: 2,
  },
  correctOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedOptionText: {
    color: '#FF69B4',
  },
  correctOptionText: {
    color: '#fff',
  },
  checkIcon: {
    marginTop: 2,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  unlockDateContainer: {
    marginLeft: -280,
    marginTop: 320,
    alignSelf: 'flex-start',
  },
  unlockDate: {
    fontSize: 14,
    color: '#b1a8a8',
    opacity: 0.9,
  },
  wordDisplay: {
    backgroundColor: 'rgba(156,39,176,0.05)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.2)',
  },
  wordLetters: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  letterSlot: {
    width: 24,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  correctWordDisplay: {
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderColor: '#4CAF50',
  },
  currentWordText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9C27B0',
    textAlign: 'center',
    letterSpacing: 1,
  },
  correctWordText: {
    color: '#4CAF50',
  },
  clueContent2: {
    padding: 8,
    alignItems: 'center',
  },
  clueDescription2: {
    fontSize: 11,
    color: '#555',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
  clueQuestion2: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 16,
    backgroundColor: 'rgba(156,39,176,0.05)',
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#9C27B0',
  },
  optionsContainer2: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  lettersGrid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  letterButton2: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.3)',
    minWidth: 28,
    alignItems: 'center',
  },
  letterText2: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  successMessage2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    gap: 4,
    justifyContent: 'center',
  },
  successText2: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  clueContent3: {
    padding: 12,
    alignItems: 'center',
  },
  clueDescription3: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  clueQuestion3: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
    backgroundColor: 'rgba(233,30,99,0.05)',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E91E63',
  },
  optionsContainer3: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  gameContainer: {
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  sequenceDisplay: {
    backgroundColor: 'rgba(233,30,99,0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(233,30,99,0.25)',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 60,
  },
  progressIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(233,30,99,0.3)',
  },
  progressDotActive: {
    backgroundColor: '#E91E63',
  },
  sequenceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E91E63',
    textAlign: 'center',
  },
  successTextColor: {
    color: '#4CAF50',
  },
  errorTextColor: {
    color: '#F44336',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 0,
    paddingHorizontal: 5,
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  flashingColorButton: {
    borderColor: '#fff',
    borderWidth: 4,
    transform: [{ scale: 1.25 }],
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  selectedColorButton: {
    borderColor: '#333',
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  colorButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  successMessage3: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    gap: 6,
    justifyContent: 'center',
  },
  successText3: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  clueContent4: {
    padding: 10,
    alignItems: 'center',
  },
  clueDescription4: {
    fontSize: 11,
    color: '#555',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
  clueQuestion4: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 16,
    backgroundColor: 'rgba(33,150,243,0.05)',
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#2196F3',
  },
  optionsContainer4: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  phraseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(33,150,243,0.05)',
    padding: 8,
    borderRadius: 8,
  },
  phraseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  blankSpace: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.3)',
    minWidth: 60,
  },
  blankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
  },
  correctBlankText: {
    color: '#4CAF50',
  },
  optionsGrid4: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 6,
    marginBottom: 0,
  },
  optionButton4: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.3)',
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedOption4: {
    backgroundColor: 'rgba(33,150,243,0.15)',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  correctOption4: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  optionText4: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  selectedOptionText4: {
    color: '#2196F3',
  },
  correctOptionText4: {
    color: '#fff',
  },
  successMessage4: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    gap: 4,
    justifyContent: 'center',
    marginTop: 8,
  },
  successText4: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  clueContent5: {
    padding: 10,
    alignItems: 'center',
  },
  clueDescription5: {
    fontSize: 11,
    color: '#555',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
  clueQuestion5: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 16,
    backgroundColor: 'rgba(255,152,0,0.05)',
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#FF9800',
  },
  optionsContainer5: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.05)',
    padding: 6,
    borderRadius: 6,
    marginBottom: 4,
    gap: 8,
  },
  instructionText: {
    fontSize: 11,
    color: '#555',
    flex: 1,
  },
  numberInputContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  numberInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 8,
    textAlign: 'center',
  },
  numberOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
    marginBottom: 8,
  },
  numberButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
    minWidth: 50,
    alignItems: 'center',
  },
  selectedNumber: {
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  correctNumber: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  numberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedNumberText: {
    color: '#FF9800',
  },
  correctNumberText: {
    color: '#fff',
  },
  successMessage5: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    gap: 4,
    justifyContent: 'center',
    marginTop: 8,
  },
  successText5: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  clueContent6: {
    padding: 10,
    alignItems: 'center',
  },
  clueDescription6: {
    fontSize: 11,
    color: '#555',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
  clueQuestion6: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 16,
    backgroundColor: 'rgba(156,39,176,0.05)',
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#9C27B0',
  },
  optionsContainer6: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  optionsGrid6: {
    gap: 6,
    marginBottom: 8,
  },
  optionButton6: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.3)',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedOption6: {
    backgroundColor: 'rgba(156,39,176,0.15)',
    borderColor: '#9C27B0',
    borderWidth: 2,
  },
  correctOption6: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  optionText6: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedOptionText6: {
    color: '#9C27B0',
  },
  correctOptionText6: {
    color: '#fff',
  },
  successMessage6: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    gap: 4,
    justifyContent: 'center',
    marginTop: 8,
  },
  successText6: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  errorWordText: {
    color: '#F44336',
  },
  lettersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  letterButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.3)',
    minWidth: 32,
    alignItems: 'center',
  },
  letterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clueCard7: {
    marginLeft: 80,
    marginTop: 35,
    minWidth: 340,
    maxWidth: 380,
  },
  clueContent7: {
    padding: 12,
    alignItems: 'center',
  },
  clueDescription7: {
    fontSize: 12,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 18,
  },
  clueQuestion7: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
    backgroundColor: 'rgba(76,175,80,0.05)',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  optionsContainer7: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  finalButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  correctFinalButton: {
    backgroundColor: '#4CAF50',
  },
  finalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  correctFinalButtonText: {
    color: '#fff',
  },
  successMessage7: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    gap: 8,
  },
  successText7: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  scratchContainer: {
    alignItems: 'center',
  },
  scratchGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 50,
    paddingVertical: 30,
  },
  separator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginHorizontal: 5,
  },
  arrangeButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  arrangeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  scratchGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  scratchCard: {
    width: 100,
    height: 100,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  lockedCard: {
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#BDBDBD',
  },
  scratchedCard: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#388E3C',
  },
  lockedContent: {
    alignItems: 'center',
  },
  scratchContent: {
    backgroundColor: '#FF6B35',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  scratchText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  revealedContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finalMessage: {
    marginTop: 25,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  messageGradient: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderRadius: 16,
    alignItems: 'center',
  },
  finalMessageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  revealedNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },

  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayContent: {
    alignItems: 'center',
    gap: 8,
  },
  overlayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  spacer: {
    width: 50,
    height: 1,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(76,175,80,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successOverlayContent: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  successOverlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default Pistas;
