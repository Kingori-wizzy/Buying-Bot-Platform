export interface StoredObject {
  readonly objectKey: string;
  readonly absolutePath: string | null;
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

export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function buildProductObjectKey(
  mimeType: string,
  originalName: string | undefined,
  contentHash12: string,
  id: string,
): string {
  const ext =
    EXT_BY_MIME[mimeType] ??
    (originalName?.includes('.')
      ? originalName.split('.').pop()?.toLowerCase()
      : 'bin') ??
    'bin';
  return `products/${id}-${contentHash12}.${ext}`;
}

export function mimeFromObjectKey(objectKey: string): string {
  const ext = objectKey.includes('.')
    ? objectKey.split('.').pop()?.toLowerCase()
    : undefined;
  const found = Object.entries(EXT_BY_MIME).find(([, e]) => e === ext);
  return found?.[0] ?? 'application/octet-stream';
}
