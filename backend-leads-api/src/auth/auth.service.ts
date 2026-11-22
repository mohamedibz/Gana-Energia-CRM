import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '../common/app.error.js';
import { PrismaService } from '../database/prisma.service.js';
import { verifyPassword } from './password.js';

// Datos públicos del agente: nunca incluyen el teléfono de acceso ni el hash
export interface Agent {
  id: bigint;
  nombre: string;
  rol: string;
}

const publicFields = { id: true, nombre: true, rol: true } as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(telefono: string, password: string): Promise<{ token: string; agente: Agent }> {
    const record = await this.prisma.agente.findUnique({ where: { telefono } });

    // Mismo mensaje si el teléfono no existe o la contraseña falla, para no revelar qué teléfonos hay
    if (!record || !(await verifyPassword(password, record.passwordHash))) {
      throw new AppError('UNAUTHORIZED', 'Teléfono o contraseña incorrectos');
    }

    const token = await this.jwt.signAsync({ sub: record.id.toString() });
    return {
      token,
      agente: { id: record.id, nombre: record.nombre, rol: record.rol },
    };
  }

  // Devuelve el id del agente si el token es válido y no ha caducado; si no, null
  async verifyToken(token: string): Promise<bigint | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      return BigInt(payload.sub);
    } catch {
      return null;
    }
  }

  findAgent(id: bigint): Promise<Agent | null> {
    return this.prisma.agente.findUnique({ where: { id }, select: publicFields });
  }

  listAgents(): Promise<Agent[]> {
    return this.prisma.agente.findMany({ select: publicFields, orderBy: { id: 'asc' } });
  }
}
