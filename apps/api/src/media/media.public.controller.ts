import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { Public, SkipCsrf } from '../auth/guards.js';
import type { ApiEnv } from '../config/env.js';
import { APP_ENV } from '../config/tokens.js';
import { createObjectStorage } from './create-object-storage.js';

@Controller('v1/media')
export class MediaPublicController {
  constructor(@Inject(APP_ENV) private readonly env: ApiEnv) {}

  @Get('files/products/:fileName')
  @Public()
  @SkipCsrf()
  async getProductFile(
    @Param('fileName') fileName: string,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    if (
      !fileName ||
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Media object not found',
      });
    }
    const objectKey = `products/${fileName}`;
    const storage = createObjectStorage(this.env);
    const file = await storage.get(objectKey);
    if (!file) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Media object not found',
      });
    }
    void reply
      .header('content-type', file.mimeType)
      .header('cache-control', 'public, max-age=86400')
      .send(file.bytes);
  }
}
