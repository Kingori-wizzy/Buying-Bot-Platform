import { describe, expect, it } from 'vitest';

import { createObjectStorage } from './create-object-storage.js';
import { LocalFilesystemStorage } from './local-filesystem.storage.js';
import { S3CompatibleStorage } from './s3-compatible.storage.js';

describe('createObjectStorage', () => {
  it('defaults to local filesystem', () => {
    const storage = createObjectStorage({
      MEDIA_DRIVER: 'local',
      MEDIA_LOCAL_ROOT: '.data/media-test',
      MEDIA_PUBLIC_BASE_URL: 'http://127.0.0.1:3000/v1/media/files',
    } as never);
    expect(storage).toBeInstanceOf(LocalFilesystemStorage);
  });

  it('selects S3 when driver and credentials are present', () => {
    const storage = createObjectStorage({
      MEDIA_DRIVER: 's3',
      S3_ENDPOINT: 'http://127.0.0.1:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'buyingbot-media',
      S3_ACCESS_KEY_ID: 'minioadmin',
      S3_SECRET_ACCESS_KEY: 'minioadmin',
      S3_FORCE_PATH_STYLE: true,
      MEDIA_PUBLIC_BASE_URL: 'http://127.0.0.1:3000/v1/media/files',
    } as never);
    expect(storage).toBeInstanceOf(S3CompatibleStorage);
  });

  it('throws when s3 driver lacks credentials', () => {
    expect(() =>
      createObjectStorage({
        MEDIA_DRIVER: 's3',
      } as never),
    ).toThrow(/S3_ENDPOINT/);
  });
});
