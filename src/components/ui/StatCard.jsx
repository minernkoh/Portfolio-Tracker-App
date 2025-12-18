// reusable stat card component for displaying metrics
// used in Dashboard for showing portfolio statistics

import React from 'react';
import { formatCurrency } from '../../services/utils';

export default function StatCard({
  label,
  value,
  valueFormatted,
  subtitle,
  isPositive,
  hideValues = false,
}) {
  // determine text color based on positive/negative
  const valueColorClass = isPositive !== undefined
    ? isPositive
      ? 'text-green'
      : 'text-red'
    : 'text-white';

  const subtitleColorClass = isPositive !== undefined
    ? isPositive
      ? 'text-green'
      : 'text-red'
    : '';

  // handle display value
  let displayValue;
  if (valueFormatted !== undefined) {
    displayValue = valueFormatted;
  } else if (typeof value === 'string') {
    displayValue = value;
  } else {
    displayValue = formatCurrency(value, hideValues);
  }

  // handle subtitle
  const displaySubtitle = subtitle;

  return (
    <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
      <div className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold ${valueColorClass} ${typeof value === 'string' ? '' : 'truncate'}`}>
        {displayValue}
      </div>
      {displaySubtitle && (
        <div className={`text-xs font-bold ${subtitleColorClass}`}>
          {displaySubtitle}
        </div>
      )}
    </div>
  );
}

