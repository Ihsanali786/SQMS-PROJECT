// src/components/AdminDashboard.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';

const AdminDashboard = ({ type = 'bank' }) => {
  const [tokens] = useState([
    { id: 1, token: 'B-38', name: 'Hassan', service: 'Cash Deposit', status: 'In Service' },
    { id: 2, token: 'N-210', name: 'Ali', service: 'CNIC Renewal', status: 'Waiting' },
    { id: 3, token: 'U-140', name: 'Sara', service: 'Student Registration', status: 'Waiting' },
  ]);

  const stats = {
    bank: { today: 90, serving: 'B-38', next: 'Sana', waiting: 'N-212' },
    nadra: { today: 210, serving: 'N-210', next: 'N-211', waiting: 'N-212' },
    university: { today: 55, serving: 'U-140', next: 'U-141', waiting: 'N-142' },
  };

  const currentStat = stats[type];

  const handleMarkDone = (tokenId) => {
    toast.success(`Token ${tokenId} marked as completed!`);
  };

  const handleSkip = () => {
    toast.success('Token skipped!');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h1 className="text-2xl font-bold capitalize">{type} Admin Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Today's Appointments</p>
            <p className="text-3xl font-bold text-blue-600">{currentStat.today}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Now Serving</p>
            <p className="text-3xl font-bold text-green-600">{currentStat.serving}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">People Waiting</p>
            <p className="text-3xl font-bold text-orange-600">{currentStat.waiting}</p>
          </div>
        </div>

        {/* Token List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Current Queue</h2>
          <div className="space-y-3">
            {tokens.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="font-mono font-bold text-lg">{item.token}</span>
                  <p className="text-sm text-gray-600">{item.name} - {item.service}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.status === 'In Service' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status}
                  </span>
                  <button 
                    onClick={() => handleMarkDone(item.token)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Mark As Done
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => handleSkip()}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Skip Token
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Call Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;