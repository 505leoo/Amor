import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const EventCreator = ({ onClose, onEventCreated }) => {
  const [eventName, setEventName] = useState('');
  const [subTabs, setSubTabs] = useState([
    { title: 'Próximos', image: null },
    { title: 'Pasados', image: null },
    { title: 'Favoritos', image: null },
    { title: 'Ideas', image: null }
  ]);
  const [loading, setLoading] = useState(false);

  const pickImage = async (index) => {
    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu galería para seleccionar imágenes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newSubTabs = [...subTabs];
      newSubTabs[index].image = result.assets[0].uri;
      setSubTabs(newSubTabs);
    }
  };

  const uploadImage = async (uri, path) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const imageRef = ref(storage, path);
    await uploadBytes(imageRef, blob);
    return await getDownloadURL(imageRef);
  };

  const createEvent = async () => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el evento');
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        id: eventName.toLowerCase().replace(/\s+/g, '_'),
        title: eventName,
        icon: 'calendar',
        subTabs: []
      };

      for (let i = 0; i < subTabs.length; i++) {
        const subTab = subTabs[i];
        let imageUrl = null;
        
        if (subTab.image) {
          const imagePath = `events/${eventData.id}/${subTab.title.toLowerCase()}.jpg`;
          imageUrl = await uploadImage(subTab.image, imagePath);
        }

        eventData.subTabs.push({
          title: subTab.title,
          imageUrl,
          content: {
            title: `${eventName} - ${subTab.title}`,
            description: `Contenido de ${subTab.title} para ${eventName}`,
            items: []
          }
        });
      }

      onEventCreated(eventData);
      Alert.alert('Éxito', 'Evento creado correctamente');
      onClose();
    } catch (error) {
      console.error('Error creando evento:', error);
      Alert.alert('Error', 'No se pudo crear el evento');
    } finally {
      setLoading(false);
    }
  };

  const updateSubTabTitle = (index, title) => {
    const newSubTabs = [...subTabs];
    newSubTabs[index].title = title;
    setSubTabs(newSubTabs);
  };

  const addSubTab = () => {
    setSubTabs([...subTabs, { title: 'Nuevo', image: null }]);
  };

  const removeSubTab = (index) => {
    if (subTabs.length > 1) {
      setSubTabs(subTabs.filter((_, i) => i !== index));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crear Nuevo Evento</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={24} color="#8b5a83" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nombre del Evento</Text>
          <TextInput
            style={styles.input}
            value={eventName}
            onChangeText={setEventName}
            placeholder="Ej: Aniversario, Cumpleaños..."
            placeholderTextColor="#8b5a83"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sub-categorías</Text>
            <TouchableOpacity onPress={addSubTab} style={styles.addButton}>
              <Feather name="plus" size={16} color="#d4a5c7" />
            </TouchableOpacity>
          </View>

          {subTabs.map((subTab, index) => (
            <View key={index} style={styles.subTabItem}>
              <View style={styles.subTabHeader}>
                <TextInput
                  style={styles.subTabInput}
                  value={subTab.title}
                  onChangeText={(text) => updateSubTabTitle(index, text)}
                  placeholder="Nombre de categoría"
                  placeholderTextColor="#8b5a83"
                />
                {subTabs.length > 1 && (
                  <TouchableOpacity onPress={() => removeSubTab(index)} style={styles.removeButton}>
                    <Feather name="trash-2" size={16} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.imageSelector}
                onPress={() => pickImage(index)}
              >
                {subTab.image ? (
                  <Text style={styles.imageSelectedText}>Imagen seleccionada ✓</Text>
                ) : (
                  <>
                    <Feather name="image" size={24} color="#8b5a83" />
                    <Text style={styles.imageSelectorText}>Seleccionar imagen</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createEvent}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creando...' : 'Crear Evento'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 199, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d1b2e',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d1b2e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.4)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#2d1b2e',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 165, 199, 0.2)',
  },
  subTabItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    borderRadius: 12,
  },
  subTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subTabInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.4)',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: '#2d1b2e',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
  },
  imageSelector: {
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 199, 0.4)',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageSelectorText: {
    fontSize: 14,
    color: '#8b5a83',
    marginTop: 4,
  },
  imageSelectedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#d4a5c7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default EventCreator;