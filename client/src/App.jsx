import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { OrgProvider } from './context/OrgContext.jsx';
import { AnimatedBackground } from './components/AnimatedBackground.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Board } from './pages/Board.jsx';
import { Members } from './pages/Members.jsx';
import { NotFound } from './pages/NotFound.jsx';

export const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <OrgProvider>
          {/* Animated Background rendered once behind everything */}
          <AnimatedBackground />

          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Workspace Shell Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/board" element={<Board />} />
              <Route path="/members" element={<Members />} />
            </Route>

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </OrgProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
