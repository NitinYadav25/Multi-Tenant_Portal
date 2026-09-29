import React, { useState, useEffect } from 'react';

export const ThemeToggle = ({ className = '' }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nexora_theme') || 'dark';
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
    >
      ◐ {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
};
