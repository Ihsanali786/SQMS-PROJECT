// frontend/src/components/EnhancedUserDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import socketService from '../services/socketService';
import api from '../services/api';

const EnhancedUserDashboard = () => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [token, setToken] = useState(null);
  const [activeTokens, setActiveTokens] = useState([]);
  const [tokenStatuses, setTokenStatuses] = useState({});
  const [showQR, setShowQR] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Simulation controls (admin only)
  const [simLoading, setSimLoading] = useState(false);

  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const isAdmin = user?.role === 'admin';

  // Use ref to always access current token/activeTokens inside socket callbacks
  const tokenRef = useRef(token);
  const activeTokensRef = useRef(activeTokens);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { activeTokensRef.current = activeTokens; }, [activeTokens]);

  const refreshQueueStatus = async (serviceTypeToRefresh, tokenNumber, opts = {}) => {
    if (!serviceTypeToRefresh || !tokenNumber) return;
    const { updatePrimary = false } = opts;

    try {
      const response = await api.get(`/tokens/queue/${serviceTypeToRefresh}`);
      if (!response.data?.success) return;

      const data = response.data.data;
      const waitingList = data.waitingList || [];
      const nowServing = data.currentServing?.tokenNumber || null;
      const openCounters = data.openCounters || 1;

      if (nowServing && nowServing === tokenNumber) {
        const status = {
          serviceType: serviceTypeToRefresh,
          nowServing,
          peopleAhead: 0,
          estimatedWait: '0 minutes',
          isTurnNear: false,
          openCounters,
        };
        setTokenStatuses((prev) => ({ ...prev, [tokenNumber]: status }));
        if (updatePrimary) setQueueStatus(status);
        return;
      }

      const index = waitingList.findIndex((t) => t.tokenNumber === tokenNumber);
      const peopleAhead = index === -1 ? 0 : index;
      // ETA from backend position field (already recalculated)
      const myToken = waitingList.find(t => t.tokenNumber === tokenNumber);
      const estimatedWait = myToken
        ? `Approximately ${myToken.estimatedWaitTime} minutes`
        : `${peopleAhead * 5} minutes`;
      const isTurnNear = peopleAhead > 0 && peopleAhead <= 2;

      const status = {
        serviceType: serviceTypeToRefresh,
        nowServing,
        peopleAhead,
        estimatedWait,
        isTurnNear,
        openCounters,
      };
      setTokenStatuses((prev) => ({ ...prev, [tokenNumber]: status }));
      if (updatePrimary) setQueueStatus(status);
    } catch {
      // ignore transient errors
    }
  };

  const hydrateActiveToken = async () => {
    if (!user) return;

    try {
      const response = await api.get('/tokens/my-tokens');
      if (!response.data?.success) return;

      const tokens = response.data.data || [];
      const active = tokens.filter((t) => t.status === 'waiting' || t.status === 'serving');
      setActiveTokens(active);

      const primary =
        active.find((t) => t.status === 'serving') ||
        active.sort((a, b) => (a.position || 0) - (b.position || 0))[0];
      if (!primary) return;

      setToken({
        number: primary.tokenNumber,
        service: primary.service,
        city: primary.city || '',
        branch: primary.branch,
        date: primary.date ? new Date(primary.date).toISOString().slice(0, 10) : '',
        time: primary.time,
        peopleAhead: Math.max((primary.position || 1) - 1, 0),
        estimatedWait: `Approximately ${primary.estimatedWaitTime || 0} minutes`,
        status: primary.status,
        timestamp: primary.createdAt,
        serviceType: primary.serviceType,
      });

      await Promise.all(
        active.map((t) =>
          refreshQueueStatus(t.serviceType, t.tokenNumber, { updatePrimary: t.tokenNumber === primary.tokenNumber })
        )
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    hydrateActiveToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get current time for disabling past slots
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHour = hours % 12 || 12;
    return `${formattedHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const isTimeDisabled = (timeSlot) => {
    if (!selectedDate) return false;
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate !== today) return false;

    const currentTime = getCurrentTime();
    const [currentHour, currentMinute, currentPeriod] = currentTime.match(/(\d+):(\d+)\s(AM|PM)/).slice(1);
    const [slotHour, slotMinute, slotPeriod] = timeSlot.match(/(\d+):(\d+)\s(AM|PM)/).slice(1);

    let currentTotal = parseInt(currentHour) + (currentPeriod === 'PM' ? 12 : 0);
    let slotTotal = parseInt(slotHour) + (slotPeriod === 'PM' ? 12 : 0);

    if (currentTotal === 12) currentTotal = 0;
    if (slotTotal === 12) slotTotal = 0;

    return slotTotal < currentTotal || (slotTotal === currentTotal && parseInt(slotMinute) < parseInt(currentMinute));
  };

  const services = {
    bank: ['Account Opening', 'Card Issue', 'Cash Deposit', 'Loan Application', 'Fund Transfer', 'Fixed Deposit'],
    nadra: ['CNIC Renewal', 'New CNIC', 'Family Registration', 'Child Registration', 'Death Certificate', 'Marriage Certificate', 'Birth Certificate'],
    university: ['Admission', 'Fee Submission', 'Exam Form', 'Transcript', 'Scholarship Application', 'Hostel Application'],
    hospital: ['General Checkup', 'Emergency', 'Specialist Appointment', 'Lab Test', 'Vaccination', 'Dental Care', 'Eye Checkup', 'Physical Therapy']
  };

  const getServiceType = () => {
    if (services.bank.includes(selectedService)) return 'bank';
    if (services.nadra.includes(selectedService)) return 'nadra';
    if (services.university.includes(selectedService)) return 'university';
    if (services.hospital.includes(selectedService)) return 'hospital';
    return null;
  };

  const serviceType = getServiceType();

  const getBranchesByServiceAndCity = (service, city) => {
    const branches = {
      bank: {
        Karachi: ['HBL Main Branch', 'HBL Saddar', 'HBL Clifton', 'UBL Clifton', 'UBL Gulshan', 'Standard Chartered Bank', 'MCB Tower Branch'],
        Lahore: ['MCB DHA', 'MCB Gulberg', 'Allied Bank Gulberg', 'Allied Bank Johar Town', 'HBL Liberty Market', 'UBL MM Alam Road'],
        Islamabad: ['National Bank Blue Area', 'National Bank F-10', 'HBL F-7 Markaz', 'UBL F-11', 'MCB G-11'],
        Rawalpindi: ['National Bank Saddar', 'HBL Commercial Market', 'UBL Sixth Road', 'MCB Cantonment'],
        Multan: ['National Bank Multan Cantt', 'HBL Chowk Kumharanwala', 'UBL Shah Rukn-e-Alam']
      },
      nadra: {
        Karachi: ['NADRA Mega Center Karachi', 'NADRA Executive Office Clifton', 'NADRA Regional Office Karachi'],
        Lahore: ['NADRA Regional Office Lahore', 'NADRA Executive Office DHA', 'NADRA Gulberg Office'],
        Islamabad: ['NADRA Headquarters Islamabad', 'NADRA Executive Office F-10', 'NADRA G-11 Office'],
        Rawalpindi: ['NADRA Regional Office Rawalpindi', 'NADRA Saddar Office Rawalpindi'],
        Multan: ['NADRA Regional Office Multan', 'NADRA Cantt Office Multan']
      },
      university: {
        Karachi: ['University of Karachi Main Campus', 'NED University', 'IBA Karachi Main Campus'],
        Lahore: ['Punjab University Main Campus', 'LUMS Main Campus', 'FAST NUCES Lahore'],
        Islamabad: ['NUST Islamabad Campus', 'Quaid-e-Azam University', 'COMSATS Islamabad'],
        Rawalpindi: ['Army Medical College', 'Fatima Jinnah University'],
        Multan: ['Bahauddin Zakariya University', 'Multan Medical College']
      },
      hospital: {
        Karachi: ['Aga Khan University Hospital', 'Liaquat National Hospital', 'Jinnah Postgraduate Medical Centre'],
        Lahore: ['Punjab Institute of Cardiology', 'Mayo Hospital', 'Services Hospital'],
        Islamabad: ['Shifa International Hospital', 'Pakistan Institute of Medical Sciences'],
        Rawalpindi: ['Holy Family Hospital', 'Benazir Bhutto Hospital'],
        Multan: ['Nishtar Hospital', 'Multan Institute of Cardiology']
      }
    };

    if (service && branches[service] && branches[service][city]) {
      return branches[service][city];
    }
    return [];
  };

  // WebSocket Connection for real-time updates
  useEffect(() => {
    if (!user) return;

    socketService.connect(user.id, user.role);

    socketService.onQueueUpdate((data) => {
      const serviceTypeFromEvent = data?.serviceType || data?.data?.serviceType;
      if (!serviceTypeFromEvent) return;

      const currentToken = tokenRef.current;
      const currentActiveTokens = activeTokensRef.current;

      const list = currentActiveTokens.length
        ? currentActiveTokens
        : currentToken?.serviceType
          ? [{ tokenNumber: currentToken.number, serviceType: currentToken.serviceType }]
          : [];

      list
        .filter((t) => t.serviceType === serviceTypeFromEvent)
        .forEach((t) =>
          refreshQueueStatus(t.serviceType, t.tokenNumber, {
            updatePrimary: t.tokenNumber === currentToken?.number
          })
        );
    });

    // ✅ Fixed: turn-alert handler is now reachable (was behind an early return before)
    socketService.onTurnAlert((data) => {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <strong className="text-lg">🔔 Your turn is almost here!</strong>
          <p>Token <strong>{data.tokenNumber}</strong> — Position #{data.position}</p>
          <p className="text-sm text-gray-200">{data.message}</p>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      ), { duration: 15000, icon: '🔔' });
    });

    setIsConnected(true);

    // Join queue rooms for any active service types
    const currentToken = tokenRef.current;
    const currentActiveTokens = activeTokensRef.current;

    if (currentToken?.serviceType) {
      socketService.joinQueue(currentToken.serviceType, user.id);
      socketService.joinTokenRoom(currentToken.number);
    }
    const uniqueServiceTypes = [...new Set(currentActiveTokens.map((t) => t.serviceType).filter(Boolean))];
    uniqueServiceTypes.forEach((st) => socketService.joinQueue(st, user.id));
    currentActiveTokens.forEach((t) => socketService.joinTokenRoom(t.tokenNumber));

    return () => {
      socketService.removeListener('queue-update');
      socketService.removeListener('turn-alert');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Join token rooms whenever activeTokens changes
  useEffect(() => {
    if (!user) return;
    activeTokens.forEach((t) => {
      socketService.joinQueue(t.serviceType, user.id);
      socketService.joinTokenRoom(t.tokenNumber);
    });
    if (token?.number) {
      socketService.joinTokenRoom(token.number);
    }
  }, [activeTokens, token?.number, user?.id]);

  // Check for token expiry
  useEffect(() => {
    if (token) {
      const expiryCheck = setInterval(() => {
        const tokenAge = Date.now() - new Date(token.timestamp || Date.now()).getTime();
        const hoursSinceGeneration = tokenAge / (1000 * 60 * 60);

        if (hoursSinceGeneration > 8 && token.status !== 'completed') {
          toast.error('Your token may have expired. Please refresh.');
          clearInterval(expiryCheck);
        }
      }, 5 * 60 * 1000); // check every 5 minutes

      return () => clearInterval(expiryCheck);
    }
  }, [token]);

  const handleBookAppointment = async () => {
    if (!selectedService || !selectedCity || !selectedBranch || !selectedDate || !selectedTime) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/tokens', {
        service: selectedService,
        serviceType: serviceType,
        branch: selectedBranch,
        city: selectedCity,
        date: selectedDate,
        time: selectedTime
      });

      if (response.data.success) {
        const newToken = response.data.data;

        const newTokenState = {
          number: newToken.tokenNumber,
          service: newToken.service,
          city: selectedCity,
          branch: selectedBranch,
          date: selectedDate,
          time: selectedTime,
          peopleAhead: newToken.position - 1,
          estimatedWait: `Approximately ${newToken.estimatedWaitTime} minutes`,
          status: newToken.status,
          timestamp: newToken.createdAt,
          serviceType: newToken.serviceType
        };

        setToken(newTokenState);
        setActiveTokens((prev) => {
          const next = [newToken, ...prev.filter((t) => t.tokenNumber !== newToken.tokenNumber)];
          return next;
        });

        localStorage.setItem(
          'activeToken',
          JSON.stringify({ tokenNumber: newToken.tokenNumber, serviceType: newToken.serviceType })
        );

        // Join socket rooms for the new token
        socketService.joinQueue(newToken.serviceType, user?.id);
        socketService.joinTokenRoom(newToken.tokenNumber);

        await refreshQueueStatus(newToken.serviceType, newToken.tokenNumber, { updatePrimary: true });

        // Save appointment history record
        try {
          await api.post('/appointments', {
            tokenId: newToken.tokenNumber,
            service: selectedService,
            serviceType: serviceType,
            branch: selectedBranch,
            city: selectedCity,
            date: selectedDate,
            time: selectedTime
          });
        } catch {
          // Non-fatal — token was generated, history record failed silently
        }

        toast.success(`🎫 Token ${newToken.tokenNumber} generated! Position #${newToken.position}`, {
          duration: 5000,
          icon: '🎫'
        });
      } else {
        toast.error(response.data.message || 'Failed to generate token');
      }
    } catch (error) {
      console.error('Token generation error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Server error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    try {
      await api.put(`/tokens/${token.number}/cancel`, { reason: cancelReason });
      toast.success(`Appointment ${token.number} has been cancelled`, { icon: '❌' });
      setShowCancelModal(false);
      setCancelReason('');
      setToken(null);
      setActiveTokens(prev => prev.filter(t => t.tokenNumber !== token.number));
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      toast.error('Please select new date and time');
      return;
    }

    try {
      const response = await api.put(`/tokens/${token.number}/reschedule`, {
        newDate: rescheduleDate,
        newTime: rescheduleTime
      });

      if (response.data.success) {
        setToken({
          ...token,
          date: rescheduleDate,
          time: rescheduleTime,
          timestamp: new Date().toISOString()
        });
        toast.success(`Appointment rescheduled to ${rescheduleDate} at ${rescheduleTime}`, { icon: '📅' });
      }
    } catch (error) {
      toast.error('Failed to reschedule appointment');
    }

    setShowRescheduleModal(false);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  // Admin: simulate a customer arrival
  const handleSimulateArrival = async (svcType) => {
    setSimLoading(true);
    try {
      const response = await api.post(`/queue/${svcType}/simulate`, {
        customerName: `Demo Customer ${Date.now() % 1000}`,
        service: null
      });
      if (response.data.success) {
        toast.success(`✅ Simulated arrival: ${response.data.data.tokenNumber}`, { icon: '🤖' });
      }
    } catch (error) {
      toast.error('Simulation failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setSimLoading(false);
    }
  };

  const QRCodeModal = ({ token, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold dark:text-white">Your Token QR Code</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg">
              <div className="w-48 h-48 bg-white flex items-center justify-center text-black text-center rounded-lg">
                <div>
                  <div className="text-3xl mb-2">📱</div>
                  <div className="font-mono text-lg font-bold">{token.number}</div>
                  <div className="text-xs mt-2">{token.service}</div>
                  <div className="text-xs">{token.branch}</div>
                  {token.city && <div className="text-xs">{token.city}</div>}
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{token.number}</p>
              <p className="text-sm text-gray-600 mt-2">{token.service}</p>
              <p className="text-xs text-gray-500">{token.branch}{token.city ? `, ${token.city}` : ''}</p>
              <p className="text-xs text-gray-500">{token.date} at {token.time}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              🖨️ Print Token
            </button>
          </div>
        </div>
      </div>
    );
  };

  const exportToExcel = () => {
    if (!token) return toast.error('No token to export');
    const excelData = [{
      'Token Number': token.number, 'Service': token.service, 'City': token.city,
      'Branch': token.branch, 'Date': token.date, 'Time': token.time,
      'People Ahead': queueStatus?.peopleAhead ?? token.peopleAhead,
      'Estimated Wait': queueStatus?.estimatedWait || token.estimatedWait
    }];
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'My Token');
    XLSX.writeFile(workbook, `token-${token.number}.xlsx`);
    toast.success('Excel downloaded!');
  };

  const exportToPDF = () => {
    if (!token) return toast.error('No token to export');
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('Your Queue Token', 14, 20);
    doc.setFontSize(12);
    doc.text(`Token: ${token.number}`, 14, 40);
    doc.text(`Service: ${token.service}`, 14, 50);
    doc.text(`Branch: ${token.branch}${token.city ? ', ' + token.city : ''}`, 14, 60);
    doc.text(`Date: ${token.date} at ${token.time}`, 14, 70);
    doc.text(`People Ahead: ${queueStatus?.peopleAhead ?? token.peopleAhead}`, 14, 80);
    doc.text(`Est. Wait: ${queueStatus?.estimatedWait || token.estimatedWait}`, 14, 90);
    doc.text('(Estimates are approximate and may vary)', 14, 100);
    doc.save(`token-${token.number}.pdf`);
    toast.success('PDF downloaded!');
  };

  const peopleAhead = queueStatus?.peopleAhead ?? token?.peopleAhead ?? 0;
  const position = peopleAhead + 1;

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 md:py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Welcome to Smart Queue System</h1>
          <p className="text-blue-100">Book your appointment and track your queue in real-time</p>
        </div>

        {/* Connection Status */}
        {token && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-xs px-2 py-1 rounded ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isConnected ? '🟢 Live Connection' : '🔴 Connecting...'}
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">🔔 Turn notifications active</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition"
              >
                📅 Reschedule
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mb-8 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              You are signed in as admin. Use the sidebar for Dashboard, service queues, analytics, and staff tools.
            </p>
            <Link
              to="/admin/dashboard"
              className="shrink-0 inline-flex justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Open Admin Dashboard
            </Link>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 dark:text-white flex items-center gap-2">
              <span>📝</span> Book New Appointment
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
                  <span>🛎️</span> Select Service
                </label>
                <select className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={selectedService}
                  onChange={(e) => { setSelectedService(e.target.value); setSelectedCity(''); setSelectedBranch(''); }}>
                  <option value="">Choose a service</option>
                  <optgroup label="🏦 Bank">{services.bank.map(s => <option key={s}>{s}</option>)}</optgroup>
                  <optgroup label="🪪 NADRA">{services.nadra.map(s => <option key={s}>{s}</option>)}</optgroup>
                  <optgroup label="🎓 University">{services.university.map(s => <option key={s}>{s}</option>)}</optgroup>
                  <optgroup label="🏥 Hospital">{services.hospital.map(s => <option key={s}>{s}</option>)}</optgroup>
                </select>
              </div>

              {selectedService && (
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
                    <span>📍</span> Select City
                  </label>
                  <select className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={selectedCity}
                    onChange={(e) => { setSelectedCity(e.target.value); setSelectedBranch(''); }}>
                    <option value="">Choose city</option>
                    <option>Karachi</option><option>Lahore</option><option>Islamabad</option>
                    <option>Rawalpindi</option><option>Multan</option>
                  </select>
                </div>
              )}

              {selectedService && selectedCity && (
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
                    <span>🏢</span> Select {serviceType === 'bank' ? 'Branch' : serviceType === 'nadra' ? 'NADRA Office' : serviceType === 'university' ? 'Campus' : 'Hospital'}
                  </label>
                  <select className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}>
                    <option value="">Choose in {selectedCity}</option>
                    {getBranchesByServiceAndCity(serviceType, selectedCity).map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
                  <span>📅</span> Select Date
                </label>
                <input type="date" className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
                  <span>⏰</span> Select Time
                </label>
                <select className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                  <option value="">Choose time</option>
                  {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'].map(time => (
                    <option key={time} value={time} disabled={isTimeDisabled(time)}>
                      {time} {isTimeDisabled(time) ? '(Past)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleBookAppointment}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold text-lg shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Token...
                  </span>
                ) : (
                  '🎫 Generate Token'
                )}
              </button>
            </div>
          </div>

          {/* Token Display */}
          {token && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                  <span>🎫</span> Your Token Status
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowQR(true)} className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 transition">📱 QR</button>
                  <button onClick={exportToExcel} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition">📊 Excel</button>
                  <button onClick={exportToPDF} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition">📄 PDF</button>
                </div>
              </div>

              {/* Hero Token Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-6 text-center border-2 border-blue-200 dark:border-blue-700 shadow-lg">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">Your Token Number</div>
                <div className="text-7xl font-bold text-blue-600 dark:text-blue-400 mb-3 tracking-wider">
                  {token.number}
                </div>
                <div className="flex justify-center gap-4 mb-4">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">✅ Active</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">🟢 Live</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-xs">Service</p>
                    <p className="font-semibold">{token.service}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-xs">Location</p>
                    <p className="font-semibold text-sm">{token.branch}{token.city ? `, ${token.city}` : ''}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-xs">Date & Time</p>
                    <p className="font-semibold text-sm">{token.date} at {token.time}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-xs">Your Position</p>
                    <p className="font-semibold text-lg text-orange-600">#{position}</p>
                  </div>
                </div>
              </div>

              {/* Multiple active tokens */}
              {activeTokens.length > 1 && (
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-bold mb-4 dark:text-white">Active Tokens (Live)</h3>
                  <div className="space-y-3">
                    {activeTokens
                      .filter((t) => t.status === 'waiting' || t.status === 'serving')
                      .map((t) => {
                        const status = tokenStatuses[t.tokenNumber];
                        const pAhead = status?.nowServing === t.tokenNumber ? 0 : status?.peopleAhead;
                        return (
                          <div key={t.tokenNumber} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                            <div>
                              <div className="font-mono text-xl font-bold dark:text-white">{t.tokenNumber}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                {t.service} • {t.serviceType} • {t.branch}
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <div className="text-right">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Now Serving</div>
                                <div className="font-semibold dark:text-white">{status?.nowServing || '—'}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500 dark:text-gray-400">People Ahead</div>
                                <div className="font-semibold dark:text-white">{pAhead ?? '—'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Live Queue Status */}
              <div className="mt-6 space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">👥 People Ahead of You</span>
                    <span className="text-2xl font-bold text-orange-600">{peopleAhead}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (peopleAhead / 20) * 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {peopleAhead === 0 ? "🎉 You're next! Please be ready." :
                     peopleAhead <= 3 ? "⚠️ Your turn is almost here!" :
                     `${queueStatus?.estimatedWait || token.estimatedWait} (approximate)`}
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">🟢 Now Serving</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-400">
                        {queueStatus?.nowServing || 'Waiting...'}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">⏱️ Est. Wait</p>
                      <p className="text-lg font-semibold">{queueStatus?.estimatedWait || token.estimatedWait}</p>
                      <p className="text-xs text-gray-400">(approximate)</p>
                    </div>
                  </div>
                  {queueStatus?.openCounters !== undefined && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      🏢 {queueStatus.openCounters} counter{queueStatus.openCounters !== 1 ? 's' : ''} open
                    </p>
                  )}
                </div>

                {queueStatus?.isTurnNear && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-lg animate-pulse">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-2xl">⚠️</span>
                      <span className="font-semibold text-yellow-700 dark:text-yellow-300">Your turn is coming up next!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Cancel Appointment</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to cancel token <span className="font-bold">{token?.number}</span>?</p>
            <textarea
              className="w-full border rounded-lg p-3 mb-4 dark:bg-gray-700 focus:ring-2 focus:ring-red-500"
              rows="3"
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={handleCancelAppointment} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition">Confirm Cancel</button>
              <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Reschedule Appointment</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Select new date and time for token <span className="font-bold">{token?.number}</span></p>
            <input
              type="date"
              className="w-full border rounded-lg p-3 mb-3 dark:bg-gray-700 focus:ring-2 focus:ring-yellow-500"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <select
              className="w-full border rounded-lg p-3 mb-4 dark:bg-gray-700 focus:ring-2 focus:ring-yellow-500"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            >
              <option value="">Select new time</option>
              <option>09:00 AM</option><option>10:00 AM</option><option>11:00 AM</option>
              <option>12:00 PM</option><option>01:00 PM</option><option>02:00 PM</option>
              <option>03:00 PM</option><option>04:00 PM</option>
            </select>
            <div className="flex gap-3">
              <button onClick={handleRescheduleAppointment} className="flex-1 bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition">Confirm Reschedule</button>
              <button onClick={() => setShowRescheduleModal(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showQR && token && <QRCodeModal token={token} onClose={() => setShowQR(false)} />}
    </div>
  );
};

export default EnhancedUserDashboard;
