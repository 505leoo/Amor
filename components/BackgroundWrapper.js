import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';

const Star = ({ top, left, delay }) => {
  const opacity = useState(new Animated.Value(0.3 + Math.random() * 0.7))[0];

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.1,
          duration: 800 + Math.random() * 1200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 800 + Math.random() * 1200,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    setTimeout(animate, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.star,
        { top, left, opacity },
      ]}
    />
  );
};

const SunRay = ({ top, left, delay }) => {
  const opacity = useState(new Animated.Value(0.2 + Math.random() * 0.5))[0];

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.1,
          duration: 1500 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1500 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    setTimeout(animate, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.sunray,
        { top, left, opacity },
      ]}
    />
  );
};

const BackgroundWrapper = ({ children }) => {
  const { getTheme } = useTheme();
  const theme = getTheme();
  
  const [particlePositions] = useState(() => 
    [...Array(30)].map((_, i) => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 3000
    }))
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.particlesContainer}>
          {particlePositions.map((particle, i) => (
            theme.particles === 'stars' ? (
              <Star
                key={i}
                top={particle.top}
                left={particle.left}
                delay={particle.delay}
              />
            ) : (
              <SunRay
                key={i}
                top={particle.top}
                left={particle.left}
                delay={particle.delay}
              />
            )
          ))}
        </View>
        {children}
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
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  sunray: {
    position: 'absolute',
    width: 3,
    height: 15,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});

export default BackgroundWrapper;