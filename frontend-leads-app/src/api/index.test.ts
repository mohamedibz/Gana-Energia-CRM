import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, session } from './index';

const fetchMock = vi.fn();

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
};

describe('cliente de la API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    sessionStorage.clear();
    session.onUnauthorized(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('envía el token en la cabecera Authorization cuando hay sesión', async () => {
    session.setToken('abc123');
    respond(200, []);

    await api.agents();

    expect(lastCall().headers.Authorization).toBe('Bearer abc123');
  });

  it('no envía Authorization si no hay sesión', async () => {
    respond(200, { token: 't', agente: {} });

    await api.login('600000001', 'x');

    expect(lastCall().headers.Authorization).toBeUndefined();
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ telefono: '600000001', password: 'x' });
  });

  it('convierte el error del servidor en un ApiError con código, mensaje y detalle', async () => {
    respond(400, {
      error: 'VALIDATION',
      message: 'Los datos enviados no son válidos',
      details: [{ campo: 'origen', mensaje: 'Demasiado grande' }],
    });

    const error = await api.getLead('1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION',
      message: 'Los datos enviados no son válidos',
      details: [{ campo: 'origen', mensaje: 'Demasiado grande' }],
    });
  });

  it('muestra un mensaje claro si no hay conexión con el servidor', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(api.agents()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('avisa de una sesión caducada (401), pero no en un login fallido', async () => {
    const onUnauthorized = vi.fn();
    session.onUnauthorized(onUnauthorized);

    respond(401, { error: 'UNAUTHORIZED', message: 'Teléfono o contraseña incorrectos' });
    await api.login('600000001', 'mala').catch(() => {});
    expect(onUnauthorized).not.toHaveBeenCalled();

    respond(401, { error: 'UNAUTHORIZED', message: 'El token ha caducado' });
    await api.getLead('1').catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('construye la consulta del listado y omite los filtros vacíos', async () => {
    respond(200, { items: [], total: 0, page: 2, limit: 20 });

    await api.listLeads({ search: 'ana', status: 'NUEVO', agentId: '', sort: 'asc', page: 2 });

    const params = new URL(lastCall().url).searchParams;
    expect(Object.fromEntries(params)).toEqual({ search: 'ana', status: 'NUEVO', sort: 'asc', page: '2', limit: '20' });
  });

  it('al modificar un lead envía la versión que se leyó y nunca una puntuación', async () => {
    respond(200, {});

    await api.updateLead(
      '7',
      { nombre: 'Ana', telefono: '600111222', clienteNuevo: 1, interesComercial: 2, origen: 3, antiguedad: 4 },
      5,
    );

    const body = JSON.parse(lastCall().init.body as string);
    expect(body.version).toBe(5);
    expect(body).not.toHaveProperty('puntuacion');
    expect(lastCall().init.method).toBe('PUT');
  });
});
