import { useEffect, useState, type FormEvent } from 'react';
import { api, toApiError, type ApiError } from '../api';
import type { Weights } from '../api/types';
import { ErrorMessage, Loading } from '../components/Feedback';
import { InfoTip, Tooltip } from '../components/Tooltip';
import { WeightsAudit } from '../components/WeightsInfo';
import { CRITERIA, type CriterionKey } from '../constants';
import { useApi } from '../hooks/useApi';
import { toast } from '../toast';
import { validateWeights } from '../validation';

type Values = Record<CriterionKey, string>;

const toValues = (weights: Weights): Values => ({
  clienteNuevo: String(weights.clienteNuevo),
  interesComercial: String(weights.interesComercial),
  origen: String(weights.origen),
  antiguedad: String(weights.antiguedad),
});

export function WeightsPage() {
  const { data, error, loading, reload } = useApi(api.getWeights, []);
  const [values, setValues] = useState<Values | null>(null);
  const [touched, setTouched] = useState<Partial<Record<CriterionKey, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (data) setValues(toValues(data));
  }, [data]);

  if (!values) {
    return (
      <>
        <h1>Configuración de pesos</h1>
        {loading && <Loading />}
        {error && <ErrorMessage error={error} onRetry={reload} />}
      </>
    );
  }

  const { fields, total, valid } = validateWeights(values);
  const validNumbers = Object.keys(fields).length === 0;
  const canSave = valid && !saving;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values || !valid) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await api.updateWeights({
        clienteNuevo: Number(values.clienteNuevo),
        interesComercial: Number(values.interesComercial),
        origen: Number(values.origen),
        antiguedad: Number(values.antiguedad),
      });
      toast.success(`Pesos guardados (versión ${saved.version}). Las puntuaciones de los leads se han recalculado.`);
      reload();
    } catch (caught) {
      setSaveError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const difference = 100 - total;

  return (
    <>
      <h1>Configuración de pesos</h1>
      <p className="muted">
        Puntuación = Σ (valoración del criterio × peso / 100). Cada valoración va de 0 a 100 y los pesos deben sumar
        exactamente 100 %. Al guardar se recalculan las puntuaciones de todos los leads.
      </p>
      {data && <WeightsAudit weights={data} />}

      <form className="card form" onSubmit={handleSubmit} noValidate>
        <table className="table">
          <thead>
            <tr>
              <th>Criterio</th>
              <th className="num">
                Peso (%){' '}
                <InfoTip
                  align="end"
                  text="Importancia del criterio en la puntuación final. Entero de 0 a 100; los cuatro pesos deben sumar exactamente 100."
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map(({ key, label, help }) => {
              const message = touched[key] ? fields[key] : undefined;
              return (
                <tr key={key}>
                  <td>
                    {label}
                    <small className="muted block">{help}</small>
                  </td>
                  <td className="num">
                    <input
                      className="weight-input"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={1}
                      aria-label={`Peso de ${label}`}
                      aria-invalid={Boolean(message)}
                      aria-describedby={message ? `weight-${key}-error` : undefined}
                      value={values[key]}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      onBlur={() => setTouched((current) => ({ ...current, [key]: true }))}
                    />
                    {message && (
                      <small id={`weight-${key}-error`} className="field-error block">
                        {message}
                      </small>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="total-row">
          <p className={valid ? 'total total-ok' : 'total total-error'} role="status">
            Total: {Number.isNaN(total) ? '—' : total} %
            {validNumbers && difference > 0 && ` (faltan ${difference})`}
            {validNumbers && difference < 0 && ` (sobran ${-difference})`}
            {!validNumbers && ' (cada peso debe ser un entero entre 0 y 100)'}
          </p>
          <InfoTip text="La suma de los cuatro pesos tiene que ser exactamente 100 para poder guardar." />
        </div>

        {saveError && <ErrorMessage error={saveError} />}

        <div className="actions">
          <Tooltip
            align="start"
            text={
              canSave
                ? 'Crea una nueva versión de los pesos y recalcula la puntuación de todos los leads.'
                : 'Corrige los pesos: cada uno debe ser un entero de 0 a 100 y la suma, exactamente 100.'
            }
          >
            <button className="btn btn-primary" disabled={!canSave}>
              {saving ? 'Guardando…' : 'Guardar pesos'}
            </button>
          </Tooltip>
        </div>
      </form>
    </>
  );
}
