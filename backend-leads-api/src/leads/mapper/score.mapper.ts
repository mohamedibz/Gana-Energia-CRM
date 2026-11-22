import { Prisma, Puntuacion as PrismaPuntuacion } from "../../database/generated/prisma/client.js";
import { Score } from "../domain/score.js";

export class ScoreMapper {

  // Dominio → Persistencia (creación)
  static DomainToEntity(score: Score): Prisma.PuntuacionUncheckedCreateInput {
    return {
      leadId: score.leadId,
      version: score.version,
      puntuacion: score.puntuacion,
    };
  }
}