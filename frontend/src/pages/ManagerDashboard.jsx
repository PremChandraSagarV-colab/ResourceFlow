import { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ConfirmationModal from '../components/ConfirmationModal';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('approvals');
  const [pendingBookings, setPendingBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal Actions
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // New Maintenance Form State
  const [maintResource, setMaintResource] = useState('');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintStart, setMaintStart] = useState('');
  const [maintEnd, setMaintEnd] = useState('');
  const [maintError, setMaintError] = useState('');
  const [maintSuccess, setMaintSuccess] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [pendRes, allRes, maintRes, resList] = await Promise.all([
        api.get('/bookings?status=pending'),
        api.get('/bookings?limit=50'),
        api.get('/maintenance'),
        api.get('/resources?limit=100'),
      ]);

      if (pendRes.data?.success) setPendingBookings(pendRes.data.data.bookings || []);
      if (allRes.data?.success) setAllBookings(allRes.data.data.bookings || []);
      if (maintRes.data?.success) setMaintenanceList(maintRes.data.data.maintenance || []);
      if (resList.data?.success) {
        setResources(resList.data.data.resources || []);
        if (resList.data.data.resources.length > 0) {
          setMaintResource(resList.data.data.resources[0]._id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load manager operations');
    } finally {
      setLoading(false);
    }
  };

  const triggerApprove = (booking) => {
    setModalConfig({
      title: 'Approve Reservation',
      message: `Approve booking for "${booking.resource?.name}" requested by ${booking.user?.name} (${booking.user?.studentId || 'Student'})?`,
      confirmText: 'Approve Booking',
      type: 'primary',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.patch(`/bookings/${booking._id}/approve`);
          setModalOpen(false);
          await loadAllData();
        } catch (err) {
          alert(err.message || 'Approval failed');
        } finally {
          setActionLoading(false);
        }
      },
    });
    setModalOpen(true);
  };

  const triggerReject = (booking) => {
    setModalConfig({
      title: 'Reject Reservation',
      message: `Reject booking for "${booking.resource?.name}"? Please provide a reason to the student.`,
      confirmText: 'Reject Booking',
      type: 'danger',
      requiresReason: true,
      reasonPlaceholder: 'Reason for rejection...',
      onConfirm: async ({ reason }) => {
        setActionLoading(true);
        try {
          await api.patch(`/bookings/${booking._id}/reject`, { reason });
          setModalOpen(false);
          await loadAllData();
        } catch (err) {
          alert(err.message || 'Rejection failed');
        } finally {
          setActionLoading(false);
        }
      },
    });
    setModalOpen(true);
  };

  const triggerCheckOut = (booking) => {
    setModalConfig({
      title: 'Asset Check-Out Verification',
      message: `Confirm physical handover of "${booking.resource?.name}" to student ${booking.user?.name}.`,
      confirmText: 'Complete Check-Out',
      type: 'primary',
      requiresCondition: true,
      onConfirm: async ({ condition }) => {
        setActionLoading(true);
        try {
          await api.post(`/bookings/${booking._id}/check-out`, { checkoutCondition: condition });
          setModalOpen(false);
          await loadAllData();
        } catch (err) {
          alert(err.message || 'Check-out failed');
        } finally {
          setActionLoading(false);
        }
      },
    });
    setModalOpen(true);
  };

  const triggerReturn = (booking) => {
    setModalConfig({
      title: 'Process Asset Return & Check-In',
      message: `Verify return condition of "${booking.resource?.name}" from ${booking.user?.name}.`,
      confirmText: 'Accept Return',
      type: 'primary',
      requiresCondition: true,
      onConfirm: async ({ condition }) => {
        setActionLoading(true);
        try {
          await api.post(`/bookings/${booking._id}/return`, { returnCondition: condition });
          setModalOpen(false);
          await loadAllData();
        } catch (err) {
          alert(err.message || 'Return processing failed');
        } finally {
          setActionLoading(false);
        }
      },
    });
    setModalOpen(true);
  };

  const handleScheduleMaintenance = async (e) => {
    e.preventDefault();
    setMaintError('');
    setMaintSuccess('');

    try {
      await api.post('/maintenance', {
        resourceId: maintResource,
        title: maintTitle.trim(),
        description: maintDesc.trim(),
        startAt: new Date(maintStart).toISOString(),
        endAt: new Date(maintEnd).toISOString(),
      });

      setMaintSuccess('Maintenance window scheduled successfully.');
      setMaintTitle('');
      setMaintDesc('');
      await loadAllData();
    } catch (err) {
      setMaintError(err.message || 'Failed to schedule maintenance');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Operations Desk
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          Review pending requests, process equipment handovers, and coordinate maintenance intervals.
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-container" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
        >
          Approvals ({pendingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('checkouts')}
          className={`tab-btn ${activeTab === 'checkouts' ? 'active' : ''}`}
        >
          Check-Out / Returns
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
        >
          Maintenance ({maintenanceList.length})
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, marginBottom: 16, fontSize: '0.82rem' }}>
          {error}
        </div>
      )}

      {/* TAB 1: APPROVALS QUEUE */}
      {activeTab === 'approvals' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Pending Student Reservations
            </h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><span className="spinner" /></div>
          ) : pendingBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No pending reservations requiring review at this time.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Student Info</th>
                    <th>Schedule</th>
                    <th>Purpose</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingBookings.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {b.resource?.name || 'Facility'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {b.resource?.location}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {b.user?.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {b.user?.studentId || 'ID: N/A'} • {b.user?.department || 'General'}
                        </div>
                      </td>
                      <td>
                        <div>{new Date(b.startAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {new Date(b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220, fontSize: '0.82rem' }}>
                        {b.purpose}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => triggerApprove(b)}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => triggerReject(b)}
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHECKOUTS / RETURNS */}
      {activeTab === 'checkouts' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Asset Check-Out & Return Desk
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Student</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.filter((b) => ['confirmed', 'checked_out', 'completed'].includes(b.status)).map((b) => (
                  <tr key={b._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.resource?.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{b.resource?.location}</div>
                    </td>
                    <td>
                      <div>{b.user?.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{b.user?.email}</div>
                    </td>
                    <td>
                      <div>{new Date(b.startAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {new Date(b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => triggerCheckOut(b)}
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                        >
                          Check Out
                        </button>
                      )}
                      {b.status === 'checked_out' && (
                        <button
                          onClick={() => triggerReturn(b)}
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                        >
                          Process Return
                        </button>
                      )}
                      {b.status === 'completed' && (
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MAINTENANCE MANAGEMENT */}
      {activeTab === 'maintenance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Form */}
          <div className="card" style={{ height: 'fit-content', padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Schedule Maintenance Window
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Locks the resource to prevent bookings during technician repairs.
            </p>

            {maintSuccess && (
              <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 6, marginBottom: 14, fontSize: '0.82rem' }}>
                {maintSuccess}
              </div>
            )}
            {maintError && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, marginBottom: 14, fontSize: '0.82rem' }}>
                {maintError}
              </div>
            )}

            <form onSubmit={handleScheduleMaintenance}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Resource
                </label>
                <select
                  className="input-control"
                  value={maintResource}
                  onChange={(e) => setMaintResource(e.target.value)}
                >
                  {resources.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.location})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Maintenance Title
                </label>
                <input
                  type="text"
                  required
                  className="input-control"
                  placeholder="e.g. Firmware update, Calibration"
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Scope of Work
                </label>
                <textarea
                  className="input-control"
                  rows={2}
                  placeholder="Technician details..."
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Window Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input-control"
                  value={maintStart}
                  onChange={(e) => setMaintStart(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Window End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input-control"
                  value={maintEnd}
                  onChange={(e) => setMaintEnd(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}>
                Schedule Window
              </button>
            </form>
          </div>

          {/* List */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Active Maintenance Windows
              </h3>
            </div>

            {maintenanceList.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No active maintenance windows scheduled.
              </div>
            ) : (
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Title & Resource</th>
                    <th>Schedule</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceList.map((m) => (
                    <tr key={m._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.title}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {m.resource?.name} ({m.resource?.location})
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>{new Date(m.startAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {new Date(m.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(m.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status="maintenance" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={modalOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
        requiresReason={modalConfig.requiresReason}
        reasonPlaceholder={modalConfig.reasonPlaceholder}
        requiresCondition={modalConfig.requiresCondition}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalOpen(false)}
        loading={actionLoading}
      />
    </div>
  );
}
