import { Weights } from "../domain/weights.js";

export const WEIGHTS_REPOSITORY = Symbol('WEIGHTS_REPOSITORY');

export interface WeightsRepository {

  findActive(): Promise<Weights | null>;

  findByVersion(version: number): Promise<Weights | null>;

  // Guarda los pesos como activos y recalcula la puntuación de todos los leads
  save(weights: Weights): Promise<Weights>;

}