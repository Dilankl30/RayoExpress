import { useState, useCallback } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAsyncReturn<T, A extends unknown[]> extends UseAsyncState<T> {
  execute: (...args: A) => Promise<T | null>;
}

export function useAsync<T, A extends unknown[] = unknown[]>(
  asyncFn: (...args: A) => Promise<T>,
): UseAsyncReturn<T, A> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFn(...args);
        setData(result);
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error desconocido';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [asyncFn],
  );

  return { data, loading, error, execute };
}
