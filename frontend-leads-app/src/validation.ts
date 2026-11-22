import { CRITERIA, type CriterionKey } from './constants';

// Validación de formularios en React: los mensajes los controla la aplicación, no el navegador.
// Las reglas son las mismas que aplica el backend.

export type Errors<K extends string> = Partial<Record<K, string>>;

const INTEGER = /^-?\d+$/;
const PHONE = /^\+?[0-9 ]{7,20}$/;

export const validateName = (value: string): string | undefined => {
  const name = value.trim();
  if (!name) return 'El nombre es obligatorio';
  if (name.length > 150) return 'El nombre no puede superar los 150 caracteres';
};

export const validatePhone = (value: string): string | undefined => {
  const phone = value.trim();
  if (!phone) return 'El teléfono es obligatorio';
  if (!PHONE.test(phone)) return 'Entre 7 y 20 dígitos; puede empezar por + (ej. 600 123 456)';
};

// Entero entre 0 y 100 (valoraciones de los criterios y pesos)
export const validatePercent = (value: string): string | undefined => {
  const text = value.trim();
  if (!INTEGER.test(text) || Number(text) < 0 || Number(text) > 100) return 'Introduce un número entero entre 0 y 100';
};

const CRITERIA_KEYS = CRITERIA.map(({ key }) => key);

export type LeadField = 'nombre' | 'telefono' | CriterionKey;
export type LeadValues = Record<LeadField, string>;

export const validateLead = (values: LeadValues): Errors<LeadField> => {
  const errors: Errors<LeadField> = {
    nombre: validateName(values.nombre),
    telefono: validatePhone(values.telefono),
  };
  for (const key of CRITERIA_KEYS) errors[key] = validatePercent(values[key]);
  return withoutEmpty(errors);
};

export type LoginField = 'telefono' | 'password';

export const validateLogin = (values: Record<LoginField, string>): Errors<LoginField> =>
  withoutEmpty<LoginField>({
    telefono: validatePhone(values.telefono),
    password: !values.password
      ? 'La contraseña es obligatoria'
      : values.password.length > 100
        ? 'La contraseña no puede superar los 100 caracteres'
        : undefined,
  });

export interface WeightsValidation {
  fields: Errors<CriterionKey>;
  total: number;
  valid: boolean;
}

// Cada peso debe ser válido y entre todos sumar exactamente 100
export const validateWeights = (values: Record<CriterionKey, string>): WeightsValidation => {
  const fields = withoutEmpty<CriterionKey>(
    Object.fromEntries(CRITERIA_KEYS.map((key) => [key, validatePercent(values[key])])),
  );
  const total = CRITERIA_KEYS.reduce((sum, key) => sum + (values[key].trim() === '' ? NaN : Number(values[key])), 0);
  return { fields, total, valid: Object.keys(fields).length === 0 && total === 100 };
};

function withoutEmpty<K extends string>(errors: Errors<K>): Errors<K> {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as Errors<K>;
}
