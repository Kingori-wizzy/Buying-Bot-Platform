export class InMemoryRateLimiter {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  tryConsume(
    key: string,
    limit: number,
    windowMs: number,
  ): { ok: boolean; remaining: number } {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: limit - 1 };
    }
    if (current.count >= limit) {
      return { ok: false, remaining: 0 };
    }
    current.count += 1;
    return { ok: true, remaining: limit - current.count };
  }
}
