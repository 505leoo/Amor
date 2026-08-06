import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';

const MusicContext = createContext();

export const useMusicPlayer = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicProvider');
  }
  return context;
};

export const MusicProvider = ({ children }) => {
  const [currentMusicUrl, setCurrentMusicUrl] = useState(null);
  const player = useAudioPlayer(currentMusicUrl);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    loadSeasonMusic();
  }, []);

  useEffect(() => {
    if (currentMusicUrl && player) {
      setIsPlayerReady(true);
      const timer = setTimeout(() => {
        try {
          player.volume = 0.3;
          player.play();
        } catch (error) {
          console.error('Error playing music:', error);
        }
      }, 1);
      return () => clearTimeout(timer);
    } else {
      setIsPlayerReady(false);
    }
  }, [currentMusicUrl, player]);

  const loadSeasonMusic = async () => {
    setCurrentMusicUrl(null);
  };

  return (
    <MusicContext.Provider value={{ player, currentMusicUrl }}>
      {children}
    </MusicContext.Provider>
  );
};
