import { Injectable } from '@nestjs/common';
import { Lead } from '../domain/lead.js';
import { LeadRepository } from './lead.repository.js';
import { PrismaService } from '../../database/prisma.service.js';
import { LeadMapper } from '../mapper/lead.mapper.js';
import { LeadStatus } from '../domain/lead.status.js';
import { LeadPage, LeadQueryParams } from './lead.query-params.js';
import { Prisma } from '../../database/generated/prisma/client.js';
import { ScoreMapper } from '../mapper/score.mapper.js';
import { calculateScore, Score } from '../domain/score.js';
import { Weights } from '../../weights/domain/weights.js';
import { WeightsMapper } from '../../weights/mapper/weights.mapper.js';
import { lockWeightsShared } from '../../database/weights-lock.js';
import { AppError } from '../../common/app.error.js';


@Injectable()
export class LeadRepositoryImpl implements LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(lead: Lead): Promise<Lead> {
    return this.prisma.$transaction(async (tx) => {
      await lockWeightsShared(tx);
      const weights = await this.findActiveWeights(tx);

      const record = await tx.lead.create({
        data: LeadMapper.DomainToEntity(lead),
      });

      const score = new Score(record.id, weights.version!, calculateScore(lead, weights));
      const scoreSaved = await tx.puntuacion.create({
        data: ScoreMapper.DomainToEntity(score),
      });

      return LeadMapper.EntityToDomain(record, scoreSaved);
    });
  }

  async findById(id: bigint): Promise<Lead | null> {
    const record = await this.prisma.lead.findUnique({
      where: { id },
      include: { puntuaciones: { where: { pesos: { activo: true } } } },
    });
    return record ? LeadMapper.EntityToDomain(record, record.puntuaciones[0] ?? null) : null;
  }

  async findAll(params: LeadQueryParams): Promise<LeadPage> {
    const search = params.search;

    // Se parte de la puntuación de los pesos activos para poder ordenar y paginar en la base de datos
    const where: Prisma.PuntuacionWhereInput = {
      pesos: { activo: true },
      lead: {
        estado: params.status,
        agenteId: params.agentId,
        OR: search
          ? [
              { nombre: { contains: search, mode: 'insensitive' } },
              { telefono: { contains: search } },
            ]
          : undefined,
      },
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.puntuacion.count({ where }),
      this.prisma.puntuacion.findMany({
        where,
        include: { lead: true },
        // El id desempata para que el orden sea siempre estable
        orderBy: [{ puntuacion: params.sortByScore ?? 'desc' }, { leadId: 'asc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);

    return {
      items: rows.map(({ lead, ...score }) => LeadMapper.EntityToDomain(lead, score)),
      total,
    };
  }

  // Devuelve null si el lead no existe, si su versión ya no es la que se intenta modificar
  // o si ya no está asignado al mismo agente
  async update(lead: Lead): Promise<Lead | null> {
    return this.prisma.$transaction(async (tx) => {
      await lockWeightsShared(tx);
      const weights = await this.findActiveWeights(tx);

      const result = await tx.lead.updateMany({
        where: { id: lead.id!, version: lead.version, agenteId: lead.agenteId },
        data: LeadMapper.DomainToEntityUpdate(lead),
      });
      if (result.count === 0) return null;

      const data = ScoreMapper.DomainToEntity(
        new Score(lead.id!, weights.version!, calculateScore(lead, weights)),
      );
      const score = await tx.puntuacion.upsert({
        where: { leadId_version: { leadId: data.leadId, version: data.version } },
        create: data,
        update: { puntuacion: data.puntuacion },
      });
      const record = await tx.lead.findUniqueOrThrow({ where: { id: lead.id! } });

      return LeadMapper.EntityToDomain(record, score);
    });
  }

  // Solo asigna si el lead sigue libre: si dos agentes lo intentan a la vez, solo uno lo consigue
  async assignAgent(leadId: bigint, agentId: bigint): Promise<boolean> {
    const result = await this.prisma.lead.updateMany({
      where: {
        id: leadId,
        agenteId: null,
      },
      data: {
        agenteId: agentId,
      },
    });
    return result.count === 1;
  }

  // Si se indica agentId, solo desasigna cuando el lead está asignado a ese agente
  async unassignAgent(leadId: bigint, agentId?: bigint): Promise<boolean> {
    const result = await this.prisma.lead.updateMany({
      where: {
        id: leadId,
        agenteId: agentId ?? { not: null },
      },
      data: {
        agenteId: null,
      },
    });
    return result.count === 1;
  }

  // Solo cambia el estado si el lead sigue asignado al agente indicado
  async updateStatus(id: bigint, status: LeadStatus, agentId: bigint): Promise<boolean> {
    const result = await this.prisma.lead.updateMany({
      where: { id, agenteId: agentId },
      data: { estado: status },
    });
    return result.count === 1;
  }

  private async findActiveWeights(tx: Prisma.TransactionClient): Promise<Weights> {
    const record = await tx.pesos.findFirst({ where: { activo: true } });
    if (!record) {
      throw new AppError('WEIGHTS_NOT_CONFIGURED', 'No hay una configuración de pesos activa');
    }
    return WeightsMapper.EntityToDomain(record);
  }
}
