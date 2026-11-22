import type { ApiError } from '../api';
import { FIELD_LABELS } from '../constants';

export function Loading({ text = 'Cargando…' }: { text?: string }) {
  return (
    <p className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}
    </p>
  );
}

// Muestra el mensaje del servidor y, si los hay, el detalle de cada campo inválido
export function ErrorMessage({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="alert alert-error" role="alert">
      <p>{error.message}</p>
      {error.details.length > 0 && (
        <ul>
          {error.details.map((detail, index) => (
            <li key={index}>
              {detail.campo ? <strong>{FIELD_LABELS[detail.campo] ?? detail.campo}: </strong> : null}
              {detail.mensaje}
            </li>
          ))}
        </ul>
      )}
      {onRetry && (
        <button type="button" className="btn btn-small" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
