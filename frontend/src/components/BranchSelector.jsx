// frontend/src/components/BranchSelector.jsx
import { useState, useEffect } from 'react';
import { useBranch } from '../context/BranchContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const BranchSelector = ({ serviceType, selectedCity, onBranchSelect }) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const { selectBranch } = useBranch();

  useEffect(() => {
    if (serviceType && selectedCity) {
      loadBranches();
    }
  }, [serviceType, selectedCity]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/branches?serviceType=${serviceType}&city=${selectedCity}`);
      setBranches(response.data.data);
    } catch (error) {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (branchId) => {
    setSelectedBranchId(branchId);
    const branch = branches.find(b => b.branchId === branchId);
    if (branch) {
      selectBranch(branch);
      onBranchSelect(branch);
    }
  };

  const getBranchTypeLabel = () => {
    switch(serviceType) {
      case 'bank': return 'Bank Branch';
      case 'nadra': return 'NADRA Office';
      case 'university': return 'University Campus';
      case 'hospital': return 'Hospital';
      default: return 'Branch';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2 dark:text-gray-300">
        Select {getBranchTypeLabel()}
      </label>
      <select
        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        value={selectedBranchId}
        onChange={(e) => handleBranchChange(e.target.value)}
        disabled={loading}
      >
        <option value="">Choose {getBranchTypeLabel()}</option>
        {branches.map(branch => (
          <option key={branch.branchId} value={branch.branchId}>
            {branch.name} - {branch.address} ({branch.phone})
          </option>
        ))}
      </select>
      {loading && <p className="text-sm text-gray-500 mt-1">Loading branches...</p>}
    </div>
  );
};

export default BranchSelector;