// Unified staff dashboard for SC-03 (all service types)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, {
  manageCounter,
  simulateArrival,
  getSimulationStatus,
  startSimulation,
  stopSimulation,
  resetSimulation
} from '../services/api';
import socketService from '../services/socketService';
import { formatEstimatedWaitMinutes } from '../utils/formatWait';

const SERVICE_META = {
  bank: { label: 'Bank', icon: '🏦', gradient: 'from-green-600 to-emerald-700' },
  nadra: { label: 'NADRA', icon: '🪪', gradient: 'from-purple-600 to-violet-700' },
  university: { label: 'University', icon: '🎓', gradient: 'from-orange-600 to-amber-700' },
  hospital: { label: 'Hospital', icon: '🏥', gradient: 'from-red-600 to-rose-700' }
};

const STATUS_BADGE = {
  waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  serving: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  skipped: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

function StatusBadge({ status }) {
  const key = (status || '').toLowerCase();
  const cls = STATUS_BADGE[key] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status || 'unknown'}
    </span>
  );
}

const StaffDashboard = ({ serviceType: fixedServiceType }) => {
  const params = useParams();
  const navigate = useNavigate();
  const rawType = fixedServiceType || params.serviceType || 'bank';
  const serviceType = SERVICE_META[rawType] ? rawType : 'bank';
  const meta = SERVICE_META[serviceType];

  const [selectedBranch, setSelectedBranch] = useState('all');
  const [tokens, setTokens] = useState([]);
  const [completedTokens, setCompletedTokens] = useState([]);
  const [skippedTokens, setSkippedTokens] = useState([]);
  const [currentServing, setCurrentServing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [openCounters, setOpenCounters] = useState(1);
  const [simRunning, setSimRunning] = useState(false);
  const [simIntervalMs, setSimIntervalMs] = useState(8000);
  const [stats, setStats] = useState({
    totalToday: 0,
    completed: 0,
    skipped: 0,
    waiting: 0,
    serving: 0,
    averageWaitTime: 0,
    branches: 0
  });
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [confirmSkip, setConfirmSkip] = useState(null);

  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (!fixedServiceType && params.serviceType && !SERVICE_META[params.serviceType]) {
      toast.error('Unknown service type');
      navigate('/admin/dashboard', { replace: true });
    }
  }, [fixedServiceType, params.serviceType, navigate]);

  const scheduleRefresh = () => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(async () => {
      refreshTimerRef.current = null;
      await fetchQueue();
    }, 400);
  };

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const query = selectedBranch !== 'all' ? `?branch=${encodeURIComponent(selectedBranch)}` : '';
      const response = await api.get(`/queue/${serviceType}${query}`);
      if (response.data.success) {
        const { tokens: t = [], completedTokens: c = [], skippedTokens: s = [], stats: st = {} } = response.data.data;
        setTokens(t);
        setCompletedTokens(c);
        setSkippedTokens(s);
        setStats(st);
        setOpenCounters(st.openCounters ?? 1);
        setSimRunning(st.simulationRunning === true);
        setCurrentServing(t.find((x) => x.status === 'serving') || null);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('You are not authorized for this service queue');
        navigate('/');
      } else {
        const message = error.response?.data?.message || 'Failed to load queue';
        setLoadError(message);
        toast.error('Failed to load queue');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSimulationStatus = async () => {
    try {
      const res = await getSimulationStatus(serviceType);
      if (res.data?.success) {
        setSimRunning(res.data.data.running);
        setSimIntervalMs(res.data.data.intervalMs || 8000);
      }
    } catch {
      // optional
    }
  };

  useEffect(() => {
    if (user) socketService.connect(user.id, user.role);
    fetchQueue();
    loadSimulationStatus();

    socketService.joinQueue(serviceType, user?.id);
    socketService.onQueueUpdate((data) => {
      if (data?.serviceType === serviceType) scheduleRefresh();
    });

    return () => {
      socketService.removeListener('queue-update');
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, selectedBranch]);

  const handleServiceChange = (next) => {
    if (fixedServiceType) return;
    navigate(`/admin/${next}`);
  };

  const handleCallNext = async () => {
    try {
      setIsCalling(true);
      const body = selectedBranch !== 'all' ? { branch: selectedBranch } : {};
      const response = await api.put(`/queue/${serviceType}/next`, body);
      if (response.data.success) {
        toast.success(`Now serving: ${response.data.data.tokenNumber}`);
        fetchQueue();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'No customers waiting');
    } finally {
      setIsCalling(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/queue/${serviceType}/complete/${id}`);
      toast.success('Customer completed');
      fetchQueue();
    } catch {
      toast.error('Failed to complete');
    }
    setConfirmComplete(null);
  };

  const handleSkip = async (id) => {
    try {
      await api.put(`/queue/${serviceType}/skip/${id}`);
      toast('Customer skipped', { icon: '⏭️' });
      fetchQueue();
    } catch {
      toast.error('Failed to skip');
    }
    setConfirmSkip(null);
  };

  const handleCounter = async (action) => {
    try {
      const res = await manageCounter(serviceType, action);
      if (res.data?.success) {
        setOpenCounters(res.data.data.openCounters);
        toast.success(`Open counters: ${res.data.data.openCounters}`);
        fetchQueue();
      }
    } catch {
      toast.error('Counter update failed');
    }
  };

  const handleSimArrival = async () => {
    try {
      const res = await simulateArrival(serviceType, `Demo ${Date.now() % 1000}`, null);
      if (res.data?.success) {
        toast.success(`Simulated: ${res.data.data.tokenNumber}`, { icon: '🤖' });
        fetchQueue();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Simulation failed');
    }
  };

  const handleSimStart = async () => {
    try {
      await startSimulation(serviceType, simIntervalMs);
      setSimRunning(true);
      toast.success('Auto-arrival simulation started');
    } catch {
      toast.error('Could not start simulation');
    }
  };

  const handleSimStop = async () => {
    try {
      await stopSimulation(serviceType);
      setSimRunning(false);
      toast.success('Simulation stopped');
    } catch {
      toast.error('Could not stop simulation');
    }
  };

  const handleSimReset = async () => {
    try {
      const res = await resetSimulation(serviceType);
      toast.success(`Removed ${res.data?.data?.removed ?? 0} simulated tokens`);
      fetchQueue();
    } catch {
      toast.error('Reset failed');
    }
  };

  const waitingTokens = tokens.filter((t) => t.status === 'waiting');
  const filteredTokens = waitingTokens.filter((token) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (token.customerName || '').toLowerCase().includes(q) ||
      token.tokenNumber.toLowerCase().includes(q) ||
      (token.service || '').toLowerCase().includes(q);
    const matchesBranch = selectedBranch === 'all' || token.branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  const uniqueBranches = [...new Set(tokens.map((t) => t.branch).filter(Boolean))];

  const statCards = [
    { label: 'Total today', value: stats.totalToday ?? 0, icon: '🎫', color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Waiting', value: stats.waiting ?? 0, icon: '⏳', color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Serving', value: stats.serving ?? 0, icon: '🔔', color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Completed', value: stats.completed ?? 0, icon: '✅', color: 'text-green-600 dark:text-green-400' },
    { label: 'Staff counters', value: openCounters, icon: '👔', color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Avg wait', value: `${stats.averageWaitTime ?? 0} min`, icon: '⏱️', color: 'text-rose-600 dark:text-rose-400' },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 md:py-8 space-y-6">
        <div className={`bg-gradient-to-r ${meta.gradient} rounded-2xl shadow-lg p-6 md:p-8 text-white`}>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide opacity-80">Service queue control</p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">
                {meta.icon} {meta.label} Admin
              </h1>
              <p className="opacity-90 mt-2 text-sm md:text-base">Counters, call-next, completion, and simulation tools</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm opacity-90 sr-only" htmlFor="service-select">
                Service
              </label>
              <select
                id="service-select"
                value={serviceType}
                onChange={(e) => handleServiceChange(e.target.value)}
                disabled={Boolean(fixedServiceType)}
                className="text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm disabled:opacity-80"
              >
                {Object.entries(SERVICE_META).map(([key, m]) => (
                  <option key={key} value={key}>
                    {m.icon} {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 flex flex-wrap gap-3 items-center justify-between text-red-700 dark:text-red-300">
            <span>{loadError}</span>
            <button type="button" onClick={fetchQueue} className="text-sm font-semibold underline">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <span aria-hidden>{card.icon}</span>
              </div>
              {loading && tokens.length === 0 && !loadError ? (
                <div className="h-7 w-12 mt-2 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
              ) : (
                <p className={`text-xl font-bold mt-1 tabular-nums ${card.color}`}>{card.value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <h3 className="font-semibold mb-3 dark:text-white">Counters</h3>
            <p className="text-sm text-gray-500 mb-3">
              Estimated wait uses open counter count. At 0 counters, citizens see &quot;paused&quot; (not a fake minute value).
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleCounter('open')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">+ Open counter</button>
              <button type="button" onClick={() => handleCounter('close')} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition">− Close counter</button>
              <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm dark:text-gray-200">{openCounters} open</span>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">🤖 Simulation (simulated tokens only)</h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
              Simulated arrivals are tagged <code className="text-xs">isSimulated</code> and use <code className="text-xs">-SIM-</code> token numbers. Reset never deletes real customer tokens.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" onClick={handleSimArrival} className="bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm">+ One arrival</button>
              {!simRunning ? (
                <button type="button" onClick={handleSimStart} className="bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm">Start auto</button>
              ) : (
                <button type="button" onClick={handleSimStop} className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm">Stop auto</button>
              )}
              <button type="button" onClick={handleSimReset} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm">Reset sim data</button>
              <label className="text-sm flex items-center gap-1">
                Interval (ms)
                <input
                  type="number"
                  min={3000}
                  step={1000}
                  value={simIntervalMs}
                  onChange={(e) => setSimIntervalMs(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-1 dark:bg-gray-800"
                />
              </label>
            </div>
          </div>
        </div>

        {currentServing && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 mb-6">
            <p className="text-sm text-green-700 dark:text-green-300 mb-1">Currently serving</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              {currentServing.tokenNumber} — {currentServing.customerName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{currentServing.service} · {currentServing.branch}</p>
            <button type="button" onClick={() => setConfirmComplete(currentServing._id)} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg">Complete</button>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={handleCallNext}
            disabled={isCalling || filteredTokens.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-bold shadow-md disabled:opacity-50 transition"
          >
            {isCalling ? 'Calling…' : `Call next (${filteredTokens.length} waiting)`}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4 flex flex-wrap gap-4">
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="border rounded-lg p-2 dark:bg-gray-700 dark:text-white">
            <option value="all">All branches ({stats.branches})</option>
            {uniqueBranches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search token, name, service…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
          <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between gap-2">
            <h2 className="font-bold dark:text-white">Waiting &amp; serving</h2>
            {loading && <span className="text-xs text-gray-500">Updating…</span>}
          </div>
          <div className="overflow-x-auto">
            {loading && tokens.length === 0 && !loadError ? (
              <p className="p-10 text-center text-gray-500 dark:text-gray-400">Loading queue…</p>
            ) : tokens.length === 0 ? (
              <p className="p-10 text-center text-gray-500 dark:text-gray-400">Queue is empty — waiting for customers or use simulation.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/80">
                  <tr>
                    <th className="p-3 text-left font-medium dark:text-gray-200">Token</th>
                    <th className="p-3 text-left font-medium dark:text-gray-200">Customer</th>
                    <th className="p-3 text-left font-medium dark:text-gray-200">Branch</th>
                    <th className="p-3 text-left font-medium dark:text-gray-200">Pos</th>
                    <th className="p-3 text-left font-medium dark:text-gray-200">Est. wait</th>
                    <th className="p-3 text-left font-medium dark:text-gray-200">Status</th>
                    <th className="p-3 text-left font-medium dark:text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((item) => (
                    <tr key={item._id} className="border-t dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/30">
                      <td className="p-3 font-mono dark:text-white whitespace-nowrap">
                        {item.tokenNumber}
                        {item.isSimulated && (
                          <span className="ml-1 text-xs bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 px-1.5 py-0.5 rounded">SIM</span>
                        )}
                      </td>
                      <td className="p-3 dark:text-gray-300">{item.customerName}</td>
                      <td className="p-3 dark:text-gray-300 text-xs">{item.branch || '—'}</td>
                      <td className="p-3 dark:text-gray-300">{item.position}</td>
                      <td className="p-3 dark:text-gray-300">{formatEstimatedWaitMinutes(item.estimatedWaitTime)}</td>
                      <td className="p-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmComplete(item._id)}
                            className="text-green-700 dark:text-green-400 text-xs font-semibold hover:underline"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmSkip(item._id)}
                            className="text-red-600 dark:text-red-400 text-xs font-semibold hover:underline"
                          >
                            Skip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <h3 className="font-bold mb-2 dark:text-white">Completed today</h3>
            <ul className="text-sm space-y-1 dark:text-gray-300 max-h-48 overflow-y-auto">
              {completedTokens.map((t) => (
                <li key={t._id}>{t.tokenNumber} — {t.customerName}</li>
              ))}
              {completedTokens.length === 0 && <li className="text-gray-500">None yet</li>}
            </ul>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <h3 className="font-bold mb-2 dark:text-white">Skipped today</h3>
            <ul className="text-sm space-y-1 dark:text-gray-300 max-h-48 overflow-y-auto">
              {skippedTokens.map((t) => (
                <li key={t._id}>{t.tokenNumber} — {t.customerName}</li>
              ))}
              {skippedTokens.length === 0 && <li className="text-gray-500">None</li>}
            </ul>
          </div>
        </div>
      </div>

      {confirmComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <p className="mb-4 dark:text-white">Mark this token as completed?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleComplete(confirmComplete)} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Yes</button>
              <button type="button" onClick={() => setConfirmComplete(null)} className="flex-1 bg-gray-300 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {confirmSkip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <p className="mb-4 dark:text-white">Skip this token?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleSkip(confirmSkip)} className="flex-1 bg-red-600 text-white py-2 rounded-lg">Skip</button>
              <button type="button" onClick={() => setConfirmSkip(null)} className="flex-1 bg-gray-300 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
