import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface StoredObject {
  readonly objectKey: string;
  readonly absolutePath: string;
  readonly publicUrl: string | null;
  readonly size: number;
  readonly mimeType: string;
}

export interface ObjectStoragePort {
  put(input: {
    readonly bytes: Buffer;
    readonly mimeType: string;
    readonly originalName?: string | undefined;
  }): Promise<StoredObject>;
  get(objectKey: string): Promise<{ bytes: Buffer; mimeType: string } | null>;
  delete(objectKey: string): Promise<void>;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Local filesystem object storage for development.
 * Production should swap for S3/GCS/Azure via the same port.
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
    const ext =
      EXT_BY_MIME[input.mimeType] ??
      (input.originalName?.includes('.')
        ? input.originalName.split('.').pop()?.toLowerCase()
        : 'bin') ??
      'bin';
    const hash = createHash('sha256').update(input.bytes).digest('hex').slice(0, 12);
    const objectKey = `products/${id}-${hash}.${ext}`;
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
      const ext = path.extname(safe).toLowerCase();
      const mimeType =
        Object.entries(EXT_BY_MIME).find(([, e]) => `.${e}` === ext)?.[0] ??
        'application/octet-stream';
      return { bytes, mimeType };
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
