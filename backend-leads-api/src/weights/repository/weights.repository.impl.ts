import { Injectable } from '@nestjs/common';
import { WeightsRepository } from './weights.repository.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Weights } from '../domain/weights.js';
import { WeightsMapper } from '../mapper/weights.mapper.js';
import { lockWeightsExclusive } from '../../database/weights-lock.js';

@Injectable()
export class WeightsRepositoryImpl implements WeightsRepository {

  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<Weights | null> {
    const weights = await this.prisma.pesos.findFirst({
      where: { activo: true },
    });
    if (!weights) return null;
    return WeightsMapper.EntityToDomain(weights);
  }

  async findByVersion(version: number): Promise<Weights | null> {
    const weights = await this.prisma.pesos.findUnique({
      where: { version },
    });
    if (!weights) return null;
    return WeightsMapper.EntityToDomain(weights);
  }

  async save(weights: Weights): Promise<Weights> {
    return this.prisma.$transaction(async (tx) => {
      await lockWeightsExclusive(tx);

      // La versión que deja de estar activa queda marcada como modificada por quien la sustituye
      await tx.pesos.updateMany({
        where: { activo: true },
        data: { activo: false, modificadoPorId: weights.creadoPorId },
      });

      const record = await tx.pesos.create({
        data: WeightsMapper.DomainToEntity(weights),
      });

      // Misma fórmula que calculateScore (enteros y una única división)
      await tx.$executeRaw`
        INSERT INTO "Puntuacion" (lead_id, version, puntuacion)
        SELECT
          l.id,
          w.version,
          (
            l.cliente_nuevo * w.cliente_nuevo +
            l.interes_comercial * w.interes_comercial +
            l.origen * w.origen +
            l.antiguedad * w.antiguedad
          )::float8 / 100
        FROM "Lead" l
        CROSS JOIN "Pesos" w
        WHERE w.version = ${record.version}
      `;

      return WeightsMapper.EntityToDomain(record);
    });
  }
}
