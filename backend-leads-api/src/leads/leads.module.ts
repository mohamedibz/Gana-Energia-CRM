import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WeightsModule } from '../weights/weights.module.js';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';
import { LEAD_REPOSITORY } from './repository/lead.repository.js';
import { LeadRepositoryImpl } from './repository/lead.repository.impl.js';

@Module({
  imports: [AuthModule, WeightsModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    { provide: LEAD_REPOSITORY, useClass: LeadRepositoryImpl },
  ],
})
export class LeadsModule {}
