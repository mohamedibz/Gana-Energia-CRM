import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../database/generated/prisma/client.js';
import { AppError, ErrorCode } from './app.error.js';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  WEIGHTS_NOT_CONFIGURED: 503,
};

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

const HTTP_MESSAGES: Record<number, string> = {
  400: 'La petición no es válida',
  404: 'Ruta no encontrada',
  405: 'Método no permitido',
};

interface HttpError {
  code: ErrorCode | 'INTERNAL_ERROR';
  status: number;
  message: string;
  details: unknown[];
}

const INTERNAL_ERROR: HttpError = {
  code: 'INTERNAL_ERROR',
  status: 500,
  message: 'Error interno del servidor',
  details: [],
};

// Convierte cualquier excepción en una respuesta JSON con siempre el mismo formato.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const error = this.toHttpError(exception);

    // El detalle de los errores inesperados solo se registra, nunca se envía al cliente.
    if (error === INTERNAL_ERROR) {
      this.logger.error(exception);
    }

    response.status(error.status).json({
      statusCode: error.status,
      error: error.code,
      message: error.message,
      details: error.details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private toHttpError(exception: unknown): HttpError {
    if (exception instanceof AppError) {
      return {
        code: exception.code,
        status: STATUS_BY_CODE[exception.code],
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        code: CODE_BY_STATUS[status] ?? 'VALIDATION',
        status,
        message: HTTP_MESSAGES[status] ?? exception.message,
        details: [],
      };
    }

    return INTERNAL_ERROR;
  }

  private fromPrisma(error: Prisma.PrismaClientKnownRequestError): HttpError {
    switch (error.code) {
      case 'P2025':
        return { code: 'NOT_FOUND', status: 404, message: 'El recurso solicitado no existe', details: [] };
      case 'P2002':
        return { code: 'CONFLICT', status: 409, message: 'Ya existe un registro con esos datos', details: [] };
      case 'P2003':
        return { code: 'VALIDATION', status: 400, message: 'Se hace referencia a un recurso que no existe', details: [] };
      default:
        return INTERNAL_ERROR;
    }
  }
}
