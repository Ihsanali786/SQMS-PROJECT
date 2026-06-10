// src/hooks/useWebSocketSimulation.js
import { useState, useEffect } from 'react';

export const useWebSocketSimulation = (initialToken) => {
  const [queueStatus, setQueueStatus] = useState({
    nowServing: null,
    peopleAhead: initialToken?.peopleAhead || 0,
    estimatedWait: initialToken?.estimatedWait || '',
    isTurnNear: false
  });

  useEffect(() => {
    if (!initialToken) return;

    // Simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      setQueueStatus(prev => {
        const newPeopleAhead = Math.max(0, prev.peopleAhead - 1);
        const isTurnNear = newPeopleAhead <= 2;
        
        // Simulate now serving changing
        const nowServingNum = parseInt(initialToken.number.split('-')[1]) - (initialToken.peopleAhead - newPeopleAhead);
        
        return {
          nowServing: `${initialToken.number.split('-')[0]}-${nowServingNum}`,
          peopleAhead: newPeopleAhead,
          estimatedWait: `${newPeopleAhead * 5}-${(newPeopleAhead * 5) + 15} min`,
          isTurnNear
        };
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [initialToken]);

  return queueStatus;
};