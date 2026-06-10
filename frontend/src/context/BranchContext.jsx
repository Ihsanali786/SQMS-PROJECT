// frontend/src/context/BranchContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const BranchContext = createContext();

export const useBranch = () => useContext(BranchContext);

export const BranchProvider = ({ children }) => {
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load branches based on service type and city
  const loadBranches = async (serviceType, city) => {
    setLoading(true);
    try {
      const response = await api.get(`/branches?serviceType=${serviceType}&city=${city}`);
      setAvailableBranches(response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Error loading branches:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const selectBranch = (branch) => {
    setSelectedBranch(branch);
    localStorage.setItem('selectedBranch', JSON.stringify(branch));
  };

  // Load saved branch on mount
  useEffect(() => {
    const savedBranch = localStorage.getItem('selectedBranch');
    if (savedBranch) {
      setSelectedBranch(JSON.parse(savedBranch));
    }
  }, []);

  return (
    <BranchContext.Provider value={{
      selectedBranch,
      availableBranches,
      loading,
      loadBranches,
      selectBranch
    }}>
      {children}
    </BranchContext.Provider>
  );
};