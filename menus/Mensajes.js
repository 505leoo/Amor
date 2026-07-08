import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';

const Mensajes = ({ message = 'Hola', navigation, selectedSticker: initialSticker }) => {
  const [fontsLoaded] = useFonts({ Omori: require('../fonts/Omori.ttf') });
  const [selectedSticker, setSelectedSticker] = useState(initialSticker || null);

  useEffect(() => {
    setSelectedSticker(initialSticker || null);
  }, [initialSticker]);

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
          <Text style={styles.timerText}>24h</Text>
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
  timerText: {
    position: 'absolute',
    top: 45,
    left: 165,
    fontFamily: 'Omori',
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default Mensajes;
