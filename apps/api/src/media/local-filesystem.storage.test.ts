import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { LocalFilesystemStorage } from './local-filesystem.storage.js';

describe('LocalFilesystemStorage', () => {
  let root = '';

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('stores and retrieves image bytes with public URL', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'bb-media-'));
    const storage = new LocalFilesystemStorage(
      root,
      'http://127.0.0.1:3000/v1/media/files',
    );
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const stored = await storage.put({
      bytes,
      mimeType: 'image/jpeg',
      originalName: 'photo.jpg',
    });
    expect(stored.objectKey).toMatch(/^products\/.+\.jpg$/);
    expect(stored.publicUrl).toContain('/v1/media/files/products/');
    const disk = await readFile(stored.absolutePath);
    expect(disk.equals(bytes)).toBe(true);
    const got = await storage.get(stored.objectKey);
    expect(got?.mimeType).toBe('image/jpeg');
    expect(got?.bytes.equals(bytes)).toBe(true);
  });

  it('rejects path traversal on get', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'bb-media-'));
    await mkdir(path.join(root, 'products'), { recursive: true });
    const storage = new LocalFilesystemStorage(root);
    const got = await storage.get('../outside.txt');
    expect(got).toBeNull();
  });
});
