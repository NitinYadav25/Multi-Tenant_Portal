import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export const Login = () => {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('Demo@12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
      showToast('Logged in successfully!', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@example.com');
    setPassword('Demo@12345');
    setError('');
  };

  return (
    <div id="login">
      <div className="hero">
        <div className="brand">
          <i className="grad">N</i>
          <span>Nexora</span>
        </div>
        <h1>
          Every team. <span className="gt">Its own secure workspace.</span>
        </h1>
        <p>
          Manage projects, assign tasks and switch between organizations in one click – with
          strict tenant isolation built in.
        </p>
        <div className="fl">
          <div className="g">
            <b>Website Redesign</b>
            <br />
            <span className="tag">68% complete</span>
          </div>
          <div className="g">
            <span className="pill HIGH">HIGH</span> <b>Ship v2 launch</b>
          </div>
          <div className="g">
            🔒 <b>Org data isolated</b>
          </div>
        </div>
      </div>

      <div className="g form-card">
        <h2>Welcome back 👋</h2>
        <div style={{ color: 'var(--mut)', marginBottom: 18 }}>Log in to your workspaces</div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: '#f43f5e1f',
              color: 'var(--bad)',
              fontSize: 13,
              marginBottom: 16
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@example.com"
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            className="btn"
            style={{ width: '100%', marginTop: 22 }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log in →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            type="button"
            onClick={fillDemo}
            style={{ color: 'var(--a)', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}
          >
            Fill Demo Credentials (demo@example.com)
          </button>
        </div>

        <div className="sec-note">🔐 Encrypted · JWT secured · Role-based access</div>

        <div style={{ textAlign: 'center', marginTop: 18, color: 'var(--mut)' }}>
          New here?{' '}
          <Link to="/register" style={{ color: 'var(--a)', fontWeight: 700, textDecoration: 'none' }}>
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};
