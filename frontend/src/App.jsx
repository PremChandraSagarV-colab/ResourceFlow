import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const ResourceDetailPage = lazy(() => import('./pages/ResourceDetailPage'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Route guards
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function HomeRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/resources" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Sidebar />
          <div className="main-layout">
            <TopHeader />
            <main className="content-workspace">
              <Suspense
                fallback={
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <span className="spinner" />
                  </div>
                }
              >
                <Routes>
                  {/* Public & Discovery */}
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/resources" element={<ResourcesPage />} />
                  <Route path="/resources/:id" element={<ResourceDetailPage />} />

                  {/* Student Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <StudentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-bookings"
                    element={
                      <ProtectedRoute>
                        <MyBookingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <StudentProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Manager Operations */}
                  <Route
                    path="/manager"
                    element={
                      <ProtectedRoute allowedRoles={['manager', 'admin']}>
                        <ManagerDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Administrator Portal */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Error Pages */}
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
