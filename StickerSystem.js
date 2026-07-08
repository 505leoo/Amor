import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import Stickers from './Stickers';
import Tienda from './Tienda';
import Coleccion from './Coleccion';

const StickerSystem = () => {
  const [showStickers, setShowStickers] = useState(false);
  const [showTienda, setShowTienda] = useState(false);
  const [showColeccion, setShowColeccion] = useState(false);

  return (
    <View style={styles.container}>
      {/* Botón para abrir stickers */}
      <Stickers 
        onOpenTienda={() => setShowTienda(true)}
        onOpenColeccion={() => setShowColeccion(true)}
      />

      {/* Modal de la Tienda */}
      <Modal
        visible={showTienda}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTienda(false)}
      >
        <Tienda onClose={() => setShowTienda(false)} />
      </Modal>

      {/* Modal de la Colección */}
      <Modal
        visible={showColeccion}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowColeccion(false)}
      >
        <Coleccion onClose={() => setShowColeccion(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default StickerSystem;