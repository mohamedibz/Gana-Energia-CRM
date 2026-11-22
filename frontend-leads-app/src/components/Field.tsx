import { useId, type InputHTMLAttributes } from 'react';
import { InfoTip } from './Tooltip';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  // Explicación que aparece en un tooltip junto a la etiqueta
  tip?: string;
  // Mensaje de validación de React; si existe, el campo se marca como inválido
  error?: string;
  // Marca el campo como inválido sin mensaje propio (p. ej. error devuelto por el servidor)
  invalid?: boolean;
}

export function Field({ label, tip, error, invalid, ...input }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const isInvalid = Boolean(error) || Boolean(invalid);

  return (
    <div className={isInvalid ? 'field field-invalid' : 'field'}>
      <div className="field-label">
        <label htmlFor={id}>{label}</label>
        {tip && <InfoTip text={tip} />}
      </div>
      <input id={id} aria-invalid={isInvalid} aria-describedby={error ? errorId : undefined} {...input} />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
