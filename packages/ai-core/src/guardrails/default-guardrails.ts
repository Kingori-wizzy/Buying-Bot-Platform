import type {
  GuardrailInput,
  GuardrailOutput,
  GuardrailPort,
  GuardrailResult,
} from '../ports.js';

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|system)\s+(prompts?|instructions?)/i,
  /you\s+are\s+now\s+(dan|unrestricted|jailbroken)/i,
  /system\s*:\s*you\s+must/i,
  /<\/?system>/i,
];

const SECRET_PATTERNS: readonly RegExp[] = [
  /\b(sk-[A-Za-z0-9_-]{16,})\b/g,
  /\b(AKIA[0-9A-Z]{16})\b/g,
  /\b(ghp_[A-Za-z0-9]{20,})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
  /\b(Bearer\s+[A-Za-z0-9._\-+=/]{20,})\b/gi,
  /\b(password\s*[:=]\s*\S+)\b/gi,
  /\b(api[_-]?key\s*[:=]\s*\S+)\b/gi,
];

/**
 * Heuristic prompt-injection checks + secret scrubbing on model outputs.
 */
export class DefaultGuardrails implements GuardrailPort {
  checkInput(input: GuardrailInput): GuardrailResult {
    const text =
      input.userText ?? input.messages.map((m) => m.content).join('\n');
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          ok: false,
          reason: 'Potential prompt injection detected',
        };
      }
    }
    return { ok: true };
  }

  scrubOutput(output: GuardrailOutput): GuardrailResult {
    let sanitized = output.text;
    for (const pattern of SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return { ok: true, sanitizedText: sanitized };
  }
}

export function scrubSecrets(text: string): string {
  let sanitized = text;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}
