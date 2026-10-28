import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import StatusBadge from '../components/StatusBadge';

export default function StudentProfilePage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState(1);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDepartment(user.department || 'Computer Science & Engineering');
      setYear(user.year || 1);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile({
        name: name.trim(),
        department: department.trim(),
        year: Number(year),
      });
      setSuccessMsg('Your profile has been updated successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          User Profile
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          Manage your personal details and academic affiliation for campus facility reservations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Left: Overview Card */}
        <div className="card" style={{ height: 'fit-content', padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#7a0c2e',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 10,
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {user?.email}
            </div>
            <div style={{ marginTop: 8 }}>
              <StatusBadge role={user?.role} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>ID Number</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user?.studentId || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Department</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user?.department || 'Unassigned'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Academic Year</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Year {user?.year || 1}</span>
            </div>
          </div>
        </div>

        {/* Right: Edit Form */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
            Update Profile Information
          </h2>

          {successMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', marginBottom: 14, fontSize: '0.82rem' }}>
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: 14, fontSize: '0.82rem' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Full Name
              </label>
              <input
                type="text"
                required
                className="input-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Academic Department
              </label>
              <select
                className="input-control"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electrical & Electronics">Electrical & Electronics</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Bioengineering & Health Sciences">Bioengineering & Health Sciences</option>
                <option value="School of Design & Media">School of Design & Media</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Academic Year
              </label>
              <select
                className="input-control"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
                <option value={5}>Year 5 (Graduate)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {saving ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
