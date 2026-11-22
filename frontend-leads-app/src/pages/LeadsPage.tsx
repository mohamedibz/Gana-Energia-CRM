import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api, PAGE_SIZE } from '../api';
import type { LeadFilters, LeadStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { ErrorMessage, Loading } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { InfoTip, Tooltip } from '../components/Tooltip';
import { STATUS_LABELS, STATUSES } from '../constants';
import { formatScore } from '../format';
import { useApi } from '../hooks/useApi';

// Los filtros viven en la URL: se pueden compartir y se conservan al volver desde el detalle
const readFilters = (params: URLSearchParams): LeadFilters => {
  const status = params.get('status') as LeadStatus | null;
  return {
    search: params.get('search') ?? '',
    status: status && STATUSES.includes(status) ? status : '',
    agentId: params.get('agentId') ?? '',
    sort: params.get('sort') === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
};

const writeFilters = (filters: LeadFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.sort === 'asc') params.set('sort', 'asc');
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
};

export function LeadsPage() {
  const { agents, agentName } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);

  // Al cambiar un filtro se vuelve a la página 1, salvo que el cambio sea de página
  const update = (patch: Partial<LeadFilters>) =>
    setParams((previous) => writeFilters({ ...readFilters(previous), page: 1, ...patch }), { replace: true });

  // La búsqueda espera 300 ms tras la última tecla para no lanzar una petición por letra
  const [searchText, setSearchText] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(
        (previous) => {
          const current = readFilters(previous);
          const search = searchText.trim();
          return search === current.search ? previous : writeFilters({ ...current, search, page: 1 });
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, setParams]);

  const { data, error, loading, reload } = useApi(
    () => api.listLeads(filters),
    [filters.search, filters.status, filters.agentId, filters.sort, filters.page],
  );

  const from = `/leads${location.search}`;

  return (
    <>
      <div className="page-header">
        <h1>Leads</h1>
        <Tooltip text="Crea un lead nuevo; podrás asignártelo o dejarlo libre" align="end">
          <Link to="/leads/new" className="btn btn-primary">
            + Nuevo lead
          </Link>
        </Tooltip>
      </div>

      <div className="toolbar">
        <Tooltip text="Busca por parte del nombre o del teléfono" align="start" className="toolbar-search">
          <input
            type="search"
            placeholder="Buscar nombre o teléfono"
            aria-label="Buscar por nombre o teléfono"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Tooltip>
        <select
          aria-label="Filtrar por estado"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value as LeadStatus | '' })}
        >
          <option value="">Estado: todos</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por agente" value={filters.agentId} onChange={(e) => update({ agentId: e.target.value })}>
          <option value="">Agente: todos</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorMessage error={error} onRetry={reload} />}
      {!data && loading && <Loading />}

      {data && (
        <div className={loading ? 'is-loading' : undefined} aria-busy={loading}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th className="hide-small">Teléfono</th>
                  <th>Estado</th>
                  <th>
                    Agente{' '}
                    <InfoTip text="Agente responsable del lead. Solo él puede modificarlo; si está libre, cualquier agente puede asignárselo." />
                  </th>
                  <th aria-sort={filters.sort === 'asc' ? 'ascending' : 'descending'}>
                    <Tooltip text="Pulsa para invertir el orden de la puntuación (mayor a menor o menor a mayor)">
                      <button className="sort" onClick={() => update({ sort: filters.sort === 'asc' ? 'desc' : 'asc' })}>
                        Puntuación {filters.sort === 'asc' ? '↑' : '↓'}
                      </button>
                    </Tooltip>{' '}
                    <InfoTip text="De 0 a 100. Prioridad alta ≥ 75, media ≥ 40 y baja < 40." />
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link to={`/leads/${lead.id}`} state={{ from }}>
                        {lead.nombre}
                      </Link>
                    </td>
                    <td className="hide-small">{lead.telefono}</td>
                    <td>
                      <StatusBadge status={lead.estado} />
                    </td>
                    <td className={lead.agenteId ? undefined : 'muted'}>{agentName(lead.agenteId)}</td>
                    <td>
                      <strong>{formatScore(lead.puntuacion)}</strong> <PriorityBadge priority={lead.prioridad} />
                    </td>
                    <td className="num">
                      <Link to={`/leads/${lead.id}`} state={{ from }} className="btn btn-small">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.items.length === 0 && <p className="empty">No hay leads que coincidan con los filtros.</p>}

          <Pagination
            page={data.page}
            limit={PAGE_SIZE}
            total={data.total}
            disabled={loading}
            onChange={(page) => update({ page })}
          />
        </div>
      )}
    </>
  );
}
