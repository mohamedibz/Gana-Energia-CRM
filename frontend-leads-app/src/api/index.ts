import type {
  Agent,
  FieldError,
  Lead,
  LeadDetail,
  LeadFilters,
  LeadInput,
  LeadPage,
  LeadStatus,
  LoginResponse,
  NewLeadInput,
  Weights,
  WeightsInput,
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'leads.token';
export const PAGE_SIZE = 20;

// Error con el mismo formato que devuelve el backend: { error, message, details }
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: FieldError[] = [],
  ) {
    super(message);
  }
}

export const toApiError = (error: unknown): ApiError =>
  error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Ha ocurrido un error inesperado');

// ---- Sesión: el token se guarda en el navegador y se envía en cada petición
let onUnauthorized: () => void = () => {};

export const session = {
  // sessionStorage: cada pestaña tiene su propia sesión, así dos agentes no se pisan el token en el mismo navegador
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
  // Se avisa cuando el servidor responde 401 (token caducado o inválido)
  onUnauthorized: (callback: () => void) => {
    onUnauthorized = callback;
  },
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = session.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se pudo conectar con el servidor. Comprueba que la API está en marcha');
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data ?? {}) as { error?: string; message?: string; details?: FieldError[] };
    // El login devuelve 401 con credenciales incorrectas: no es una sesión caducada
    if (response.status === 401 && path !== '/auth/login') onUnauthorized();
    throw new ApiError(
      response.status,
      error.error ?? 'UNKNOWN',
      error.message ?? 'Ha ocurrido un error inesperado',
      error.details ?? [],
    );
  }

  return data as T;
}

const toQuery = (filters: LeadFilters): string => {
  const params = new URLSearchParams({ sort: filters.sort, page: String(filters.page), limit: String(PAGE_SIZE) });
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.agentId) params.set('agentId', filters.agentId);
  return params.toString();
};

export const api = {
  login: (telefono: string, password: string) =>
    request<LoginResponse>('POST', '/auth/login', { telefono, password }),
  me: () => request<Agent>('GET', '/auth/me'),
  agents: () => request<Agent[]>('GET', '/agents'),

  listLeads: (filters: LeadFilters) => request<LeadPage>('GET', `/leads?${toQuery(filters)}`),
  getLead: (id: string) => request<LeadDetail>('GET', `/leads/${id}`),
  createLead: (input: NewLeadInput) => request<Lead>('POST', '/leads', input),
  updateLead: (id: string, input: LeadInput, version: number) =>
    request<Lead>('PUT', `/leads/${id}`, { ...input, version }),
  changeStatus: (id: string, estado: LeadStatus) => request<Lead>('PATCH', `/leads/${id}/status`, { estado }),
  assign: (id: string) => request<Lead>('POST', `/leads/${id}/assign`),
  unassign: (id: string) => request<Lead>('DELETE', `/leads/${id}/assign`),

  getWeights: () => request<Weights>('GET', '/weights'),
  updateWeights: (input: WeightsInput) => request<Weights>('PUT', '/weights', input),
};
