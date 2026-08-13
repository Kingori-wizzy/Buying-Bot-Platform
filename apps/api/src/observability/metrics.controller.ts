import { Controller, Get, Header } from '@nestjs/common';

import { Public } from '../auth/guards.js';

const counters = new Map<string, number>();

export function incrementMetric(name: string, value = 1): void {
  const safeName = name.replace(/[^a-zA-Z0-9_:]/g, '_');
  counters.set(safeName, (counters.get(safeName) ?? 0) + value);
}

export function resetMetricsForTests(): void {
  counters.clear();
}

@Controller()
export class MetricsController {
  @Get('metrics')
  @Public()
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(): string {
    const lines = [
      '# HELP buying_bot_up Whether the API process is running.',
      '# TYPE buying_bot_up gauge',
      'buying_bot_up 1',
    ];
    for (const [name, value] of [...counters.entries()].sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      lines.push(`# TYPE ${name} counter`, `${name} ${String(value)}`);
    }
    return `${lines.join('\n')}\n`;
  }
}
