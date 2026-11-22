import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { Agent } from '../auth/auth.service.js';
import { AuthGuard, CurrentAgent } from '../auth/auth.guard.js';
import { idSchema } from '../common/schemas.js';
import { LeadMapper } from './mapper/lead.mapper.js';
import {
  changeStatusSchema,
  createLeadSchema,
  listLeadsSchema,
  updateLeadSchema,
} from './leads.schemas.js';
import type {
  ChangeStatusInput,
  CreateLeadInput,
  ListLeadsInput,
  UpdateLeadInput,
} from './leads.schemas.js';
import { LeadsService } from './leads.service.js';

@Controller('leads')
@UseGuards(AuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  async create(@CurrentAgent() agent: Agent, @Body({ schema: createLeadSchema }) body: CreateLeadInput) {
    return LeadMapper.DomainToDto(await this.leadsService.create(agent, body));
  }

  @Get()
  async list(@Query({ schema: listLeadsSchema }) query: ListLeadsInput) {
    const { items, total } = await this.leadsService.list({
      status: query.status,
      agentId: query.agentId,
      search: query.search,
      sortByScore: query.sort,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((lead) => LeadMapper.DomainToDto(lead)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  @Get(':id')
  async findOne(@Param('id', { schema: idSchema }) id: bigint) {
    const { lead, desglose } = await this.leadsService.get(id);
    return { ...LeadMapper.DomainToDto(lead), desglose };
  }

  @Put(':id')
  async update(
    @CurrentAgent() agent: Agent,
    @Param('id', { schema: idSchema }) id: bigint,
    @Body({ schema: updateLeadSchema }) body: UpdateLeadInput,
  ) {
    return LeadMapper.DomainToDto(await this.leadsService.update(agent, id, body));
  }

  @Patch(':id/status')
  async changeStatus(
    @CurrentAgent() agent: Agent,
    @Param('id', { schema: idSchema }) id: bigint,
    @Body({ schema: changeStatusSchema }) body: ChangeStatusInput,
  ) {
    return LeadMapper.DomainToDto(await this.leadsService.changeStatus(agent, id, body.estado));
  }

  @Post(':id/assign')
  @HttpCode(200)
  async assign(@CurrentAgent() agent: Agent, @Param('id', { schema: idSchema }) id: bigint) {
    return LeadMapper.DomainToDto(await this.leadsService.assign(agent, id));
  }

  @Delete(':id/assign')
  async unassign(@CurrentAgent() agent: Agent, @Param('id', { schema: idSchema }) id: bigint) {
    return LeadMapper.DomainToDto(await this.leadsService.unassign(agent, id));
  }
}
