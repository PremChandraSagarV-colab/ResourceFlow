import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

const CATEGORIES = [
  { id: 'all', label: 'All Resources' },
  { id: 'laboratory', label: 'Laboratories' },
  { id: 'meeting_room', label: 'Meeting Rooms' },
  { id: 'sports_facility', label: 'Sports Facilities' },
  { id: 'equipment', label: 'Equipment' },
];

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchResources();
  }, [selectedCategory]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/resources?limit=50';
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setResources(res.data.data.resources || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Header Bar */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Campus Resources
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Explore verified institutional laboratories, meeting halls, sports facilities, and equipment.
          </p>
        </div>

        {/* Search */}
        <div style={{ width: 280 }}>
          <input
            type="text"
            className="input-control"
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="tab-container" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, marginBottom: 20, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <span className="spinner" />
          <div style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.85rem' }}>Loading campus assets...</div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            No matching resources found
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Try adjusting your search criteria or switch category filters.
          </div>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="btn btn-outline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Resource Cards Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {filteredResources.map((r) => (
            <div
              key={r._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 20,
              }}
            >
              <div>
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
                    {r.category?.replace('_', ' ')}
                  </span>
                  <StatusBadge status={r.status} />
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {r.name}
                </h3>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.45, minHeight: 36 }}>
                  {r.description || 'Institutional facility designated for university coursework, student projects, and research.'}
                </p>

                {/* Metadata */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: 4 }}>
                    Location: {r.location}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: 4 }}>
                    Capacity: {r.capacity}
                  </span>
                  {r.approvalRequired && (
                    <span style={{ fontSize: '0.72rem', color: '#b45309', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>
                      Manager Approval
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14, marginTop: 4 }}>
                <Link
                  to={`/resources/${r._id}`}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '8px 12px' }}
                >
                  View Details & Reserve
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
