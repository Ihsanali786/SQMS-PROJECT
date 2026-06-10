// src/components/UserDashboard.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [token, setToken] = useState(null);

  const services = ['Account Opening', 'Card Issue', 'Cash Deposit', 'CNIC Renewal'];

  const handleBookAppointment = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error('Please fill all fields');
      return;
    }
    // Mock token generation
    const mockToken = {
      number: `B-${Math.floor(Math.random() * 50) + 1}`,
      service: selectedService,
      date: selectedDate,
      time: selectedTime,
      branch: 'HBL Saddar Branch',
      peopleAhead: Math.floor(Math.random() * 15),
      estimatedWait: `${Math.floor(Math.random() * 60) + 15}-${Math.floor(Math.random() * 30) + 45} min`
    };
    setToken(mockToken);
    toast.success('Appointment booked successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Logo */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              SQ
            </div>
            <span className="text-xl font-bold text-gray-800">Smart Queue System</span>
          </div>
          <button className="text-red-600 hover:text-red-800">Logout</button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Book New Appointment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Service</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  <option value="">Choose a service</option>
                  {services.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg p-2"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Time</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                >
                  <option value="">Choose time</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="1:30 PM">1:30 PM</option>
                  <option value="2:00 PM">2:00 PM</option>
                </select>
              </div>

              <button 
                onClick={handleBookAppointment}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Get Token
              </button>
            </div>
          </div>

          {/* Live Queue Status */}
          {token && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Your Token Status</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-3xl font-bold text-blue-600 mb-2">{token.number}</div>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Service:</span> {token.service}</p>
                  <p><span className="font-semibold">Branch:</span> {token.branch}</p>
                  <p><span className="font-semibold">Date:</span> {token.date} at {token.time}</p>
                  <p><span className="font-semibold">People Ahead:</span> {token.peopleAhead}</p>
                  <p><span className="font-semibold">Est. Wait:</span> {token.estimatedWait}</p>
                </div>
              </div>
              
              {/* Now Serving */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600">Now Serving</p>
                <p className="text-2xl font-bold text-green-700">
                  {String.fromCharCode(65 + Math.floor(Math.random() * 3))}-{Math.floor(Math.random() * 50) + 1}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;