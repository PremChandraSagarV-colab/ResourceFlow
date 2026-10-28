import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function ResourceDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Availability state
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [availabilityError, setAvailabilityError] = useState('');

  // Booking state
  const [purpose, setPurpose] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');

  const initDefaultDates = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(12, 0, 0, 0);

    const toIsoLocal = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartAt(toIsoLocal(tomorrow));
    setEndAt(toIsoLocal(tomorrowEnd));
  }, []);

  const fetchResource = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/resources/${id}`);
      if (res.data?.success) {
        setResource(res.data.data.resource);
      }
    } catch (err) {
      setError(err.message || 'Failed to load resource details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResource();
    initDefaultDates();
  }, [fetchResource, initDefaultDates]);

  const checkAvailability = async () => {
    if (!startAt || !endAt) {
      setAvailabilityError('Please select both start and end times');
      return;
    }
    setCheckingAvailability(true);
    setAvailabilityError('');
    setAvailabilityResult(null);

    try {
      const startIso = new Date(startAt).toISOString();
      const endIso = new Date(endAt).toISOString();
      const res = await api.get(`/resources/${id}/availability?startAt=${startIso}&endAt=${endIso}`);
      if (res.data?.success) {
        setAvailabilityResult(res.data.data);
      }
    } catch (err) {
      setAvailabilityError(err.message || 'Availability check failed');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!purpose.trim()) {
      setBookingError('Please specify the purpose of your reservation');
      return;
    }

    setSubmittingBooking(true);
    setBookingError('');
    setBookingSuccess('');

    try {
      const idempotencyKey = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const res = await api.post('/bookings', {
        resourceId: id,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        purpose: purpose.trim(),
        idempotencyKey,
      });

      if (res.data?.success) {
        setBookingSuccess(
          res.data.message || 'Reservation confirmed! Redirecting to your bookings...'
        );
        setTimeout(() => {
          navigate('/my-bookings');
        }, 1500);
      }
    } catch (err) {
      setBookingError(err.message || 'Booking conflict or error occurred.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <span className="spinner" />
        <div style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.85rem' }}>Loading resource details...</div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          {error || 'Resource not found'}
        </div>
        <Link to="/resources" className="btn btn-primary" style={{ marginTop: 8 }}>
          Return to Resources
        </Link>
      </div>
    );
  }

  const specs = resource.specifications ? Object.entries(resource.specifications) : [];
  const policy = resource.bookingPolicy || {};

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <Link to="/resources" style={{ color: 'var(--primary)', fontWeight: 500 }}>Resources</Link> / <span>{resource.name}</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* Left Column: Details & Specs */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-subtle)',
              padding: '3px 8px',
              borderRadius: 4,
            }}>
              {resource.category?.replace('_', ' ')}
            </span>
            <StatusBadge status={resource.status} />
          </div>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {resource.name}
          </h1>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
            {resource.description || 'Institutional facility designated for university coursework, student projects, and research.'}
          </p>

          {/* Key Specs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            padding: 14,
            backgroundColor: 'var(--bg-app)',
            borderRadius: 6,
            border: '1px solid var(--border-light)',
            marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: 2 }}>{resource.location}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capacity</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: 2 }}>{resource.capacity} units / seats</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workflow</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: 2, color: resource.approvalRequired ? '#b45309' : '#15803d' }}>
                {resource.approvalRequired ? 'Manager Approval' : 'Instant Confirmation'}
              </div>
            </div>
          </div>

          {/* Specifications */}
          {specs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Technical Specifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {specs.map(([k, v]) => (
                  <div key={k} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 4,
                    backgroundColor: 'var(--bg-app)',
                    fontSize: '0.82rem',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidelines */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Booking Guidelines
            </h3>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Session duration: {policy.minDurationHours || 0.5}h to {policy.maxDurationHours || 4}h</li>
              <li>Advance window: up to {policy.maxAdvanceBookingDays || 14} days ahead</li>
              <li>Protected by automated conflict prevention & concurrency lock</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Reservation Form */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Reserve Asset
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 18 }}>
            Select your schedule and review real-time slot availability.
          </p>

          <form onSubmit={handleBook}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                required
                className="input-control"
                value={startAt}
                onChange={(e) => {
                  setStartAt(e.target.value);
                  setAvailabilityResult(null);
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                End Date & Time
              </label>
              <input
                type="datetime-local"
                required
                className="input-control"
                value={endAt}
                onChange={(e) => {
                  setEndAt(e.target.value);
                  setAvailabilityResult(null);
                }}
              />
            </div>

            {/* Availability Check */}
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={checkAvailability}
                disabled={checkingAvailability || !startAt || !endAt}
                className="btn btn-outline"
                style={{ width: '100%', fontSize: '0.82rem' }}
              >
                {checkingAvailability ? <span className="spinner" /> : 'Check Availability'}
              </button>

              {availabilityResult && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  backgroundColor: availabilityResult.isAvailable ? '#f0fdf4' : '#fef2f2',
                  border: '1px solid ' + (availabilityResult.isAvailable ? '#bbf7d0' : '#fecaca'),
                  color: availabilityResult.isAvailable ? '#15803d' : '#b91c1c',
                }}>
                  {availabilityResult.isAvailable
                    ? 'Time slot is available for reservation.'
                    : `Slot conflict: ${availabilityResult.conflicts?.bookings || 0} existing booking(s).`}
                </div>
              )}

              {availabilityError && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.82rem' }}>
                  {availabilityError}
                </div>
              )}
            </div>

            {/* Purpose */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Academic Purpose
              </label>
              <textarea
                required
                className="input-control"
                rows={3}
                placeholder="Coursework, project demonstration, or capstone research..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            {bookingError && (
              <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: 14, fontSize: '0.82rem' }}>
                {bookingError}
              </div>
            )}

            {bookingSuccess && (
              <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', marginBottom: 14, fontSize: '0.82rem' }}>
                {bookingSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={submittingBooking || (availabilityResult && !availabilityResult.isAvailable)}
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '0.88rem', padding: '10px 16px' }}
            >
              {submittingBooking ? (
                <span className="spinner" />
              ) : resource.approvalRequired ? (
                'Submit for Approval'
              ) : (
                'Confirm Reservation'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
