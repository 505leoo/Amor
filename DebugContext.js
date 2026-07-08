import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DebugContext = createContext();

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
};

export const DebugProvider = ({ children }) => {
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    loadDebugMode();
  }, []);

  const loadDebugMode = async () => {
    try {
      const debugMode = await AsyncStorage.getItem('debugMode');
      setIsDebugMode(debugMode === 'true');
    } catch (error) {
      console.error('Error loading debug mode:', error);
    }
  };

  const toggleDebugMode = async () => {
    try {
      const newDebugMode = !isDebugMode;
      setIsDebugMode(newDebugMode);
      await AsyncStorage.setItem('debugMode', newDebugMode.toString());
    } catch (error) {
      console.error('Error saving debug mode:', error);
    }
  };

  return (
    <DebugContext.Provider value={{ isDebugMode, toggleDebugMode }}>
      {children}
    </DebugContext.Provider>
  );
};