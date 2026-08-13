export class InMemoryMetrics {
  private readonly counters = new Map<string, number>();

  inc(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key =
      Object.keys(labels).length === 0
        ? name
        : `${name}{${Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')}}`;
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  toPrometheus(): string {
    const lines = ['# TYPE worker_up gauge', 'worker_up 1'];
    for (const [key, value] of this.counters) {
      lines.push(`${key} ${String(value)}`);
    }
    return `${lines.join('\n')}\n`;
  }
}
