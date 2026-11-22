import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api';
import { AuthContext, type AuthValue } from '../auth/AuthContext';
import { LeadForm } from './LeadForm';

const initial = {
  nombre: 'Ana Torres',
  telefono: '600111222',
  clienteNuevo: 80,
  interesComercial: 60,
  origen: 40,
  antiguedad: 20,
};

describe('LeadForm', () => {
  it('envía los datos con los indicadores como números', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LeadForm initial={initial} submitLabel="Guardar" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Origen del lead'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ ...initial, origen: 75 }));
  });

  it('no ofrece ningún campo para escribir la puntuación', () => {
    render(<LeadForm submitLabel="Crear" onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/puntuaci/i)).toBeNull();
  });

  it('ante un conflicto de versión avisa y permite recargar los datos', async () => {
    const onReload = vi.fn();
    const conflict = new ApiError(409, 'CONFLICT', 'El lead fue modificado por otro usuario');
    render(<LeadForm initial={initial} submitLabel="Guardar" onSubmit={vi.fn().mockRejectedValue(conflict)} onReload={onReload} />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('modificado por otro usuario');
    fireEvent.click(screen.getByRole('button', { name: 'Recargar datos del lead' }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('señala los campos que el servidor rechaza', async () => {
    const invalid = new ApiError(400, 'VALIDATION', 'Los datos enviados no son válidos', [
      { campo: 'origen', mensaje: 'Demasiado grande' },
    ]);
    render(<LeadForm initial={initial} submitLabel="Guardar" onSubmit={vi.fn().mockRejectedValue(invalid)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await screen.findByRole('alert');
    expect(screen.getByLabelText('Origen del lead').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Antigüedad').getAttribute('aria-invalid')).toBe('false');
  });

  describe('validación en React', () => {
    it('no usa la validación nativa del navegador', () => {
      const { container } = render(<LeadForm submitLabel="Crear" onSubmit={vi.fn()} />);

      expect(container.querySelector('form')!.noValidate).toBe(true);
      expect(container.querySelector('[required], [pattern]')).toBeNull();
    });

    it('al enviar vacío muestra un mensaje por campo y no llama al servidor', async () => {
      const onSubmit = vi.fn();
      render(<LeadForm submitLabel="Crear" onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

      expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();
      expect(screen.getByText('El teléfono es obligatorio')).toBeTruthy();
      expect(screen.getAllByText('Introduce un número entero entre 0 y 100')).toHaveLength(4);
      expect(screen.getByLabelText('Nombre').getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(screen.getByLabelText('Nombre'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rechaza valoraciones fuera de rango o decimales y el teléfono mal formado', async () => {
      const onSubmit = vi.fn();
      render(<LeadForm initial={initial} submitLabel="Guardar" onSubmit={onSubmit} />);

      fireEvent.change(screen.getByLabelText('Origen del lead'), { target: { value: '101' } });
      fireEvent.change(screen.getByLabelText('Antigüedad'), { target: { value: '1.5' } });
      fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(await screen.findByText(/ej\. 600 123 456/)).toBeTruthy();
      expect(screen.getAllByText('Introduce un número entero entre 0 y 100')).toHaveLength(2);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('tras un envío fallido los errores se actualizan al corregir el campo', async () => {
      render(<LeadForm submitLabel="Crear" onSubmit={vi.fn()} />);
      expect(screen.queryByText('El nombre es obligatorio')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
      expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();

      fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });

      expect(screen.queryByText('El nombre es obligatorio')).toBeNull();
    });
  });

  describe('asignación al crear', () => {
    it('por defecto se asigna al agente y puede dejarlo libre', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<LeadForm initial={initial} submitLabel="Crear" onSubmit={onSubmit} assignmentChoice />);

      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
      await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith({ ...initial, asignarme: true }));

      fireEvent.click(screen.getByLabelText('Dejarlo libre, sin asignar'));
      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
      await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith({ ...initial, asignarme: false }));
    });

    it('al editar no se ofrece la opción ni se envía asignarme', () => {
      render(<LeadForm initial={initial} submitLabel="Guardar" onSubmit={vi.fn()} />);

      expect(screen.queryByLabelText('Asignármelo a mí')).toBeNull();
    });
  });

  describe('ponderaciones', () => {
    const weights = {
      version: 7,
      clienteNuevo: 40,
      interesComercial: 30,
      origen: 20,
      antiguedad: 10,
      createdAt: '2026-11-20T10:00:00.000Z',
      updatedAt: '2026-11-21T12:30:00.000Z',
      creadoPorId: '1',
      modificadoPorId: '2',
    };
    const auth: AuthValue = {
      status: 'authenticated',
      agent: { id: '2', nombre: 'Agente 02', rol: 'AGENTE' },
      agents: [],
      login: vi.fn(),
      logout: vi.fn(),
      agentName: (id) => `Agente 0${id}`,
    };

    it('muestra las ponderaciones vigentes y quién y cuándo las creó y modificó', () => {
      render(
        <AuthContext.Provider value={auth}>
          <LeadForm initial={initial} submitLabel="Guardar" onSubmit={vi.fn()} weights={weights} />
        </AuthContext.Provider>,
      );

      const panel = screen.getByRole('region', { name: 'Ponderaciones vigentes' });
      expect(panel.textContent).toContain('Cliente nuevo: 40 %');
      expect(panel.textContent).toContain('Antigüedad: 10 %');
      expect(panel.textContent).toContain('Versión 7');
      expect(panel.textContent).toContain('creada por Agente 01');
      expect(panel.textContent).toContain('última modificación por Agente 02');
    });
  });
});
