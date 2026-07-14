import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AnimatedSun = () => {
  const breatheAnim = useState(new Animated.Value(1))[0];
  const shimmerAnim = useState(new Animated.Value(0))[0];
  const coreRotateAnim = useState(new Animated.Value(0))[0];
  const raysRotateAnim = useState(new Animated.Value(0))[0];
  const glowPulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.08,
          duration: 4200,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0.95,
          duration: 3800,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1.05,
          duration: 2900,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    const coreRotateAnimation = Animated.loop(
      Animated.timing(coreRotateAnim, {
        toValue: 1,
        duration: 45000,
        useNativeDriver: true,
      })
    );

    const raysRotateAnimation = Animated.loop(
      Animated.timing(raysRotateAnim, {
        toValue: 1,
        duration: 60000,
        useNativeDriver: true,
      })
    );

    const glowPulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 1.3,
          duration: 5500,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 0.7,
          duration: 4200,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 1.1,
          duration: 3800,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 1,
          duration: 2900,
          useNativeDriver: true,
        }),
      ])
    );

    breatheAnimation.start();
    shimmerAnimation.start();
    coreRotateAnimation.start();
    raysRotateAnimation.start();
    glowPulseAnimation.start();

    return () => {
      breatheAnimation.stop();
      shimmerAnimation.stop();
      coreRotateAnimation.stop();
      raysRotateAnimation.stop();
      glowPulseAnimation.stop();
    };
  }, []);

  const coreRotateInterpolate = coreRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const raysRotateInterpolate = raysRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.sunContainer}>
      <Animated.View
        style={[
          styles.raysContainer,
          {
            transform: [{ rotate: raysRotateInterpolate }],
            opacity: shimmerOpacity,
          },
        ]}
      >
        {Array.from({ length: 16 }, (_, i) => (
          <SunRay
            key={i}
            rotation={i * 22.5}
            length={i % 2 === 0 ? 90 : 70}
            opacity={0.6}
          />
        ))}
      </Animated.View>

      <Animated.View
        style={[
          styles.sunOuterHalo,
          {
            transform: [{ scale: glowPulseAnim }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.sunHalo,
          {
            transform: [{ scale: breatheAnim }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.sunCore,
          {
            transform: [{ scale: breatheAnim }, { rotate: coreRotateInterpolate }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.sunInner,
          {
            transform: [{ scale: breatheAnim }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.sunCenter,
          {
            transform: [{ scale: breatheAnim }],
            opacity: shimmerOpacity,
          },
        ]}
      />
    </View>
  );
};

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

const SunRay = ({ rotation, length, opacity }) => (
  <View
    style={[
      styles.sunRay,
      {
        transform: [{ rotate: `${rotation}deg` }],
        width: length,
        opacity,
      },
    ]}
  />
);

const Cloud = ({ top, left, right, bottom, size }) => (
  <View style={[styles.cloudContainer, { top, left, right, bottom }]}>
    <View style={[styles.cloudPart, styles.cloudMain, { width: size, height: size * 0.65 }]} />
    <View style={[styles.cloudPart, styles.cloudLeft, { width: size * 0.8, height: size * 0.55, left: -size * 0.35 }]} />
    <View style={[styles.cloudPart, styles.cloudRight, { width: size * 0.85, height: size * 0.6, right: -size * 0.4 }]} />
    <View style={[styles.cloudPart, styles.cloudTop, { width: size * 0.7, height: size * 0.45, top: -size * 0.25 }]} />
    <View style={[styles.cloudPart, styles.cloudBottom, { width: size * 0.6, height: size * 0.4, bottom: -size * 0.15 }]} />
  </View>
);

const MiniCloud = ({ top, left, right, size }) => (
  <View style={[styles.miniCloudContainer, { top, left, right }]}>
    <View style={[styles.miniCloudPart, { width: size, height: size * 0.6 }]} />
    <View style={[styles.miniCloudPart, { width: size * 0.7, height: size * 0.5, left: -size * 0.25, top: size * 0.1 }]} />
    <View style={[styles.miniCloudPart, { width: size * 0.6, height: size * 0.4, right: -size * 0.2, top: size * 0.05 }]} />
  </View>
);

const Bubble = ({ size, delay, duration, startPos, startHeight }) => {
  const translateY = useState(new Animated.Value(0))[0];
  const translateX = useState(new Animated.Value(0))[0];
  const scale = useState(new Animated.Value(0.8))[0];
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -50,
              duration: duration * 0.5,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 50,
              duration: duration * 0.5,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: 30,
              duration: duration * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: -30,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 0,
              duration: duration * 0.3,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.1,
              duration: duration * 0.25,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.9,
              duration: duration * 0.25,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.8,
              duration: duration * 0.15,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: duration * 0.35,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          left: startPos,
          top: startHeight,
          transform: [{ translateY }, { translateX }, { scale }],
          opacity,
        },
      ]}
    >
      <View style={[styles.bubbleShine, { width: size * 0.3, height: size * 0.3, top: size * 0.15, left: size * 0.15 }]} />
    </Animated.View>
  );
};

const BioParticle = ({ top, left, delay }) => {
  const glow = useState(new Animated.Value(0.3))[0];
  const float = useState(new Animated.Value(0))[0];

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(glow, {
              toValue: 1,
              duration: 1500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glow, {
              toValue: 0.2,
              duration: 1500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(float, {
              toValue: -15,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(float, {
              toValue: 15,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.bioParticle,
        {
          top,
          left,
          opacity: glow,
          transform: [{ translateY: float }],
        },
      ]}
    />
  );
};

const Moon = () => {
  const breathe = useState(new Animated.Value(1))[0];
  const glow = useState(new Animated.Value(1))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.05, duration: 4000, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0.98, duration: 3500, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1.2, duration: 5000, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.9, duration: 4500, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <View style={styles.moonContainer}>
      <Animated.View style={[styles.moonGlow, { transform: [{ scale: glow }] }]} />
      <Animated.View style={[styles.moonHalo, { transform: [{ scale: breathe }] }]} />
      <Animated.View style={[styles.moonCore, { transform: [{ scale: breathe }] }]} />
      <View style={styles.moonCrater1} />
      <View style={styles.moonCrater2} />
      <View style={styles.moonCrater3} />
    </View>
  );
};

const SweetCake = () => {
  const breathe = useState(new Animated.Value(1))[0];
  const sparkle = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.03, duration: 3000, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0.98, duration: 2500, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkle, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(sparkle, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.cakeContainer, { transform: [{ scale: breathe }] }]}>
      <View style={styles.cakeBase} />
      <LinearGradient
        colors={['#FFB6C1', '#FFC0CB']}
        style={styles.cakeFrosting}
      />
      <View style={[styles.cakeCherry, { opacity: sparkle }]} />
      <View style={styles.cakeDecor1} />
      <View style={styles.cakeDecor2} />
    </Animated.View>
  );
};

const SweetBalloon = ({ x, y, color, delay }) => {
  const float = useState(new Animated.Value(0))[0];
  const sway = useState(new Animated.Value(0))[0];

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(float, { toValue: -20, duration: 3000, useNativeDriver: true }),
            Animated.timing(float, { toValue: 20, duration: 3000, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sway, { toValue: 10, duration: 2000, useNativeDriver: true }),
            Animated.timing(sway, { toValue: -10, duration: 2000, useNativeDriver: true }),
          ])
        ),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View 
      style={[
        styles.balloonContainer, 
        { 
          left: x, 
          top: y,
          transform: [{ translateY: float }, { translateX: sway }]
        }
      ]}
    >
      <LinearGradient
        colors={[color, '#FFFFFF80']}
        style={styles.balloon}
      />
      <View style={styles.balloonShine} />
      <View style={styles.balloonString} />
    </Animated.View>
  );
};

const SweetSparkle = ({ x, y, delay }) => {
  const sparkle = useState(new Animated.Value(0))[0];
  const rotate = useState(new Animated.Value(0))[0];

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkle, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(sparkle, { toValue: 0, duration: 800, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.timing(rotate, { toValue: 1, duration: 4000, useNativeDriver: true })
        ),
      ]).start();
    }, delay);
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View 
      style={[
        styles.sparkleContainer,
        {
          left: x,
          top: y,
          opacity: sparkle,
          transform: [{ rotate: rotateInterpolate }]
        }
      ]}
    >
      <View style={styles.sparkle} />
    </Animated.View>
  );
};



const starPositions = Array.from({ length: 80 }, () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  delay: Math.random() * 2000,
}));

const ThemeParticles = ({ particleType }) => {
  if (!particleType) return null;

  if (particleType === 'stars') {
    return (
      <View style={styles.container}>
        {starPositions.map((star, i) => (
          <Star key={i} top={star.top} left={star.left} delay={star.delay} />
        ))}
      </View>
    );
  }

  if (particleType === 'goldenParticles') {
    return (
      <View style={styles.container}>
        <AnimatedSun />

        <Cloud top="3%" left="2%" size={65} />
        <Cloud top="6%" right="4%" size={70} />
        <Cloud bottom="8%" left="6%" size={60} />
        <Cloud bottom="5%" right="3%" size={75} />
        <Cloud top="55%" left="15%" size={45} />
        <Cloud top="70%" right="12%" size={50} />

        <MiniCloud top="18%" left="25%" size={30} />
        <MiniCloud top="22%" right="25%" size={28} />
        <MiniCloud bottom="25%" left="35%" size={32} />
        <MiniCloud bottom="30%" right="40%" size={35} />
        <MiniCloud top="80%" left="60%" size={25} />

        <View style={styles.ambientGlow} />
        <View style={styles.ambientGlow2} />
      </View>
    );
  }

  if (particleType === 'ocean') {
    const bubbles = Array.from({ length: 30 }, (_, i) => ({
      size: 8 + Math.random() * 20,
      delay: Math.random() * 5000,
      duration: 10000 + Math.random() * 8000,
      startPos: `${Math.random() * 100}%`,
      startHeight: `${Math.random() * 100}%`,
    }));

    const bioParticles = Array.from({ length: 50 }, (_, i) => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 3000,
    }));

    return (
      <View style={styles.container}>
        {bioParticles.map((particle, i) => (
          <BioParticle key={`bio-${i}`} top={particle.top} left={particle.left} delay={particle.delay} />
        ))}

        {bubbles.map((bubble, i) => (
          <Bubble
            key={`bubble-${i}`}
            size={bubble.size}
            delay={bubble.delay}
            duration={bubble.duration}
            startPos={bubble.startPos}
            startHeight={bubble.startHeight}
          />
        ))}
      </View>
    );
  }

  if (particleType === 'moonlight') {
    const stars = Array.from({ length: 60 }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2000,
    }));

    return (
      <View style={styles.container}>
        {stars.map((star, i) => (
          <Star key={i} top={star.top} left={star.left} delay={star.delay} />
        ))}
        <Moon />
        <MoonCloud top="10%" left="5%" size={50} delay={0} />
        <MoonCloud top="15%" right="8%" size={45} delay={1000} />
        <MoonCloud top="70%" left="10%" size={40} delay={2000} />
      </View>
    );
  }

  if (particleType === 'sweetCake') {
    const balloons = [
      { x: '15%', y: '20%', color: '#FF69B4', delay: 0 },
      { x: '75%', y: '15%', color: '#FFB6C1', delay: 500 },
      { x: '10%', y: '60%', color: '#FFC0CB', delay: 1000 },
      { x: '80%', y: '65%', color: '#FF1493', delay: 1500 },
      { x: '25%', y: '80%', color: '#FFCCCB', delay: 2000 },
      { x: '70%', y: '85%', color: '#FF69B4', delay: 2500 },
    ];

    const sparkles = Array.from({ length: 20 }, (_, i) => ({
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      delay: Math.random() * 3000,
    }));

    return (
      <View style={styles.container}>
        <SweetCake />
        {balloons.map((balloon, i) => (
          <SweetBalloon
            key={i}
            x={balloon.x}
            y={balloon.y}
            color={balloon.color}
            delay={balloon.delay}
          />
        ))}
        {sparkles.map((sparkle, i) => (
          <SweetSparkle
            key={i}
            x={sparkle.x}
            y={sparkle.y}
            delay={sparkle.delay}
          />
        ))}
      </View>
    );
  }



  return null;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },

  sunContainer: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    width: 200,
    height: 200,
    marginTop: -100,
    marginLeft: -100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  raysContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunOuterHalo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
  },
  sunHalo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
  },
  sunCore: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#FFD700',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 20,
  },
  sunInner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF8DC',
    shadowColor: '#FFFFE0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
  },
  sunCenter: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#FFFACD',
    shadowColor: '#FFFFF0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  sunRay: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  cloudContainer: {
    position: 'absolute',
  },
  cloudPart: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 100,
    shadowColor: 'rgba(255, 215, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  cloudMain: {
    zIndex: 5,
  },
  cloudLeft: {
    zIndex: 4,
    top: '12%',
  },
  cloudRight: {
    zIndex: 4,
    top: '8%',
  },
  cloudTop: {
    zIndex: 3,
    left: '20%',
  },
  cloudBottom: {
    zIndex: 2,
    left: '25%',
  },

  miniCloudContainer: {
    position: 'absolute',
  },
  miniCloudPart: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 50,
    shadowColor: 'rgba(255, 165, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },

  ambientGlow: {
    position: 'absolute',
    top: '25%',
    left: '35%',
    width: '30%',
    height: '30%',
    borderRadius: 200,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 80,
  },
  ambientGlow2: {
    position: 'absolute',
    top: '20%',
    left: '30%',
    width: '40%',
    height: '40%',
    borderRadius: 300,
    backgroundColor: 'rgba(255, 165, 0, 0.05)',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 100,
  },

  bubble: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  bubbleShine: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },

  bioParticle: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#00ffff',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  moonContainer: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  moonGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(200, 180, 255, 0.1)',
    shadowColor: '#C8B4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
  },

  moonHalo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(220, 200, 255, 0.15)',
    shadowColor: '#DCC8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
  },

  moonCore: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0E6FF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
  },

  moonCrater1: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 180, 230, 0.3)',
    top: 25,
    left: 35,
  },

  moonCrater2: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 180, 230, 0.25)',
    top: 50,
    right: 30,
  },

  moonCrater3: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(200, 180, 230, 0.2)',
    bottom: 35,
    left: 45,
  },

  moonCloudContainer: {
    position: 'absolute',
  },

  cakeContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -75,
    marginTop: -40,
  },

  cakeBase: {
    width: 150,
    height: 60,
    backgroundColor: '#F4A460',
    borderRadius: 8,
    shadowColor: '#DEB887',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },

  cakeFrosting: {
    position: 'absolute',
    top: -15,
    left: 10,
    width: 130,
    height: 25,
    borderRadius: 15,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },

  cakeCherry: {
    position: 'absolute',
    top: -20,
    left: 70,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF1493',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  cakeDecor1: {
    position: 'absolute',
    top: -12,
    left: 40,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF69B4',
  },

  cakeDecor2: {
    position: 'absolute',
    top: -12,
    right: 40,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF69B4',
  },

  balloonContainer: {
    position: 'absolute',
    width: 40,
    height: 60,
  },

  balloon: {
    width: 40,
    height: 50,
    borderRadius: 20,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  balloonShine: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF80',
  },

  balloonString: {
    position: 'absolute',
    bottom: -10,
    left: 19,
    width: 1,
    height: 20,
    backgroundColor: '#666',
  },

  sparkleContainer: {
    position: 'absolute',
    width: 8,
    height: 8,
  },

  sparkle: {
    width: 8,
    height: 8,
    backgroundColor: '#FFB6C1',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  mountainSilhouette: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 200,
    borderTopRightRadius: 150,
  },






});

export default ThemeParticles;
