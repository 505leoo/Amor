import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const Mensajes = ({ message = 'Hola', navigation, selectedSticker: initialSticker }) => {
  const [fontsLoaded] = useFonts({ Omori: require('../fonts/Omori.ttf') });
  const [selectedSticker, setSelectedSticker] = useState(initialSticker || null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const loadCartaSticker = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const ref = doc(db, 'cartaStickers', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const { imageUrl, selectedAt } = snap.data();
        const elapsed = Date.now() - selectedAt.toMillis();
        const remaining = 24 * 60 * 60 * 1000 - elapsed;
        if (remaining <= 0) {
          await deleteDoc(ref);
        } else {
          setSelectedSticker({ imageUrl });
          setTimeLeft(remaining);
        }
      } catch (e) {}
    };
    loadCartaSticker();
  }, []);

  useEffect(() => {
    if (!timeLeft) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) { clearInterval(interval); setSelectedSticker(null); return null; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (!fontsLoaded) return null;

  const normalizedMessage = message.trim();
  const charCount = normalizedMessage.replace(/\s+/g, '').length;
  let fontSize = 20;
  if (charCount > 10) fontSize = 17;
  else if (charCount > 7) fontSize = 18;
  else if (charCount > 4) fontSize = 19;

  return (
    <View style={styles.container}>
      <Image source={require('../assets/menu/mensajes.png')} style={styles.image} />
      {selectedSticker?.imageUrl && (
        <>
          {timeLeft ? (
            <View style={styles.timerWrap}>
              {/* Capa base: trazo principal */}
              <View style={styles.timerRow}>
                {formatTime(timeLeft).split('').map((char, i) => (
                  <Text key={`a${i}`} style={[
                    styles.timerChar,
                    {
                      fontSize: [11, 10.5, 11.5, 10, 11, 10.5, 11.5, 10][i % 8],
                      opacity: [0.62, 0.38, 0.70, 0.34, 0.58, 0.48, 0.66, 0.36][i % 8],
                      color: [
                        'rgba(72,68,64,0.75)',
                        'rgba(52,48,44,0.50)',
                        'rgba(85,80,74,0.68)',
                        'rgba(44,40,37,0.45)',
                        'rgba(78,73,68,0.72)',
                        'rgba(58,54,50,0.55)',
                        'rgba(68,63,58,0.65)',
                        'rgba(48,44,40,0.48)',
                      ][i % 8],
                      marginRight: [-0.4, 0.6, -0.2, 0.8, -0.5, 0.3, -0.3, 0.5][i % 8],
                      transform: [
                        { rotate: `${[-3.5, 1.8, -2.2, 3.0, -1.2, 3.5, -2.8, 1.2][i % 8]}deg` },
                        { translateY: [-1.4, 1.0, -0.6, 1.8, -1.0, 0.5, -1.8, 0.8][i % 8] },
                        { translateX: [-0.3, 0.4, -0.1, 0.5, -0.4, 0.2, -0.2, 0.3][i % 8] },
                      ],
                      textShadowColor: 'rgba(20,15,10,0.45)',
                      textShadowOffset: { width: 0.8, height: 1.0 },
                      textShadowRadius: 0.5,
                    }
                  ]}>{char}</Text>
                ))}
              </View>
              {/* Capa luz: arriba-izquierda, simula luz rebotando en el relieve del trazo */}
              <View style={[styles.timerRow, { position: 'absolute', top: -0.8, left: -0.7 }]}>
                {formatTime(timeLeft).split('').map((char, i) => (
                  <Text key={`b${i}`} style={[
                    styles.timerChar,
                    {
                      fontSize: [11, 10.5, 11.5, 10, 11, 10.5, 11.5, 10][i % 8],
                      opacity: [0.10, 0.05, 0.12, 0.04, 0.09, 0.06, 0.11, 0.04][i % 8],
                      color: 'rgba(180,170,155,0.6)',
                      marginRight: [-0.4, 0.6, -0.2, 0.8, -0.5, 0.3, -0.3, 0.5][i % 8],
                      transform: [
                        { rotate: `${[-3.5, 1.8, -2.2, 3.0, -1.2, 3.5, -2.8, 1.2][i % 8]}deg` },
                        { translateY: [-1.4, 1.0, -0.6, 1.8, -1.0, 0.5, -1.8, 0.8][i % 8] },
                      ],
                    }
                  ]}>{char}</Text>
                ))}
              </View>
              {/* Capa ruido: saltos bruscos, grafito interrumpido por textura rugosa */}
              <View style={[styles.timerRow, { position: 'absolute', top: 0, left: 0 }]}>
                {formatTime(timeLeft).split('').map((char, i) => (
                  <Text key={`d${i}`} style={[
                    styles.timerChar,
                    {
                      fontSize: [11, 10.5, 11.5, 10, 11, 10.5, 11.5, 10][i % 8],
                      opacity: [0.07, 0.13, 0.04, 0.10, 0.06, 0.12, 0.05, 0.09][i % 8],
                      color: 'rgba(55,50,44,0.5)',
                      marginRight: [-0.4, 0.6, -0.2, 0.8, -0.5, 0.3, -0.3, 0.5][i % 8],
                      transform: [
                        { rotate: `${[-3.5, 1.8, -2.2, 3.0, -1.2, 3.5, -2.8, 1.2][i % 8]}deg` },
                        { translateY: [2.5, -2.0, 1.8, -2.8, 2.2, -1.5, 2.8, -1.8][i % 8] },
                        { translateX: [1.2, -0.8, 1.5, -1.0, 0.9, -1.3, 1.1, -0.7][i % 8] },
                      ],
                    }
                  ]}>{char}</Text>
                ))}
              </View>
              {/* Capa sombra: abajo-derecha, el surco del trazo sobre la pared */}
              <View style={[styles.timerRow, { position: 'absolute', top: 1.2, left: 1.0 }]}>
                {formatTime(timeLeft).split('').map((char, i) => (
                  <Text key={`c${i}`} style={[
                    styles.timerChar,
                    {
                      fontSize: [11, 10.5, 11.5, 10, 11, 10.5, 11.5, 10][i % 8],
                      opacity: [0.14, 0.06, 0.16, 0.05, 0.12, 0.07, 0.14, 0.05][i % 8],
                      color: 'rgba(15,10,5,0.5)',
                      marginRight: [-0.4, 0.6, -0.2, 0.8, -0.5, 0.3, -0.3, 0.5][i % 8],
                      transform: [
                        { rotate: `${[-3.5, 1.8, -2.2, 3.0, -1.2, 3.5, -2.8, 1.2][i % 8]}deg` },
                        { translateY: [-1.4, 1.0, -0.6, 1.8, -1.0, 0.5, -1.8, 0.8][i % 8] },
                      ],
                    }
                  ]}>{char}</Text>
                ))}
              </View>
            </View>
          ) : null}
          <Image
            source={{ uri: selectedSticker.imageUrl }}
            style={styles.stickerOverlay}
            resizeMode="contain"
          />
        </>
      )}
      <TouchableOpacity
        style={styles.textSquare}
        onPress={() => navigation?.navigate('carta', { message: normalizedMessage, selectedSticker })}
        activeOpacity={0.8}
      >
        {normalizedMessage === '' ? (
          <Text style={[styles.text, { fontSize: 20 }]}>:(</Text>
        ) : (
          <Text style={[styles.text, { fontSize }]} numberOfLines={2} ellipsizeMode="tail">
            {normalizedMessage}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '43%',
    left: '70%',
    transform: [{ translateX: -125 }, { translateY: -75 }],
  },
  image: {
    width: 350,
    height: 200,
    resizeMode: 'contain',
  },
  textSquare: {
    position: 'absolute',
    top: 61,
    left: 137,
    width: 79.5,
    height: 71,
    borderWidth: 1,
    borderColor: '#fdfdfd23',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    fontFamily: 'Omori',
    color: 'black',
    textAlign: 'center',
  },
  stickerOverlay: {
    position: 'absolute',
    width: 69,
    height: 69,
    top: 62.5,
    left: 142.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffffff00',
    backgroundColor: 'transparent',
  },
  timerWrap: {
    position: 'absolute',
    top: 135,
    left: 200,
    transform: [{ rotate: '-7deg' }, { skewX: '-3deg' }],
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  timerChar: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 0,
    textShadowColor: 'rgba(20, 10, 0, 0.12)',
    textShadowOffset: { width: 0.4, height: 0.6 },
    textShadowRadius: 0.4,
  },
});

export default Mensajes;
