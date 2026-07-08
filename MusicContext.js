import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useSeason } from './SeasonContext';

const MusicContext = createContext();

export const useMusicPlayer = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicProvider');
  }
  return context;
};

export const MusicProvider = ({ children }) => {
  const { getDisplaySeason } = useSeason();
  const [currentMusicUrl, setCurrentMusicUrl] = useState(null);
  const player = useAudioPlayer(currentMusicUrl);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    loadSeasonMusic();
  }, [getDisplaySeason()]);

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
    try {
      const displaySeason = getDisplaySeason();
      
      if (!displaySeason) {
        setCurrentMusicUrl(null);
        return;
      }

      const musicQuery = query(
        collection(db, 'stickers'),
        where('season', '==', displaySeason.id),
        where('category', '==', 'Otros')
      );
      
      const musicSnapshot = await getDocs(musicQuery);
      
      if (!musicSnapshot.empty) {
        const firstMusic = musicSnapshot.docs[0].data();
        
        if (firstMusic.audioUrl && firstMusic.audioUrl !== currentMusicUrl) {
          setCurrentMusicUrl(firstMusic.audioUrl);
        }
      } else {
        setCurrentMusicUrl(null);
      }
    } catch (error) {
      console.error('Error loading season music:', error);
    }
  };

  return (
    <MusicContext.Provider value={{ player, currentMusicUrl }}>
      {children}
    </MusicContext.Provider>
  );
};
