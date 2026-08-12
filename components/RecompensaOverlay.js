import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import LottieView from 'lottie-react-native';

export default function RecompensaOverlay({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <LottieView
          source={require('../assets/Lottie/reward.json')}
          autoPlay loop style={s.lottie}
        />
        <View onStartShouldSetResponder={() => true}>
          {children}
        </View>
        <Text style={s.hint}>toca para continuar</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(6,0,10,0.88)' },
  lottie:  { position: 'absolute', width: 420, height: 420 },
  hint:    { position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Delius', letterSpacing: 1 },
});
