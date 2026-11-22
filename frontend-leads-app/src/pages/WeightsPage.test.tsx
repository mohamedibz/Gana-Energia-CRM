import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import type { Weights } from '../api/types';
import { AuthContext, type AuthValue } from '../auth/AuthContext';
import { toast } from '../toast';
import { WeightsPage } from './WeightsPage';

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  api: { getWeights: vi.fn(), updateWeights: vi.fn() },
}));
vi.mock('../toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), apiError: vi.fn() } }));

const getWeights = vi.mocked(api.getWeights);
const updateWeights = vi.mocked(api.updateWeights);

const auth: AuthValue = {
  status: 'authenticated',
  agent: { id: '1', nombre: 'Agente 01', rol: 'ADMIN' },
  agents: [],
  login: vi.fn(),
  logout: vi.fn(),
  agentName: (id) => (id === null ? 'Sin asignar' : `Agente 0${id}`),
};

const weights = (overrides: Partial<Weights> = {}): Weights => ({
  version: 3,
  clienteNuevo: 40,
  interesComercial: 30,
  origen: 20,
  antiguedad: 10,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-21T12:30:00.000Z',
  creadoPorId: '1',
  modificadoPorId: '2',
  ...overrides,
});

const setWeight = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(`Peso de ${label}`), { target: { value } });

const saveButton = () => screen.getByRole('button', { name: /Guardar pesos/ }) as HTMLButtonElement;

const renderPage = () =>
  render(
    <AuthContext.Provider value={auth}>
      <WeightsPage />
    </AuthContext.Provider>,
  );

describe('WeightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWeights.mockResolvedValue(weights());
  });

  it('muestra los pesos vigentes con total 100 % y permite guardar', async () => {
    renderPage();

    expect(await screen.findByText(/Total: 100 %/)).toBeTruthy();
    expect((screen.getByLabelText('Peso de Cliente nuevo') as HTMLInputElement).value).toBe('40');
    expect(saveButton().disabled).toBe(false);
  });

  it('no incluye la columna de valoración', async () => {
    renderPage();
    await screen.findByText(/Total: 100 %/);

    expect(screen.queryByRole('columnheader', { name: /Valoración/ })).toBeNull();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('muestra quién y cuándo creó y modificó la versión vigente', async () => {
    renderPage();
    await screen.findByText(/Total: 100 %/);

    const audit = document.querySelector('.weights-audit')!.textContent!;
    expect(audit).toContain('Versión 3');
    expect(audit).toContain('creada por Agente 01');
    expect(audit).toContain('última modificación por Agente 02');
  });

  it('no deja guardar si la suma no es 100 y explica cuánto falta o sobra', async () => {
    renderPage();
    await screen.findByText(/Total: 100 %/);

    setWeight('Origen del lead', '25');
    expect(screen.getByText(/Total: 105 % \(sobran 5\)/)).toBeTruthy();
    expect(saveButton().disabled).toBe(true);

    setWeight('Origen del lead', '15');
    expect(screen.getByText(/Total: 95 % \(faltan 5\)/)).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('no acepta pesos negativos ni decimales y lo explica junto al campo', async () => {
    renderPage();
    await screen.findByText(/Total: 100 %/);

    setWeight('Cliente nuevo', '-10');
    setWeight('Interés comercial', '80');
    expect(saveButton().disabled).toBe(true);

    fireEvent.blur(screen.getByLabelText('Peso de Cliente nuevo'));
    expect(screen.getByText('Introduce un número entero entre 0 y 100')).toBeTruthy();
    expect(screen.getByLabelText('Peso de Cliente nuevo').getAttribute('aria-invalid')).toBe('true');

    setWeight('Cliente nuevo', '40.5');
    setWeight('Interés comercial', '29.5');
    expect(saveButton().disabled).toBe(true);
  });

  it('guarda los pesos como números enteros y confirma la nueva versión con un toast', async () => {
    updateWeights.mockResolvedValue(
      weights({ version: 4, clienteNuevo: 25, interesComercial: 25, origen: 25, antiguedad: 25 }),
    );
    renderPage();
    await screen.findByText(/Total: 100 %/);

    setWeight('Cliente nuevo', '25');
    setWeight('Interés comercial', '25');
    setWeight('Origen del lead', '25');
    setWeight('Antigüedad', '25');
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(updateWeights).toHaveBeenCalledWith({ clienteNuevo: 25, interesComercial: 25, origen: 25, antiguedad: 25 }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('versión 4')));
  });
});
