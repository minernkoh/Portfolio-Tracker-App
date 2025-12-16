// reusable sorting hook for table components
// used in Dashboard and PortfolioTable

import { useState, useCallback, useMemo } from 'react';

export function useSort(initialKey = null, initialDirection = 'desc') {
  const [sortConfig, setSortConfig] = useState({
    key: initialKey,
    direction: initialDirection,
  });

  const handleSort = useCallback((key) => {
    setSortConfig((current) => {
      let direction = 'asc';
      // if clicking same column, toggle direction
      if (current.key === key && current.direction === 'asc') {
        direction = 'desc';
      }
      return { key, direction };
    });
  }, []);

  const renderSortArrow = useCallback(
    (key) => {
      if (sortConfig.key !== key) return null;
      return (
        <span className="ml-1">
          {sortConfig.direction === 'asc' ? '▲' : '▼'}
        </span>
      );
    },
    [sortConfig]
  );

  return {
    sortConfig,
    handleSort,
    renderSortArrow,
  };
}

