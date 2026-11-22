import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import type { Lead, LeadPage } from '../api/types';
import { AuthContext, type AuthValue } from '../auth/AuthContext';
import { LeadsPage } from './LeadsPage';

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  api: { listLeads: vi.fn() },
}));

const listLeads = vi.mocked(api.listLeads);

const lead = (id: string, overrides: Partial<Lead>): Lead => ({
  id,
  nombre: `Lead ${id}`,
  telefono: '600111222',
  estado: 'NUEVO',
  agenteId: null,
  clienteNuevo: 50,
  interesComercial: 50,
  origen: 50,
  antiguedad: 50,
  version: 1,
  updatedAt: '2026-11-22T10:00:00.000Z',
  puntuacion: 50,
  prioridad: 'MEDIA',
  pesosVersion: 1,
  ...overrides,
});

const page = (items: Lead[], total = items.length): LeadPage => ({ items, total, page: 1, limit: 20 });

const auth: AuthValue = {
  status: 'authenticated',
  agent: { id: '1', nombre: 'Agente 01', rol: 'ADMIN' },
  agents: [
    { id: '1', nombre: 'Agente 01', rol: 'ADMIN' },
    { id: '2', nombre: 'Agente 02', rol: 'AGENTE' },
  ],
  login: vi.fn(),
  logout: vi.fn(),
  agentName: (id) => (id === null ? 'Sin asignar' : `Agente 0${id}`),
};

const renderPage = (url = '/leads') =>
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[url]}>
        <LeadsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('LeadsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista los leads con estado, agente, puntuación y prioridad', async () => {
    listLeads.mockResolvedValue(
      page([
        lead('1', { nombre: 'Ana Torres', puntuacion: 87, prioridad: 'ALTA' }),
        lead('2', { nombre: 'Luis Pérez', estado: 'EN_GESTION', agenteId: '2', puntuacion: 32.5, prioridad: 'BAJA' }),
      ]),
    );
    renderPage();

    expect(await screen.findByText('Ana Torres')).toBeTruthy();
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Alta')).toBeTruthy();
    expect(table.getByText('87')).toBeTruthy();
    expect(table.getByText('Sin asignar')).toBeTruthy();
    expect(table.getByText('En gestión')).toBeTruthy();
    expect(table.getByText('Agente 02')).toBeTruthy();
    expect(table.getByText('32,5')).toBeTruthy();
    expect(screen.getByText('1–2 de 2')).toBeTruthy();
  });

  it('ordena por puntuación descendente y permite invertir el orden', async () => {
    listLeads.mockResolvedValue(page([lead('1', {})]));
    renderPage();
    await screen.findByText('Lead 1');
    expect(listLeads).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'desc', page: 1 }));

    fireEvent.click(screen.getByRole('button', { name: /Puntuación/ }));

    await waitFor(() => expect(listLeads).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'asc' })));
  });

  it('lee los filtros de la URL y los envía a la API', async () => {
    listLeads.mockResolvedValue(page([]));
    renderPage('/leads?status=NUEVO&agentId=2&page=3');

    await screen.findByText('No hay leads que coincidan con los filtros.');

    expect(listLeads).toHaveBeenCalledWith(expect.objectContaining({ status: 'NUEVO', agentId: '2', page: 3 }));
  });

  it('muestra el error de la API y permite reintentar', async () => {
    const { ApiError } = await vi.importActual<typeof import('../api')>('../api');
    listLeads.mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'No se pudo conectar con el servidor'));
    renderPage();

    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo conectar con el servidor');

    listLeads.mockResolvedValue(page([lead('1', {})]));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Lead 1')).toBeTruthy();
  });

  it('pagina: la página siguiente pide la página 2', async () => {
    listLeads.mockResolvedValue({ items: [lead('1', {})], total: 45, page: 1, limit: 20 });
    renderPage();
    await screen.findByText('Lead 1');

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => expect(listLeads).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});
