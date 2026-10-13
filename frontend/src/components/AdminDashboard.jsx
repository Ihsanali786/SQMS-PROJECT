
// src/components/AdminDashboard.jsx

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const AdminDashboard = ({ type = 'bank' }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/appointments/admin/all');

      const data = response.data?.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid appointment data received');
      }

      setAppointments(data);
    } catch (err) {
      console.error('Admin appointments error:', err);

      const message =
        err.response?.data?.message ||
        'Failed to load appointments';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filteredAppointments = appointments.filter((appointment) => {
    if (!appointment.serviceType) return true;

    return appointment.serviceType
      .toLowerCase()
      .includes(type.toLowerCase());
  });

  const today = new Date().toDateString();

  const todaysAppointments = filteredAppointments.filter(
    (appointment) =>
      appointment.date &&
      new Date(appointment.date).toDateString() === today
  );

  const waitingAppointments = filteredAppointments.filter(
    (appointment) =>
      appointment.status?.toLowerCase() === 'waiting'
  );

  const currentServing = filteredAppointments.find(
    (appointment) =>
      appointment.status?.toLowerCase() === 'in service'
  );

  const handleMarkDone = async (appointmentId) => {
    toast.error(
      'Completion API is not connected yet. No status was changed.'
    );
  };

  const handleSkip = () => {
    toast.error(
      'Skip API is not connected yet. No appointment was changed.'
    );
  };

  const handleCallNext = () => {
    toast.error(
      'Call Next API is not connected yet. No appointment was changed.'
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold capitalize">
            {type} Admin Dashboard
          </h1>

          <button
            onClick={fetchAppointments}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">
              Today's Appointments
            </p>
            <p className="text-3xl font-bold text-blue-600">
              {todaysAppointments.length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">
              Now Serving
            </p>
            <p className="text-3xl font-bold text-green-600">
              {currentServing?.tokenId || 'None'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">
              People Waiting
            </p>
            <p className="text-3xl font-bold text-orange-600">
              {waitingAppointments.length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold">
              Appointment History
            </h2>

            <span className="text-sm text-gray-600">
              Total: {filteredAppointments.length}
            </span>
          </div>

          {loading ? (
            <p className="text-gray-600 py-4">
              Loading appointments...
            </p>
          ) : error ? (
            <div className="py-4">
              <p className="text-red-600 mb-3">{error}</p>
              <button
                onClick={fetchAppointments}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-gray-600 py-4">
              No appointments found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3">Token</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAppointments.map((appointment) => (
                    <tr
                      key={appointment._id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3 font-mono font-bold">
                        {appointment.tokenId || '-'}
                      </td>

                      <td className="p-3">
                        {appointment.customerName || '-'}
                      </td>

                      <td className="p-3">
                        {appointment.customerEmail || '-'}
                      </td>

                      <td className="p-3">
                        {appointment.service || '-'}
                      </td>

                      <td className="p-3">
                        {appointment.branch || '-'}
                      </td>

                      <td className="p-3">
                        {appointment.date
                          ? new Date(appointment.date).toLocaleDateString()
                          : '-'}
                      </td>

                      <td className="p-3">
                        {appointment.time || '-'}
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          {appointment.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleSkip}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Skip Token
            </button>

            <button
              onClick={handleCallNext}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Call Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
