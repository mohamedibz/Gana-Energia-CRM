import { ArgumentsHost, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { AppError } from './app.error.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { Prisma } from '../database/generated/prisma/client.js';

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/leads/1' }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  new HttpExceptionFilter().catch(exception, host);

  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] };
}

describe('HttpExceptionFilter', () => {
  it.each([
    ['VALIDATION', 400],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
    ['WEIGHTS_NOT_CONFIGURED', 503],
  ] as const)('traduce AppError %s al estado %i con su mensaje', (code, expectedStatus) => {
    const { status, body } = run(new AppError(code, 'Mensaje propio', [{ campo: 'nombre' }]));

    expect(status).toBe(expectedStatus);
    expect(body).toMatchObject({
      statusCode: expectedStatus,
      error: code,
      message: 'Mensaje propio',
      details: [{ campo: 'nombre' }],
      path: '/leads/1',
    });
    expect(body.timestamp).toBeDefined();
  });

  it('traduce las HttpException de Nest con mensaje en español', () => {
    const { status, body } = run(new NotFoundException());

    expect(status).toBe(404);
    expect(body).toMatchObject({ error: 'NOT_FOUND', message: 'Ruta no encontrada' });
  });

  it('traduce los errores conocidos de Prisma', () => {
    const notFound = new Prisma.PrismaClientKnownRequestError('x', { code: 'P2025', clientVersion: '7' });
    const duplicate = new Prisma.PrismaClientKnownRequestError('x', { code: 'P2002', clientVersion: '7' });

    expect(run(notFound).status).toBe(404);
    expect(run(duplicate).status).toBe(409);
  });

  it('no filtra el detalle de errores inesperados', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { status, body } = run(new Error('password=secreto en la consulta SQL'));

    expect(status).toBe(500);
    expect(body.message).toBe('Error interno del servidor');
    expect(JSON.stringify(body)).not.toContain('secreto');
  });

  it('mantiene el estado de otras HttpException', () => {
    expect(run(new HttpException('x', 429)).status).toBe(429);
  });
});
