import React from 'react';
import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: 440, textAlign: 'center', padding: 36 }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b91c1c', marginBottom: 8 }}>
          Access Restricted
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
          You do not have administrative or staff privileges to access this area. Please return to your student dashboard or sign in with an authorized account.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-outline" style={{ fontSize: '0.82rem' }}>
            Dashboard
          </Link>
          <Link to="/login" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
