import { AppError } from "../../common/app.error.js";
import { LeadStatus } from "./lead.status.js";

export class Lead {
  constructor(
    public readonly id: bigint | null = null,
    public readonly nombre: string,
    public readonly telefono: string,
    public readonly estado: LeadStatus,
    public readonly agenteId: bigint | null,
    public readonly clienteNuevo: number,
    public readonly interesComercial: number,
    public readonly origen: number,
    public readonly antiguedad: number,
    // Versión del lead: sirve para detectar ediciones sobre datos desactualizados
    public readonly version: number = 1,
    public readonly updatedAt: Date | null = null,
    // Puntuación vigente y versión de los pesos con la que se calculó
    public readonly puntuacion?: number,
    public readonly pesosVersion?: number
  ) {
    if (!nombre.trim() || !telefono.trim()) {
      throw new AppError('VALIDATION', 'Nombre y teléfono son obligatorios');
    }

    if (
      [clienteNuevo, interesComercial, origen, antiguedad]
        .some(value => !Number.isInteger(value) || value < 0 || value > 100)
    ) {
      throw new AppError('VALIDATION', 'Los indicadores deben ser enteros entre 0 y 100');
    }
  }
}