import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const themes = {
  nightSpace: {
    name: 'Espacio Nocturno',
    gradient: ['#0f0c29', '#302b63', '#24243e'],
    particles: 'stars'
  },
  goldenDawn: {
    name: 'Amanecer Dorado',
    gradient: ['#FFF8DC', '#FFE4B5', '#DEB887'],
    particles: 'goldenParticles'
  },
  deepOcean: {
    name: 'Abismo Sereno',
    gradient: ['#001f3f', '#003d5c', '#005f73'],
    particles: 'ocean'
  },
  moonlitNight: {
    name: 'Noche de Luna',
    gradient: ['#1a0033', '#2d1b4e', '#4a2c6b'],
    particles: 'moonlight'
  },
  sweetCake: {
    name: 'Dulce Pastel',
    gradient: ['#FFB6C1', '#FFC0CB', '#FFCCCB'],
    particles: 'sweetCake'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('nightSpace');

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
  };

  const getTheme = () => themes[currentTheme];

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, getTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};