import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, toApiError } from '../api';
import type { LeadStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { ErrorMessage, Loading } from '../components/Feedback';
import { LeadForm } from '../components/LeadForm';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { InfoTip, Tooltip } from '../components/Tooltip';
import { formatDate, formatScore } from '../format';
import { useApi } from '../hooks/useApi';
import { toast } from '../toast';

export function LeadDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const { agent, agentName } = useAuth();
  const { data: lead, error, loading, reload } = useApi(() => api.getLead(id), [id]);

  const [editing, setEditing] = useState(false);
  // Estado elegido en el formulario; null mientras no se ha tocado
  const [draftStatus, setDraftStatus] = useState<LeadStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const closeEditing = () => {
    setEditing(false);
    setDraftStatus(null);
  };
  // Las ponderaciones se cargan al abrir el formulario, para mostrar las vigentes en ese momento
  const { data: weights } = useApi(() => (editing ? api.getWeights() : Promise.resolve(null)), [editing]);

  // Vuelve al listado con los mismos filtros con los que se llegó
  const back = (location.state as { from?: string } | null)?.from ?? '/leads';

  // Ejecuta una acción, avisa con un toast y siempre recarga después, así se ve el estado real aunque haya habido un conflicto
  async function run(action: () => Promise<unknown>, successMessage: string): Promise<boolean> {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      return true;
    } catch (caught) {
      toast.apiError(toApiError(caught));
      return false;
    } finally {
      setBusy(false);
      reload();
    }
  }

  if (!lead) {
    return (
      <>
        <Link to={back}>← Volver al listado</Link>
        {loading && <Loading />}
        {error && <ErrorMessage error={error} onRetry={reload} />}
      </>
    );
  }

  const isOwner = lead.agenteId === agent?.id;
  const canUnassign = lead.agenteId !== null && (isOwner || agent?.rol === 'ADMIN');

  return (
    <div className={loading ? 'is-loading' : undefined} aria-busy={loading}>
      <Link to={back}>← Volver al listado</Link>
      <div className="page-header">
        <h1>{lead.nombre}</h1>
        <StatusBadge status={lead.estado} />
      </div>

      {error && <ErrorMessage error={error} onRetry={reload} />}

      <div className="grid-2">
        <section className="card panel">
          <div className="card-header">
            <h2>{editing && isOwner ? 'Editar lead' : 'Datos del lead'}</h2>
            {!editing && isOwner && (
              <Tooltip
                align="end"
                text="Abre el formulario para cambiar el nombre, el teléfono y las valoraciones. La puntuación se recalcula al guardar."
              >
                <button className="btn btn-small" disabled={busy} onClick={() => setEditing(true)}>
                  Editar datos
                </button>
              </Tooltip>
            )}
          </div>

          <div className="panel-body">
            {editing && isOwner ? (
              <LeadForm
                initial={lead}
                submitLabel="Guardar cambios"
                weights={weights}
                status={{ value: draftStatus ?? lead.estado, onChange: setDraftStatus }}
                onSubmit={async (input) => {
                  await api.updateLead(lead.id, input, lead.version);
                  const statusChanged = draftStatus !== null && draftStatus !== lead.estado;
                  if (statusChanged) {
                    try {
                      await api.changeStatus(lead.id, draftStatus);
                    } catch (caught) {
                      // Los datos ya se guardaron: se cierra la edición y se avisa solo del estado
                      toast.apiError(toApiError(caught));
                      closeEditing();
                      reload();
                      return;
                    }
                  }
                  toast.success('Lead actualizado');
                  closeEditing();
                  reload();
                }}
                onCancel={closeEditing}
                onReload={() => {
                  closeEditing();
                  reload();
                }}
              />
            ) : (
              <>
                <div className="info-grid">
                  <div className="tile tile-wide">
                    <span className="tile-label">Teléfono</span>
                    <a className="tile-phone" href={`tel:${lead.telefono.replace(/[^\d+]/g, '')}`}>
                      {lead.telefono}
                    </a>
                  </div>

                  <div className="tile">
                    <span className="tile-label">Estado</span>
                    <StatusBadge status={lead.estado} />
                  </div>

                  <div className="tile">
                    <span className="tile-label">
                      Agente asignado
                      <InfoTip text="Solo el agente asignado puede modificar los datos y el estado del lead." />
                    </span>
                    <span className="tile-agent">
                      <span className={lead.agenteId ? 'avatar' : 'avatar avatar-empty'} aria-hidden="true">
                        {lead.agenteId ? agentName(lead.agenteId).trim().charAt(0).toUpperCase() : '–'}
                      </span>
                      <span className={lead.agenteId ? undefined : 'muted'}>{agentName(lead.agenteId)}</span>
                    </span>
                    <span className="tile-actions">
                      {lead.agenteId === null && (
                        <Tooltip text="El lead pasa a ser tuyo y podrás modificarlo. Nadie más podrá editarlo mientras lo tengas asignado.">
                          <button
                            className="btn btn-small"
                            disabled={busy}
                            onClick={() => run(() => api.assign(lead.id), 'Lead asignado a ti')}
                          >
                            Asignarme este lead
                          </button>
                        </Tooltip>
                      )}
                      {canUnassign && (
                        <Tooltip text="Deja el lead libre para que otro agente pueda asignárselo.">
                          <button
                            className="btn btn-small"
                            disabled={busy}
                            onClick={() => run(() => api.unassign(lead.id), 'Lead desasignado')}
                          >
                            Desasignar
                          </button>
                        </Tooltip>
                      )}
                    </span>
                  </div>

                  <div className="tile">
                    <span className="tile-label">Última modificación</span>
                    <span className="tile-value">{formatDate(lead.updatedAt)}</span>
                  </div>

                  <div className="tile">
                    <span className="tile-label">
                      Versión
                      <InfoTip
                        align="end"
                        text="Número de modificaciones del lead. Sirve para avisar si otra persona lo cambió mientras lo editabas."
                      />
                    </span>
                    <span className="tile-value">{lead.version}</span>
                  </div>
                </div>
                {lead.agenteId !== null && !isOwner && (
                  <p className="note">
                    Asignado a {agentName(lead.agenteId)}: solo él puede modificarlo
                    {canUnassign ? '.' : ' y solo él o un administrador puede desasignarlo.'}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section className="card panel">
          <div className="card-header">
            <h2>
              Puntuación{' '}
              <InfoTip
                align="end"
                text="Suma de cada valoración (0–100) multiplicada por su peso y dividida entre 100. Los pesos con los que se calculó están en la tabla de abajo."
              />
            </h2>
          </div>
          <div className="panel-body">
            <p className="score">
              <span className="score-value">{formatScore(lead.puntuacion)}</span> / 100 <PriorityBadge priority={lead.prioridad} />
            </p>
            <p className="muted">
              Calculada con los pesos de la versión {lead.pesosVersion ?? '—'}. Prioridad alta ≥ 75, media ≥ 40, baja &lt; 40.
            </p>
            <ScoreBreakdown items={lead.desglose} total={lead.puntuacion} />
          </div>
        </section>
      </div>
    </div>
  );
}
