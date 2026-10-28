import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ConfirmationModal from '../components/ConfirmationModal';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings/me?limit=10');
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
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${selectedBooking._id}/cancel`, { reason });
      setCancelModalOpen(false);
      setSelectedBooking(null);
      await fetchMyBookings();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  const upcomingBookings = bookings.filter((b) => ['pending', 'confirmed'].includes(b.status));
  const activeCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Welcome back, {user?.name}
            </h1>
            <StatusBadge role={user?.role} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {user?.department || 'Academic Department'} • {user?.studentId ? `ID: ${user.studentId}` : 'Student Account'} • Year {user?.year || 1}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/resources" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
            Browse Resources
          </Link>
          <Link to="/my-bookings" className="btn btn-outline" style={{ fontSize: '0.82rem' }}>
            View All Bookings
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Confirmed Reservations
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#15803d', marginTop: 4 }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Active & verified
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Pending Approval
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#b45309', marginTop: 4 }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Under staff review
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Completed Sessions
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>
            {completedCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Past sessions
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Activity
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {bookings.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Total reservations
          </div>
        </div>
      </div>

      {/* Upcoming Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Upcoming Reservations
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {upcomingBookings.length} scheduled
          </span>
        </div>

        {error && (
          <div style={{ margin: 16, padding: '10px 14px', borderRadius: 6, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.82rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <span className="spinner" />
            <div style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: '0.82rem' }}>Loading reservations...</div>
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              No upcoming reservations
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 14 }}>
              You do not have any pending or confirmed bookings at this time.
            </p>
            <Link to="/resources" className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
              Explore Available Resources
            </Link>
          </div>
        ) : (
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
                {upcomingBookings.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {b.resource?.name || 'Resource'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {b.purpose}
                      </div>
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
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setCancelModalOpen(true);
                        }}
                        className="btn btn-danger"
                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={cancelModalOpen}
        title="Cancel Reservation"
        message={`Are you sure you want to cancel your reservation for ${selectedBooking?.resource?.name || 'this resource'}?`}
        confirmLabel="Yes, Cancel Booking"
        confirmVariant="danger"
        requireReason={true}
        loading={actionLoading}
        onConfirm={handleCancelConfirm}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedBooking(null);
        }}
      />
    </div>
  );
}
