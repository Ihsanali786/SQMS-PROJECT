// frontend/src/components/WorkingAdmin.jsx
import React from 'react';

const WorkingAdmin = ({ title, icon, color }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-8">
        <div className={`bg-gradient-to-r ${color} rounded-lg shadow-md p-6 mb-6 text-white`}>
          <h1 className="text-2xl font-bold">{icon} {title}</h1>
          <p className="mt-1 opacity-90">Queue Management System</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Queue Status</h2>
          <p className="text-gray-600 dark:text-gray-400">This admin panel is working correctly!</p>
          
          <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <p className="text-green-700 dark:text-green-400">✅ Admin portal is accessible</p>
          </div>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkingAdmin;