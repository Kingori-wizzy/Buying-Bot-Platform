import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CsrfGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
  RealmGuard,
  RequireAnyPermissions,
  RequireMfa,
  RequireRealm,
  SessionAuthGuard,
} from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  type IngestKnowledgeBody,
  ingestKnowledgeSchema,
  type ListKnowledgeQuery,
  listKnowledgeSchema,
} from './knowledge.schemas.js';
import { KnowledgeService } from './knowledge.service.js';

@Controller('v1/admin/knowledge')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
@RequireRealm('admin')
@RequireMfa()
export class KnowledgeAdminController {
  constructor(
    @Inject(KnowledgeService) private readonly knowledge: KnowledgeService,
  ) {}

  @Post('ingest')
  @RequireAnyPermissions('ai:manage', 'catalog:update')
  ingest(
    @Body(new ZodValidationPipe(ingestKnowledgeSchema))
    body: IngestKnowledgeBody,
  ): Promise<unknown> {
    return this.knowledge.ingest(body);
  }

  @Get('documents')
  @RequireAnyPermissions('ai:manage', 'catalog:read')
  list(
    @Query(new ZodValidationPipe(listKnowledgeSchema))
    query: ListKnowledgeQuery,
  ): Promise<unknown> {
    return this.knowledge.listDocuments(query);
  }
}
