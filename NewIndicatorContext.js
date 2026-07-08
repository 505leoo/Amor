import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const NewIndicatorContext = createContext();

export const useNewIndicator = () => {
  const context = useContext(NewIndicatorContext);
  if (!context) {
    throw new Error('useNewIndicator must be used within NewIndicatorProvider');
  }
  return context;
};

export const NewIndicatorProvider = ({ children }) => {
  const [hasNewBuzon, setHasNewBuzon] = useState(false);
  const lastVisitedBuzonAtRef = useRef(null);

  useEffect(() => {
    let unsubRequests = null;
    let unsubGifts = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubRequests) unsubRequests();
      if (unsubGifts) unsubGifts();
      unsubRequests = null;
      unsubGifts = null;

      if (!user) {
        setHasNewBuzon(false);
        lastVisitedBuzonAtRef.current = null;
        return;
      }
      const uid = user.uid;
      let latestCreated = 0;

      const updateBuzonNew = () => {
        const latestMs = latestCreated * 1000;
        const lastVisited = lastVisitedBuzonAtRef.current;
        const show = latestCreated > 0 && (!lastVisited || latestMs > lastVisited);
        setHasNewBuzon(show);
      };

      const requestsQuery = query(
        collection(db, 'friend_requests'),
        where('to', '==', uid),
        where('status', '==', 'pending')
      );
      unsubRequests = onSnapshot(requestsQuery, (snap) => {
        latestCreated = 0;
        snap.docs.forEach((d) => {
          const t = d.data().createdAt?.seconds ?? 0;
          if (t > latestCreated) latestCreated = t;
        });
        updateBuzonNew();
      });

      const giftsQuery = query(collection(db, 'gifts'), where('to', '==', uid));
      unsubGifts = onSnapshot(giftsQuery, (snap) => {
        snap.docs.forEach((d) => {
          const t = d.data().createdAt?.seconds ?? 0;
          if (t > latestCreated) latestCreated = t;
        });
        updateBuzonNew();
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubRequests) unsubRequests();
      if (unsubGifts) unsubGifts();
    };
  }, []);

  const markBuzonVisited = () => {
    lastVisitedBuzonAtRef.current = Date.now();
    setHasNewBuzon(false);
  };

  return (
    <NewIndicatorContext.Provider
      value={{
        hasNewBuzon,
        markBuzonVisited,
        // Por si más adelante se añaden más indicadores (menu, friends, etc.)
        setNew: (section, value) => {
          if (section === 'buzon') setHasNewBuzon(!!value);
        },
      }}
    >
      {children}
    </NewIndicatorContext.Provider>
  );
};
