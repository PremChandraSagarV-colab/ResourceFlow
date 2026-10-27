import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ConfirmationModal from '../components/ConfirmationModal';

const STATUS_TABS = [
  { id: 'all', label: 'All Bookings' },
  { id: 'pending', label: 'Pending Approval' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/bookings/me?limit=50';
      if (activeTab !== 'all') {
        url += `&status=${activeTab}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setBookings(res.data.data.bookings || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async ({ reason }) => {
    if (!selectedBooking) return;
    setCancelLoading(true);
    try {
      await api.patch(`/bookings/${selectedBooking._id}/cancel`, { reason });
      setCancelModalOpen(false);
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  const openRescheduleModal = (b) => {
    setSelectedBooking(b);
    setRescheduleError('');

    const toIsoLocal = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setRescheduleStart(toIsoLocal(new Date(b.startAt)));
    setRescheduleEnd(toIsoLocal(new Date(b.endAt)));
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setRescheduleLoading(true);
    setRescheduleError('');

    try {
      await api.patch(`/bookings/${selectedBooking._id}/reschedule`, {
        startAt: new Date(rescheduleStart).toISOString(),
        endAt: new Date(rescheduleEnd).toISOString(),
      });
      setRescheduleModalOpen(false);
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err) {
      setRescheduleError(err.message || 'Failed to reschedule due to conflicting reservation.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            My Reservations
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Manage your booked campus facilities, check reservation statuses, or modify slots.
          </p>
        </div>

        <Link to="/resources" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
          Reserve New Asset
        </Link>
      </div>

      {/* Tabs */}
      <div className="tab-container" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, marginBottom: 16, fontSize: '0.82rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <span className="spinner" />
          <div style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.85rem' }}>Loading reservations...</div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            No bookings found
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            No records found under the "{activeTab}" filter.
          </div>
          <Link to="/resources" className="btn btn-outline" style={{ fontSize: '0.82rem' }}>
            Browse Campus Facilities
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Location</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const isModifiable = ['pending', 'confirmed'].includes(b.status);
                  return (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {b.resource?.name || 'Resource'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Purpose: {b.purpose}
                        </div>
                        {b.cancellationReason && (
                          <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: 2 }}>
                            Cancelled: {b.cancellationReason}
                          </div>
                        )}
                        {b.rejectionReason && (
                          <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: 2 }}>
                            Rejected: {b.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>{b.resource?.location || 'Campus'}</td>
                      <td>
                        <div>{new Date(b.startAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {new Date(b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <Link
                            to={`/resources/${b.resource?._id}`}
                            className="btn btn-outline"
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          >
                            Details
                          </Link>

                          {isModifiable && (
                            <>
                              <button
                                onClick={() => openRescheduleModal(b)}
                                className="btn btn-outline"
                                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => { setSelectedBooking(b); setCancelModalOpen(true); }}
                                className="btn btn-danger"
                                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        title="Cancel Reservation"
        message={`Are you sure you want to cancel your reservation for ${selectedBooking?.resource?.name}?`}
        confirmLabel="Cancel Booking"
        confirmVariant="danger"
        requireReason={true}
        loading={cancelLoading}
        onConfirm={handleCancelConfirm}
        onClose={() => { setCancelModalOpen(false); setSelectedBooking(null); }}
      />

      {/* Reschedule Modal */}
      {rescheduleModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 20,
          }}
          onClick={() => setRescheduleModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Reschedule Reservation
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Select a new time slot for {selectedBooking?.resource?.name}.
            </p>

            {rescheduleError && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, marginBottom: 14, fontSize: '0.82rem' }}>
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  New Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input-control"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  New End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input-control"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRescheduleModalOpen(false)}
                  disabled={rescheduleLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={rescheduleLoading}
                >
                  {rescheduleLoading ? <span className="spinner" /> : 'Confirm New Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
