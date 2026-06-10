// src/hooks/useSoundNotification.js
import { useCallback, useState } from 'react';

export const useSoundNotification = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playNotification = useCallback(() => {
    if (!soundEnabled) return;
    
    // Create audio context for browsers that require user interaction
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }, [soundEnabled]);

  const playTurnAlert = useCallback(() => {
    if (!soundEnabled) return;
    
    const audio = new Audio('https://www.soundjay.com/misc/sounds/attention-bell-01.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }, [soundEnabled]);

  return { playNotification, playTurnAlert, soundEnabled, setSoundEnabled };
};