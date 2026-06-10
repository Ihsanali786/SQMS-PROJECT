// frontend/src/components/UniversityAdmin.jsx
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import DarkModeToggle from './DarkModeToggle';
import api from '../services/api';
import socketService from '../services/socketService';

const UniversityAdmin = () => {
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [showConfirmComplete, setShowConfirmComplete] = useState(null);
  const [showConfirmSkip, setShowConfirmSkip] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [currentServing, setCurrentServing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalToday: 0,
    completed: 0,
    waiting: 0,
    universities: 0,
    totalStudents: 0,
    programs: 0
  });

  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const refreshTimerRef = useRef(null);

  const scheduleRefresh = () => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(async () => {
      refreshTimerRef.current = null;
      await fetchQueue();
    }, 500);
  };

  const faculties = [
    'Engineering', 'Computer Science', 'Business', 'Arts', 'Science', 
    'Medicine', 'Law', 'Pharmacy', 'Agriculture', 'Social Sciences'
  ];

  // Fetch queue data from backend
  const fetchQueue = async () => {
    try {
      setLoading(true);
      const response = await api.get('/queue/university');
      if (response.data.success) {
        const queueData = response.data.data;
        setTokens(queueData.tokens || []);
        setStats(queueData.stats || {
          totalToday: queueData.tokens?.length || 0,
          completed: 0,
          waiting: queueData.tokens?.filter(t => t.status === 'waiting').length || 0,
          universities: 10,
          totalStudents: 161000,
          programs: 450
        });
        
        const serving = queueData.tokens?.find(t => t.status === 'serving');
        setCurrentServing(serving);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast.error('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) socketService.connect(user.id, user.role);
    fetchQueue();

    socketService.onQueueUpdate((data) => {
      if (data?.serviceType === 'university') scheduleRefresh();
    });

    return () => {
      socketService.removeListener('queue-update');
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallNext = async () => {
    try {
      setIsCalling(true);
      const response = await api.put('/queue/university/next');
      if (response.data.success) {
        toast.success(`🔔 Now serving: ${response.data.data.tokenNumber}`, {
          duration: 5000,
          icon: '🔔'
        });
        socketService.adminAction('call-next', { serviceType: 'university', token: response.data.data.tokenNumber });
        fetchQueue();
      } else {
        toast.error(response.data.message || 'No students waiting');
      }
    } catch (error) {
      console.error('Error calling next:', error);
      if (error.response?.status === 404) {
        toast.error('No students waiting');
      } else {
        toast.error('Failed to call next student');
      }
    } finally {
      setIsCalling(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      const response = await api.put(`/queue/university/complete/${id}`);
      if (response.data.success) {
        toast.success('✅ Student processed!', { icon: '✅' });
        socketService.adminAction('complete', { serviceType: 'university', tokenId: id });
        fetchQueue();
      }
    } catch (error) {
      toast.error('Failed to complete service');
    }
    setShowConfirmComplete(null);
  };

  const handleSkip = async (id) => {
    try {
      const response = await api.put(`/queue/university/skip/${id}`);
      if (response.data.success) {
        toast.warning('⏭️ Student skipped!', { icon: '⏭️' });
        socketService.adminAction('skip', { serviceType: 'university', tokenId: id });
        fetchQueue();
      }
    } catch (error) {
      toast.error('Failed to skip student');
    }
    setShowConfirmSkip(null);
  };

  const waitingTokens = tokens.filter(token => token.status === 'waiting');
  const filteredStudents = waitingTokens.filter(student => {
    const matchesSearch = (student.customerName || student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.tokenNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.service || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUniversity = selectedUniversity === 'all' || student.university === selectedUniversity;
    const matchesFaculty = selectedFaculty === 'all' || student.faculty === selectedFaculty;
    return matchesSearch && matchesUniversity && matchesFaculty;
  });

  const uniqueUniversities = [...new Set(tokens.map(t => t.university))];
  const waitingCount = filteredStudents.length;
  const nextStudent = filteredStudents[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-700 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">🎓 University Admin Dashboard</h1>
              <p className="text-orange-100 mt-1">Manage multiple universities across Pakistan</p>
            </div>
            <DarkModeToggle />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl">👨‍🎓</div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Today's Students</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Processed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⏳</div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Waiting</p>
                <p className="text-2xl font-bold text-orange-600">{stats.waiting}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏛️</div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Universities</p>
                <p className="text-2xl font-bold text-purple-600">{stats.universities}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📚</div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Programs</p>
                <p className="text-2xl font-bold text-blue-600">{stats.programs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Now Serving Section */}
        {currentServing && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 mb-6 border-2 border-green-300 dark:border-green-700">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">🟢 CURRENTLY SERVING</span>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-green-700 dark:text-green-400">
                  {currentServing.tokenNumber} - {currentServing.customerName || currentServing.name}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {currentServing.service} | Counter 1
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {currentServing.university}, {currentServing.city} | {currentServing.program}
                </p>
              </div>
              <button 
                onClick={() => setShowConfirmComplete(currentServing._id)}
                className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition font-semibold text-lg shadow-md"
              >
                ✓ Complete Service
              </button>
            </div>
          </div>
        )}

        {/* Next Student Preview */}
        {!currentServing && nextStudent && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏩</span>
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Next in Line</p>
                  <p className="font-semibold text-lg">{nextStudent.tokenNumber} - {nextStudent.customerName || nextStudent.name}</p>
                  <p className="text-sm text-gray-500">{nextStudent.service} | {nextStudent.program}</p>
                </div>
              </div>
              <button
                onClick={handleCallNext}
                disabled={isCalling}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {isCalling ? 'Calling...' : '📞 Call Now'}
              </button>
            </div>
          </div>
        )}

        {/* BIG Call Next Button */}
        {!currentServing && (
          <div className="mb-8 flex justify-center">
            <button
              onClick={handleCallNext}
              disabled={isCalling || waitingCount === 0}
              className="bg-gradient-to-r from-orange-600 to-amber-700 text-white px-12 py-4 rounded-xl hover:from-orange-700 hover:to-amber-800 transition font-bold text-xl shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {isCalling ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calling Next...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <span className="text-2xl">📞</span>
                  Call Next Student
                  {waitingCount > 0 && <span className="bg-white text-orange-600 px-2 py-1 rounded-full text-sm ml-2">{waitingCount} waiting</span>}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
              <span>🏛️</span> Filter by University
            </label>
            <select
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Universities</option>
              {uniqueUniversities.map((university) => (
                <option key={university} value={university}>{university}</option>
              ))}
            </select>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
              <span>📚</span> Filter by Faculty
            </label>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Faculties</option>
              {faculties.map((faculty) => (
                <option key={faculty} value={faculty}>{faculty}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by token, name or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <span>📋</span> Student Queue 
              <span className="text-sm font-normal bg-orange-100 text-orange-700 px-2 py-1 rounded-full ml-2">
                {filteredStudents.length} waiting
              </span>
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold dark:text-gray-300">Token</th>
                  <th className="p-3 text-left text-sm font-semibold dark:text-gray-300">Student</th>
                  <th className="p-3 text-left text-sm font-semibold dark:text-gray-300">Service</th>
                  <th className="p-3 text-left text-sm font-semibold dark:text-gray-300">University</th>
                  <th className="p-3 text-left text-sm font-semibold dark:text-gray-300">Faculty</th>
                  <th className="p-3 text-left text-sm font-semibold dark:text-gray-300">Program</th>
                  <th className="p-3 text-left text-sm font-semibold dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={student._id} className={`border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${index === 0 && !currentServing ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}>
                    <td className="p-3 font-mono font-bold dark:text-white">
                      {student.tokenNumber}
                      {index === 0 && !currentServing && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded">Next</span>}
                    </td>
                    <td className="p-3 dark:text-gray-300">{student.customerName || student.name}</td>
                    <td className="p-3 dark:text-gray-300">{student.service}</td>
                    <td className="p-3 dark:text-gray-300">{student.university}</td>
                    <td className="p-3 dark:text-gray-300">{student.faculty}</td>
                    <td className="p-3 dark:text-gray-300">{student.program}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowConfirmComplete(student._id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => setShowConfirmSkip(student._id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                        >
                          Skip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-lg">No students waiting in queue</p>
              <p className="text-sm">New students will appear here when they book appointments</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Complete Modal */}
      {showConfirmComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Complete Service</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Mark this student as processed? This will remove them from the queue.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleComplete(showConfirmComplete)} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">Yes, Complete</button>
              <button onClick={() => setShowConfirmComplete(null)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Skip Modal */}
      {showConfirmSkip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Skip Student</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Skip this student? They will be removed from the queue.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleSkip(showConfirmSkip)} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition">Yes, Skip</button>
              <button onClick={() => setShowConfirmSkip(null)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityAdmin;
