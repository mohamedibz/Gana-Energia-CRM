import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppError } from './common/app.error.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/prisma.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { WeightsModule } from './weights/weights.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'backend-leads-api',
    }),
    DatabaseModule,
    AuthModule,
    WeightsModule,
    LeadsModule,
  ],
  providers: [
    // Todos los errores salen con el mismo formato JSON
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Valida body, query y params con los esquemas zod de cada controlador
    {
      provide: APP_PIPE,
      useValue: new StandardSchemaValidationPipe({
        exceptionFactory: (issues) =>
          new AppError(
            'VALIDATION',
            'Los datos enviados no son válidos',
            issues.map((issue) => ({
              campo: (issue.path ?? [])
                .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
                .join('.'),
              mensaje: issue.message,
            })),
          ),
      }),
    },
  ],
})
export class AppModule {}
