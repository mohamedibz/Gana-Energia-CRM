import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { calculateScore } from './../src/leads/domain/score.js';
import { Lead } from './../src/leads/domain/lead.js';
import { LeadStatus } from './../src/leads/domain/lead.status.js';
import { Weights } from './../src/weights/domain/weights.js';

// Requiere la base de datos levantada y con los datos de ejemplo (npm run seed).
// Los agentes 1 (ADMIN), 2 y 3 vienen del seed, con estas credenciales de demo.
const ADMIN = '1';
const AGENT_A = '2';
const AGENT_B = '3';

const CREDENTIALS: Record<string, { telefono: string; password: string }> = {
  [ADMIN]: { telefono: '600000001', password: 'Admin-2026' },
  [AGENT_A]: { telefono: '600000002', password: 'Agente2-2026' },
  [AGENT_B]: { telefono: '600000003', password: 'Agente3-2026' },
};

const newLead = (overrides = {}) => ({
  nombre: 'Lead de prueba',
  telefono: '600111222',
  clienteNuevo: 100,
  interesComercial: 50,
  origen: 20,
  antiguedad: 0,
  ...overrides,
});

describe('Leads API (e2e)', () => {
  let app: INestApplication;
  let originalWeights: Record<string, number>;
  const tokens: Record<string, string> = {};

  // Hace la petición como el agente indicado (con su token) o sin autenticar
  const api = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, agent?: string) => {
    const req = request(app.getHttpServer())[method](url);
    return agent ? req.set('Authorization', `Bearer ${tokens[agent]}`) : req;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    for (const [agent, credentials] of Object.entries(CREDENTIALS)) {
      const { body } = await request(app.getHttpServer()).post('/auth/login').send(credentials).expect(200);
      tokens[agent] = body.token;
    }

    const { body } = await api('get', '/weights', ADMIN);
    originalWeights = {
      clienteNuevo: body.clienteNuevo,
      interesComercial: body.interesComercial,
      origen: body.origen,
      antiguedad: body.antiguedad,
    };
  });

  afterAll(async () => {
    await api('put', '/weights', ADMIN).send(originalWeights);
    await app.close();
  });

  describe('autenticación', () => {
    it('el login devuelve token y agente, sin datos sensibles', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send(CREDENTIALS[ADMIN])
        .expect(200);

      expect(body.agente).toEqual({ id: '1', nombre: 'Agente 01', rol: 'ADMIN' });
      expect(typeof body.token).toBe('string');
      expect(JSON.stringify(body)).not.toMatch(/password|hash|600000001/i);
    });

    it('rechaza una contraseña incorrecta y un teléfono desconocido con el mismo mensaje', async () => {
      const wrongPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefono: '600000001', password: 'mala' })
        .expect(401);
      const unknownPhone = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefono: '600999999', password: 'mala' })
        .expect(401);

      expect(wrongPassword.body.message).toBe(unknownPhone.body.message);
    });

    it('valida el cuerpo del login', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ telefono: 'abc' }).expect(400);
      expect(res.body.error).toBe('VALIDATION');
    });

    it('exige token en las rutas protegidas', async () => {
      for (const url of ['/leads', '/weights', '/agents', '/auth/me']) {
        const res = await api('get', url).expect(401);
        expect(res.body.error).toBe('UNAUTHORIZED');
      }
    });

    it('rechaza tokens inválidos y la antigua cabecera X-Agent-Id', async () => {
      await request(app.getHttpServer()).get('/leads').set('Authorization', 'Bearer inventado').expect(401);
      await request(app.getHttpServer()).get('/leads').set('Authorization', `Bearer ${tokens[ADMIN]}x`).expect(401);
      await request(app.getHttpServer()).get('/leads').set('X-Agent-Id', '1').expect(401);
    });

    it('/auth/me y /agents devuelven datos públicos del agente', async () => {
      const me = await api('get', '/auth/me', AGENT_A).expect(200);
      expect(me.body).toEqual({ id: '2', nombre: 'Agente 02', rol: 'AGENTE' });

      const agents = await api('get', '/agents', AGENT_A).expect(200);
      expect(agents.body).toHaveLength(3);
      expect(JSON.stringify(agents.body)).not.toMatch(/password|hash|60000000/i);
    });
  });
  it('calcula la puntuación en el servidor y rechaza una puntuación enviada por el cliente', async () => {
    const created = await api('post', '/leads', AGENT_A).send(newLead()).expect(201);
    const expected = calculateScore(
      new Lead(1n, 'x', '600111222', LeadStatus.NUEVO, null, 100, 50, 20, 0),
      new Weights(null, originalWeights.clienteNuevo, originalWeights.interesComercial, originalWeights.origen, originalWeights.antiguedad),
    );
    expect(created.body.puntuacion).toBe(expected);

    const res = await api('post', '/leads', AGENT_A).send(newLead({ puntuacion: 100 })).expect(400);
    expect(res.body.error).toBe('VALIDATION');
  });

  it('dos agentes que se asignan el mismo lead a la vez: solo uno lo consigue', async () => {
    const { body: lead } = await api('post', '/leads', AGENT_A).send(newLead()).expect(201);

    const responses = await Promise.all([
      api('post', `/leads/${lead.id}/assign`, AGENT_A),
      api('post', `/leads/${lead.id}/assign`, AGENT_B),
      api('post', `/leads/${lead.id}/assign`, ADMIN),
    ]);

    const statuses = responses.map((res) => res.status).sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409, 409]);

    const winner = responses.find((res) => res.status === 200)!.body.agenteId;
    const { body: saved } = await api('get', `/leads/${lead.id}`, AGENT_A);
    expect(saved.agenteId).toBe(winner);
  });

  it('dos ediciones con la misma versión: la segunda recibe 409', async () => {
    const { body: lead } = await api('post', '/leads', AGENT_A).send(newLead({ asignarme: true })).expect(201);

    const responses = await Promise.all([
      api('put', `/leads/${lead.id}`, AGENT_A).send(newLead({ nombre: 'Edición A', version: lead.version })),
      api('put', `/leads/${lead.id}`, AGENT_A).send(newLead({ nombre: 'Edición B', version: lead.version })),
    ]);

    expect(responses.map((res) => res.status).sort((a, b) => a - b)).toEqual([200, 409]);
  });

  it('al crear un lead el agente decide si se lo asigna o queda libre', async () => {
    const free = await api('post', '/leads', AGENT_A).send(newLead()).expect(201);
    expect(free.body.agenteId).toBeNull();

    const own = await api('post', '/leads', AGENT_A).send(newLead({ asignarme: true })).expect(201);
    expect(own.body.agenteId).toBe(AGENT_A);

    const res = await api('post', '/leads', AGENT_A).send(newLead({ asignarme: 'si' })).expect(400);
    expect(res.body.error).toBe('VALIDATION');
  });

  it('solo el agente asignado puede modificar el lead (datos y estado)', async () => {
    const { body: lead } = await api('post', '/leads', AGENT_A).send(newLead()).expect(201);
    const edit = (agent: string, version: number) =>
      api('put', `/leads/${lead.id}`, agent).send(newLead({ nombre: 'Editado', version }));

    // Sin asignar: nadie puede editarlo ni cambiar su estado
    expect((await edit(AGENT_A, lead.version).expect(403)).body.error).toBe('FORBIDDEN');
    await api('patch', `/leads/${lead.id}/status`, AGENT_A).send({ estado: 'CONTACTADO' }).expect(403);

    // Una vez asignado a A, ni B ni el administrador pueden
    await api('post', `/leads/${lead.id}/assign`, AGENT_A).expect(200);
    await edit(AGENT_B, lead.version).expect(403);
    await edit(ADMIN, lead.version).expect(403);
    await api('patch', `/leads/${lead.id}/status`, AGENT_B).send({ estado: 'CONTACTADO' }).expect(403);

    // El agente asignado sí puede
    const edited = await edit(AGENT_A, lead.version).expect(200);
    expect(edited.body.nombre).toBe('Editado');
    const status = await api('patch', `/leads/${lead.id}/status`, AGENT_A).send({ estado: 'CONTACTADO' }).expect(200);
    expect(status.body.estado).toBe('CONTACTADO');
  });

  it('limita el tamaño de página al máximo configurado', async () => {
    const max = Number(process.env.PAGINATION_MAX_LIMIT ?? 100);
    await api('get', `/leads?limit=${max}`, AGENT_A).expect(200);
    const res = await api('get', `/leads?limit=${max + 1}`, AGENT_A).expect(400);
    expect(res.body.error).toBe('VALIDATION');
  });

  it('los pesos guardan cuándo y qué agente los creó y modificó', async () => {
    const saved = await api('put', '/weights', ADMIN).send(originalWeights).expect(200);
    expect(saved.body.creadoPorId).toBe(ADMIN);
    expect(saved.body.modificadoPorId).toBe(ADMIN);
    expect(new Date(saved.body.createdAt).getTime()).not.toBeNaN();
    expect(new Date(saved.body.updatedAt).getTime()).not.toBeNaN();

    const active = await api('get', '/weights', AGENT_A).expect(200);
    expect(active.body).toMatchObject({ version: saved.body.version, creadoPorId: ADMIN });
  });

  it('un cambio de pesos recalcula las puntuaciones y el listado queda ordenado de forma coherente', async () => {
    const { body: lead } = await api('post', '/leads', AGENT_A)
      .send(newLead({ clienteNuevo: 80, interesComercial: 10, origen: 60, antiguedad: 30 }))
      .expect(201);

    const newWeights = { clienteNuevo: 10, interesComercial: 20, origen: 30, antiguedad: 40 };
    await api('put', '/weights', ADMIN).send(newWeights).expect(200);

    // El recálculo en SQL coincide con la fórmula del dominio
    const { body: detail } = await api('get', `/leads/${lead.id}`, AGENT_A).expect(200);
    const expected = calculateScore(
      new Lead(1n, 'x', '600111222', LeadStatus.NUEVO, null, 80, 10, 60, 30),
      new Weights(null, 10, 20, 30, 40),
    );
    expect(detail.puntuacion).toBe(expected);
    expect(detail.desglose.map((item: { peso: number }) => item.peso)).toEqual([10, 20, 30, 40]);

    // Orden descendente por puntuación y, en empates, por id ascendente
    const { body: list } = await api('get', '/leads?limit=100', AGENT_A).expect(200);
    const items = list.items as { id: string; puntuacion: number; pesosVersion: number }[];
    expect(new Set(items.map((item) => item.pesosVersion)).size).toBe(1);
    for (let i = 1; i < items.length; i++) {
      const [prev, curr] = [items[i - 1], items[i]];
      const ordered =
        prev.puntuacion > curr.puntuacion ||
        (prev.puntuacion === curr.puntuacion && BigInt(prev.id) < BigInt(curr.id));
      expect(ordered).toBe(true);
    }
  });

  it('rechaza pesos inválidos y a quien no es administrador', async () => {
    const badSum = await api('put', '/weights', ADMIN)
      .send({ clienteNuevo: 50, interesComercial: 30, origen: 20, antiguedad: 10 })
      .expect(400);
    expect(badSum.body.error).toBe('VALIDATION');

    await api('put', '/weights', ADMIN)
      .send({ clienteNuevo: -10, interesComercial: 60, origen: 30, antiguedad: 20 })
      .expect(400);

    const forbidden = await api('put', '/weights', AGENT_A).send(originalWeights).expect(403);
    expect(forbidden.body.error).toBe('FORBIDDEN');
  });
});
