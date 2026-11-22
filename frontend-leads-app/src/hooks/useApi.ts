import { useEffect, useState } from 'react';
import { toApiError, type ApiError } from '../api';

interface State<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

// Carga datos de la API y expone { data, error, loading, reload }.
// Conserva los datos anteriores mientras llegan los nuevos (sin parpadeos) e ignora respuestas obsoletas.
export function useApi<T>(fetcher: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, error: null, loading: true }));

    fetcher()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (!cancelled) setState((previous) => ({ data: previous.data, error: toApiError(error), loading: false }));
      });

    return () => {
      cancelled = true;
    };
    // fetcher cambia en cada render: el efecto solo debe repetirse cuando cambian deps o se recarga
  }, [...deps, reloadCount]);

  return { ...state, reload: () => setReloadCount((count) => count + 1) };
}
