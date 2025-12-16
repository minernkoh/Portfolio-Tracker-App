// reusable button component for adding transactions
// used in Dashboard and AssetDetails

import React from 'react';
import { PlusIcon } from '@phosphor-icons/react';

export default function AddTransactionButton({ onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 bg-[var(--accent-blue)] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
    >
      <PlusIcon size={16} /> Add Transaction
    </button>
  );
}

