import { Lead } from "../domain/lead.js";
import { LeadStatus } from "../domain/lead.status.js";
import { LeadPage, LeadQueryParams } from "./lead.query-params.js";

// Token para inyectar la interfaz (las interfaces no existen en tiempo de ejecución)
export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');

export interface LeadRepository {

  save(lead: Lead): Promise<Lead>;

  findById(id: bigint): Promise<Lead | null>;

  // null si el lead no existe, su versión está desactualizada o cambió de agente
  update(lead: Lead): Promise<Lead | null>;

  findAll(params: LeadQueryParams): Promise<LeadPage>;

  assignAgent(leadId: bigint, agentId: bigint): Promise<boolean>;

  unassignAgent(leadId: bigint, agentId?: bigint): Promise<boolean>;

  updateStatus(id: bigint, status: LeadStatus, agentId: bigint): Promise<boolean>;

}
