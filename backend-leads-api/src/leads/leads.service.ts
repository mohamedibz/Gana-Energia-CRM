import { Inject, Injectable } from '@nestjs/common';
import { Agent } from '../auth/auth.service.js';
import { AppError } from '../common/app.error.js';
import { WeightsService } from '../weights/weights.service.js';
import { Lead } from './domain/lead.js';
import { LeadStatus } from './domain/lead.status.js';
import { scoreBreakdown, ScoreBreakdownItem } from './domain/score.js';
import type { LeadRepository } from './repository/lead.repository.js';
import { LEAD_REPOSITORY } from './repository/lead.repository.js';
import { LeadPage, LeadQueryParams } from './repository/lead.query-params.js';
import { CreateLeadInput, UpdateLeadInput } from './leads.schemas.js';

export interface LeadDetail {
  lead: Lead;
  desglose: ScoreBreakdownItem[];
}

@Injectable()
export class LeadsService {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    private readonly weights: WeightsService,
  ) {}

  create(agent: Agent, input: CreateLeadInput): Promise<Lead> {
    const lead = new Lead(
      null,
      input.nombre,
      input.telefono,
      LeadStatus.NUEVO,
      input.asignarme ? agent.id : null,
      input.clienteNuevo,
      input.interesComercial,
      input.origen,
      input.antiguedad,
    );
    return this.leads.save(lead);
  }

  async list(params: LeadQueryParams): Promise<LeadPage> {
    // Sin pesos activos no hay puntuaciones: se responde con un error claro en vez de una lista vacía
    await this.weights.getActive();
    return this.leads.findAll(params);
  }

  async get(id: bigint): Promise<LeadDetail> {
    const lead = await this.getLead(id);
    if (lead.pesosVersion === undefined) {
      throw new AppError('WEIGHTS_NOT_CONFIGURED', 'No hay una configuración de pesos activa');
    }

    // El desglose usa los pesos con los que se calculó la puntuación guardada, así siempre suman lo mismo
    const weights = await this.weights.getByVersion(lead.pesosVersion);
    return { lead, desglose: scoreBreakdown(lead, weights) };
  }

  async update(agent: Agent, id: bigint, input: UpdateLeadInput): Promise<Lead> {
    const current = await this.getLead(id);
    this.assertAssignedTo(agent, current);

    const lead = new Lead(
      id,
      input.nombre,
      input.telefono,
      current.estado,
      current.agenteId,
      input.clienteNuevo,
      input.interesComercial,
      input.origen,
      input.antiguedad,
      input.version,
    );

    const updated = await this.leads.update(lead);
    if (!updated) {
      throw new AppError(
        'CONFLICT',
        'El lead fue modificado por otro usuario. Recarga los datos y vuelve a intentarlo',
      );
    }
    return updated;
  }

  async changeStatus(agent: Agent, id: bigint, status: LeadStatus): Promise<Lead> {
    this.assertAssignedTo(agent, await this.getLead(id));

    if (!(await this.leads.updateStatus(id, status, agent.id))) {
      // Entre la comprobación y la escritura el lead cambió de agente
      throw new AppError('CONFLICT', 'El lead ha sido reasignado. Recarga los datos y vuelve a intentarlo');
    }
    return this.getLead(id);
  }

  async assign(agent: Agent, id: bigint): Promise<Lead> {
    if (!(await this.leads.assignAgent(id, agent.id))) {
      // No se pudo asignar: o no existe o ya lo tiene otro agente
      await this.getLead(id);
      throw new AppError('CONFLICT', 'El lead ya está asignado a un agente');
    }
    return this.getLead(id);
  }

  async unassign(agent: Agent, id: bigint): Promise<Lead> {
    const isAdmin = agent.rol === 'ADMIN';

    if (!(await this.leads.unassignAgent(id, isAdmin ? undefined : agent.id))) {
      const lead = await this.getLead(id);
      if (lead.agenteId === null) {
        throw new AppError('CONFLICT', 'El lead no tiene ningún agente asignado');
      }
      throw new AppError('FORBIDDEN', 'Solo el agente asignado o un administrador puede desasignar el lead');
    }
    return this.getLead(id);
  }

  // Un lead solo lo modifica su agente asignado: si está libre, primero hay que asignárselo
  private assertAssignedTo(agent: Agent, lead: Lead): void {
    if (lead.agenteId === null) {
      throw new AppError('FORBIDDEN', 'El lead no tiene agente asignado. Asígnatelo antes de modificarlo');
    }
    if (lead.agenteId !== agent.id) {
      throw new AppError('FORBIDDEN', 'Solo el agente asignado puede modificar este lead');
    }
  }

  private async getLead(id: bigint): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) {
      throw new AppError('NOT_FOUND', 'El lead no existe');
    }
    return lead;
  }
}
