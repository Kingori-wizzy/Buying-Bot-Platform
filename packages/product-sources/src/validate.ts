import { type NormalizedSourceProduct,normalizedSourceProductSchema } from './types.js';

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^\[::1\]$/,
];

/** SSRF-safe check for permitted external product/image URLs. */
export function isSafePublicHttpUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }
  const host = parsed.hostname;
  if (PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) {
    return false;
  }
  return true;
}

export function validateNormalizedProduct(
  input: unknown,
): NormalizedSourceProduct {
  const parsed = normalizedSourceProductSchema.parse(input);
  if (!isSafePublicHttpUrl(parsed.sourceUrl)) {
    throw new Error('UNSAFE_SOURCE_URL');
  }
  if (parsed.imageUrl && !isSafePublicHttpUrl(parsed.imageUrl)) {
    throw new Error('UNSAFE_IMAGE_URL');
  }
  return parsed;
}

export function sanitizeProductText(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .slice(0, 20_000);
}
