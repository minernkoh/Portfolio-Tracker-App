// reusable asset logo component with fallback handling
// used in PortfolioTable and AssetDetails

import React from 'react';

// size mapping for Tailwind classes (Tailwind doesn't support dynamic classes)
const sizeClasses = {
  8: 'w-8 h-8',
  16: 'w-16 h-16',
};

export default function AssetLogo({ logo, ticker, name, size = 8, className = "" }) {
  const handleError = (e) => {
    // if logo fails to load, show fallback avatar
    e.target.onerror = null;
    e.target.src = `https://ui-avatars.com/api/?name=${ticker}&background=random`;
  };

  const sizeClass = sizeClasses[size] || sizeClasses[8];

  if (logo) {
    return (
      <img
        src={logo}
        alt={name || ticker}
        className={`${sizeClass} rounded-full bg-transparent object-cover ${className}`}
        onError={handleError}
      />
    );
  }

  // fallback: show first letter of ticker
  return (
    <div className={`${sizeClass} rounded-full bg-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] ${className}`}>
      {ticker?.[0] || "?"}
    </div>
  );
}

