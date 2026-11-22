import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { Agent } from './auth.service.js';
import { AuthService } from './auth.service.js';
import { AuthGuard, CurrentAgent } from './auth.guard.js';
import { loginSchema } from './auth.schemas.js';
import type { LoginInput } from './auth.schemas.js';

const toDto = (agent: Agent) => ({
  id: agent.id.toString(),
  nombre: agent.nombre,
  rol: agent.rol,
});

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Endpoint público: devuelve el token que se usa en el resto de peticiones
  @Post('auth/login')
  @HttpCode(200)
  async login(@Body({ schema: loginSchema }) body: LoginInput) {
    const { token, agente } = await this.auth.login(body.telefono, body.password);
    return { token, agente: toDto(agente) };
  }

  // Agente de la sesión actual: útil para que el frontend recupere quién es tras recargar
  @Get('auth/me')
  @UseGuards(AuthGuard)
  me(@CurrentAgent() agent: Agent) {
    return toDto(agent);
  }

  // Lista de agentes para los filtros del frontend
  @Get('agents')
  @UseGuards(AuthGuard)
  async findAll() {
    return (await this.auth.listAgents()).map(toDto);
  }
}
