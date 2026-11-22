import type { LeadStatus, Priority } from '../api/types';
import { PRIORITY_LABELS, STATUS_LABELS } from '../constants';

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge status-${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return null;
  return <span className={`badge priority-${priority.toLowerCase()}`}>{PRIORITY_LABELS[priority]}</span>;
}
