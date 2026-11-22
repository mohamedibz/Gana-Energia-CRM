import { CanActivate, createParamDecorator, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../common/app.error.js';
import { Agent, AuthService } from './auth.service.js';

type AuthenticatedRequest = Request & { agent: Agent };

// Exige la cabecera "Authorization: Bearer <token>" obtenida en POST /auth/login.
// El agente se vuelve a leer de la base de datos en cada petición: su identidad y su rol
// salen siempre de ahí, nunca del cliente.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = (request.headers.authorization ?? '').split(' ');

    if (type !== 'Bearer' || !token) {
      throw new AppError('UNAUTHORIZED', 'Falta el token de autenticación. Inicia sesión en /auth/login');
    }

    const agentId = await this.auth.verifyToken(token);
    if (agentId === null) {
      throw new AppError('UNAUTHORIZED', 'El token no es válido o ha caducado');
    }

    const agent = await this.auth.findAgent(agentId);
    if (!agent) {
      throw new AppError('UNAUTHORIZED', 'El agente del token ya no existe');
    }

    request.agent = agent;
    return true;
  }
}

// Devuelve el agente autenticado por el guard
export const CurrentAgent = createParamDecorator((_data: unknown, context: ExecutionContext): Agent => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().agent;
});
