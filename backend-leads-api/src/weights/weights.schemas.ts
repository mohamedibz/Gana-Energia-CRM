import { z } from 'zod';
import '../common/schemas.js';

const weight = z.number().int().min(0).max(100);

// strict() rechaza campos desconocidos
export const weightsSchema = z
  .object({
    clienteNuevo: weight,
    interesComercial: weight,
    origen: weight,
    antiguedad: weight,
  })
  .strict()
  .refine(
    (w) => w.clienteNuevo + w.interesComercial + w.origen + w.antiguedad === 100,
    { message: 'La suma de los pesos debe ser exactamente 100' },
  );

export type WeightsInput = z.infer<typeof weightsSchema>;
