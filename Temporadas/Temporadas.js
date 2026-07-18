import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import TabButtons from '../components/TabButtons';

const Temporadas = ({ navigation }) => {
  const floatAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -1.2, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 1.2,  duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <Image
        source={require('../assets/paredes/pared3.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory"
      />

      <TabButtons onExit={() => navigation?.navigate?.('main')} customAddButton={<View />} />

      <Animated.View style={[s.imageWrap, { transform: [{ translateY: floatAnim }] }]}>
        <ExpoImage
          source={require('../assets/temporadas/libro/libro2.png')}
          style={s.image}
          contentFit="contain"
          contentPosition="center"
          cachePolicy="memory"
        />
      </Animated.View>
      <TouchableOpacity style={s.seasonBtn} onPress={() => navigation?.navigate?.('temporada1')}>
        <ExpoImage source={require('../assets/temporadas/libro/Temporada1/logo1.png')} style={s.cardImg} contentFit="contain" cachePolicy="memory" />
        <Text style={s.cardLabel}>Temporada 1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.seasonBtn, { left: 288 }]} onPress={() => navigation?.navigate?.('temporada2')}>
        <ExpoImage source={require('../assets/temporadas/libro/Temporada1/logo1.png')} style={s.cardImg} contentFit="contain" cachePolicy="memory" />
        <Text style={s.cardLabel}>Temporada 2</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.seasonBtn, { top: '50%' }]} onPress={() => navigation?.navigate?.('temporada3')}>
        <ExpoImage source={require('../assets/temporadas/libro/Temporada1/logo1.png')} style={s.cardImg} contentFit="contain" cachePolicy="memory" />
        <Text style={s.cardLabel}>Temporada 3</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.seasonBtn, { left: 288, top: '50%' }]} onPress={() => navigation?.navigate?.('temporada4')}>
        <ExpoImage source={require('../assets/temporadas/libro/Temporada1/logo1.png')} style={s.cardImg} contentFit="contain" cachePolicy="memory" />
        <Text style={s.cardLabel}>Temporada 4</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrap: {
    width: '145%',
    height: '120%',
    alignSelf: 'center',
  },
  seasonBtn: {
    position: 'absolute',
    left: 195,
    top: '21%',
    width: 75,
    height: 95,
    backgroundColor: '#fcf7d0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardImg: {
    width: '88%',
    height: '76%',
    marginTop: -12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardLabel: {
    color: '#333',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  image: {
    width: '110%',
    height: '110%',
    top: -24,
    left: -45,
  },
});

export default Temporadas;
