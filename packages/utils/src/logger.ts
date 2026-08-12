import type { LogLevel, NodeEnvironment } from '@buying-bot/types';

export type LogFields = Record<string, unknown>;

export interface LoggerOptions {
  readonly service: string;
  readonly environment: NodeEnvironment;
  readonly level: LogLevel;
  readonly sink?: (line: string) => void;
}

export interface Logger {
  readonly level: LogLevel;
  child(fields: LogFields): Logger;
  fatal(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  trace(message: string, fields?: LogFields): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

const REDACT_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'api_key',
  'apikey',
  'private_key',
  'client_secret',
  'card_number',
  'cvv',
  'ssn',
]);

function shouldLog(configured: LogLevel, incoming: LogLevel): boolean {
  return LEVEL_ORDER[incoming] >= LEVEL_ORDER[configured];
}

function redactValue(key: string, value: unknown): unknown {
  if (REDACT_KEYS.has(key.toLowerCase())) {
    return '[REDACTED]';
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return redactFields(value as LogFields);
  }
  return value;
}

function redactFields(fields: LogFields): LogFields {
  const redacted: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    redacted[key] = redactValue(key, value);
  }
  return redacted;
}

class StructuredLogger implements Logger {
  readonly level: LogLevel;
  private readonly service: string;
  private readonly environment: NodeEnvironment;
  private readonly baseFields: LogFields;
  private readonly sink: (line: string) => void;

  constructor(options: LoggerOptions, baseFields: LogFields = {}) {
    this.level = options.level;
    this.service = options.service;
    this.environment = options.environment;
    this.baseFields = baseFields;
    this.sink =
      options.sink ??
      ((line: string) => {
        process.stdout.write(`${line}\n`);
      });
  }

  child(fields: LogFields): Logger {
    return new StructuredLogger(
      {
        service: this.service,
        environment: this.environment,
        level: this.level,
        sink: this.sink,
      },
      { ...this.baseFields, ...fields },
    );
  }

  fatal(message: string, fields?: LogFields): void {
    this.write('fatal', message, fields);
  }

  error(message: string, fields?: LogFields): void {
    this.write('error', message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.write('warn', message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.write('info', message, fields);
  }

  debug(message: string, fields?: LogFields): void {
    this.write('debug', message, fields);
  }

  trace(message: string, fields?: LogFields): void {
    this.write('trace', message, fields);
  }

  private write(level: LogLevel, message: string, fields?: LogFields): void {
    if (!shouldLog(this.level, level)) {
      return;
    }

    const payload: LogFields = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      environment: this.environment,
      message,
      ...redactFields(this.baseFields),
      ...(fields ? redactFields(fields) : {}),
    };

    this.sink(JSON.stringify(payload));
  }
}

export function createLogger(options: LoggerOptions): Logger {
  return new StructuredLogger(options);
}
