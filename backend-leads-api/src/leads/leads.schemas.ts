import { z } from 'zod';
import { getDefaultPageLimit, getMaxPageLimit } from '../common/pagination.config.js';
import { idSchema } from '../common/schemas.js';
import { LeadStatus } from './domain/lead.status.js';

const indicator = z.number().int().min(0).max(100);

// strict() rechaza campos desconocidos: así no se puede enviar una "puntuacion" desde el cliente
const leadFields = {
  nombre: z.string().trim().min(1).max(150),
  telefono: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,20}$/, 'Teléfono no válido'),
  clienteNuevo: indicator,
  interesComercial: indicator,
  origen: indicator,
  antiguedad: indicator,
};

// asignarme: el agente que crea el lead decide si queda asignado a él o libre (por defecto, libre)
export const createLeadSchema = z
  .object({ ...leadFields, asignarme: z.boolean().default(false) })
  .strict();

// version es la que el cliente tenía al abrir el lead (control de conflictos)
export const updateLeadSchema = z
  .object({ ...leadFields, version: z.number().int().min(1) })
  .strict();

export const changeStatusSchema = z.object({ estado: z.enum(LeadStatus) }).strict();

export const listLeadsSchema = z
  .object({
    status: z.enum(LeadStatus).optional(),
    agentId: idSchema.optional(),
    search: z.string().trim().max(100).optional(),
    sort: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    // Máximo y valor por defecto configurables (PAGINATION_MAX_LIMIT y PAGINATION_DEFAULT_LIMIT en .env)
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .optional()
      .refine((value) => value === undefined || value <= getMaxPageLimit(), {
        error: () => `El límite máximo por página es ${getMaxPageLimit()}`,
      })
      .transform((value) => value ?? getDefaultPageLimit()),
  })
  .strict();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ListLeadsInput = z.infer<typeof listLeadsSchema>;
