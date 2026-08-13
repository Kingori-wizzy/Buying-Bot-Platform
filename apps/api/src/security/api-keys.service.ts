import { randomBytes } from 'node:crypto';

import {
  hashOpaqueToken,
  type PrismaDatabaseClient,
} from '@buying-bot/database';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { DATABASE_CLIENT } from '../config/tokens.js';

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
  ) {}

  async create(input: {
    readonly name: string;
    readonly scopes: readonly string[];
    readonly organizationId?: string;
    readonly createdBy?: string;
  }): Promise<unknown> {
    const secret = randomBytes(32).toString('base64url');
    const prefix = secret.slice(0, 10);
    const apiKey = `bbk_${prefix}_${secret}`;
    const row = await this.prisma().apiKey.create({
      data: {
        name: input.name,
        keyPrefix: prefix,
        keyHash: hashOpaqueToken(apiKey),
        scopesJson: [...new Set(input.scopes)],
        organizationId: input.organizationId ?? null,
        createdBy: input.createdBy ?? null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopesJson: true,
        createdAt: true,
      },
    });
    return { ...row, apiKey };
  }

  list(): Promise<unknown> {
    return this.prisma().apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopesJson: true,
        organizationId: true,
        revokedAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  revoke(id: string): Promise<unknown> {
    return this.prisma().apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: { id: true, revokedAt: true },
    });
  }

  private prisma() {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }
}
