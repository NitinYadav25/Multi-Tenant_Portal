import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register(name.trim(), email.trim(), password);
      showToast('Account created successfully!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
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
          Experience enterprise-grade multi-tenancy with strict access boundaries, instant
          workspace switching, and real-time kanban boards.
        </p>
        <div className="fl">
          <div className="g">
            <b>Zero Data Leakage</b>
            <br />
            <span className="tag">404 Disclosure</span>
          </div>
          <div className="g">
            <span className="pill LOW">ENCRYPTED</span> <b>bcrypt (cost 12)</b>
          </div>
          <div className="g">
            🛡️ <b>Strict Tenant Scope</b>
          </div>
        </div>
      </div>

      <div className="g form-card">
        <h2>Create an account 🚀</h2>
        <div style={{ color: 'var(--mut)', marginBottom: 18 }}>Start your secure team workspace</div>

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
          <label htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Morgan"
            required
            autoFocus
          />

          <label htmlFor="reg-email">Work Email</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@company.com"
            autoComplete="email"
            required
          />

          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            className="btn"
            style={{ width: '100%', marginTop: 22 }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Get Started →'}
          </button>
        </form>

        <div className="sec-note">🔐 Encrypted · JWT secured · Role-based access</div>

        <div style={{ textAlign: 'center', marginTop: 18, color: 'var(--mut)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--a)', fontWeight: 700, textDecoration: 'none' }}>
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};
