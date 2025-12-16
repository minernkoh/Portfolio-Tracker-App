// reusable edit button component with pencil icon
// used in Dashboard and AssetDetails for editing transactions

import React from 'react';
import { PencilSimpleIcon } from '@phosphor-icons/react';

export default function EditButton({ onClick, disabled = false, title = 'Edit transaction' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1 text-[var(--text-secondary)] hover:text-white transition-colors disabled:opacity-50"
      title={title}
    >
      <PencilSimpleIcon size={18} />
    </button>
  );
}

