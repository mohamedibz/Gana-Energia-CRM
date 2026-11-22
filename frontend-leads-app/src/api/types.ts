export type LeadStatus = 'NUEVO' | 'EN_GESTION' | 'CONTACTADO' | 'CERRADO';
export type Priority = 'ALTA' | 'MEDIA' | 'BAJA';
export type Role = 'ADMIN' | 'AGENTE';

export interface Agent {
  id: string;
  nombre: string;
  rol: Role;
}

export interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  estado: LeadStatus;
  agenteId: string | null;
  clienteNuevo: number;
  interesComercial: number;
  origen: number;
  antiguedad: number;
  // Versión del lead: se envía al modificarlo para detectar conflictos de edición
  version: number;
  updatedAt: string;
  puntuacion: number | null;
  prioridad: Priority | null;
  pesosVersion: number | null;
}

export interface BreakdownItem {
  criterio: string;
  valoracion: number;
  peso: number;
  aporte: number;
}

export interface LeadDetail extends Lead {
  desglose: BreakdownItem[];
}

export interface LeadPage {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
}

// Datos que el usuario puede escribir. La puntuación nunca se envía: la calcula el servidor.
export interface LeadInput {
  nombre: string;
  telefono: string;
  clienteNuevo: number;
  interesComercial: number;
  origen: number;
  antiguedad: number;
}

// Al crear, el agente decide si el lead queda asignado a él o libre
export interface NewLeadInput extends LeadInput {
  asignarme: boolean;
}

export interface Weights {
  version: number;
  clienteNuevo: number;
  interesComercial: number;
  origen: number;
  antiguedad: number;
  // Auditoría: cuándo y qué agente creó / modificó esta versión (null en versiones anteriores a la auditoría)
  createdAt: string;
  updatedAt: string;
  creadoPorId: string | null;
  modificadoPorId: string | null;
}

export type WeightsInput = Pick<Weights, 'clienteNuevo' | 'interesComercial' | 'origen' | 'antiguedad'>;

export interface LeadFilters {
  search: string;
  status: LeadStatus | '';
  agentId: string;
  sort: 'asc' | 'desc';
  page: number;
}

export interface LoginResponse {
  token: string;
  agente: Agent;
}

export interface FieldError {
  campo: string;
  mensaje: string;
}
