import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from './Icons.jsx';

export const ThemeToggle = ({ className = '' }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nexora_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexora_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      id="th"
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      title="Toggle Light / Dark Theme"
      aria-label="Toggle theme"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {theme === 'dark' ? (
        <>
          <SunIcon size={14} />
          <span>Light mode</span>
        </>
      ) : (
        <>
          <MoonIcon size={14} />
          <span>Dark mode</span>
        </>
      )}
    </button>
  );
};
