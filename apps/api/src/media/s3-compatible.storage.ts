import { createHash, randomUUID } from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import {
  buildProductObjectKey,
  mimeFromObjectKey,
  type ObjectStoragePort,
  type StoredObject,
} from './object-storage.port.js';

export interface S3CompatibleStorageConfig {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly forcePathStyle?: boolean | undefined;
  readonly publicBaseUrl?: string | undefined;
}

/**
 * S3-compatible object storage (AWS S3, MinIO, etc.).
 * Credentials come from env — never hardcode.
 */
export class S3CompatibleStorage implements ObjectStoragePort {
  private readonly client: S3Client;

  constructor(private readonly config: S3CompatibleStorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle !== false,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

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
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
        Body: input.bytes,
        ContentType: input.mimeType,
        ContentLength: input.bytes.length,
        Metadata: {
          ...(input.originalName
            ? { 'original-name': input.originalName.slice(0, 200) }
            : {}),
        },
      }),
    );
    const publicUrl = this.config.publicBaseUrl
      ? `${this.config.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`
      : null;
    return {
      objectKey,
      absolutePath: null,
      publicUrl,
      size: input.bytes.length,
      mimeType: input.mimeType,
    };
  }

  async get(
    objectKey: string,
  ): Promise<{ bytes: Buffer; mimeType: string } | null> {
    const safe = objectKey.replace(/\.\./g, '');
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: safe,
        }),
      );
      const body = response.Body;
      if (!body) {
        return null;
      }
      const bytes = Buffer.from(await body.transformToByteArray());
      return {
        bytes,
        mimeType: response.ContentType ?? mimeFromObjectKey(safe),
      };
    } catch {
      return null;
    }
  }

  async delete(objectKey: string): Promise<void> {
    const safe = objectKey.replace(/\.\./g, '');
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: safe,
        }),
      );
    } catch {
      // idempotent
    }
  }
}
