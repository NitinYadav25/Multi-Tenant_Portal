import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound = () => {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '80vh',
        padding: 24,
        textAlign: 'center'
      }}
    >
      <div className="g" style={{ maxWidth: 480, padding: 40 }}>
        <h1 className="gt" style={{ fontSize: 64, margin: '0 0 8px' }}>
          404
        </h1>
        <h2>Page Not Found</h2>
        <p style={{ color: 'var(--mut)', margin: '14px 0 24px' }}>
          The page or resource you are looking for does not exist or has strict tenant isolation
          boundaries.
        </p>
        <Link to="/dashboard" className="btn" style={{ textDecoration: 'none' }}>
          Return to Dashboard →
        </Link>
      </div>
    </div>
  );
};
