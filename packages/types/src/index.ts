/**
 * Shared cross-app contracts for the Buying Bot Platform foundation.
 * Domain feature types are deferred until product modules land.
 */

export type NodeEnvironment = 'development' | 'test' | 'staging' | 'production';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthCheckDetail {
  readonly name: string;
  readonly status: HealthStatus;
  readonly message?: string;
  readonly latencyMs?: number;
}

export interface HealthReport {
  readonly status: HealthStatus;
  readonly service: string;
  readonly environment: NodeEnvironment;
  readonly timestamp: string;
  readonly uptimeSeconds: number;
  readonly checks: readonly HealthCheckDetail[];
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requestId: string;
    readonly details?: unknown;
  };
}

export type PermissionAction =
  'create' | 'read' | 'update' | 'delete' | 'execute' | 'manage';

export interface Permission {
  readonly resource: string;
  readonly action: PermissionAction;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly permissions: readonly Permission[];
}
