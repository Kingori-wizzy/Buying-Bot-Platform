export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds?: number;
}

export interface RateLimiter {
  consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult>;
  disconnect(): Promise<void>;
}

interface CounterEntry {
  count: number;
  resetAt: number;
}

/**
 * Fail-closed in-memory limiter for auth routes when Redis is unavailable.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly counters = new Map<string, CounterEntry>();

  consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.counters.get(key);
    if (!existing || existing.resetAt <= now) {
      this.counters.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return Promise.resolve({
        allowed: true,
        remaining: Math.max(0, limit - 1),
      });
    }

    if (existing.count >= limit) {
      return Promise.resolve({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.resetAt - now) / 1000),
        ),
      });
    }

    existing.count += 1;
    return Promise.resolve({
      allowed: true,
      remaining: Math.max(0, limit - existing.count),
    });
  }

  disconnect(): Promise<void> {
    this.counters.clear();
    return Promise.resolve();
  }
}

export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: {
      incr(key: string): Promise<number>;
      pexpire(key: string, ms: number): Promise<number>;
      pttl(key: string): Promise<number>;
      quit(): Promise<'OK'>;
    },
    private readonly fallback: RateLimiter,
  ) {}

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.pexpire(key, windowSeconds * 1000);
      }
      if (count > limit) {
        const ttl = await this.redis.pttl(key);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
        };
      }
      return { allowed: true, remaining: Math.max(0, limit - count) };
    } catch {
      return this.fallback.consume(key, Math.min(limit, 5), windowSeconds);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      // ignore
    }
    await this.fallback.disconnect();
  }
}
