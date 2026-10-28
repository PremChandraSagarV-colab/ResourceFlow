import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: 440, textAlign: 'center', padding: 36 }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          404 - Page Not Found
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
          The requested campus resource or page does not exist or has been relocated.
        </p>
        <Link to="/" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
