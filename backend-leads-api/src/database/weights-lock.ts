import { Prisma } from './generated/prisma/client.js';

// Clave arbitraria del bloqueo que coordina las escrituras de leads con los cambios de pesos.
const WEIGHTS_LOCK_KEY = 1001;

// Las escrituras de leads pueden ejecutarse a la vez entre sí, pero no durante un cambio de pesos.
export async function lockWeightsShared(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(${WEIGHTS_LOCK_KEY}::bigint)`;
}

// El cambio de pesos espera a que terminen las escrituras en curso y bloquea las nuevas.
export async function lockWeightsExclusive(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WEIGHTS_LOCK_KEY}::bigint)`;
}
