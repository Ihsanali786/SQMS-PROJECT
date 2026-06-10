// src/components/EnhancedAdminDashboard.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DarkModeToggle from './DarkModeToggle';
import SoundToggle from './SoundToggle';
import { useSoundNotification } from '../hooks/useSoundNotification';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const EnhancedAdminDashboard = ({ type = 'bank' }) => {
  const [tokens, setTokens] = useState([]);
  const [currentServing, setCurrentServing] = useState(null);
  const [mobileView, setMobileView] = useState('queue');
  const { playNotification } = useSoundNotification();

  // Sample data
  const sampleTokens = {
    bank: [
      { id: 1, token: 'B-38', name: 'Hassan Ahmed', service: 'Cash Deposit', status: 'In Service', time: '10:30 AM' },
      { id: 2, token: 'B-39', name: 'Fatima Khan', service: 'Account Opening', status: 'Waiting', time: '10:45 AM' },
      { id: 3, token: 'B-40', name: 'Omar Riaz', service: 'Card Issue', status: 'Waiting', time: '11:00 AM' },
      { id: 4, token: 'B-41', name: 'Ali Raza', service: 'Loan Application', status: 'Waiting', time: '11:15 AM' },
      { id: 5, token: 'B-42', name: 'Sara Ahmed', service: 'Cash Deposit', status: 'Waiting', time: '11:30 AM' },
    ],
    nadra: [
      { id: 1, token: 'N-210', name: 'Ali Raza', service: 'CNIC Renewal', status: 'In Service', time: '10:30 AM' },
      { id: 2, token: 'N-211', name: 'Sana Mir', service: 'Family Registration', status: 'Waiting', time: '10:45 AM' },
      { id: 3, token: 'N-212', name: 'Ahmed Khan', service: 'Child Registration', status: 'Waiting', time: '11:00 AM' },
    ],
    university: [
      { id: 1, token: 'U-140', name: 'Sara Ahmed', service: 'Student Registration', status: 'In Service', time: '10:30 AM' },
      { id: 2, token: 'U-141', name: 'Ahmed Ali', service: 'Fee Submission', status: 'Waiting', time: '10:45 AM' },
      { id: 3, token: 'U-142', name: 'Fatima Zafar', service: 'Exam Form', status: 'Waiting', time: '11:00 AM' },
    ],
  };

  useEffect(() => {
    setTokens(sampleTokens[type]);
    const servingToken = sampleTokens[type].find(t => t.status === 'In Service');
    setCurrentServing(servingToken);
  }, [type]);

  const stats = {
    bank: { 
      today: 90, 
      completed: 45, 
      waiting: 45,
      avgWaitTime: '12 min',
      peakHour: '11 AM - 1 PM'
    },
    nadra: { 
      today: 210, 
      completed: 120, 
      waiting: 90,
      avgWaitTime: '25 min',
      peakHour: '10 AM - 12 PM'
    },
    university: { 
      today: 55, 
      completed: 30, 
      waiting: 25,
      avgWaitTime: '8 min',
      peakHour: '2 PM - 4 PM'
    },
  };

  const currentStat = stats[type];

  const handleMarkDone = (tokenId) => {
    setTokens(prev => prev.filter(t => t.token !== tokenId));
    playNotification();
    toast.success(`Token ${tokenId} completed! Next customer will be called.`);
    
    const nextToken = tokens.find(t => t.token !== tokenId && t.status === 'Waiting');
    if (nextToken) {
      setTimeout(() => handleCallNext(nextToken.token), 1000);
    }
  };

  const handleCallNext = (tokenId) => {
    setTokens(prev => prev.map(t => ({
      ...t,
      status: t.token === tokenId ? 'In Service' : t.status
    })));
    const nextToken = tokens.find(t => t.token === tokenId);
    setCurrentServing(nextToken);
    playNotification();
    toast.success(`Now serving: ${tokenId}`, { duration: 5000 });
  };

  const handleSkip = (tokenId) => {
    setTokens(prev => prev.filter(t => t.token !== tokenId));
    toast.warning(`Token ${tokenId} skipped!`);
    playNotification();
  };

  // Export to Excel function
  const exportToExcel = () => {
    try {
      const excelData = tokens.map(item => ({
        'Token ID': item.token,
        'Customer Name': item.name,
        'Service': item.service,
        'Time': item.time,
        'Status': item.status,
        'Branch': type.toUpperCase(),
        'Date': new Date().toLocaleDateString()
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${type.toUpperCase()} Queue`);
      
      XLSX.writeFile(workbook, `${type}-queue-data-${Date.now()}.xlsx`);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      toast.error('Failed to export Excel file');
      console.error(error);
    }
  };

  // Fixed Export to PDF function - using doc.autoTable instead of autoTable
  const exportToPDF = () => {
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(41, 128, 185);
      doc.text(`${type.toUpperCase()} Queue Report`, 14, 20);
      
      // Add date and time
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Add statistics section
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Statistics Summary:', 14, 45);
      
      doc.setFontSize(10);
      doc.text(`Total Tokens Today: ${currentStat.today}`, 20, 55);
      doc.text(`Completed Services: ${currentStat.completed}`, 20, 62);
      doc.text(`Waiting in Queue: ${currentStat.waiting}`, 20, 69);
      doc.text(`Average Wait Time: ${currentStat.avgWaitTime}`, 20, 76);
      doc.text(`Peak Hours: ${currentStat.peakHour}`, 20, 83);
      
      // Prepare table data
      const tableData = tokens.map(token => [
        token.token,
        token.name,
        token.service,
        token.time,
        token.status
      ]);
      
      // Add table to PDF - using doc.autoTable
      doc.autoTable({
        startY: 95,
        head: [['Token ID', 'Customer Name', 'Service', 'Time', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        styles: { 
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 40 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 }
        }
      });
      
      // Get final Y position
      const finalY = doc.lastAutoTable.finalY || 150;
      
      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Smart Queue Management System - ${type.toUpperCase()} Branch`, 14, finalY + 10);
      doc.text(`Page 1 of 1`, 180, finalY + 10, { align: 'right' });
      
      // Save the PDF
      doc.save(`${type}-queue-report-${Date.now()}.pdf`);
      toast.success('PDF report downloaded successfully!');
      
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Failed to export PDF: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold capitalize dark:text-white">
                {type.toUpperCase()} Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time Queue Management</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {/* Export Buttons */}
              <button
                onClick={exportToExcel}
                className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1"
              >
                📊 Export Excel
              </button>
              <button
                onClick={exportToPDF}
                className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-1"
              >
                📄 Export PDF
              </button>
              <DarkModeToggle />
              <SoundToggle soundEnabled={true} setSoundEnabled={() => {}} />
            </div>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="md:hidden flex gap-2 mb-4">
          <button 
            onClick={() => setMobileView('stats')}
            className={`flex-1 py-2 rounded ${mobileView === 'stats' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
          >
            Statistics
          </button>
          <button 
            onClick={() => setMobileView('queue')}
            className={`flex-1 py-2 rounded ${mobileView === 'queue' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
          >
            Queue Management
          </button>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 ${mobileView === 'queue' ? 'hidden md:grid' : ''}`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Today's Appointments</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{currentStat.today}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{currentStat.completed}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Waiting</p>
            <p className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">{currentStat.waiting}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Wait Time</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">{currentStat.avgWaitTime}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Peak Hour</p>
            <p className="text-sm font-semibold dark:text-white">{currentStat.peakHour}</p>
          </div>
        </div>

        {/* Current Serving Banner */}
        {currentServing && (
          <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-600 rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">🟢 CURRENTLY SERVING</p>
                <p className="text-2xl md:text-3xl font-bold text-green-700 dark:text-green-400">
                  {currentServing.token} - {currentServing.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentServing.service}</p>
              </div>
              <button 
                onClick={() => handleMarkDone(currentServing.token)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Mark As Done ✓
              </button>
            </div>
          </div>
        )}

        {/* Token Queue - Responsive Table/Cards */}
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 ${mobileView === 'stats' ? 'hidden md:block' : ''}`}>
          <h2 className="text-xl font-bold mb-4 dark:text-white">Current Queue ({tokens.length} customers)</h2>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b dark:border-gray-700">
                <tr className="text-left">
                  <th className="pb-3 dark:text-gray-300">Token</th>
                  <th className="pb-3 dark:text-gray-300">Name</th>
                  <th className="pb-3 dark:text-gray-300">Service</th>
                  <th className="pb-3 dark:text-gray-300">Time</th>
                  <th className="pb-3 dark:text-gray-300">Status</th>
                  <th className="pb-3 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((item) => (
                  <tr key={item.id} className="border-b dark:border-gray-700">
                    <td className="py-3 font-mono font-bold dark:text-white">{item.token}</td>
                    <td className="py-3 dark:text-gray-300">{item.name}</td>
                    <td className="py-3 dark:text-gray-300">{item.service}</td>
                    <td className="py-3 dark:text-gray-300">{item.time}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === 'In Service' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {item.status === 'Waiting' && (
                          <>
                            <button 
                              onClick={() => handleCallNext(item.token)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              Call Next
                            </button>
                            <button 
                              onClick={() => handleSkip(item.token)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Skip
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {tokens.map((item) => (
              <div key={item.id} className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-lg dark:text-white">{item.token}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.status === 'In Service' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="font-semibold dark:text-gray-300">{item.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.service}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">{item.time}</p>
                
                {item.status === 'Waiting' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCallNext(item.token)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      Call Next
                    </button>
                    <button 
                      onClick={() => handleSkip(item.token)}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;