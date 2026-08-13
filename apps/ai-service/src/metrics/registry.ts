export class InMemoryMetrics {
  private readonly counters = new Map<string, number>();
  private readonly observations = new Map<string, number[]>();

  inc(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  observe(
    name: string,
    value: number,
    labels: Record<string, string> = {},
  ): void {
    const key = metricKey(name, labels);
    const list = this.observations.get(key) ?? [];
    list.push(value);
    this.observations.set(key, list);
  }

  toPrometheus(): string {
    const lines: string[] = [];
    for (const [key, value] of this.counters) {
      lines.push(`${key} ${String(value)}`);
    }
    for (const [key, values] of this.observations) {
      const sum = values.reduce((a, b) => a + b, 0);
      lines.push(`${key}_count ${String(values.length)}`);
      lines.push(`${key}_sum ${String(sum)}`);
    }
    return `${lines.join('\n')}\n`;
  }
}

function metricKey(name: string, labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return name;
  }
  const labelText = entries
    .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
    .join(',');
  return `${name}{${labelText}}`;
}
