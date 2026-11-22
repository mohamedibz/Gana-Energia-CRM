import { AppError } from "../../common/app.error.js";

export class Weights {
  constructor(
    public readonly version: number | null,
    public readonly clienteNuevo: number,
    public readonly interesComercial: number,
    public readonly origen: number,
    public readonly antiguedad: number,
    // Auditoría: cuándo y qué agente creó y modificó por última vez esta versión (null en las anteriores a la auditoría)
    public readonly createdAt: Date | null = null,
    public readonly updatedAt: Date | null = null,
    public readonly creadoPorId: bigint | null = null,
    public readonly modificadoPorId: bigint | null = null,
  ) {
    const values = [clienteNuevo, interesComercial, origen, antiguedad];

    if (values.some(value => !Number.isInteger(value) || value < 0 || value > 100)) {
      throw new AppError('VALIDATION', 'Los pesos deben ser enteros entre 0 y 100');
    }

    if (values.reduce((total, value) => total + value, 0) !== 100) {
      throw new AppError('VALIDATION', 'La suma de los pesos debe ser exactamente 100');
    }
  }
}