// src/components/WebSocketUserDashboard.jsx (Create new file)
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import QRCodeModal from './QRCodeModal';
import DarkModeToggle from './DarkModeToggle';
import SoundToggle from './SoundToggle';
import socketService from '../services/socketService';
import { useSoundNotification } from '../hooks/useSoundNotification';

const WebSocketUserDashboard = () => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [token, setToken] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId] = useState(`user_${Date.now()}`);
  
  const { playNotification, playTurnAlert, soundEnabled, setSoundEnabled } = useSoundNotification();

  useEffect(() => {
    // Connect to WebSocket
    socketService.connect(userId, 'user');
    
    socketService.onQueueUpdate((data) => {
      setQueueStatus(data);
      if (data.isTurnNear) {
        playTurnAlert();
        toast.success(`⚠️ Your turn is almost here! Only ${data.peopleAhead} people ahead!`);
      }
    });

    socketService.onTurnAlert((data) => {
      playTurnAlert();
      toast((t) => (
        <div>
          <strong>🔔 Your turn is next!</strong>
          <p>Please proceed to counter {data.counter}</p>
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 bg-blue-600 text-white px-2 py-1 rounded">
            OK
          </button>
        </div>
      ), { duration: 10000 });
    });

    setIsConnected(true);

    return () => {
      socketService.removeListener('queue-update');
      socketService.removeListener('turn-alert');
      socketService.disconnect();
    };
  }, []);

  const handleBookAppointment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error('Please fill all fields');
      return;
    }
    
    const tokenData = {
      tokenId: `${getPrefix(selectedService)}-${Math.floor(Math.random() * 100) + 1}`,
      service: selectedService,
      date: selectedDate,
      time: selectedTime,
      branch: getBranch(selectedService),
      userId: userId,
      status: 'waiting',
      timestamp: new Date().toISOString()
    };
    
    setToken(tokenData);
    
    // Join WebSocket queue
    socketService.joinQueue(selectedService, tokenData);
    
    playNotification();
    toast.success(`Token ${tokenData.tokenId} generated successfully!`);
    
    // Save to localStorage for history
    const history = JSON.parse(localStorage.getItem('appointmentHistory') || '[]');
    history.push(tokenData);
    localStorage.setItem('appointmentHistory', JSON.stringify(history));
  };

  const getPrefix = (service) => {
    if (service === 'CNIC Renewal') return 'N';
    if (service.includes('Admission')) return 'U';
    return 'B';
  };

  const getBranch = (service) => {
    if (service === 'CNIC Renewal') return 'NADRA Karachi Center';
    if (service.includes('Admission')) return 'University Main Campus';
    return 'HBL Saddar Branch';
  };

  const services = {
    bank: ['Account Opening', 'Card Issue', 'Cash Deposit', 'Loan Application'],
    nadra: ['CNIC Renewal', 'Family Registration', 'Child Registration', 'Death Certificate'],
    university: ['Admission', 'Fee Submission', 'Exam Form', 'Transcript']
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Connection Status */}
        <div className="mb-4 text-right">
          <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? '🟢 Live Connection' : '🔴 Connecting...'}
          </span>
        </div>

        {/* Rest of your existing UI */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Booking Form - same as before */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Book New Appointment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Select Service</label>
                <select 
                  className="w-full border rounded-lg p-2 dark:bg-gray-700"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  <option value="">Choose a service</option>
                  <optgroup label="Bank Services">
                    {services.bank.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="NADRA Services">
                    {services.nadra.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="University Services">
                    {services.university.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Select Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg p-2 dark:bg-gray-700"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Select Time</label>
                <select 
                  className="w-full border rounded-lg p-2 dark:bg-gray-700"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                >
                  <option value="">Choose time</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="01:30 PM">01:30 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>

              <button 
                onClick={handleBookAppointment}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                Generate Token
              </button>
            </div>
          </div>

          {/* Queue Status - Live with WebSocket */}
          {token && queueStatus && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Live Queue Status</h2>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-4">
                <div className="text-3xl font-bold text-blue-600 mb-2 text-center">
                  {token.tokenId}
                </div>
                <div className="space-y-2">
                  <p><span className="font-semibold">Service:</span> {token.service}</p>
                  <p><span className="font-semibold">People Ahead:</span> {queueStatus.peopleAhead}</p>
                  <p><span className="font-semibold">Est. Wait:</span> {queueStatus.estimatedWait}</p>
                  <p><span className="font-semibold">Now Serving:</span> {queueStatus.nowServing}</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2 transition-all duration-500"
                    style={{ width: `${queueStatus.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketUserDashboard;