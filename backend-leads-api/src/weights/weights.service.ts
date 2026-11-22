import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../common/app.error.js';
import { Agent } from '../auth/auth.service.js';
import { Weights } from './domain/weights.js';
import type { WeightsRepository } from './repository/weights.repository.js';
import { WEIGHTS_REPOSITORY } from './repository/weights.repository.js';
import { WeightsInput } from './weights.schemas.js';

@Injectable()
export class WeightsService {
  constructor(
    @Inject(WEIGHTS_REPOSITORY) private readonly weights: WeightsRepository,
  ) {}

  async getActive(): Promise<Weights> {
    const active = await this.weights.findActive();
    if (!active) {
      throw new AppError('WEIGHTS_NOT_CONFIGURED', 'No hay una configuración de pesos activa');
    }
    return active;
  }

  async getByVersion(version: number): Promise<Weights> {
    const weights = await this.weights.findByVersion(version);
    if (!weights) {
      throw new AppError('NOT_FOUND', 'La versión de pesos no existe');
    }
    return weights;
  }

  async update(agent: Agent, input: WeightsInput): Promise<Weights> {
    if (agent.rol !== 'ADMIN') {
      throw new AppError('FORBIDDEN', 'Solo un administrador puede modificar los pesos');
    }

    const weights = new Weights(
      null,
      input.clienteNuevo,
      input.interesComercial,
      input.origen,
      input.antiguedad,
      null,
      null,
      agent.id,
      agent.id,
    );
    return this.weights.save(weights);
  }
}
