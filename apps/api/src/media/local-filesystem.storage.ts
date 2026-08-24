import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildProductObjectKey,
  mimeFromObjectKey,
  type ObjectStoragePort,
  type StoredObject,
} from './object-storage.port.js';

/**
 * Local filesystem object storage for development.
 * Production uses S3CompatibleStorage (MinIO / AWS S3).
 */
export class LocalFilesystemStorage implements ObjectStoragePort {
  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl?: string | undefined,
  ) {}

  async put(input: {
    readonly bytes: Buffer;
    readonly mimeType: string;
    readonly originalName?: string | undefined;
  }): Promise<StoredObject> {
    const id = randomUUID();
    const hash = createHash('sha256')
      .update(input.bytes)
      .digest('hex')
      .slice(0, 12);
    const objectKey = buildProductObjectKey(
      input.mimeType,
      input.originalName,
      hash,
      id,
    );
    const absolutePath = path.join(this.rootDir, objectKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.bytes);
    const publicUrl = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`
      : null;
    return {
      objectKey,
      absolutePath,
      publicUrl,
      size: input.bytes.length,
      mimeType: input.mimeType,
    };
  }

  async get(
    objectKey: string,
  ): Promise<{ bytes: Buffer; mimeType: string } | null> {
    const safe = objectKey.replace(/\.\./g, '');
    const absolutePath = path.join(this.rootDir, safe);
    try {
      const bytes = await readFile(absolutePath);
      return { bytes, mimeType: mimeFromObjectKey(safe) };
    } catch {
      return null;
    }
  }

  async delete(objectKey: string): Promise<void> {
    const safe = objectKey.replace(/\.\./g, '');
    const absolutePath = path.join(this.rootDir, safe);
    try {
      await unlink(absolutePath);
    } catch {
      // idempotent
    }
  }
}
