import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import type { Agent } from '../auth/auth.service.js';
import { AuthGuard, CurrentAgent } from '../auth/auth.guard.js';
import { weightsSchema } from './weights.schemas.js';
import { WeightsMapper } from './mapper/weights.mapper.js';
import type { WeightsInput } from './weights.schemas.js';
import { WeightsService } from './weights.service.js';

@Controller('weights')
@UseGuards(AuthGuard)
export class WeightsController {
  constructor(private readonly weightsService: WeightsService) {}

  @Get()
  async getActive() {
    return WeightsMapper.DomainToDto(await this.weightsService.getActive());
  }

  @Put()
  async update(@CurrentAgent() agent: Agent, @Body({ schema: weightsSchema }) body: WeightsInput) {
    return WeightsMapper.DomainToDto(await this.weightsService.update(agent, body));
  }
}
