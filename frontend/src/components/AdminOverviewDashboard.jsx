import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getQueueAnalytics, getQueue } from '../services/api';
import socketService from '../services/socketService';

const SERVICES = [
  { key: 'bank', label: 'Bank', icon: '🏦', color: 'from-green-500 to-emerald-600', border: 'border-green-200 dark:border-green-800' },
  { key: 'nadra', label: 'NADRA', icon: '🪪', color: 'from-violet-500 to-purple-600', border: 'border-violet-200 dark:border-violet-800' },
  { key: 'university', label: 'University', icon: '🎓', color: 'from-orange-500 to-amber-600', border: 'border-orange-200 dark:border-orange-800' },
  { key: 'hospital', label: 'Hospital', icon: '🏥', color: 'from-rose-500 to-red-600', border: 'border-rose-200 dark:border-rose-800' },
];

const emptyStats = {
  totalToday: 0,
  waiting: 0,
  serving: 0,
  completed: 0,
  skipped: 0,
  openCounters: 0,
};

const SUMMARY_CARDS = [
  { key: 'totalToday', label: 'Total Tokens', icon: '🎫', accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  { key: 'waiting', label: 'Waiting', icon: '⏳', accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  { key: 'serving', label: 'Serving', icon: '🔔', accent: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  { key: 'completed', label: 'Completed', icon: '✅', accent: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' },
  { key: 'openCounters', label: 'Staff', icon: '👔', accent: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
];

const AdminOverviewDashboard = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState('bank');
  const [rows, setRows] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const analytics = await Promise.all(
        SERVICES.map(async (service) => {
          const response = await getQueueAnalytics(service.key);
          return { ...service, ...(response.data?.data || emptyStats) };
        })
      );
      setRows(analytics);

      const queueResponses = await Promise.all(
        SERVICES.map((service) =>
          getQueue(service.key)
            .then((res) => ({ service, data: res.data?.data }))
            .catch(() => ({ service, data: null }))
        )
      );

      const activity = [];
      queueResponses.forEach(({ service, data }) => {
        const completed = data?.completedTokens || [];
        completed.slice(0, 5).forEach((token) => {
          activity.push({
            id: `${service.key}-${token._id}`,
            serviceLabel: service.label,
            serviceKey: service.key,
            tokenNumber: token.tokenNumber,
            customerName: token.customerName,
            at: token.completedAt || token.updatedAt || token.createdAt,
          });
        });
      });

      activity.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      setRecentActivity(activity.slice(0, 12));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin dashboard.');
      setRows([]);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.id) socketService.connect(user.id, user.role);

    loadData();

    const onUpdate = () => loadData();
    socketService.onQueueUpdate(onUpdate);
    return () => socketService.removeListener('queue-update');
  }, []);

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          totalToday: sum.totalToday + (row.totalToday || 0),
          waiting: sum.waiting + (row.waiting || 0),
          serving: sum.serving + (row.serving || 0),
          completed: sum.completed + (row.completed || 0),
          openCounters: sum.openCounters + (row.openCounters || 0),
        }),
        { ...emptyStats }
      ),
    [rows]
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-8">
        <header className="rounded-2xl bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 text-white shadow-lg p-6 md:p-8">
          <p className="text-sm uppercase tracking-wider text-blue-200/90 font-medium">SQMS Control Center</p>
          <h1 className="text-2xl md:text-4xl font-bold mt-1">Admin Dashboard</h1>
          <p className="text-blue-100/90 mt-2 max-w-2xl">
            Live queue overview across Bank, NADRA, University, and Hospital — powered by your connected APIs and Socket.IO updates.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <label className="text-sm text-blue-100">Quick service</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="rounded-lg px-3 py-2 text-gray-900 text-sm shadow-sm"
            >
              {SERVICES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => navigate(`/admin/${selectedService}`)}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Open queue control →
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300 flex flex-wrap gap-3 items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadData} className="text-sm font-semibold underline">
              Retry
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {SUMMARY_CARDS.map((card) => (
            <div
              key={card.key}
              className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow p-4 ${card.bg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>
                  {card.icon}
                </span>
                {loading && !error ? (
                  <span className="h-7 w-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                ) : (
                  <p className={`text-2xl font-bold tabular-nums ${card.accent}`}>
                    {totals[card.key] ?? 0}
                  </p>
                )}
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">{card.label}</p>
              {card.key === 'openCounters' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Open counter stations</p>
              )}
            </div>
          ))}
        </section>

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {SERVICES.map((service) => {
            const stats = rows.find((r) => r.key === service.key) || { ...service, ...emptyStats };
            return (
              <Link
                key={service.key}
                to={`/admin/${service.key}`}
                className={`group rounded-xl border ${service.border} bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition p-5`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${service.color} text-white text-lg shadow`}>
                  {service.icon}
                </div>
                <h2 className="font-semibold text-lg dark:text-white mt-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  {service.label}
                </h2>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <dt>Waiting</dt>
                    <dd className="font-semibold text-gray-900 dark:text-gray-100">{stats.waiting}</dd>
                  </div>
                  <div>
                    <dt>Serving</dt>
                    <dd className="font-semibold text-gray-900 dark:text-gray-100">{stats.serving}</dd>
                  </div>
                  <div>
                    <dt>Today</dt>
                    <dd className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalToday}</dd>
                  </div>
                  <div>
                    <dt>Counters</dt>
                    <dd className="font-semibold text-gray-900 dark:text-gray-100">{stats.openCounters}</dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold dark:text-white">Service snapshot</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/80 text-left">
                  <tr>
                    <th className="p-3 font-medium dark:text-gray-200">Service</th>
                    <th className="p-3 font-medium dark:text-gray-200">Total</th>
                    <th className="p-3 font-medium dark:text-gray-200">Waiting</th>
                    <th className="p-3 font-medium dark:text-gray-200">Serving</th>
                    <th className="p-3 font-medium dark:text-gray-200">Completed</th>
                    <th className="p-3 font-medium dark:text-gray-200">Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Loading service metrics…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No queue data yet. Metrics appear when tokens are created.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.key} className="border-t dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/30">
                        <td className="p-3 font-medium dark:text-white">
                          {row.icon} {row.label}
                        </td>
                        <td className="p-3 dark:text-gray-300">{row.totalToday}</td>
                        <td className="p-3 dark:text-gray-300">{row.waiting}</td>
                        <td className="p-3 dark:text-gray-300">{row.serving}</td>
                        <td className="p-3 dark:text-gray-300">{row.completed}</td>
                        <td className="p-3 dark:text-gray-300">{row.openCounters}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="px-5 py-4 border-b dark:border-gray-700">
              <h2 className="font-semibold dark:text-white">Recent activity</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest completions from live queues</p>
            </div>
            <ul className="divide-y dark:divide-gray-700 max-h-80 overflow-y-auto">
              {loading && recentActivity.length === 0 ? (
                <li className="p-6 text-sm text-gray-500 text-center">Loading activity…</li>
              ) : recentActivity.length === 0 ? (
                <li className="p-6 text-sm text-gray-500 text-center">No completed tokens yet today.</li>
              ) : (
                recentActivity.map((item) => (
                  <li key={item.id} className="px-5 py-3 text-sm">
                    <p className="font-medium dark:text-white">
                      {item.tokenNumber}{' '}
                      <span className="text-gray-500 dark:text-gray-400 font-normal">· {item.customerName}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.serviceLabel}
                      {item.at ? ` · ${new Date(item.at).toLocaleString()}` : ''}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminOverviewDashboard;
