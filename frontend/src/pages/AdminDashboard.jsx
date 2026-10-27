import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  // Users State
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Resources State
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [createResourceModalOpen, setCreateResourceModalOpen] = useState(false);

  // New Resource Form
  const [newResName, setNewResName] = useState('');
  const [newResCategory, setNewResCategory] = useState('laboratory');
  const [newResLocation, setNewResLocation] = useState('');
  const [newResCapacity, setNewResCapacity] = useState(25);
  const [newResDesc, setNewResDesc] = useState('');
  const [newResApproval, setNewResApproval] = useState(false);
  const [resFormLoading, setResFormLoading] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Confirmation Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'resources') fetchResources();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, userPage, userRoleFilter, userStatusFilter]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      let url = `/users?page=${userPage}&limit=10`;
      if (userSearch) url += `&search=${encodeURIComponent(userSearch)}`;
      if (userRoleFilter) url += `&role=${userRoleFilter}`;
      if (userStatusFilter) url += `&isActive=${userStatusFilter}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setUsers(res.data.data.users || []);
        setUserPagination(res.data.data.pagination || {});
      }
    } catch (err) {
      alert(err.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const res = await api.get('/resources?limit=100');
      if (res.data?.success) {
        setResources(res.data.data.resources || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to load resources');
    } finally {
      setResourcesLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/analytics/utilization');
      if (res.data?.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const toggleUserStatus = (targetUser) => {
    const nextStatus = !targetUser.isActive;
    setModalConfig({
      title: `${nextStatus ? 'Reactivate' : 'Deactivate'} User Account`,
      message: `Are you sure you want to ${nextStatus ? 'reactivate' : 'deactivate'} account for ${targetUser.name} (${targetUser.email})?`,
      confirmText: nextStatus ? 'Reactivate' : 'Deactivate',
      type: nextStatus ? 'primary' : 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.patch(`/users/${targetUser._id}/status`, { isActive: nextStatus });
          setModalOpen(false);
          await fetchUsers();
        } catch (err) {
          alert(err.message || 'Failed to change user status');
        } finally {
          setActionLoading(false);
        }
      },
    });
    setModalOpen(true);
  };

  const changeUserRole = async (targetUser, newRole) => {
    try {
      await api.patch(`/users/${targetUser._id}/role`, { role: newRole });
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to change role');
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    setResFormLoading(true);
    try {
      await api.post('/resources', {
        name: newResName.trim(),
        category: newResCategory,
        location: newResLocation.trim(),
        capacity: Number(newResCapacity),
        description: newResDesc.trim(),
        approvalRequired: newResApproval,
        status: 'active',
      });
      setCreateResourceModalOpen(false);
      setNewResName('');
      setNewResLocation('');
      setNewResDesc('');
      await fetchResources();
    } catch (err) {
      alert(err.message || 'Failed to create resource');
    } finally {
      setResFormLoading(false);
    }
  };

  const triggerDeleteResource = (r) => {
    setModalConfig({
      title: 'Archive Resource',
      message: `Archive or remove "${r.name}" from active campus listings?`,
      confirmText: 'Archive Resource',
      type: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/resources/${r._id}`);
          setModalOpen(false);
          await fetchResources();
        } catch (err) {
          alert(err.message || 'Failed to archive resource');
        } finally {
          setActionLoading(false);
        }
      },
    });
    setModalOpen(true);
  };

  const categoryChartData = analytics?.byCategory?.map((c) => ({
    name: c._id?.replace('_', ' ')?.toUpperCase() || 'OTHER',
    bookings: c.count,
  })) || [];

  const topResourcesChartData = analytics?.topResources?.map((r) => ({
    name: r.name?.length > 18 ? r.name.substring(0, 18) + '...' : r.name,
    bookings: r.count,
  })) || [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Admin Suite
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          User authorization, campus resource master catalog, and aggregate utilization metrics.
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-container" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('users')}
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
        >
          User Directory
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
        >
          Resource Inventory ({resources.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
        >
          Utilization Analytics
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-control"
              placeholder="Search by name, email, or student ID..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
              style={{ flex: '1 1 220px', fontSize: '0.82rem' }}
            />
            <select
              className="input-control"
              value={userRoleFilter}
              onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
              style={{ width: 130, fontSize: '0.82rem' }}
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <select
              className="input-control"
              value={userStatusFilter}
              onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1); }}
              style={{ width: 130, fontSize: '0.82rem' }}
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Deactivated</option>
            </select>
            <button onClick={fetchUsers} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              Filter
            </button>
          </div>

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><span className="spinner" /></div>
          ) : (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Name & Email</th>
                      <th>Student ID</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td>{u.studentId || '—'}</td>
                        <td>{u.department || 'General'} {u.year ? `(Yr ${u.year})` : ''}</td>
                        <td>
                          <select
                            className="input-control"
                            value={u.role}
                            onChange={(e) => changeUserRole(u, e.target.value)}
                            style={{ padding: '3px 6px', fontSize: '0.78rem', width: 100 }}
                          >
                            <option value="student">student</option>
                            <option value="manager">manager</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td>
                          <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => toggleUserStatus(u)}
                            className={u.isActive ? 'btn btn-danger' : 'btn btn-outline'}
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          >
                            {u.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total {userPagination.total || 0} accounts
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => p - 1)}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Page {userPage} of {userPagination.pages || 1}
                  </span>
                  <button
                    disabled={userPage >= (userPagination.pages || 1)}
                    onClick={() => setUserPage((p) => p + 1)}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESOURCE INVENTORY */}
      {activeTab === 'resources' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Campus Facilities & Equipment
            </h2>
            <button
              onClick={() => setCreateResourceModalOpen(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem' }}
            >
              Add Resource
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                      {r.approvalRequired && (
                        <span style={{ fontSize: '0.7rem', color: '#b45309' }}>Approval Required</span>
                      )}
                    </td>
                    <td>{r.category?.replace('_', ' ')}</td>
                    <td>{r.location}</td>
                    <td>{r.capacity} units</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => triggerDeleteResource(r)}
                        className="btn btn-danger"
                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: UTILIZATION ANALYTICS */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 20,
          }}>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Bookings</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#7a0c2e', marginTop: 4 }}>
                {analytics?.totalBookings || 0}
              </div>
            </div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confirmed Sessions</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                {analytics?.byStatus?.confirmed || 0}
              </div>
            </div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Approvals</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#b45309', marginTop: 4 }}>
                {analytics?.byStatus?.pending || 0}
              </div>
            </div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed Sessions</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>
                {analytics?.byStatus?.completed || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Chart 1: Category */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                Reservations by Facility Category
              </h3>
              {categoryChartData.length > 0 ? (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={10} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#ffffff', borderColor: '#e5e7eb', color: '#111827', fontSize: '0.8rem' }} />
                      <Bar dataKey="bookings" fill="#7a0c2e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No data</div>
              )}
            </div>

            {/* Chart 2: Top Utilized */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                Top Utilized Facilities
              </h3>
              {topResourcesChartData.length > 0 ? (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={topResourcesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={10} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#ffffff', borderColor: '#e5e7eb', color: '#111827', fontSize: '0.8rem' }} />
                      <Bar dataKey="bookings" fill="#4b5563" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Resource Modal */}
      {createResourceModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 20,
          }}
          onClick={() => setCreateResourceModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 480, padding: 24, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Add Resource
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Create a new laboratory, meeting hall, or equipment profile.
            </p>

            <form onSubmit={handleCreateResource}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Resource Name
                </label>
                <input
                  type="text"
                  required
                  className="input-control"
                  placeholder="e.g. Robotics Lab 102"
                  value={newResName}
                  onChange={(e) => setNewResName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    className="input-control"
                    value={newResCategory}
                    onChange={(e) => setNewResCategory(e.target.value)}
                  >
                    <option value="laboratory">Laboratory</option>
                    <option value="meeting_room">Meeting Room</option>
                    <option value="sports_facility">Sports Facility</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Capacity
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="input-control"
                    value={newResCapacity}
                    onChange={(e) => setNewResCapacity(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Location / Wing
                </label>
                <input
                  type="text"
                  required
                  className="input-control"
                  placeholder="e.g. Science Block, Room 201"
                  value={newResLocation}
                  onChange={(e) => setNewResLocation(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Description
                </label>
                <textarea
                  className="input-control"
                  rows={2}
                  placeholder="Facility overview..."
                  value={newResDesc}
                  onChange={(e) => setNewResDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <input
                  type="checkbox"
                  id="approvalReq"
                  checked={newResApproval}
                  onChange={(e) => setNewResApproval(e.target.checked)}
                  style={{ accentColor: '#7a0c2e' }}
                />
                <label htmlFor="approvalReq" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Require manager approval before confirmation
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCreateResourceModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resFormLoading}
                >
                  {resFormLoading ? <span className="spinner" /> : 'Create Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={modalOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalOpen(false)}
        loading={actionLoading}
      />
    </div>
  );
}
