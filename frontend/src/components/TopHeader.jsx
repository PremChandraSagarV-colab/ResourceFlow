import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function TopHeader() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      {/* Left side: System status badge */}
      <div className="system-online-badge">
        <span className="system-online-dot" />
        <span>System Online</span>
      </div>

      {/* Right side: User Profile or Sign In */}
      <div>
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                  {user.department ? ` • ${user.department}` : ''}
                </div>
              </div>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#7a0c2e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/login" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              Sign In
            </Link>
            <Link to="/login?tab=register" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
