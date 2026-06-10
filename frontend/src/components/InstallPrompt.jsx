// frontend/src/components/InstallPrompt.jsx
import { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    });
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted install');
        }
        setDeferredPrompt(null);
        setShowInstall(false);
      });
    }
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white rounded-lg shadow-xl p-4 z-50">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold">Install App</h3>
          <p className="text-sm text-blue-100">Install for faster access</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleInstall} className="bg-white text-blue-600 px-3 py-1 rounded">Install</button>
          <button onClick={() => setShowInstall(false)} className="text-blue-100">✕</button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;