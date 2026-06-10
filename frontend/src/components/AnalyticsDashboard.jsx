// frontend/src/components/AnalyticsDashboard.jsx
import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DarkModeToggle from './DarkModeToggle';

const AnalyticsDashboard = () => {
  const [queueData, setQueueData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sample data - In production, fetch from your backend API
  useEffect(() => {
    // Hourly customer data
    const hourlyData = [
      { hour: '9 AM', customers: 45, waitTime: 5, completed: 40 },
      { hour: '10 AM', customers: 78, waitTime: 8, completed: 70 },
      { hour: '11 AM', customers: 120, waitTime: 15, completed: 110 },
      { hour: '12 PM', customers: 95, waitTime: 12, completed: 88 },
      { hour: '1 PM', customers: 62, waitTime: 7, completed: 58 },
      { hour: '2 PM', customers: 85, waitTime: 10, completed: 80 },
      { hour: '3 PM', customers: 110, waitTime: 14, completed: 100 },
      { hour: '4 PM', customers: 70, waitTime: 6, completed: 65 },
    ];
    setQueueData(hourlyData);

    // Service distribution
    const services = [
      { name: 'Bank', value: 320, color: '#22c55e' },
      { name: 'NADRA', value: 210, color: '#a855f7' },
      { name: 'University', value: 180, color: '#f97316' },
      { name: 'Hospital', value: 150, color: '#ef4444' },
    ];
    setServiceData(services);

    // Peak hours analysis
    const peaks = [
      { hour: '11 AM - 12 PM', customers: 120, utilization: '90%' },
      { hour: '3 PM - 4 PM', customers: 110, utilization: '85%' },
      { hour: '10 AM - 11 AM', customers: 78, utilization: '65%' },
    ];
    setPeakHours(peaks);
    setLoading(false);
  }, []);

  const COLORS = ['#22c55e', '#a855f7', '#f97316', '#ef4444', '#3b82f6', '#eab308'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md p-6 mb-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">📊 Analytics Dashboard</h1>
              <p className="text-blue-100 mt-1">Real-time queue statistics and insights</p>
            </div>
            <DarkModeToggle />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers Today</p>
            <p className="text-2xl font-bold text-blue-600">665</p>
            <p className="text-xs text-green-600">↑ 12% from yesterday</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Average Wait Time</p>
            <p className="text-2xl font-bold text-green-600">9.6 min</p>
            <p className="text-xs text-green-600">↓ 2 min improvement</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Peak Hour</p>
            <p className="text-2xl font-bold text-orange-600">11 AM - 12 PM</p>
            <p className="text-xs text-gray-500">120 customers</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Service Rate</p>
            <p className="text-2xl font-bold text-purple-600">94%</p>
            <p className="text-xs text-green-600">↑ 5% efficiency</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Line Chart - Customer Traffic */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold mb-4 dark:text-white">📈 Customer Traffic (Hourly)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={queueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="customers" stroke="#3b82f6" name="Customers" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Wait Times */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold mb-4 dark:text-white">⏱️ Average Wait Time (Minutes)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={queueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="waitTime" fill="#ef4444" name="Wait Time (min)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Service Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold mb-4 dark:text-white">🥧 Service Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold mb-4 dark:text-white">🔥 Peak Hours Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="p-3 text-left">Time Slot</th>
                    <th className="p-3 text-left">Customers</th>
                    <th className="p-3 text-left">Utilization</th>
                    <th className="p-3 text-left">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {peakHours.map((peak, index) => (
                    <tr key={index} className="border-t dark:border-gray-700">
                      <td className="p-3 font-semibold">{peak.hour}</td>
                      <td className="p-3">{peak.customers}</td>
                      <td className="p-3">
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                          {peak.utilization}
                        </span>
                      </td>
                      <td className="p-3 text-sm">Add more staff</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4 dark:text-white">💡 AI Recommendations</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">👥</span>
                <span className="font-semibold">Staff Optimization</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Peak hours 11 AM - 12 PM need 2 additional staff members to reduce wait time by 40%.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⏰</span>
                <span className="font-semibold">Best Time to Visit</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recommended visiting hours: 9 AM - 10 AM or 1 PM - 2 PM (30% less waiting time).
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🏦</span>
                <span className="font-semibold">Branch Performance</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                HBL Main Branch has highest traffic. Consider redirecting customers to Clifton Branch.
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📊</span>
                <span className="font-semibold">Service Efficiency</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cash Deposit service takes 40% longer than average. Review process for improvement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;