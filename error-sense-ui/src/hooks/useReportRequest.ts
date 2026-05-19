import { Dispatch, SetStateAction, useEffect, useState } from 'react';

type RequestFn<TFilters, TItem> = (filters: TFilters, signal: AbortSignal) => Promise<{ errCases: TItem[] }>;

type RequestState<TItem> = {
  error: string;
  items: TItem[];
  loading: boolean;
  setError: Dispatch<SetStateAction<string>>;
  setItems: Dispatch<SetStateAction<TItem[]>>;
};

export function useReportRequest<TFilters, TItem>(
  filters: TFilters,
  request: RequestFn<TFilters, TItem>,
  errorMessage: string
): RequestState<TItem> {
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');

      try {
        const response = await request(filters, controller.signal);
        setItems(response.errCases);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : errorMessage);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [errorMessage, filters, request]);

  return {
    error,
    items,
    loading,
    setError,
    setItems,
  };
}
