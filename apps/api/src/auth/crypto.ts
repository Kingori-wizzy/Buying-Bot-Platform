import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

import { hash, verify } from '@node-rs/argon2';

const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hashValue: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

/** Encrypt MFA TOTP secrets at rest (AES-256-GCM). Never log plaintext. */
export function encryptSecret(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload: string, secret: string): string {
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid encrypted secret payload');
  }
  const key = deriveKey(secret);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function createCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export function createRecoveryCode(): string {
  return randomBytes(5).toString('hex');
}
