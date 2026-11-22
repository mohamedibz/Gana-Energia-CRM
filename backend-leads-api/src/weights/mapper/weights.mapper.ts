import { Pesos, Prisma } from "../../database/generated/prisma/client.js";
import { Weights } from "../domain/weights.js";

export class WeightsMapper {

  // Dominio → Persistencia (Prisma)
  static DomainToEntity(weights: Weights): Prisma.PesosUncheckedCreateInput {
    return {
      activo: true,
      clienteNuevo: weights.clienteNuevo,
      interesComercial: weights.interesComercial,
      origen: weights.origen,
      antiguedad: weights.antiguedad,
      creadoPorId: weights.creadoPorId,
      modificadoPorId: weights.modificadoPorId,
    };
  }

  // Persistencia (Prisma) → Dominio
  static EntityToDomain(record: Pesos): Weights {
    return new Weights(
      record.version,
      record.clienteNuevo,
      record.interesComercial,
      record.origen,
      record.antiguedad,
      record.createdAt,
      record.updatedAt,
      record.creadoPorId,
      record.modificadoPorId,
    );
  }

  // Dominio → DTO (los BigInt se envían como texto porque JSON no los admite)
  static DomainToDto(weights: Weights) {
    return {
      version: weights.version,
      clienteNuevo: weights.clienteNuevo,
      interesComercial: weights.interesComercial,
      origen: weights.origen,
      antiguedad: weights.antiguedad,
      createdAt: weights.createdAt,
      updatedAt: weights.updatedAt,
      creadoPorId: weights.creadoPorId?.toString() ?? null,
      modificadoPorId: weights.modificadoPorId?.toString() ?? null,
    };
  }
}