import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, TextInput, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import Amistades from './menus/Amistades';
import { signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import NotificationSystem from './utils/NotificationSystem';

const { width } = Dimensions.get('window');

const Menu = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [textOpacity] = useState(new Animated.Value(1));
  
  // Estados para creación de eventos
  const [creationStep, setCreationStep] = useState(0);
  const [eventName, setEventName] = useState('');
  const [eventIcon, setEventIcon] = useState('calendar');
  const [currentSubTabs, setCurrentSubTabs] = useState([{ title: '', image: null }]);
  const [editingSubTab, setEditingSubTab] = useState(null);
  
  // Estados para edición de tabs
  const [editStep, setEditStep] = useState(0);
  const [selectedTabForEdit, setSelectedTabForEdit] = useState(null);
  const [selectedSubTabForEdit, setSelectedSubTabForEdit] = useState(null);
  
  const tabs = [
    {
      id: 'eventos',
      title: 'Eventos',
      icon: 'calendar',
      subTabs: [
        {
          title: 'Pistas',
          content: {
            isImage: true
          }
        }
      ]
    },
    {
      id: 'creation',
      title: 'Creación',
      icon: 'plus-circle',
      subTabs: [
        {
          title: 'Nuevo',
          content: {
            title: 'Crear Nuevo Evento',
            description: 'Sigue los pasos para crear tu evento personalizado.',
            isCreation: true
          }
        },
        {
          title: 'Edición',
          content: {
            title: 'Editar Tabs Existentes',
            description: 'Modifica tabs y sub-tabs ya creados.',
            isEdition: true
          }
        }
      ]
    },
    {
      id: 'friends',
      title: 'Conexiones',
      icon: 'users',
      subTabs: [
        {
          title: 'Conexiones',
          content: {
            isFriendsModule: true
          }
        }
      ]
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: 'settings',
      subTabs: [
        {
          title: 'General',
          content: {
            title: 'Configuración General',
            description: 'Ajustes básicos de la aplicación.',
          }
        },
        {
          title: 'Cuenta',
          content: {
            title: 'Cuenta',
            description: '',
            items: [],
            hasLogout: true
          }
        },
        {
          title: 'Datos',
          content: {
            title: 'Gestión de Datos',
            description: 'Controla tus datos y respaldos.',
            items: ['• Exportar datos', '• Crear respaldo', '• Eliminar datos']
          }
        },
        {
          title: 'Ayuda',
          content: {
            title: 'Ayuda y Soporte',
            description: 'Encuentra ayuda y contacta con soporte.',
            items: ['• Preguntas frecuentes', '• Contactar soporte', '• Reportar problema']
          }
        }
      ]
    }
  ];

  const iconOptions = ['calendar', 'heart', 'star', 'gift', 'music', 'camera', 'coffee', 'home'];

  const resetCreationSteps = () => {
    setCreationStep(0);
    setEventName('');
    setEventIcon('calendar');
    setCurrentSubTabs([{ title: '', image: null }]);
    setEditingSubTab(null);
  };

  const resetEditSteps = () => {
    setEditStep(0);
    setSelectedTabForEdit(null);
    setSelectedSubTabForEdit(null);
  };

  const addSubTab = () => {
    setCurrentSubTabs([...currentSubTabs, { title: '', image: null }]);
  };

  const updateSubTabTitle = (index, title) => {
    const updated = [...currentSubTabs];
    updated[index].title = title;
    setCurrentSubTabs(updated);
  };

  const addSubTabToExisting = (tabIndex) => {
    if (allTabs[tabIndex]?.subTabs.length >= 4) {
      return;
    }
    
    const newSubTab = {
      title: `Nuevo ${allTabs[tabIndex]?.subTabs.length + 1}`,
      content: {
        title: `Nuevo contenido ${allTabs[tabIndex]?.subTabs.length + 1}`,
        description: 'Descripción del nuevo subtab',
        items: []
      }
    };
    
    if (tabIndex >= 3) {
      const updatedCustomTabs = [...customTabs];
      const customTabIndex = tabIndex - 3;
      updatedCustomTabs[customTabIndex].subTabs.push(newSubTab);
      setCustomTabs(updatedCustomTabs);
    } else {
      // Para tabs predefinidos, agregar al array original temporalmente
      const updatedTabs = [...tabs];
      updatedTabs[tabIndex].subTabs.push(newSubTab);
      // Forzar re-render actualizando el estado
      setSelectedSubTabForEdit(null);
    }
  };

  const removeSubTab = (index) => {
    if (currentSubTabs.length > 1) {
      setCurrentSubTabs(currentSubTabs.filter((_, i) => i !== index));
    }
  };

  const handleEventCreated = (eventData) => {
    setCustomTabs([...customTabs, eventData]);
    resetCreationSteps();
  };

  const createEvent = () => {
    if (!eventName.trim()) return;
    
    const eventData = {
      id: eventName.toLowerCase().replace(/\s+/g, '_'),
      title: eventName,
      icon: eventIcon,
      subTabs: currentSubTabs.filter(st => st.title.trim()).map(subTab => ({
        title: subTab.title,
        content: {
          title: `${eventName} - ${subTab.title}`,
          description: `Contenido de ${subTab.title} para ${eventName}`,
          items: []
        }
      }))
    };
    
    handleEventCreated(eventData);
  };

  const allTabs = [...tabs, ...customTabs];

  useEffect(() => {
    // allow external navigation to open a specific tab (e.g. from Hud2)
    const openId = (navigation && navigation.getParam && navigation.getParam('openTabId')) || (typeof route !== 'undefined' && route?.params?.openTabId);
    if (openId) {
      const idx = allTabs.findIndex(t => t.id === openId);
      if (idx >= 0) {
        setActiveTab(idx);
        setActiveSubTab(0);
      }
    }
  }, [route?.params?.openTabId, customTabs]);

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              const uid = auth.currentUser?.uid;
              if (uid) await NotificationSystem.clearPushTokenForUser(uid);
              await signOut(auth);
              if (navigation && typeof navigation.reset === 'function') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else if (navigation && typeof navigation.navigate === 'function') {
                // App.js expects lowercase screen keys like 'login'
                navigation.navigate('login');
              } else {
                
              }
            } catch (error) {
              console.error('Logout error:', error);
              const msg = (error && (error.message || error.toString())) || 'No se pudo cerrar la sesión';
              Alert.alert('Error', msg);
            }
          }
        }
      ]
    );
  };

  const handleClose = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate('main');
    }
  };

  useEffect(() => {
    const textAnimation = () => {
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ]).start(() => textAnimation());
    };
    
    textAnimation();
  }, [textOpacity]);

  const renderContent = () => {
    const currentContent = allTabs[activeTab].subTabs[activeSubTab].content;
    
    if (currentContent.isCreation) {
      return renderCreationSteps();
    }
    
    if (currentContent.isEdition) {
      return renderEditionSteps();
    }
    
    if (currentContent.isImage) {
      return (
        <TouchableOpacity 
          style={styles.pistasImageContainer}
          onPress={() => navigation && navigation.navigate('pistas')}
        >
          <Image 
            source={require('./assets/menu/pistas.png')}
            style={styles.pistasImage}
            resizeMode="cover"
          />
          <Animated.Text style={[styles.moreInfoText, { opacity: textOpacity }]}>Más información</Animated.Text>
        </TouchableOpacity>
      );
    }

    if (currentContent.isFriendsModule) {
      return (
        <Amistades navigation={navigation} />
      );
    }
    
    return (
      <View style={styles.infoContent}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoTitle}>{currentContent.title}</Text>
          <Text style={styles.infoDescription}>{currentContent.description}</Text>
        </View>
        
        {currentContent.items && currentContent.items.length > 0 && (
          <View style={styles.itemsList}>
            {currentContent.items.map((item, index) => (
              <View 
                key={index} 
                style={styles.itemContainer}
              >
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
        
        {currentContent.hasLogout && (
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Feather name="log-out" size={16} color="#fff" />
              <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}
        

      </View>
    );
  };

  const renderCreationSteps = () => {
    switch (creationStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Nombre e Icono del Evento</Text>
              <TouchableOpacity
                style={[styles.nextButton, !eventName.trim() && styles.nextButtonDisabled]}
                onPress={() => eventName.trim() && setCreationStep(1)}
                disabled={!eventName.trim()}
              >
                <Text style={styles.nextButtonText}>Siguiente</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.compactRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Nombre:</Text>
                <TextInput
                  style={styles.compactInput}
                  value={eventName}
                  onChangeText={setEventName}
                  placeholder="Ej: Aniversario"
                  placeholderTextColor="#8b5a83"
                />
              </View>
              
              <View style={styles.iconHalf}>
                <Text style={styles.inputLabel}>Icono:</Text>
                <View style={styles.compactIconGrid}>
                  {iconOptions.slice(0, 4).map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.compactIconOption, eventIcon === icon && styles.selectedIcon]}
                      onPress={() => setEventIcon(icon)}
                    >
                      <Feather name={icon} size={16} color={eventIcon === icon ? '#fff' : '#8b5a83'} />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.compactIconGrid}>
                  {iconOptions.slice(4).map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.compactIconOption, eventIcon === icon && styles.selectedIcon]}
                      onPress={() => setEventIcon(icon)}
                    >
                      <Feather name={icon} size={16} color={eventIcon === icon ? '#fff' : '#8b5a83'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
        
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Crear Sub-tabs</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setCreationStep(0)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, currentSubTabs.every(st => !st.title.trim()) && styles.nextButtonDisabled]}
                  onPress={() => currentSubTabs.some(st => st.title.trim()) && setCreationStep(2)}
                  disabled={currentSubTabs.every(st => !st.title.trim())}
                >
                  <Text style={styles.nextButtonText}>Vista Previa</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.subTabsGrid}>
              {currentSubTabs.map((subTab, index) => (
                <View key={index} style={styles.compactSubTabCreator}>
                  <TextInput
                    style={styles.compactSubTabInput}
                    value={subTab.title}
                    onChangeText={(text) => updateSubTabTitle(index, text)}
                    placeholder={`Elemento ${index + 1}`}
                    placeholderTextColor="#8b5a83"
                  />
                  {currentSubTabs.length > 1 && (
                    <TouchableOpacity onPress={() => removeSubTab(index)} style={styles.compactRemoveButton}>
                      <Feather name="x" size={12} color="#ff6b6b" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              <TouchableOpacity onPress={addSubTab} style={styles.compactAddButton}>
                <Feather name="plus" size={14} color="#d4a5c7" />
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Vista Previa</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setCreationStep(1)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.createButton} onPress={createEvent}>
                  <Text style={styles.createButtonText}>Crear Evento</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.previewContainer}>
              <View style={styles.previewTabRow}>
                <View style={styles.previewTab}>
                  <Feather name={eventIcon} size={14} color="#8b5a83" />
                  <Text style={styles.previewTabText}>{eventName}</Text>
                </View>
                <TouchableOpacity style={styles.editTabButton} onPress={() => setCreationStep(5)}>
                  <Feather name="edit-3" size={12} color="#8b5a83" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.previewSubTabsContainer}>
                {currentSubTabs.filter(st => st.title.trim()).map((subTab, index) => (
                  <View key={index} style={styles.previewSubTabRow}>
                    <TouchableOpacity 
                      style={styles.previewSubTab}
                      onPress={() => {
                        setEditingSubTab(index);
                        setCreationStep(3);
                      }}
                    >
                      <Text style={styles.previewSubTabText}>{subTab.title}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.editSubTabButtonSmall}
                      onPress={() => {
                        setEditingSubTab(index);
                        setCreationStep(3);
                      }}
                    >
                      <Feather name="edit-3" size={10} color="#8b5a83" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <TouchableOpacity style={styles.addPreviewButtonBottom} onPress={addSubTab}>
                  <Feather name="plus" size={14} color="#8b5a83" />
                  <Text style={styles.addPreviewText}>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
        
      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Editar: {currentSubTabs[editingSubTab]?.title}</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setCreationStep(2)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={() => setCreationStep(2)}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.editRow}>
              <View style={styles.editInputSection}>
                <Text style={styles.inputLabel}>Título:</Text>
                <TextInput
                  style={styles.compactInput}
                  value={currentSubTabs[editingSubTab]?.title || ''}
                  onChangeText={(text) => updateSubTabTitle(editingSubTab, text)}
                  placeholder="Título del sub-tab"
                  placeholderTextColor="#8b5a83"
                />
              </View>
              
              <TouchableOpacity 
                style={styles.compactImageSelector}
                onPress={() => setCreationStep(4)}
              >
                <Feather name="image" size={16} color="#8b5a83" />
                <Text style={styles.compactImageText}>Imagen</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Cambiar Imagen: {currentSubTabs[editingSubTab]?.title}</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setCreationStep(3)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={() => setCreationStep(2)}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity style={styles.imageUploadArea}>
              <Feather name="upload" size={24} color="#8b5a83" />
              <Text style={styles.imageUploadText}>Seleccionar imagen</Text>
              <Text style={styles.imageUploadSubtext}>(Próximamente)</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 5:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Editar Tab: {eventName}</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setCreationStep(2)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={() => setCreationStep(2)}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.editTabRow}>
              <View style={styles.editInputSection}>
                <Text style={styles.inputLabel}>Título:</Text>
                <TextInput
                  style={styles.compactInput}
                  value={eventName}
                  onChangeText={setEventName}
                  placeholder="Nombre del evento"
                  placeholderTextColor="#8b5a83"
                />
              </View>
              
              <View style={styles.iconEditSection}>
                <Text style={styles.inputLabel}>Icono:</Text>
                <View style={styles.compactIconGrid}>
                  {iconOptions.slice(0, 4).map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.compactIconOption, eventIcon === icon && styles.selectedIcon]}
                      onPress={() => setEventIcon(icon)}
                    >
                      <Feather name={icon} size={16} color={eventIcon === icon ? '#fff' : '#8b5a83'} />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.compactIconGrid}>
                  {iconOptions.slice(4).map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.compactIconOption, eventIcon === icon && styles.selectedIcon]}
                      onPress={() => setEventIcon(icon)}
                    >
                      <Feather name={icon} size={16} color={eventIcon === icon ? '#fff' : '#8b5a83'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  const renderEditionSteps = () => {
    switch (editStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.compactTabGrid}>
              {allTabs.map((tab, index) => (
                <View key={tab.id} style={styles.tabEditContainer}>
                  <TouchableOpacity
                    style={[styles.compactEditTabOption, selectedTabForEdit === index && styles.selectedEditTab]}
                    onPress={() => {
                      setSelectedTabForEdit(index);
                      setSelectedSubTabForEdit(null);
                    }}
                  >
                    <Feather name={tab.icon} size={14} color={selectedTabForEdit === index ? '#fff' : '#8b5a83'} />
                    <Text style={[styles.compactEditTabText, selectedTabForEdit === index && styles.selectedEditTabText]}>
                      {tab.title}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.editTabButtonSmall}
                    onPress={() => {
                      setSelectedTabForEdit(index);
                      setEditStep(5);
                    }}
                  >
                    <Feather name="edit-3" size={12} color="#8b5a83" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editTabButtonSmall, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}
                    onPress={() => removeTab(index)}
                  >
                    <Feather name="trash-2" size={12} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
            {selectedTabForEdit !== null && (
              <View style={styles.editSubTabsList}>
                <View style={styles.subTabsWithAddButton}>
                  <TouchableOpacity 
                    style={[styles.addSubTabButton, allTabs[selectedTabForEdit]?.subTabs.length >= 4 && { opacity: 0.3 }]}
                    onPress={() => addSubTabToExisting(selectedTabForEdit)}
                    disabled={allTabs[selectedTabForEdit]?.subTabs.length >= 4}
                  >
                    <Feather name="plus" size={14} color="#8b5a83" />
                  </TouchableOpacity>
                  <View style={styles.subTabsColumn}>
                    {allTabs[selectedTabForEdit]?.subTabs.map((subTab, index) => (
                      <View key={index} style={styles.subTabEditRow}>
                        <TouchableOpacity
                          style={[styles.editSubTabItem, selectedSubTabForEdit === index && styles.selectedEditSubTab]}
                          onPress={() => setSelectedSubTabForEdit(index)}
                        >
                          <Text style={[styles.editSubTabItemText, selectedSubTabForEdit === index && styles.selectedEditSubTabText]}>
                            {subTab.title}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.editSubTabButtonSmall}
                          onPress={() => {
                            setSelectedSubTabForEdit(index);
                            setEditStep(2);
                          }}
                        >
                          <Feather name="edit-3" size={10} color="#8b5a83" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.editSubTabButtonSmall, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}
                          onPress={() => removeSubTab(selectedTabForEdit, index)}
                        >
                          <Feather name="trash-2" size={10} color="#ff6b6b" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        );
        
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{allTabs[selectedTabForEdit]?.title} - Sub-tabs</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setEditStep(0)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, selectedSubTabForEdit === null && styles.nextButtonDisabled]}
                  onPress={() => selectedSubTabForEdit !== null && setEditStep(2)}
                  disabled={selectedSubTabForEdit === null}
                >
                  <Text style={styles.nextButtonText}>Editar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.editPreviewContainer}>
              <View style={styles.editPreviewTab}>
                <Feather name={allTabs[selectedTabForEdit]?.icon} size={14} color="#8b5a83" />
                <Text style={styles.editPreviewTabText}>{allTabs[selectedTabForEdit]?.title}</Text>
              </View>
              
              <View style={styles.editPreviewSubTabs}>
                {allTabs[selectedTabForEdit]?.subTabs.map((subTab, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.editPreviewSubTab, selectedSubTabForEdit === index && styles.selectedEditPreviewSubTab]}
                    onPress={() => setSelectedSubTabForEdit(index)}
                  >
                    <Text style={[styles.editPreviewSubTabText, selectedSubTabForEdit === index && styles.selectedEditPreviewSubTabText]}>
                      {subTab.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
        
      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Editar: {allTabs[selectedTabForEdit]?.subTabs[selectedSubTabForEdit]?.title}</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setEditStep(1)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={() => setEditStep(3)}>
                  <Text style={styles.saveButtonText}>Continuar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.editOptionsRow}>
              <TouchableOpacity style={styles.editOptionButton} onPress={() => setEditStep(3)}>
                <Feather name="type" size={16} color="#8b5a83" />
                <Text style={styles.editOptionText}>Cambiar Título</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.editOptionButton} onPress={() => setEditStep(4)}>
                <Feather name="image" size={16} color="#8b5a83" />
                <Text style={styles.editOptionText}>Cambiar Imagen</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.currentContentPreview}>
              <Text style={styles.previewLabel}>Vista actual:</Text>
              <View style={styles.currentContent}>
                <Text style={styles.currentTitle}>
                  {allTabs[selectedTabForEdit]?.subTabs[selectedSubTabForEdit]?.content.title}
                </Text>
                <Text style={styles.currentDescription}>
                  {allTabs[selectedTabForEdit]?.subTabs[selectedSubTabForEdit]?.content.description}
                </Text>
              </View>
            </View>
          </View>
        );
        
      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Cambiar Título</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setEditStep(2)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.editTitleRow}>
              <View style={styles.titleInputSection}>
                <Text style={styles.inputLabel}>Nuevo título:</Text>
                <TextInput
                  style={styles.compactInput}
                  defaultValue={allTabs[selectedTabForEdit]?.subTabs[selectedSubTabForEdit]?.content.title}
                  placeholder="Título del contenido"
                  placeholderTextColor="#8b5a83"
                />
              </View>
              
              <View style={styles.descInputSection}>
                <Text style={styles.inputLabel}>Descripción:</Text>
                <TextInput
                  style={styles.compactInput}
                  defaultValue={allTabs[selectedTabForEdit]?.subTabs[selectedSubTabForEdit]?.content.description}
                  placeholder="Descripción del contenido"
                  placeholderTextColor="#8b5a83"
                  multiline
                />
              </View>
            </View>
          </View>
        );
        
      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Cambiar Imagen</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setEditStep(2)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity style={styles.imageUploadArea}>
              <Feather name="upload" size={24} color="#8b5a83" />
              <Text style={styles.imageUploadText}>Seleccionar nueva imagen</Text>
              <Text style={styles.imageUploadSubtext}>(Próximamente)</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 5:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Editar Tab: {allTabs[selectedTabForEdit]?.title}</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={() => setEditStep(0)}>
                  <Text style={styles.backButtonSmallText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={() => setEditStep(0)}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.editTabRow}>
              <View style={styles.editInputSection}>
                <Text style={styles.inputLabel}>Título:</Text>
                <TextInput
                  style={styles.compactInput}
                  defaultValue={allTabs[selectedTabForEdit]?.title}
                  placeholder="Nombre del tab"
                  placeholderTextColor="#8b5a83"
                />
              </View>
              
              <View style={styles.iconEditSection}>
                <Text style={styles.inputLabel}>Icono:</Text>
                <View style={styles.compactIconGrid}>
                  {iconOptions.slice(0, 4).map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.compactIconOption, allTabs[selectedTabForEdit]?.icon === icon && styles.selectedIcon]}
                    >
                      <Feather name={icon} size={16} color={allTabs[selectedTabForEdit]?.icon === icon ? '#fff' : '#8b5a83'} />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.compactIconGrid}>
                  {iconOptions.slice(4).map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.compactIconOption, allTabs[selectedTabForEdit]?.icon === icon && styles.selectedIcon]}
                    >
                      <Feather name={icon} size={16} color={allTabs[selectedTabForEdit]?.icon === icon ? '#fff' : '#8b5a83'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ffeef8', '#f8e8ff', '#fff0f5']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.header}>
        <View style={styles.tabBar}>
          {allTabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, activeTab === index && styles.activeTabButton]}
              onPress={() => {
                setActiveTab(index);
                setActiveSubTab(0);
              }}
              activeOpacity={0.7}
            >
              <Feather 
                name={tab.icon} 
                size={14} 
                color={activeTab === index ? '#ffffff' : '#8b5a83'} 
              />
              <Text style={[styles.tabButtonText, activeTab === index && styles.activeTabButtonText]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Feather name="x" size={20} color="#8b5a83" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.mainContent}>
        <View style={styles.subTabContainer}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.subTabScroll}>
            {allTabs[activeTab].subTabs.map((subTab, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.subTabButton, activeSubTab === index && styles.activeSubTabButton]}
                onPress={() => {
                  setActiveSubTab(index);
                  if (allTabs[activeTab].id === 'creation') {
                    if (index === 0) resetCreationSteps();
                    if (index === 1) resetEditSteps();
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.subTabButtonText, activeSubTab === index && styles.activeSubTabButtonText]}>
                  {subTab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.infoContent}>
            {renderContent()}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    display: 'none',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    marginLeft: 16,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: '#667eea',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  activeTabButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  subTabContainer: {
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  subTabScroll: {
    paddingVertical: 4,
  },
  subTabButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeSubTabButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  subTabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7F8C8D',
    textAlign: 'center',
  },
  activeSubTabButtonText: {
    fontWeight: '700',
    color: '#ffffff',
  },
  infoContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  infoHeader: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  itemsList: {
    gap: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#2C3E50',
    fontWeight: '500',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  nextButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButtonSmall: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  compactRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inputHalf: {
    flex: 1,
  },
  iconHalf: {
    flex: 1,
  },
  compactInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#2C3E50',
    backgroundColor: '#F8F9FA',
  },
  compactIconGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  compactIconOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedIcon: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  subTabsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactSubTabCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    borderRadius: 8,
    padding: 8,
    minWidth: 120,
  },
  compactSubTabInput: {
    flex: 1,
    fontSize: 12,
    color: '#2d1b2e',
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  compactRemoveButton: {
    padding: 4,
    marginLeft: 4,
  },
  compactAddButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 165, 199, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.4)',
    borderStyle: 'dashed',
  },
  editRow: {
    flexDirection: 'row',
    gap: 16,
  },
  editInputSection: {
    flex: 2,
  },
  compactImageSelector: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.4)',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    gap: 4,
  },
  compactImageText: {
    fontSize: 12,
    color: '#8b5a83',
  },
  compactTabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -20,
  },
  compactEditTabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.3)',
    gap: 4,
  },
  compactEditTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b5a83',
  },
  editPreviewContainer: {
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  editPreviewTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 90, 131, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  editPreviewTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5a83',
  },
  editPreviewSubTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editPreviewSubTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.3)',
  },
  selectedEditPreviewSubTab: {
    backgroundColor: '#d4a5c7',
    borderColor: '#d4a5c7',
  },
  editPreviewSubTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8b5a83',
  },
  selectedEditPreviewSubTabText: {
    color: '#ffffff',
  },
  editOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  editOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    justifyContent: 'center',
  },
  editOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5a83',
  },
  currentContentPreview: {
    backgroundColor: 'rgba(212, 165, 199, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5a83',
    marginBottom: 8,
  },
  editTitleRow: {
    gap: 16,
  },
  titleInputSection: {
    marginBottom: 16,
  },
  descInputSection: {
    marginBottom: 16,
  },
  imageUploadArea: {
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 199, 0.4)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    gap: 8,
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5a83',
  },
  imageUploadSubtext: {
    fontSize: 12,
    color: '#8b5a83',
    opacity: 0.7,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
  },
  previewContainer: {
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  previewTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  previewTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 90, 131, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  previewTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5a83',
  },
  editTabButton: {
    padding: 6,
    backgroundColor: 'rgba(139, 90, 131, 0.1)',
    borderRadius: 6,
  },
  previewSubTabsContainer: {
    gap: 8,
  },
  previewSubTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  previewSubTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flex: 1,
  },
  previewSubTabText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8b5a83',
  },
  editSubTabButtonSmall: {
    padding: 4,
    backgroundColor: 'rgba(139, 90, 131, 0.1)',
    borderRadius: 4,
  },
  addPreviewButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 165, 199, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  addPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5a83',
  },
  editTabRow: {
    flexDirection: 'row',
    gap: 16,
  },
  iconEditSection: {
    flex: 1,
  },
  tabEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: -2,
  },
  editTabButtonSmall: {
    padding: 4,
    backgroundColor: 'rgba(139, 90, 131, 0.1)',
    borderRadius: 4,
  },
  selectedEditTab: {
    backgroundColor: '#d4a5c7',
    borderColor: '#d4a5c7',
  },
  selectedEditTabText: {
    color: '#ffffff',
  },
  subTabsSection: {
    marginTop: 20,
    backgroundColor: 'rgba(212, 165, 199, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  subTabsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d1b2e',
    marginBottom: 12,
  },
  editSubTabsList: {
    gap: 4,
    marginTop: 4,
  },
  subTabEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editSubTabItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.3)',
  },
  editSubTabItemText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8b5a83',
  },
  selectedEditSubTab: {
    backgroundColor: '#d4a5c7',
    borderColor: '#d4a5c7',
  },
  selectedEditSubTabText: {
    color: '#ffffff',
  },
  subTabsWithAddButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  subTabsColumn: {
    flex: 1,
    gap: 4,
  },
  addSubTabButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 165, 199, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.4)',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addSubTabBottomText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5a83',
  },
  currentContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    padding: 12,
  },
  currentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d1b2e',
    marginBottom: 4,
  },
  currentDescription: {
    fontSize: 12,
    color: '#6b4c6d',
  },
  pistasImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pistasImageContainer: {
    flex: 1,
  },
  moreInfoText: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  logoutContainer: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 28,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  errorMessage: {
    fontSize: 12,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
});

export default Menu;
