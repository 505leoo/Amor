import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { getDownloadURL } from 'firebase/storage';
import { auth, db } from '../firebaseConfig';
import { Buffer } from 'buffer';

const StickerUploader = ({ visible, onClose, onSuccess }) => {
  const [uploadData, setUploadData] = useState({
    name: '',
    price: 5,
    rarity: 'Común',
    category: 'Personajes',
    season: 'goldenDawn',
    file: null
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadType, setUploadType] = useState('images');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const adjustPrice = (amount) => {
    const newPrice = Math.max(1, uploadData.price + amount);
    setUploadData({ ...uploadData, price: newPrice });
  };

  const showSuccessMessage = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setUploadData({ name: '', price: 5, rarity: 'Común', category: 'Personajes', season: 'goldenDawn', file: null });
      onSuccess();
      onClose();
    }, 2000);
  };

  const isAudioCategory = () => uploadData.category === 'Otros';
  
  const getFileTypeText = () => isAudioCategory() ? 'Música' : 'Imagen';
  
  const getFileIcon = () => isAudioCategory() ? 'music-note' : 'add-a-photo';

  const getNamePlaceholder = () => {
    if (uploadData.category === 'Stickers') return 'Nombre del sticker';
    if (uploadData.category === 'Personajes') return 'Nombre del personaje';
    return 'Nombre del elemento';
  };

  const pickFile = async () => {
    if (isAudioCategory()) {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled) {
        setUploadData({ ...uploadData, file: result.assets[0] });
      }
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadData({ ...uploadData, file: result.assets[0] });
      }
    }
  };

  const uploadSticker = async () => {
    if (!uploadData.name || !uploadData.file) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    // Verificar nombre duplicado
    try {
      const q = query(
        collection(db, 'stickers'), 
        where('name', '==', uploadData.name.trim())
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        Alert.alert('❌ Nombre duplicado', 'Ya existe un sticker con este nombre. Elige otro nombre.');
        return;
      }
    } catch (error) {
      console.error('Error checking name:', error);
      Alert.alert('Error', 'No se pudo verificar el nombre');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    onClose();

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }

      setUploadProgress(20);

      // Leer archivo como base64
      const base64 = await FileSystem.readAsStringAsync(uploadData.file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      setUploadProgress(60);
      
      // Obtener token de Firebase
      const token = await user.getIdToken();
      const storagePath = isAudioCategory() ? 'music' : 'stickers';
      
      // Detectar MIME type del archivo
      let mimeType = uploadData.file.mimeType;
      if (!mimeType) {
        const fileName = uploadData.file.name || uploadData.file.uri;
        const extension = fileName.split('.').pop()?.toLowerCase();
        
        if (extension === 'png') {
          mimeType = 'image/png';
        } else if (extension === 'jpg' || extension === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (extension === 'gif') {
          mimeType = 'image/gif';
        } else if (extension === 'webp') {
          mimeType = 'image/webp';
        } else if (isAudioCategory()) {
          mimeType = 'audio/mpeg';
        } else {
          mimeType = 'image/jpeg';
        }
      }
      
      const fileNameUpload = `${Date.now()}_${uploadData.name}`;
      const fullPath = `${storagePath}/${fileNameUpload}`;
      
      // Usar API REST de Firebase Storage con storageBucket correcto
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/amor-9df0d.firebasestorage.app/o/${encodeURIComponent(fullPath)}?uploadType=media`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
          'Authorization': `Bearer ${token}`
        },
        body: Buffer.from(base64, 'base64')
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      setUploadProgress(95);
      
      // Construir URL de descarga
      const fileUrl = `https://firebasestorage.googleapis.com/v0/b/amor-9df0d.firebasestorage.app/o/${encodeURIComponent(fullPath)}?alt=media`;

      const firestoreCategory = uploadData.category === 'Stickers' ? 'StickerCarta' : uploadData.category;
      const docData = {
        name: uploadData.name.trim(),
        price: uploadData.price,
        rarity: uploadData.rarity,
        category: firestoreCategory,
        season: uploadData.season,
        createdBy: user.uid,
        createdAt: new Date()
      };
      
      if (isAudioCategory()) {
        docData.audioUrl = fileUrl;
      } else {
        docData.imageUrl = fileUrl;
      }

      await addDoc(collection(db, 'stickers'), docData);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadData({ name: '', price: 5, rarity: 'Común', category: 'Personajes', season: 'goldenDawn', file: null });
        onSuccess();
        Alert.alert('✅ Éxito', `${isAudioCategory() ? 'Música' : 'Sticker'} subido correctamente`);
      }, 500);
      
    } catch (error) {
      console.error('Error uploading:', error);
      setIsUploading(false);
      setUploadProgress(0);
      Alert.alert('Error', `No se pudo subir ${isAudioCategory() ? 'la música' : 'el sticker'}. Inténtalo de nuevo.`);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Común': return '#95a5a6';
      case 'Épico': return '#9b59b6';
      case 'Legendario': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#ffeef8', '#f8e8ff']}
            style={styles.background}
          />
          
          <View style={styles.header}>
            <MaterialIcons name="cloud-upload" size={28} color="#8b5a83" />
            <View style={styles.typeToggle}>
              <TouchableOpacity 
                style={[styles.toggleButton, uploadType === 'images' && styles.activeToggle]}
                onPress={() => {
                  setUploadType('images');
                  setUploadData({ ...uploadData, category: 'Personajes', file: null });
                }}
              >
                <MaterialIcons name="image" size={16} color={uploadType === 'images' ? '#fff' : '#8b5a83'} />
                <Text style={[styles.toggleText, uploadType === 'images' && styles.activeToggleText]}>Imágenes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, uploadType === 'audio' && styles.activeToggle]}
                onPress={() => {
                  setUploadType('audio');
                  setUploadData({ ...uploadData, category: 'Otros', file: null });
                }}
              >
                <MaterialIcons name="music-note" size={16} color={uploadType === 'audio' ? '#fff' : '#8b5a83'} />
                <Text style={[styles.toggleText, uploadType === 'audio' && styles.activeToggleText]}>Otros</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#8b5a83" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.imageSection}>
              <TouchableOpacity style={styles.imageContainer} onPress={pickFile}>
                {uploadData.file ? (
                  isAudioCategory() ? (
                    <View style={styles.audioPreview}>
                      <MaterialIcons name="music-note" size={40} color="#8b5a83" />
                      <Text style={styles.audioName} numberOfLines={2}>{uploadData.file.name}</Text>
                    </View>
                  ) : (
                    <Image 
                      source={{ uri: uploadData.file.uri }}
                      style={styles.previewImage}
                    />
                  )
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name={getFileIcon()} size={32} color="#ccc" />
                    <Text style={styles.placeholderText}>{getFileTypeText()}</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.imageControls}>
                <Text style={styles.controlLabel}>Rareza:</Text>
                <View style={styles.rarityButtons}>
                  {['Común', 'Épico', 'Legendario'].map((rarity) => (
                    <TouchableOpacity
                      key={rarity}
                      style={[
                        styles.rarityButtonSmall,
                        { backgroundColor: getRarityColor(rarity) },
                        uploadData.rarity === rarity && styles.selectedRarity
                      ]}
                      onPress={() => setUploadData({ ...uploadData, rarity })}
                    >
                      <Text style={styles.rarityButtonTextSmall}>{rarity[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <TextInput
                style={styles.input}
                placeholder={getNamePlaceholder()}
                value={uploadData.name}
                onChangeText={(text) => {
                  if (text.length <= 16) {
                    setUploadData({ ...uploadData, name: text });
                  }
                }}
                maxLength={16}
              />
              
              <View style={styles.priceSection}>
                <Text style={styles.rarityLabel}>Precio: {uploadData.price} 💎</Text>
                <View style={styles.priceControls}>
                  <TouchableOpacity style={styles.priceButton} onPress={() => adjustPrice(-5)}>
                    <Text style={styles.priceButtonText}>-5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.priceButton} onPress={() => adjustPrice(-1)}>
                    <Text style={styles.priceButtonText}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.priceButton} onPress={() => adjustPrice(1)}>
                    <Text style={styles.priceButtonText}>+1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.priceButton} onPress={() => adjustPrice(5)}>
                    <Text style={styles.priceButtonText}>+5</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {uploadType === 'images' && (
                <View style={styles.raritySection}>
                  <Text style={styles.rarityLabel}>Categoría:</Text>
                  <View style={styles.rarityButtons}>
                    {['Personajes', 'Stickers', 'Emoticonos', 'Marcos', 'Insignias'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          uploadData.category === cat && styles.selectedCategory
                        ]}
                        onPress={() => {
                          setUploadData({ ...uploadData, category: cat, file: null });
                        }}
                      >
                        <Text style={styles.categoryButtonText}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.raritySection}>
                <Text style={styles.rarityLabel}>Temporada:</Text>
                <View style={styles.rarityButtons}>
                  <TouchableOpacity
                    style={[styles.seasonButton, uploadData.season === 'goldenDawn' && styles.selectedSeason]}
                    onPress={() => setUploadData({ ...uploadData, season: 'goldenDawn' })}
                  >
                    <Text style={styles.seasonButtonText}>Temporada 1</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  isUploading && styles.disabledButton
                ]} 
                onPress={uploadSticker}
                disabled={isUploading}
              >
                <MaterialIcons name="cloud-upload" size={16} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {isUploading ? 'Subiendo...' : 'Subir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      
      {isUploading && (
        <View style={styles.progressOverlay}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Subiendo... {Math.round(uploadProgress)}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        </View>
      )}
      
      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successMessage}>
            <MaterialIcons name="check-circle" size={60} color="#27ae60" />
            <Text style={styles.successTitle}>¡{isAudioCategory() ? 'Música' : 'Sticker'} subido!</Text>
            <Text style={styles.successSubtitle}>Se ha añadido correctamente a la tienda</Text>
          </View>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '95%',
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 4,
  },
  activeToggle: {
    backgroundColor: '#8b5a83',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5a83',
  },
  activeToggleText: {
    color: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8b5a83',
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    flex: 1,
  },
  imageSection: {
    flex: 1,
    marginRight: 12,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  placeholderText: {
    marginTop: 10,
    color: '#999',
    fontSize: 14,
  },
  formSection: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  raritySection: {
    marginBottom: 8,
  },
  rarityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  rarityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rarityButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginHorizontal: 1,
    alignItems: 'center',
  },
  selectedRarity: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  rarityButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 6,
    marginHorizontal: 1,
    alignItems: 'center',
    backgroundColor: '#95a5a6',
  },
  selectedCategory: {
    backgroundColor: '#3498db',
    borderWidth: 2,
    borderColor: '#fff',
  },
  categoryButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  seasonButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 6,
    marginHorizontal: 1,
    alignItems: 'center',
    backgroundColor: '#e67e22',
  },
  selectedSeason: {
    backgroundColor: '#27ae60',
    borderWidth: 2,
    borderColor: '#fff',
  },
  seasonButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#8b5a83',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    gap: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rarityButtonTextSmall: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  imageControls: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  rarityButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  priceSection: {
    marginBottom: 8,
  },
  priceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  priceButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  priceButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successMessage: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 250,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 15,
    marginBottom: 5,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  audioPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    gap: 8,
  },
  audioName: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  disabledButton: {
    backgroundColor: '#bbb',
    opacity: 0.6,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 200,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  progressBar: {
    width: 150,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5a83',
    borderRadius: 2,
  },
});

export default StickerUploader;