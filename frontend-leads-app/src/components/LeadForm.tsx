import { useRef, useState, type FormEvent } from 'react';
import { toApiError, type ApiError } from '../api';
import type { LeadInput, LeadStatus, Weights } from '../api/types';
import { CRITERIA, STATUS_LABELS, STATUSES } from '../constants';
import { validateLead, type LeadField, type LeadValues } from '../validation';
import { Field } from './Field';
import { ErrorMessage } from './Feedback';
import { InfoTip } from './Tooltip';
import { WeightsInfo } from './WeightsInfo';

// Si el formulario ofrece elegir la asignación, el envío incluye asignarme
export type LeadFormValues = LeadInput & { asignarme?: boolean };

interface Props {
  initial?: LeadInput;
  submitLabel: string;
  onSubmit: (input: LeadFormValues) => Promise<void>;
  onCancel?: () => void;
  // Para recargar los datos si otro usuario modificó el lead mientras se editaba (409)
  onReload?: () => void;
  // Ponderaciones vigentes con las que se calculará la puntuación
  weights?: Weights | null;
  // Ofrece elegir si el lead queda asignado al agente o libre (al crear)
  assignmentChoice?: boolean;
  // Si se pasa, el formulario incluye el selector de estado (lo gestiona quien lo usa)
  status?: { value: LeadStatus; onChange: (status: LeadStatus) => void };
}

const EMPTY: LeadValues = { nombre: '', telefono: '', clienteNuevo: '', interesComercial: '', origen: '', antiguedad: '' };

export function LeadForm({ initial, submitLabel, onSubmit, onCancel, onReload, weights, assignmentChoice, status }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<LeadValues>(initial ? toStrings(initial) : EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [assignToMe, setAssignToMe] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const errors = validateLead(values);
  // Los errores aparecen al intentar enviar y desde entonces se actualizan al escribir.
  // No se validan al salir del campo: el mensaje movería el botón y se perdería el clic de enviar.
  const shown = (field: LeadField) => (submitted ? errors[field] : undefined);
  const serverInvalid = (field: string) => error?.details.some((detail) => detail.campo === field) ?? false;

  const props = (field: LeadField) => ({
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [field]: event.target.value })),
    error: shown(field),
    invalid: serverInvalid(field),
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);

    const firstInvalid = (Object.keys(errors) as LeadField[])[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        nombre: values.nombre.trim(),
        telefono: values.telefono.trim(),
        clienteNuevo: Number(values.clienteNuevo),
        interesComercial: Number(values.interesComercial),
        origen: Number(values.origen),
        antiguedad: Number(values.antiguedad),
        ...(assignmentChoice ? { asignarme: assignToMe } : {}),
      });
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} className="form" onSubmit={handleSubmit} noValidate>
      {weights && <WeightsInfo weights={weights} />}

      <Field
        label="Nombre"
        tip="Nombre de la persona o empresa de contacto (máximo 150 caracteres)"
        maxLength={150}
        autoComplete="off"
        {...props('nombre')}
      />
      <Field
        label="Teléfono"
        tip="Entre 7 y 20 dígitos; puede empezar por + y llevar espacios"
        inputMode="tel"
        autoComplete="off"
        {...props('telefono')}
      />
      {status && (
        <div className="field">
          <div className="field-label">
            <label htmlFor="lead-status">Estado</label>
            <InfoTip text="En qué fase de gestión está el lead. Solo el agente asignado puede cambiarlo." />
          </div>
          <select id="lead-status" value={status.value} onChange={(e) => status.onChange(e.target.value as LeadStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset>
        <legend>Valoración de cada criterio (0–100)</legend>
        <div className="grid-2">
          {CRITERIA.map(({ key, label, help }) => (
            <Field
              key={key}
              label={label}
              tip={`${help}. Valor entero de 0 (nada) a 100 (máximo).`}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              {...props(key)}
            />
          ))}
        </div>
        <p className="muted">La puntuación no se introduce: la calcula el servidor con los pesos vigentes.</p>
      </fieldset>

      {assignmentChoice && (
        <fieldset>
          <legend>
            Asignación del lead{' '}
            <InfoTip text="Solo el agente asignado puede modificar un lead. Si lo dejas libre, cualquier agente podrá asignárselo después." />
          </legend>
          <label className="choice">
            <input type="radio" name="asignacion" checked={assignToMe} onChange={() => setAssignToMe(true)} />
            <span>Asignármelo a mí</span>
          </label>
          <label className="choice">
            <input type="radio" name="asignacion" checked={!assignToMe} onChange={() => setAssignToMe(false)} />
            <span>Dejarlo libre, sin asignar</span>
          </label>
        </fieldset>
      )}

      {error && <ErrorMessage error={error} />}
      {error?.code === 'CONFLICT' && onReload && (
        <button type="button" className="btn" onClick={onReload}>
          Recargar datos del lead
        </button>
      )}

      <div className="actions">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

const toStrings = (input: LeadInput): LeadValues => ({
  nombre: input.nombre,
  telefono: input.telefono,
  clienteNuevo: String(input.clienteNuevo),
  interesComercial: String(input.interesComercial),
  origen: String(input.origen),
  antiguedad: String(input.antiguedad),
});
