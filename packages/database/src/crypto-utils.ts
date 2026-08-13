import { createHash } from 'node:crypto';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function hashOpaqueToken(token: string): string {
  return sha256Hex(token);
}
