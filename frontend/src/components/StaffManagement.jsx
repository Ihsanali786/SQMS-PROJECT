import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQueueAnalytics } from '../services/api';

const SERVICES = [
  { key: 'bank', label: 'Bank', icon: '🏦', path: '/admin/bank' },
  { key: 'nadra', label: 'NADRA', icon: '🪪', path: '/admin/nadra' },
  { key: 'university', label: 'University', icon: '🎓', path: '/admin/university' },
  { key: 'hospital', label: 'Hospital', icon: '🏥', path: '/admin/hospital' },
];

const StaffManagement = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await Promise.all(
        SERVICES.map(async (service) => {
          const res = await getQueueAnalytics(service.key);
          return {
            ...service,
            openCounters: res.data?.data?.openCounters ?? 0,
            waiting: res.data?.data?.waiting ?? 0,
            serving: res.data?.data?.serving ?? 0,
          };
        })
      );
      setRows(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load staff management data.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
        <header className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h1 className="text-2xl md:text-3xl font-bold dark:text-white">Staff Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage counters and queue operations per service. Open counters represent active staff stations serving customers.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300">
            {error}
            <button type="button" onClick={load} className="ml-3 text-sm font-semibold underline">
              Retry
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {SERVICES.map((service) => {
            const stats = rows.find((r) => r.key === service.key);
            return (
              <Link
                key={service.key}
                to={service.path}
                className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{service.icon}</span>
                  <div>
                    <h2 className="font-semibold text-lg dark:text-white">{service.label}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Queue & counter control</p>
                  </div>
                </div>
                {loading ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : stats ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">{stats.openCounters}</span> open counters ·{' '}
                    <span className="font-semibold">{stats.waiting}</span> waiting ·{' '}
                    <span className="font-semibold">{stats.serving}</span> serving
                  </p>
                ) : null}
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Open dashboard →</span>
              </Link>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          User accounts are managed via backend seed and auth. Counter actions are available on each service staff dashboard.
        </p>
      </div>
    </div>
  );
};

export default StaffManagement;
