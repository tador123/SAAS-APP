import { useState, useMemo, useCallback } from 'react';

/**
 * Hook for client-side table sorting.
 *
 * @param {Array} data - The array of items to sort
 * @param {string} [defaultField] - Initial sort field
 * @param {'asc'|'desc'} [defaultDir] - Initial sort direction
 * @returns {{ sorted, sortField, sortDir, requestSort, SortHeader }}
 */
export function useSortable(data, defaultField = null, defaultDir = 'asc') {
  const [sortField, setSortField] = useState(defaultField);
  const [sortDir, setSortDir] = useState(defaultDir);

  const requestSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sortField || !data?.length) return data || [];
    return [...data].sort((a, b) => {
      let aVal = typeof sortField === 'function' ? sortField(a) : a[sortField];
      let bVal = typeof sortField === 'function' ? sortField(b) : b[sortField];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Boolean
      if (typeof aVal === 'boolean') {
        return sortDir === 'asc' ? (aVal === bVal ? 0 : aVal ? -1 : 1) : (aVal === bVal ? 0 : aVal ? 1 : -1);
      }

      // Date detection
      if (typeof aVal === 'string' && !isNaN(Date.parse(aVal)) && aVal.includes('-')) {
        const da = new Date(aVal).getTime();
        const db = new Date(bVal).getTime();
        return sortDir === 'asc' ? da - db : db - da;
      }

      // String comparison
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortField, sortDir]);

  return { sorted, sortField, sortDir, requestSort };
}
