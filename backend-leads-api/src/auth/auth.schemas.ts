import { z } from 'zod';
import '../common/schemas.js';

export const loginSchema = z
  .object({
    telefono: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{7,20}$/, 'Teléfono no válido'),
    password: z.string().min(1).max(100),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
