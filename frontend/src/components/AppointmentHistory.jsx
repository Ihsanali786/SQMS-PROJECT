// frontend/src/components/AppointmentHistory.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';

const AppointmentHistory = () => {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
    fetchAppointments();
  }, []);

  // ✅ FIXED: Fetch appointments from backend API
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/appointments/my-appointments');
      if (response.data.success) {
        setAppointments(response.data.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
      default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '⏳';
    }
  };

  const filteredAppointments = appointments.filter(apt => 
    filter === 'all' ? true : (apt.status || 'waiting') === filter
  );

  const exportToExcel = () => {
    try {
      const excelData = appointments.map(apt => ({
        'Token ID': apt.tokenId,
        'Service': apt.service,
        'Date': apt.date,
        'Time': apt.time,
        'Branch': apt.branch,
        'City': apt.city || '',
        'Status': apt.status || 'waiting',
        'Booked On': apt.timestamp || apt.createdAt
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'My Appointments');
      XLSX.writeFile(workbook, `my-appointments-${Date.now()}.xlsx`);
      toast.success('Excel file downloaded!');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(41, 128, 185);
      doc.text('My Appointment History', 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Customer: ${user?.name || 'User'}`, 14, 35);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);
      doc.text(`Total Appointments: ${appointments.length}`, 14, 49);
      
      const tableData = appointments.map(apt => [
        apt.tokenId,
        apt.service,
        apt.date,
        apt.time,
        apt.branch,
        apt.status || 'waiting'
      ]);
      
      doc.autoTable({
        startY: 60,
        head: [['Token', 'Service', 'Date', 'Time', 'Branch', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      doc.save(`my-appointments-${Date.now()}.pdf`);
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleCancel = async (appointmentId) => {
    try {
      await api.put(`/appointments/${appointmentId}/cancel`);
      toast.success('Appointment cancelled');
      fetchAppointments(); // Refresh the list
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold dark:text-white mb-2">No Appointments Yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't booked any appointments. Start by booking one!
            </p>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold dark:text-white">📅 Appointment History</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View all your past and upcoming appointments
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToExcel}
                className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
              >
                📊 Export Excel
              </button>
              <button
                onClick={exportToPDF}
                className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 flex items-center gap-1"
              >
                📄 Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'waiting', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  filter === status 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? '📋 All' : status === 'waiting' ? '⏳ Waiting' : status === 'completed' ? '✅ Completed' : '❌ Cancelled'}
                ({status === 'all' ? appointments.length : appointments.filter(a => (a.status || 'waiting') === status).length})
              </button>
            ))}
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="divide-y dark:divide-gray-700">
            {filteredAppointments.map((apt, index) => (
              <div key={apt._id || index} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono font-bold text-lg dark:text-white">🎫 {apt.tokenId}</span>
                      <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${getStatusColor(apt.status || 'waiting')}`}>
                        {getStatusIcon(apt.status || 'waiting')} {apt.status || 'waiting'}
                      </span>
                    </div>
                    <p className="text-lg font-semibold dark:text-white mb-2">{apt.service}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>{new Date(apt.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>⏰</span>
                        <span>{apt.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span>{apt.branch}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedAppointment(apt)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-2"
                    >
                      👁️ View
                    </button>
                    {(apt.status === 'waiting' || !apt.status) && (
                      <button
                        onClick={() => handleCancel(apt._id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 p-2"
                      >
                        ❌ Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">📋 Appointment Details</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold dark:text-gray-300">Token:</span>
                <span className="font-mono dark:text-white">{selectedAppointment.tokenId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold dark:text-gray-300">Service:</span>
                <span className="dark:text-white">{selectedAppointment.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold dark:text-gray-300">Date:</span>
                <span className="dark:text-white">{new Date(selectedAppointment.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold dark:text-gray-300">Time:</span>
                <span className="dark:text-white">{selectedAppointment.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold dark:text-gray-300">Branch:</span>
                <span className="dark:text-white">{selectedAppointment.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold dark:text-gray-300">City:</span>
                <span className="dark:text-white">{selectedAppointment.city || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold dark:text-gray-300">Status:</span>
                <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${getStatusColor(selectedAppointment.status || 'waiting')}`}>
                  {getStatusIcon(selectedAppointment.status || 'waiting')} {selectedAppointment.status || 'waiting'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold dark:text-gray-300">Booked On:</span>
                <span className="dark:text-white">{new Date(selectedAppointment.timestamp || selectedAppointment.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedAppointment(null)}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentHistory;