import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { OrgSwitcher } from './OrgSwitcher.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { getInitials } from '../utils/colors.js';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="g">
      <div className="brand">
        <i className="grad">N</i>
        <span>Nexora</span>
      </div>

      <OrgSwitcher />

      <div className="lb">WORKSPACE</div>

      <NavLink
        to="/dashboard"
        className={({ isActive }) => `nav ${isActive ? 'on active' : ''}`}
      >
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="9" rx="2" />
          <rect x="14" y="3" width="7" height="5" rx="2" />
          <rect x="14" y="12" width="7" height="9" rx="2" />
          <rect x="3" y="16" width="7" height="5" rx="2" />
        </svg>
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="/board"
        className={({ isActive }) => `nav ${isActive ? 'on active' : ''}`}
      >
        <svg viewBox="0 0 24 24">
          <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
        <span>Task Board</span>
      </NavLink>

      <NavLink
        to="/members"
        className={({ isActive }) => `nav ${isActive ? 'on active' : ''}`}
      >
        <svg viewBox="0 0 24 24">
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 010 8M22 21c0-3-2-5-4-5.5" />
        </svg>
        <span>Members</span>
      </NavLink>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ThemeToggle className="btn o sm" />

        {user && (
          <div className="me">
            <span
              className="av grad"
              style={{ borderRadius: '50%', width: 32, height: 32 }}
            >
              {getInitials(user.name)}
            </span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <b style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.name}
              </b>
              <small style={{ display: 'block', color: 'var(--mut)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.email}
              </small>
            </span>
            <button
              type="button"
              className="logout-btn"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
