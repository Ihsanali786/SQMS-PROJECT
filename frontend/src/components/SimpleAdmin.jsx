// frontend/src/components/SimpleAdmin.jsx
import React from 'react';

const SimpleAdmin = ({ title, icon }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">{icon}</div>
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">{title}</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">This admin panel is working!</p>
          <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
            ✅ Admin portal is accessible
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleAdmin;