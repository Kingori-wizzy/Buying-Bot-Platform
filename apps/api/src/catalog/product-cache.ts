export interface ProductCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    ...args: (string | number)[]
  ): Promise<'OK' | null>;
  del(...keys: string[]): Promise<number>;
}

class MemoryProductCache implements ProductCache {
  private readonly store = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  get(key: string): Promise<string | null> {
    const hit = this.store.get(key);
    if (!hit) {
      return Promise.resolve(null);
    }
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(hit.value);
  }

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return Promise.resolve();
  }

  del(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}

class RedisProductCache implements ProductCache {
  constructor(
    private readonly redis: RedisLike,
    private readonly fallback: ProductCache,
  ) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return this.fallback.get(key);
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch {
      await this.fallback.set(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      await this.fallback.del(key);
    }
  }
}

export function createProductCache(redis?: RedisLike): ProductCache {
  const memory = new MemoryProductCache();
  if (!redis) {
    return memory;
  }
  return new RedisProductCache(redis, memory);
}

export function productCacheKey(idOrSlug: string): string {
  return `catalog:product:${idOrSlug}`;
}
