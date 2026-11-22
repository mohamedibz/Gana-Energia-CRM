import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api';
import { AuthContext, type AuthValue } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';

vi.mock('../toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), apiError: vi.fn() } }));

function renderLogin(login: AuthValue['login']) {
  const value: AuthValue = {
    status: 'anonymous',
    agent: null,
    agents: [],
    login,
    logout: vi.fn(),
    agentName: () => '',
  };
  render(
    <AuthContext.Provider value={value}>
      <LoginPage />
    </AuthContext.Provider>,
  );
}

const fill = (telefono: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: telefono } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
};

describe('LoginPage', () => {
  it('inicia sesión con el teléfono y la contraseña escritos', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    renderLogin(login);

    fill(' 600000002 ', 'Agente2-2026');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('600000002', 'Agente2-2026'));
  });

  it('muestra el error del servidor si las credenciales son incorrectas', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Teléfono o contraseña incorrectos'));
    renderLogin(login);

    fill('600000002', 'mala');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Teléfono o contraseña incorrectos');
    expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('valida los campos en React antes de llamar al servidor', async () => {
    const login = vi.fn();
    renderLogin(login);

    fill('123', '');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText(/Entre 7 y 20 dígitos/)).toBeTruthy();
    expect(screen.getByText('La contraseña es obligatoria')).toBeTruthy();
    expect(screen.getByLabelText('Teléfono').getAttribute('aria-invalid')).toBe('true');
    expect(login).not.toHaveBeenCalled();
  });

  it('rellena el formulario con un usuario de demo', () => {
    renderLogin(vi.fn());

    fireEvent.click(screen.getAllByRole('button', { name: 'Usar' })[0]);

    expect((screen.getByLabelText('Teléfono') as HTMLInputElement).value).toBe('600000001');
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('Admin-2026');
  });
});
