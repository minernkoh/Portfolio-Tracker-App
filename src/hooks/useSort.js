// reusable hook for table sorting logic
// reduces duplication between PortfolioTable and Dashboard

import { useState, useCallback } from "react";

export function useSort(initialConfig = { key: null, direction: "asc" }) {
  const [sortConfig, setSortConfig] = useState(initialConfig);

  // toggle sort direction or set new sort key
  // if clicking same column: toggle asc/desc
  // if clicking different column: set to asc
  const handleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // sort data using the current configuration
  // accepts a custom comparator function for flexibility
  const sortData = useCallback(
    (data, comparator) => {
      if (!sortConfig.key || !data?.length) return data;

      return [...data].sort((a, b) => {
        if (comparator) {
          return comparator(a, b, sortConfig.key, sortConfig.direction);
        }
        // default comparison
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === "number" && typeof valB === "number") {
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? "").toLowerCase();
        const strB = String(valB ?? "").toLowerCase();
        return sortConfig.direction === "asc"
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    },
    [sortConfig]
  );

  // get sort direction for a given key (returns 'asc', 'desc', or null)
  const getSortDirection = useCallback(
    (key) => {
      if (sortConfig.key !== key) return null;
      return sortConfig.direction;
    },
    [sortConfig]
  );

  return {
    handleSort,
    sortData,
    getSortDirection,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
  };
}
