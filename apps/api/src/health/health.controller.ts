import type { ApiEnv } from '@buying-bot/config';
import type { DatabaseClient } from '@buying-bot/database';
import type { HealthReport } from '@buying-bot/types';
import { aggregateHealth, processHealthCheck } from '@buying-bot/utils';
import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { APP_ENV, DATABASE_CLIENT } from '../config/tokens.js';

@Controller()
export class HealthController {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient | null,
  ) {}

  @Get(['health/live', 'livez'])
  live(): { status: 'ok'; service: string } {
    return { status: 'ok', service: this.env.SERVICE_NAME };
  }

  @Get(['health/ready', 'readyz'])
  async ready(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<HealthReport> {
    const report = await this.buildReport();
    if (report.status === 'error') {
      void reply.status(503);
    }
    return report;
  }

  @Get(['health', 'healthz'])
  async health(): Promise<HealthReport> {
    return this.buildReport();
  }

  private async buildReport(): Promise<HealthReport> {
    const checks = [processHealthCheck()];
    if (this.database) {
      const db = await this.database.healthCheck();
      checks.push({
        name: 'database',
        status: db.ok ? 'ok' : 'error',
        ...(db.latencyMs !== undefined ? { latencyMs: db.latencyMs } : {}),
        ...(db.message !== undefined ? { message: db.message } : {}),
      });
    }
    return aggregateHealth(this.env.SERVICE_NAME, this.env.NODE_ENV, checks);
  }
}
