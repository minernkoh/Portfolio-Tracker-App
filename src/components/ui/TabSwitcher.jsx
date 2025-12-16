// reusable tab switcher component
// used in Dashboard for Overview/Transactions tabs

import React from 'react';

export default function TabSwitcher({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-4 border-b border-[var(--border-subtle)] w-fit mt-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`pb-2 text-sm font-bold transition-all border-b-2 ${
            activeTab === tab.id
              ? 'border-[var(--accent-blue)] text-white'
              : 'border-transparent text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

