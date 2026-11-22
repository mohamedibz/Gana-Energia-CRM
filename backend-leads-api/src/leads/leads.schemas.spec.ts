import { listLeadsSchema } from './leads.schemas.js';

describe('listLeadsSchema (limit)', () => {
  const original = { max: process.env.PAGINATION_MAX_LIMIT, def: process.env.PAGINATION_DEFAULT_LIMIT };

  afterEach(() => {
    for (const [key, value] of [
      ['PAGINATION_MAX_LIMIT', original.max],
      ['PAGINATION_DEFAULT_LIMIT', original.def],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('usa 20 por defecto y 100 como máximo si no hay variables de entorno', () => {
    delete process.env.PAGINATION_MAX_LIMIT;
    delete process.env.PAGINATION_DEFAULT_LIMIT;

    expect(listLeadsSchema.parse({}).limit).toBe(20);
    expect(listLeadsSchema.parse({ limit: '100' }).limit).toBe(100);
    expect(listLeadsSchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('respeta el máximo y el valor por defecto configurados en el entorno', () => {
    process.env.PAGINATION_MAX_LIMIT = '50';
    process.env.PAGINATION_DEFAULT_LIMIT = '10';

    expect(listLeadsSchema.parse({}).limit).toBe(10);
    expect(listLeadsSchema.parse({ limit: '50' }).limit).toBe(50);

    const result = listLeadsSchema.safeParse({ limit: '51' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('50');
  });

  it('el valor por defecto nunca supera el máximo', () => {
    process.env.PAGINATION_MAX_LIMIT = '5';
    process.env.PAGINATION_DEFAULT_LIMIT = '20';

    expect(listLeadsSchema.parse({}).limit).toBe(5);
  });

  it('rechaza límites menores que 1', () => {
    expect(listLeadsSchema.safeParse({ limit: '0' }).success).toBe(false);
  });
});
