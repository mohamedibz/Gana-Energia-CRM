import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WEIGHTS_REPOSITORY } from './repository/weights.repository.js';
import { WeightsRepositoryImpl } from './repository/weights.repository.impl.js';
import { WeightsController } from './weights.controller.js';
import { WeightsService } from './weights.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WeightsController],
  providers: [
    WeightsService,
    { provide: WEIGHTS_REPOSITORY, useClass: WeightsRepositoryImpl },
  ],
  exports: [WeightsService],
})
export class WeightsModule {}
