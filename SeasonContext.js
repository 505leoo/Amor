import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const SeasonContext = createContext();

export const useSeason = () => {
  const context = useContext(SeasonContext);
  if (!context) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
};

// Configuración de temporadas
export const seasons = {
  goldenDawn: {
    id: 'goldenDawn',
    name: 'Amanecer Dorado',
    theme: 'goldenDawn',
    startDate: new Date('2024-12-01'),
    endDate: new Date('2025-01-31'),
    gradient: ['#FFF8DC', '#FFE4B5', '#DEB887'],
    particles: 'goldenParticles',
    icon: '☀️',
    logo: 'Amanecer Dorado',
    number: 1,
    backgroundMusic: null
  },
  nightSpace: {
    id: 'nightSpace',
    name: 'Espacio Nocturno',
    theme: 'nightSpace',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-03-31'),
    gradient: ['#0f0c29', '#302b63', '#24243e'],
    particles: 'stars',
    icon: '⭐',
    logo: 'Espacio Nocturno',
    number: 2,
    backgroundMusic: null
  }
};

export const SeasonProvider = ({ children }) => {
  const [currentSeason, setCurrentSeason] = useState(null);
  const [scheduledSeason, setScheduledSeason] = useState(null);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [devSeason, setDevSeason] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentSeason();
  }, []);

  const loadCurrentSeason = async () => {
    try {
      const seasonDoc = await getDoc(doc(db, 'season', 'current'));
      if (seasonDoc.exists()) {
        const data = seasonDoc.data();
        const season = seasons[data.seasonId];
        if (season) {
          setCurrentSeason(season);
          setScheduledSeason(season);
          if (data.scheduledDate) {
            setScheduledDate(new Date(data.scheduledDate));
          }
        } else {
          setCurrentSeason(null);
        }
      } else {
        setCurrentSeason(null);
      }
      setDevSeason(seasons.goldenDawn);
    } catch (error) {
      console.error('Error loading season:', error);
      setCurrentSeason(null);
      setDevSeason(seasons.goldenDawn);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentSeason = async (seasonId) => {
    try {
      await setDoc(doc(db, 'season', 'current'), {
        seasonId,
        scheduledDate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving season:', error);
    }
  };

  const getActiveSeason = () => currentSeason;
  const getDevSeason = () => devSeason;
  const getDisplaySeason = () => isDevMode ? devSeason : currentSeason;

  const changeSeason = async (seasonId) => {
    const season = seasons[seasonId];
    if (season) {
      setCurrentSeason(season);
      setScheduledSeason(season);
      setScheduledDate(new Date());
      await saveCurrentSeason(seasonId);
    }
  };

  const changeDevSeason = (seasonId) => {
    const season = seasons[seasonId];
    if (season) {
      setDevSeason(season);
    }
  };

  const toggleDevMode = () => {
    setIsDevMode(!isDevMode);
  };

  const getDaysSinceScheduled = () => {
    if (!scheduledDate) return 0;
    const now = new Date();
    const diffTime = now - scheduledDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <SeasonContext.Provider value={{ 
      currentSeason, 
      devSeason,
      scheduledSeason,
      isDevMode,
      isLoading,
      getActiveSeason, 
      getDevSeason,
      getDisplaySeason,
      seasons, 
      changeSeason,
      changeDevSeason,
      toggleDevMode,
      getDaysSinceScheduled
    }}>
      {children}
    </SeasonContext.Provider>
  );
};
