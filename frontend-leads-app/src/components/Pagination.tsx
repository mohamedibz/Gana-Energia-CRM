interface Props {
  page: number;
  limit: number;
  total: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}

export function Pagination({ page, limit, total, disabled, onChange }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Paginación">
      <span className="muted">
        {from}–{to} de {total}
      </span>
      <div>
        <button className="btn" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </button>
        <span className="page-number">
          {page} / {lastPage}
        </span>
        <button className="btn" disabled={disabled || page >= lastPage} onClick={() => onChange(page + 1)}>
          Siguiente
        </button>
      </div>
    </nav>
  );
}
