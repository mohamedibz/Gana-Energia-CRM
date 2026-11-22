import { AppError } from "../../common/app.error.js";
import { Weights } from "../../weights/domain/weights.js";
import { Lead } from "./lead.js";

export type Priority = 'ALTA' | 'MEDIA' | 'BAJA';

export interface ScoreBreakdownItem {
  criterio: string;
  valoracion: number;
  peso: number;
  aporte: number;
}

export class Score {
  constructor(
    public readonly leadId: bigint | number,
    public readonly version: number,
    public readonly puntuacion: number,
  ) {
    if (leadId !== null && leadId <= 0n) {
      throw new AppError('VALIDATION', 'El identificador del lead no es válido');
    }

    if (!Number.isInteger(version) || version <= 0) {
      throw new AppError('VALIDATION', 'La versión de los pesos debe ser un entero positivo');
    }

    if (
      !Number.isFinite(puntuacion) ||
      puntuacion < 0 ||
      puntuacion > 100
    ) {
      throw new AppError('VALIDATION', 'La puntuación debe estar entre 0 y 100');
    }
  }
}

// Aporte de cada criterio: valoración (0-100) × peso / 100
export function scoreBreakdown(lead: Lead, weights: Weights): ScoreBreakdownItem[] {
  const criteria = [
    { criterio: 'Cliente nuevo', valoracion: lead.clienteNuevo, peso: weights.clienteNuevo },
    { criterio: 'Interés comercial', valoracion: lead.interesComercial, peso: weights.interesComercial },
    { criterio: 'Origen del lead', valoracion: lead.origen, peso: weights.origen },
    { criterio: 'Antigüedad', valoracion: lead.antiguedad, peso: weights.antiguedad },
  ];

  return criteria.map(item => ({
    ...item,
    aporte: (item.valoracion * item.peso) / 100,
  }));
}

// Puntuación final = suma de los aportes. Se calcula con enteros y una única
// división para que el resultado coincida con el recálculo en SQL.
export function calculateScore(lead: Lead, weights: Weights): number {
  const total =
    lead.clienteNuevo * weights.clienteNuevo +
    lead.interesComercial * weights.interesComercial +
    lead.origen * weights.origen +
    lead.antiguedad * weights.antiguedad;

  return total / 100;
}

export function getPriority(score: number): Priority {
  if (score >= 75) return 'ALTA';
  if (score >= 40) return 'MEDIA';
  return 'BAJA';
}
