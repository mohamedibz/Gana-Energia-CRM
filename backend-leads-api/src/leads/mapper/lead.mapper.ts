import { Lead } from "../domain/lead.js";
import { getPriority } from "../domain/score.js";
import { LeadStatus } from "../domain/lead.status.js";
import { Lead as PrismaLead, Puntuacion, Prisma } from '../../database/generated/prisma/client.js';


export class LeadMapper {

  // Dominio → Persistencia (Prisma)
  static DomainToEntity(lead: Lead): Prisma.LeadUncheckedCreateInput {
    return {
      nombre: lead.nombre,
      telefono: lead.telefono,
      estado: lead.estado,
      agenteId: lead.agenteId,
      clienteNuevo: lead.clienteNuevo,
      interesComercial: lead.interesComercial,
      origen: lead.origen,
      antiguedad: lead.antiguedad,
    };
  }

  // Dominio → Persistencia (actualización). El estado y el agente tienen sus propias operaciones.
  static DomainToEntityUpdate(lead: Lead): Prisma.LeadUncheckedUpdateManyInput {
    return {
      nombre: lead.nombre,
      telefono: lead.telefono,
      clienteNuevo: lead.clienteNuevo,
      interesComercial: lead.interesComercial,
      origen: lead.origen,
      antiguedad: lead.antiguedad,
      version: { increment: 1 },
    };
  }

  // Persistencia (Prisma) → Dominio
  static EntityToDomain(record: PrismaLead, score: Puntuacion | null): Lead {
    return new Lead(
      record.id,
      record.nombre,
      record.telefono,
      record.estado as LeadStatus,
      record.agenteId,
      record.clienteNuevo,
      record.interesComercial,
      record.origen,
      record.antiguedad,
      record.version,
      record.updatedAt,
      score?.puntuacion,
      score?.version
    );
  }

  // Dominio → DTO (los BigInt se envían como texto porque JSON no los admite)
  static DomainToDto(lead: Lead) {
    return {
      id: lead.id!.toString(),
      nombre: lead.nombre,
      telefono: lead.telefono,
      estado: lead.estado,
      agenteId: lead.agenteId?.toString() ?? null,
      clienteNuevo: lead.clienteNuevo,
      interesComercial: lead.interesComercial,
      origen: lead.origen,
      antiguedad: lead.antiguedad,
      version: lead.version,
      updatedAt: lead.updatedAt,
      puntuacion: lead.puntuacion ?? null,
      prioridad: lead.puntuacion === undefined ? null : getPriority(lead.puntuacion),
      pesosVersion: lead.pesosVersion ?? null,
    };
  }
}