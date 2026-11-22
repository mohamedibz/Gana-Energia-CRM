import { z } from 'zod';

// Mensajes de validación en español
z.config(z.locales.es());

// Los ids llegan como texto (JSON no admite BigInt) y se convierten a bigint
export const idSchema = z
  .string()
  .regex(/^[1-9]\d{0,17}$/, 'Identificador no válido')
  .transform((value) => BigInt(value));
