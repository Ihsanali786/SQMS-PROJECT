// src/components/SoundToggle.jsx
const SoundToggle = ({ soundEnabled, setSoundEnabled }) => {
  return (
    <button
      onClick={() => setSoundEnabled(!soundEnabled)}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      aria-label="Toggle sound"
    >
      {soundEnabled ? '🔊' : '🔇'}
    </button>
  );
};

export default SoundToggle;