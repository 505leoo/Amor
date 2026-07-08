import React from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';

const Mensajes = ({ message = 'Hola', navigation }) => {
  const [fontsLoaded] = useFonts({ Omori: require('../fonts/Omori.ttf') });
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
      <TouchableOpacity
        style={styles.textSquare}
        onPress={() => navigation?.navigate('carta', { message: normalizedMessage })}
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
    top: '50%',
    left: '80%',
    transform: [{ translateX: -125 }, { translateY: -75 }],
  },
  image: {
    width: 250,
    height: 150,
    resizeMode: 'contain',
  },
  textSquare: {
    position: 'absolute',
    top: 48,
    left: 99,
    width: 55,
    height: 49,
    borderWidth: 1,
    borderColor: '#e6e6e621',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    fontFamily: 'Omori',
    color: 'black',
    textAlign: 'center',
  },
});

export default Mensajes;
