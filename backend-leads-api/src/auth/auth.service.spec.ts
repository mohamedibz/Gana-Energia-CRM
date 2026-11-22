import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { hashPassword, verifyPassword } from './password.js';
import type { PrismaService } from '../database/prisma.service.js';

describe('password', () => {
  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const stored = await hashPassword('Admin-2026');

    expect(await verifyPassword('Admin-2026', stored)).toBe(true);
    expect(await verifyPassword('otra-cosa', stored)).toBe(false);
  });

  it('no guarda la contraseña en claro y usa una sal distinta cada vez', async () => {
    const [first, second] = [await hashPassword('Admin-2026'), await hashPassword('Admin-2026')];

    expect(first).not.toContain('Admin-2026');
    expect(first).not.toBe(second);
  });

  it.each(['', 'sin-formato', ':', 'zz:zz'])('rechaza el hash guardado inválido "%s"', async (stored) => {
    expect(await verifyPassword('Admin-2026', stored)).toBe(false);
  });
});

describe('AuthService', () => {
  const jwt = new JwtService({ secret: 'secreto-de-prueba-123456', signOptions: { expiresIn: '8h' } });
  const findUnique = vi.fn();
  const service = new AuthService({ agente: { findUnique } } as unknown as PrismaService, jwt);

  beforeEach(() => findUnique.mockReset());

  it('devuelve un token y el agente con credenciales correctas', async () => {
    findUnique.mockResolvedValue({
      id: 2n,
      nombre: 'Agente 02',
      rol: 'AGENTE',
      telefono: '600000002',
      passwordHash: await hashPassword('Agente2-2026'),
    });

    const { token, agente } = await service.login('600000002', 'Agente2-2026');

    expect(agente).toEqual({ id: 2n, nombre: 'Agente 02', rol: 'AGENTE' });
    expect(await service.verifyToken(token)).toBe(2n);
  });

  it('responde igual si el teléfono no existe o la contraseña es incorrecta', async () => {
    findUnique.mockResolvedValueOnce(null);
    const unknownPhone = await service.login('600999999', 'x').catch((e: unknown) => e);

    findUnique.mockResolvedValueOnce({ id: 2n, nombre: 'A', rol: 'AGENTE', passwordHash: await hashPassword('buena') });
    const wrongPassword = await service.login('600000002', 'mala').catch((e: unknown) => e);

    expect(unknownPhone).toMatchObject({ code: 'UNAUTHORIZED', message: 'Teléfono o contraseña incorrectos' });
    expect(wrongPassword).toMatchObject({ code: 'UNAUTHORIZED', message: 'Teléfono o contraseña incorrectos' });
  });

  it('rechaza tokens manipulados, de otro secreto o caducados', async () => {
    const valid = await jwt.signAsync({ sub: '1' });
    const foreign = await new JwtService({ secret: 'otro-secreto-distinto-123' }).signAsync({ sub: '1' });
    const expired = await jwt.signAsync({ sub: '1' }, { expiresIn: '-1s' });

    expect(await service.verifyToken(valid)).toBe(1n);
    expect(await service.verifyToken(`${valid}x`)).toBeNull();
    expect(await service.verifyToken(foreign)).toBeNull();
    expect(await service.verifyToken(expired)).toBeNull();
    expect(await service.verifyToken('no-es-un-token')).toBeNull();
  });
});
