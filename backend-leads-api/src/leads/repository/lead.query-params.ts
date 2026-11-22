import { Lead } from "../domain/lead.js";
import { LeadStatus } from "../domain/lead.status.js";

export interface LeadQueryParams {
  status?: LeadStatus;
  agentId?: bigint;
  search?: string;
  sortByScore?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface LeadPage {
  items: Lead[];
  total: number;
}
