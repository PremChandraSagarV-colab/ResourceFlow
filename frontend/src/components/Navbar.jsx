import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 68,
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
          }}>
            ⚡
          </div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              Resource<span style={{ color: '#6366f1' }}>Flow</span>
            </span>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: -2 }}>
              Campus Asset Cloud
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link
            to="/resources"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive('/resources') ? '#818cf8' : '#9ca3af',
              background: isActive('/resources') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            Explore Resources
          </Link>

          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: isActive('/dashboard') ? '#818cf8' : '#9ca3af',
                  background: isActive('/dashboard') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                Dashboard
              </Link>

              <Link
                to="/my-bookings"
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: isActive('/my-bookings') ? '#818cf8' : '#9ca3af',
                  background: isActive('/my-bookings') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                My Bookings
              </Link>

              {isManager && (
                <Link
                  to="/manager"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: isActive('/manager') ? '#c084fc' : '#a855f7',
                    background: isActive('/manager') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.08)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    transition: 'all 0.2s',
                  }}
                >
                  🛡️ Manager Hub
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: isActive('/admin') ? '#fb7185' : '#f43f5e',
                    background: isActive('/admin') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    transition: 'all 0.2s',
                  }}
                >
                  ⚡ Admin Portal
                </Link>
              )}
            </>
          )}
        </div>

        {/* User Profile / Auth Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Link
                to="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#fff',
                }}>
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                    {user.name}
                  </div>
                  <span className={`badge badge-${user.role}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    {user.role}
                  </span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="btn btn-outline"
                style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                title="Log out of ResourceFlow"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Sign In
              </Link>
              <Link to="/login?tab=register" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
