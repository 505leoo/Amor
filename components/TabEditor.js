import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

const TabEditor = ({ tabs, onClose }) => {
  const [selectedTab, setSelectedTab] = useState(null);
  const [selectedSubTab, setSelectedSubTab] = useState(null);

  const handleTabSelect = (tabIndex) => {
    setSelectedTab(tabIndex);
    setSelectedSubTab(null);
  };

  const handleSubTabSelect = (subTabIndex) => {
    setSelectedSubTab(subTabIndex);
  };

  const handleEdit = () => {
    if (selectedTab === null) {
      Alert.alert('Selección requerida', 'Por favor selecciona un tab primero.');
      return;
    }
    if (selectedSubTab === null) {
      Alert.alert('Selección requerida', 'Por favor selecciona un sub-tab para editar.');
      return;
    }
    
    Alert.alert('Editar', `Editando: ${tabs[selectedTab].title} > ${tabs[selectedTab].subTabs[selectedSubTab].title}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Editar Tabs</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={24} color="#8b5a83" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Selecciona un Tab</Text>
          <View style={styles.tabGrid}>
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabItem,
                  selectedTab === index && styles.selectedTabItem
                ]}
                onPress={() => handleTabSelect(index)}
              >
                <Feather name={tab.icon} size={16} color={selectedTab === index ? '#ffffff' : '#8b5a83'} />
                <Text style={[
                  styles.tabItemText,
                  selectedTab === index && styles.selectedTabItemText
                ]}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedTab !== null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Selecciona un Sub-Tab</Text>
            <View style={styles.subTabGrid}>
              {tabs[selectedTab].subTabs.map((subTab, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.subTabItem,
                    selectedSubTab === index && styles.selectedSubTabItem
                  ]}
                  onPress={() => handleSubTabSelect(index)}
                >
                  <Text style={[
                    styles.subTabItemText,
                    selectedSubTab === index && styles.selectedSubTabItemText
                  ]}>
                    {subTab.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedTab !== null && selectedSubTab !== null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Información Seleccionada</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                {tabs[selectedTab].title} {tabs[selectedTab].subTabs[selectedSubTab].title}
              </Text>
              <Text style={styles.infoDescription}>
                {tabs[selectedTab].subTabs[selectedSubTab].content.description}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.editButton,
            (selectedTab === null || selectedSubTab === null) && styles.editButtonDisabled
          ]}
          onPress={handleEdit}
          disabled={selectedTab === null || selectedSubTab === null}
        >
          <Feather name="edit-3" size={20} color="#ffffff" />
          <Text style={styles.editButtonText}>Editar Selección</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d1b2e',
    marginBottom: 12,
  },
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.3)',
    gap: 6,
  },
  selectedTabItem: {
    backgroundColor: '#d4a5c7',
    borderColor: '#d4a5c7',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5a83',
  },
  selectedTabItemText: {
    color: '#ffffff',
  },
  subTabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subTabItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.3)',
  },
  selectedSubTabItem: {
    backgroundColor: '#d4a5c7',
    borderColor: '#d4a5c7',
  },
  subTabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5a83',
  },
  selectedSubTabItemText: {
    color: '#ffffff',
  },
  infoCard: {
    padding: 16,
    backgroundColor: 'rgba(212, 165, 199, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 199, 0.3)',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d1b2e',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 12,
    color: '#6b4c6d',
    lineHeight: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4a5c7',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  editButtonDisabled: {
    opacity: 0.5,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default TabEditor;