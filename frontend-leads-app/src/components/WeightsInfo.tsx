import type { Weights } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { CRITERIA } from '../constants';
import { formatDate } from '../format';
import { InfoTip } from './Tooltip';

// Quién y cuándo creó / modificó una versión de los pesos
export function WeightsAudit({ weights }: { weights: Weights }) {
  const { agentName } = useAuth();
  const who = (id: string | null) => (id === null ? 'un agente desconocido' : agentName(id));

  return (
    <p className="muted weights-audit">
      Versión <strong>{weights.version}</strong> · creada por <strong>{who(weights.creadoPorId)}</strong> el{' '}
      {formatDate(weights.createdAt)} · última modificación por <strong>{who(weights.modificadoPorId)}</strong> el{' '}
      {formatDate(weights.updatedAt)}
    </p>
  );
}

// Ponderaciones vigentes con las que se calculará la puntuación del lead que se está guardando
export function WeightsInfo({ weights }: { weights: Weights }) {
  return (
    <section className="weights-info" aria-label="Ponderaciones vigentes">
      <h3>
        Ponderaciones de la puntuación{' '}
        <InfoTip text="Al guardar, la puntuación del lead se calcula en el servidor sumando cada valoración (0–100) multiplicada por su peso y dividida entre 100. Solo un administrador puede cambiar los pesos." />
      </h3>
      <ul className="weights-chips">
        {CRITERIA.map(({ key, label }) => (
          <li key={key}>
            {label}: <strong>{weights[key]} %</strong>
          </li>
        ))}
      </ul>
      <WeightsAudit weights={weights} />
    </section>
  );
}
