import type { AuthPrincipal } from '@buying-bot/auth';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  CsrfGuard,
  CurrentUser,
  Public,
  SessionAuthGuard,
  SkipCsrf,
} from '../auth/guards.js';
import { ServiceJwtGuard } from '../auth/service-jwt.guard.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  type ChatBody,
  chatBodySchema,
  type RetrieveBody,
  retrieveBodySchema,
} from './ai.schemas.js';
import { AiService } from './ai.service.js';

@Controller('v1/ai')
export class AiController {
  constructor(@Inject(AiService) private readonly ai: AiService) {}

  @Post('chat')
  @UseGuards(CsrfGuard, SessionAuthGuard)
  chat(
    @CurrentUser() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(chatBodySchema)) body: ChatBody,
  ): Promise<unknown> {
    return this.ai.chat(body, principal.subjectId, this.realm(principal));
  }

  @Post('chat/stream')
  @UseGuards(CsrfGuard, SessionAuthGuard)
  async stream(
    @CurrentUser() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(chatBodySchema)) body: ChatBody,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const proxied = await this.ai.streamChat(
      body,
      principal.subjectId,
      this.realm(principal),
    );
    reply.header('content-type', 'text/event-stream; charset=utf-8');
    reply.header('cache-control', 'no-cache, no-transform');
    reply.header('x-conversation-id', proxied.conversationId);
    reply.hijack();

    if (!proxied.response.body) {
      reply.raw.end();
      return;
    }
    const reader = proxied.response.body.getReader();
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) {
          break;
        }
        reply.raw.write(chunk.value);
      }
    } finally {
      reader.releaseLock();
      reply.raw.end();
    }
  }

  @Get('conversations/:conversationId')
  @UseGuards(SessionAuthGuard)
  getConversation(
    @CurrentUser() principal: AuthPrincipal,
    @Param('conversationId') conversationId: string,
  ): Promise<unknown> {
    return this.ai.getConversation(conversationId, principal.subjectId);
  }

  @Post('retrieve')
  @Public()
  @SkipCsrf()
  @UseGuards(ServiceJwtGuard)
  retrieve(
    @Body(new ZodValidationPipe(retrieveBodySchema)) body: RetrieveBody,
  ): Promise<unknown> {
    return this.ai.retrieve(body);
  }

  private realm(principal: AuthPrincipal): 'customer' | 'admin' {
    return principal.realm === 'admin' ? 'admin' : 'customer';
  }
}
