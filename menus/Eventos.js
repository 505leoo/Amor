import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Eventos = ({ navigation }) => {
  const [daysSince, setDaysSince] = useState(1);
  
  useEffect(() => {
    const startDate = new Date('2026-02-14');
    const currentDate = new Date();
    const diffTime = currentDate - startDate;
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    setDaysSince(diffDays);
  }, []);

  const handleEventPress = () => {
    if (navigation) {
      navigation.navigate('ecos');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleEventPress} style={styles.eventCard}>
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.15)', 'rgba(180, 140, 50, 0.2)']}
          style={styles.gradientCard}
        >
          <View style={styles.topLeftLine} />
          <View style={styles.topRightLine} />
          <View style={styles.bottomLeftLine} />
          <View style={styles.bottomRightLine} />
          
          <View style={styles.daysBadge}>
            <Text style={[styles.daysText, { color: '#D4AF37' }]}>{daysSince}d</Text>
          </View>
          <Ionicons name="musical-notes" size={24} color="#D4AF37" />
          <Text style={[styles.eventTitle, { color: '#D4AF37' }]}>
            Ecos
          </Text>
          <Text style={[styles.eventSubtitle, { color: '#D4AF37' }]}>
            Escucha nuestro amor
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 85,
    left: 40,
    paddingLeft: 0,
    paddingRight: 0,
  },

  eventCard: {
    width: 180,
    height: 80,
    borderRadius: 1,
  },
  gradientCard: {
    width: 180,
    height: 80,
    borderRadius: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  daysBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  daysText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
    textAlign: 'center',
  },
  eventSubtitle: {
    fontSize: 11,
    color: '#7C4DFF',
    marginTop: 2,
    textAlign: 'center',
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
    marginLeft: 86,
  },
  topLeftLine: {
    position: 'absolute',
    top: -10,
    left: 0,
    width: 1,
    height: 10,
    backgroundColor: '#CCC',
  },
  topRightLine: {
    position: 'absolute',
    top: -10,
    right: 0,
    width: 1,
    height: 10,
    backgroundColor: '#CCC',
  },
  bottomLeftLine: {
    position: 'absolute',
    bottom: -10,
    left: 0,
    width: 1,
    height: 10,
    backgroundColor: '#CCC',
  },
  bottomRightLine: {
    position: 'absolute',
    bottom: -10,
    right: 0,
    width: 1,
    height: 10,
    backgroundColor: '#CCC',
  },
});

export default Eventos;