import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const TabButtons = ({ onExit, userMoney, onAddSticker, onStopMusic, title, customAddButton }) => {
  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}
      <TouchableOpacity 
        onPress={() => {
          if (onStopMusic) onStopMusic();
          onExit();
        }}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        <LinearGradient
          colors={['#6c757d', '#5a6268']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.exitButton}
        >
          <Text style={styles.exitText}>Salir</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <View style={styles.rightButtons}>
        {customAddButton ? customAddButton : (
          <TouchableOpacity 
            onPress={onAddSticker}
            activeOpacity={0.7}
            style={styles.touchable}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButton}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        <LinearGradient
          colors={['#f093fb', '#f5576c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.moneyButton}
        >
          <MaterialIcons name="diamond" size={16} color="#fff" />
          <Text style={styles.moneyText}>{userMoney}</Text>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  touchable: {
    pointerEvents: 'auto',
  },
  exitButton: {
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  exitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moneyButton: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderBottomLeftRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moneyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 80,
    zIndex: -1,
    pointerEvents: 'none',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
});

export default TabButtons;
