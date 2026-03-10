import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for debouncing a value.
 * @param {*} value  The value to debounce
 * @param {number} delay  Debounce delay in ms (default 300)
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for tracking async operation loading state and preventing
 * double-submissions on forms.
 */
export function useSubmitting() {
  const [submitting, setSubmitting] = useState(false);

  const withSubmit = useCallback(async (fn) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fn();
    } finally {
      setSubmitting(false);
    }
  }, [submitting]);

  return [submitting, withSubmit];
}

/**
 * Custom hook for paginated API calls.
 * Returns { data, pagination, loading, error, setPage, refetch }
 *
 * @param {function} fetchFn  Async function (page, limit) => { data, pagination }
 * @param {object} options   { initialPage, limit, deps }
 */
export function usePagination(fetchFn, { initialPage = 1, limit = 15, deps = [] } = {}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: initialPage, totalPages: 1, total: 0, limit });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const fetchData = useCallback(async (page = pagination.page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current(page, limit);
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, limit]);

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setPage = useCallback((p) => {
    setPagination((prev) => ({ ...prev, page: p }));
    fetchData(p);
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(pagination.page), [fetchData, pagination.page]);

  return { data, pagination, loading, error, setPage, refetch };
}
