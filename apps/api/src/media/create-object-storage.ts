import type { ApiEnv } from '../config/env.js';
import { LocalFilesystemStorage } from './local-filesystem.storage.js';
import type { ObjectStoragePort } from './object-storage.port.js';
import { S3CompatibleStorage } from './s3-compatible.storage.js';

/**
 * Resolve object storage from env.
 * - MEDIA_DRIVER=s3|minio with S3_* set → MinIO / S3
 * - otherwise → local filesystem (dev only)
 */
export function createObjectStorage(env?: ApiEnv): ObjectStoragePort {
  const driver = env?.MEDIA_DRIVER ?? 'local';
  const endpoint = env?.S3_ENDPOINT;
  const bucket = env?.S3_BUCKET;
  const accessKeyId = env?.S3_ACCESS_KEY_ID;
  const secretAccessKey = env?.S3_SECRET_ACCESS_KEY;

  if (
    (driver === 's3' || driver === 'minio') &&
    endpoint &&
    bucket &&
    accessKeyId &&
    secretAccessKey
  ) {
    const publicBaseUrl =
      env.MEDIA_PUBLIC_BASE_URL ??
      (env.PUBLIC_API_BASE_URL
        ? `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}/v1/media/files`
        : undefined);
    return new S3CompatibleStorage({
      endpoint,
      region: env.S3_REGION,
      bucket,
      accessKeyId,
      secretAccessKey,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      ...(publicBaseUrl ? { publicBaseUrl } : {}),
    });
  }

  if (driver === 's3' || driver === 'minio') {
    throw new Error(
      'MEDIA_DRIVER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY',
    );
  }

  const root =
    env?.MEDIA_LOCAL_ROOT ??
    `${process.cwd()}${process.cwd().includes('\\') ? '\\' : '/'}.data/media`;
  const publicBase =
    env?.MEDIA_PUBLIC_BASE_URL ??
    `${env?.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000'}/v1/media/files`;
  return new LocalFilesystemStorage(root, publicBase);
}
