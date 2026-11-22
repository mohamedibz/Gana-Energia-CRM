import { AppError } from '../common/app.error.js';
import { Lead } from './domain/lead.js';
import { LeadStatus } from './domain/lead.status.js';
import { Weights } from '../weights/domain/weights.js';
import { LeadsService } from './leads.service.js';
import type { LeadRepository } from './repository/lead.repository.js';
import type { WeightsService } from '../weights/weights.service.js';

const agent = { id: 2n, nombre: 'Agente 02', rol: 'AGENTE' };
const admin = { id: 1n, nombre: 'Agente 01', rol: 'ADMIN' };

const buildLead = (agenteId: bigint | null = null, version = 1) =>
  new Lead(1n, 'Ana Torres', '600111222', LeadStatus.NUEVO, agenteId, 50, 50, 50, 50, version, null, 50, 1);

const input = {
  nombre: 'Ana Torres',
  telefono: '600111222',
  clienteNuevo: 50,
  interesComercial: 50,
  origen: 50,
  antiguedad: 50,
  version: 1,
};

describe('LeadsService', () => {
  let leads: { [K in keyof LeadRepository]: ReturnType<typeof vi.fn> };
  let weights: { getActive: ReturnType<typeof vi.fn>; getByVersion: ReturnType<typeof vi.fn> };
  let service: LeadsService;

  beforeEach(() => {
    leads = {
      save: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
      assignAgent: vi.fn(),
      unassignAgent: vi.fn(),
      updateStatus: vi.fn(),
    };
    weights = {
      getActive: vi.fn().mockResolvedValue(new Weights(1, 40, 30, 20, 10)),
      getByVersion: vi.fn().mockResolvedValue(new Weights(1, 40, 30, 20, 10)),
    };
    service = new LeadsService(leads as unknown as LeadRepository, weights as unknown as WeightsService);
  });

  describe('assign', () => {
    it('asigna el lead si está libre', async () => {
      leads.assignAgent.mockResolvedValue(true);
      leads.findById.mockResolvedValue(buildLead(agent.id));

      const lead = await service.assign(agent, 1n);

      expect(leads.assignAgent).toHaveBeenCalledWith(1n, agent.id);
      expect(lead.agenteId).toBe(agent.id);
    });

    it('responde 409 si otro agente se lo asignó antes', async () => {
      leads.assignAgent.mockResolvedValue(false);
      leads.findById.mockResolvedValue(buildLead(3n));

      await expect(service.assign(agent, 1n)).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('responde 404 si el lead no existe', async () => {
      leads.assignAgent.mockResolvedValue(false);
      leads.findById.mockResolvedValue(null);

      await expect(service.assign(agent, 1n)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('unassign', () => {
    it('un agente solo puede desasignar sus propios leads', async () => {
      leads.unassignAgent.mockResolvedValue(false);
      leads.findById.mockResolvedValue(buildLead(3n));

      await expect(service.unassign(agent, 1n)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(leads.unassignAgent).toHaveBeenCalledWith(1n, agent.id);
    });

    it('un administrador puede desasignar cualquier lead', async () => {
      leads.unassignAgent.mockResolvedValue(true);
      leads.findById.mockResolvedValue(buildLead(null));

      await service.unassign(admin, 1n);

      expect(leads.unassignAgent).toHaveBeenCalledWith(1n, undefined);
    });
  });

  describe('create', () => {
    const newLead = { nombre: 'Ana', telefono: '600111222', clienteNuevo: 1, interesComercial: 1, origen: 1, antiguedad: 1 };

    it('lo deja libre si el agente no pide asignárselo', async () => {
      leads.save.mockImplementation((lead: Lead) => Promise.resolve(lead));

      const lead = await service.create(agent, { ...newLead, asignarme: false });

      expect(lead.agenteId).toBeNull();
    });

    it('se lo asigna al agente que lo crea si lo pide', async () => {
      leads.save.mockImplementation((lead: Lead) => Promise.resolve(lead));

      const lead = await service.create(agent, { ...newLead, asignarme: true });

      expect(lead.agenteId).toBe(agent.id);
    });
  });

  describe('update', () => {
    it('responde 409 si el lead fue modificado por otro usuario', async () => {
      leads.findById.mockResolvedValue(buildLead(agent.id, 2));
      leads.update.mockResolvedValue(null);

      const error = await service.update(agent, 1n, input).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ code: 'CONFLICT' });
    });

    it('conserva estado y agente y envía la versión que tenía el cliente', async () => {
      leads.findById.mockResolvedValue(buildLead(agent.id, 1));
      leads.update.mockImplementation((lead: Lead) => Promise.resolve(lead));

      await service.update(agent, 1n, input);

      const sent = leads.update.mock.calls[0][0] as Lead;
      expect(sent.agenteId).toBe(agent.id);
      expect(sent.version).toBe(1);
    });

    it('no deja modificar un lead asignado a otro agente, ni siquiera a un administrador', async () => {
      leads.findById.mockResolvedValue(buildLead(3n));

      await expect(service.update(agent, 1n, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(service.update(admin, 1n, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(leads.update).not.toHaveBeenCalled();
    });

    it('no deja modificar un lead sin asignar: primero hay que asignarlo', async () => {
      leads.findById.mockResolvedValue(buildLead(null));

      await expect(service.update(agent, 1n, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(leads.update).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('el agente asignado puede cambiar el estado', async () => {
      leads.findById.mockResolvedValue(buildLead(agent.id));
      leads.updateStatus.mockResolvedValue(true);

      await service.changeStatus(agent, 1n, LeadStatus.CONTACTADO);

      expect(leads.updateStatus).toHaveBeenCalledWith(1n, LeadStatus.CONTACTADO, agent.id);
    });

    it('otro agente o un lead libre responden 403', async () => {
      leads.findById.mockResolvedValue(buildLead(3n));
      await expect(service.changeStatus(agent, 1n, LeadStatus.CERRADO)).rejects.toMatchObject({ code: 'FORBIDDEN' });

      leads.findById.mockResolvedValue(buildLead(null));
      await expect(service.changeStatus(agent, 1n, LeadStatus.CERRADO)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(leads.updateStatus).not.toHaveBeenCalled();
    });

    it('responde 409 si el lead se reasignó entre la comprobación y la escritura', async () => {
      leads.findById.mockResolvedValue(buildLead(agent.id));
      leads.updateStatus.mockResolvedValue(false);

      await expect(service.changeStatus(agent, 1n, LeadStatus.CERRADO)).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('sin pesos activos', () => {
    it('el listado responde 503', async () => {
      weights.getActive.mockRejectedValue(new AppError('WEIGHTS_NOT_CONFIGURED', 'sin pesos'));

      await expect(service.list({ page: 1, limit: 20 })).rejects.toMatchObject({
        code: 'WEIGHTS_NOT_CONFIGURED',
      });
    });

    it('el detalle responde 503 si el lead no tiene puntuación', async () => {
      leads.findById.mockResolvedValue(new Lead(1n, 'Ana', '600111222', LeadStatus.NUEVO, null, 1, 1, 1, 1));

      await expect(service.get(1n)).rejects.toMatchObject({ code: 'WEIGHTS_NOT_CONFIGURED' });
    });
  });

  describe('get', () => {
    it('desglosa la puntuación con los pesos con los que se calculó', async () => {
      leads.findById.mockResolvedValue(buildLead());

      const { desglose } = await service.get(1n);

      expect(weights.getByVersion).toHaveBeenCalledWith(1);
      expect(desglose.map((item) => item.peso)).toEqual([40, 30, 20, 10]);
    });
  });
});
