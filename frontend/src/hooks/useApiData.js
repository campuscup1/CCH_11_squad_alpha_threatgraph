import { useEffect, useMemo, useRef, useState } from 'react';
import { useRefresh } from '../context/RefreshContext';

export function useApiData(fetcher, dependencies = []) {
  const { refreshToken, markUpdated } = useRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const dependencyKey = useMemo(
    () => JSON.stringify(dependencies),
    [dependencies],
  );

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((result) => {
        if (!active) return;
        setData(result);
        markUpdated();
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || 'Unable to load data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshToken, dependencyKey, markUpdated]);

  return { data, setData, loading, error };
}
