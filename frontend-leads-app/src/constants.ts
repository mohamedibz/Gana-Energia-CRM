import type { LeadStatus } from './api/types';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NUEVO: 'Nuevo',
  EN_GESTION: 'En gestión',
  CONTACTADO: 'Contactado',
  CERRADO: 'Cerrado',
};

export const STATUSES = Object.keys(STATUS_LABELS) as LeadStatus[];

export const PRIORITY_LABELS = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' } as const;

// Los 4 criterios de la puntuación, con el nombre del campo en la API
export const CRITERIA = [
  { key: 'clienteNuevo', label: 'Cliente nuevo', help: 'Si el cliente es nuevo o ya lo teníamos' },
  { key: 'interesComercial', label: 'Interés comercial', help: 'Interés mostrado por el cliente' },
  { key: 'origen', label: 'Origen del lead', help: 'Calidad del canal de origen' },
  { key: 'antiguedad', label: 'Antigüedad', help: 'Antigüedad del contacto' },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]['key'];

// Nombres legibles de los campos de la API, para mostrar los errores de validación
export const FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre',
  telefono: 'Teléfono',
  password: 'Contraseña',
  version: 'Versión',
  estado: 'Estado',
  ...Object.fromEntries(CRITERIA.map(({ key, label }) => [key, label])),
};
