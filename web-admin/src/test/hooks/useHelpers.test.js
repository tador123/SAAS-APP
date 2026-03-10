import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce, useSubmitting } from '../../hooks/useHelpers';

describe('useDebounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value updates', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ value: 'ab' });
    expect(result.current).toBe('a'); // not yet updated

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('ab');
  });
});

describe('useSubmitting', () => {
  it('starts as false', () => {
    const { result } = renderHook(() => useSubmitting());
    const [submitting] = result.current;
    expect(submitting).toBe(false);
  });

  it('sets submitting=true during async fn and back to false after', async () => {
    const { result } = renderHook(() => useSubmitting());
    let resolve;
    const promise = new Promise((r) => { resolve = r; });

    act(() => {
      result.current[1](async () => { await promise; });
    });
    expect(result.current[0]).toBe(true);

    await act(async () => { resolve(); });
    expect(result.current[0]).toBe(false);
  });
});
