import React from 'react';
import { NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle.jsx';

export const BottomPreviewBar = () => {
  return (
    <nav className="pv" aria-label="Quick Navigation">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => (isActive ? 'on active' : '')}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/board"
        className={({ isActive }) => (isActive ? 'on active' : '')}
      >
        Task Board
      </NavLink>
      <NavLink
        to="/members"
        className={({ isActive }) => (isActive ? 'on active' : '')}
      >
        Members
      </NavLink>
      <ThemeToggle />
    </nav>
  );
};
