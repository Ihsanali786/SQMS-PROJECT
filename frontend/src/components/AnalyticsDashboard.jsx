// frontend/src/components/AnalyticsDashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getQueueAnalytics } from '../services/api';

const SERVICES = [
  { key: 'bank', label: 'Bank', color: '#16a34a' },
  { key: 'nadra', label: 'NADRA', color: '#7c3aed' },
  { key: 'university', label: 'University', color: '#ea580c' },
  { key: 'hospital', label: 'Hospital', color: '#dc2626' }
];

const emptyMetrics = {
  totalToday: 0,
  waiting: 0,
  serving: 0,
  completed: 0,
  skipped: 0,
  averageWaitTime: 0,
  openCounters: 0,
  completionRate: 0
};

const AnalyticsDashboard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const responses = await Promise.all(
        SERVICES.map((service) =>
          getQueueAnalytics(service.key).then((response) => ({
            ...service,
            ...(response.data?.data || emptyMetrics)
          }))
        )
      );
      setRows(responses);
    } catch (err) {
      const message = err.response?.status === 401
        ? 'Analytics are available to admin users only.'
        : err.response?.data?.message || 'Failed to load analytics.';
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const totals = useMemo(() => rows.reduce((sum, row) => ({
    totalToday: sum.totalToday + (row.totalToday || 0),
    waiting: sum.waiting + (row.waiting || 0),
    serving: sum.serving + (row.serving || 0),
    completed: sum.completed + (row.completed || 0),
    skipped: sum.skipped + (row.skipped || 0),
    openCounters: sum.openCounters + (row.openCounters || 0)
  }), emptyMetrics), [rows]);

  const weightedAverageWait = useMemo(() => {
    const weighted = rows.reduce((sum, row) => sum + ((row.averageWaitTime || 0) * Math.max(row.completed || row.totalToday || 0, 1)), 0);
    const weight = rows.reduce((sum, row) => sum + Math.max(row.completed || row.totalToday || 0, 1), 0);
    return weight > 0 ? Math.round(weighted / weight) : 0;
  }, [rows]);

  const distribution = rows
    .filter((row) => (row.totalToday || row.waiting || row.completed || row.skipped || row.serving) > 0)
    .map((row) => ({
      name: row.label,
      value: row.totalToday || row.waiting + row.serving + row.completed + row.skipped,
      color: row.color
    }));

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 md:p-6 md:py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold dark:text-white">Analytics Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Live metrics from MongoDB queue records</p>
            </div>
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading && rows.length === 0 && !error && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">Loading analytics…</p>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!error && rows.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
            No analytics data is available yet.
          </div>
        )}

        {!error && rows.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Customers Today</p>
                <p className="text-2xl font-bold text-blue-600">{totals.totalToday}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Waiting Now</p>
                <p className="text-2xl font-bold text-orange-600">{totals.waiting}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Wait</p>
                <p className="text-2xl font-bold text-green-600">{weightedAverageWait} min</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Open Counters</p>
                <p className="text-2xl font-bold text-purple-600">{totals.openCounters}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h2 className="text-lg font-bold mb-4 dark:text-white">Queue Load by Service</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="waiting" name="Waiting" fill="#f97316" />
                    <Bar dataKey="serving" name="Serving" fill="#3b82f6" />
                    <Bar dataKey="completed" name="Completed Today" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h2 className="text-lg font-bold mb-4 dark:text-white">Today's Service Distribution</h2>
                {distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distribution}
                        cx="50%"
                        cy="50%"
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={90}
                        dataKey="value"
                      >
                        {distribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No tokens created today.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold dark:text-white">Service Details</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="p-3 text-left dark:text-gray-300">Service</th>
                      <th className="p-3 text-left dark:text-gray-300">Today</th>
                      <th className="p-3 text-left dark:text-gray-300">Waiting</th>
                      <th className="p-3 text-left dark:text-gray-300">Serving</th>
                      <th className="p-3 text-left dark:text-gray-300">Completed</th>
                      <th className="p-3 text-left dark:text-gray-300">Skipped</th>
                      <th className="p-3 text-left dark:text-gray-300">Avg Wait</th>
                      <th className="p-3 text-left dark:text-gray-300">Counters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-t dark:border-gray-700">
                        <td className="p-3 font-semibold dark:text-white">{row.label}</td>
                        <td className="p-3 dark:text-gray-300">{row.totalToday}</td>
                        <td className="p-3 dark:text-gray-300">{row.waiting}</td>
                        <td className="p-3 dark:text-gray-300">{row.serving}</td>
                        <td className="p-3 dark:text-gray-300">{row.completed}</td>
                        <td className="p-3 dark:text-gray-300">{row.skipped}</td>
                        <td className="p-3 dark:text-gray-300">{row.averageWaitTime} min</td>
                        <td className="p-3 dark:text-gray-300">{row.openCounters}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
