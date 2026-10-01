import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Sidebar } from './Sidebar.jsx';
import { BottomPreviewBar } from './BottomPreviewBar.jsx';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: 'var(--mut)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="av grad" style={{ width: 48, height: 48, borderRadius: 8, margin: '0 auto 16px', fontSize: 20 }}>
            N
          </div>
          <div>Loading workspace session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div id="shell">
      <Sidebar />
      <main id="main">
        <Outlet />
      </main>
      <BottomPreviewBar />
    </div>
  );
};
