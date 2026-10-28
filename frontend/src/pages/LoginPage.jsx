import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('tab') === 'register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science & Engineering');
  const [regYear, setRegYear] = useState(3);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        studentId: regStudentId,
        department: regDepartment,
        year: Number(regYear),
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    setIsRegister(false);
    setError('');
    if (role === 'student') {
      setLoginEmail('alex.johnson@student.edu');
      setLoginPassword('Student123!');
    } else if (role === 'manager') {
      setLoginEmail('manager@resourceflow.dev');
      setLoginPassword('AdminPass123!');
    } else if (role === 'admin') {
      setLoginEmail('admin@resourceflow.dev');
      setLoginPassword('AdminPass123!');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 120px)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
            borderRadius: 8,
            backgroundColor: '#7a0c2e',
            color: '#ffffff',
            marginBottom: 12,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isRegister ? 'Student Registration' : 'Institutional Portal'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {isRegister
              ? 'Register with your student ID to reserve campus assets.'
              : 'Sign in to access campus laboratories, rooms, and equipment.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          backgroundColor: 'var(--bg-app)',
          padding: 3,
          borderRadius: 6,
          marginBottom: 20,
        }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              fontSize: '0.82rem',
              fontWeight: 500,
              color: !isRegister ? '#ffffff' : 'var(--text-muted)',
              backgroundColor: !isRegister ? '#7a0c2e' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              fontSize: '0.82rem',
              fontWeight: 500,
              color: isRegister ? '#ffffff' : 'var(--text-muted)',
              backgroundColor: isRegister ? '#7a0c2e' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 16,
            color: '#b91c1c',
            fontSize: '0.82rem',
          }}>
            {error}
          </div>
        )}

        {!isRegister ? (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                className="input-control"
                placeholder="name@student.edu"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Password
              </label>
              <input
                type="password"
                required
                className="input-control"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '9px 16px', fontSize: '0.88rem' }}
            >
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>

            {import.meta.env.DEV && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
                  Quick Demo Fill
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('student')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.76rem', padding: '5px 8px' }}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('manager')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.76rem', padding: '5px 8px' }}
                  >
                    Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('admin')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.76rem', padding: '5px 8px' }}
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Full Name
              </label>
              <input
                type="text"
                required
                className="input-control"
                placeholder="Alex Johnson"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Campus Email
              </label>
              <input
                type="email"
                required
                className="input-control"
                placeholder="alex.johnson@student.edu"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Student ID
                </label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="STU2024001"
                  value={regStudentId}
                  onChange={(e) => setRegStudentId(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Academic Year
                </label>
                <select
                  className="input-control"
                  value={regYear}
                  onChange={(e) => setRegYear(e.target.value)}
                >
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                  <option value={5}>Year 5</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Department
              </label>
              <select
                className="input-control"
                value={regDepartment}
                onChange={(e) => setRegDepartment(e.target.value)}
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electrical & Electronics">Electrical & Electronics</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Bioengineering & Health Sciences">Bioengineering & Health Sciences</option>
                <option value="School of Design & Media">School of Design & Media</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Password (Min 8 characters)
              </label>
              <input
                type="password"
                required
                className="input-control"
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '9px 16px', fontSize: '0.88rem' }}
            >
              {loading ? <span className="spinner" /> : 'Register Student Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
