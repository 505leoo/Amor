import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { hasUnclaimedTrofeos } from './utils/trofeosDef';

const TrofeosContext = createContext();

export const useTrofeos = () => {
  const context = useContext(TrofeosContext);
  if (!context) {
    throw new Error('useTrofeos must be used within TrofeosProvider');
  }
  return context;
};

export const TrofeosProvider = ({ children }) => {
  const [hasUnclaimed, setHasUnclaimed] = useState(false);

  const load = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setHasUnclaimed(false);
        return;
      }
      const snap = await getDoc(doc(db, 'usuarios', uid));
      if (!snap.exists()) {
        setHasUnclaimed(false);
        return;
      }
      const data = snap.data();
      const amigosCount = (data.amigos || []).length;
      const claimedIds = data.trofeosClaimados || [];
      setHasUnclaimed(hasUnclaimedTrofeos(amigosCount, claimedIds));
    } catch (error) {
      console.error('TrofeosContext load:', error);
      setHasUnclaimed(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) setHasUnclaimed(false);
      else load();
    });
    return () => unsubscribe();
  }, []);

  return (
    <TrofeosContext.Provider value={{ hasUnclaimedTrofeos: hasUnclaimed, refreshTrofeos: load }}>
      {children}
    </TrofeosContext.Provider>
  );
};
