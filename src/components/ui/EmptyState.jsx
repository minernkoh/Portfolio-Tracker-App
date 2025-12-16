// reusable empty state component for when there's no data
// used in Dashboard and AssetDetails transaction tables

import React from 'react';

export default function EmptyState({ message, colSpan = 1 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-[var(--text-secondary)]">
        {message}
      </td>
    </tr>
  );
}

