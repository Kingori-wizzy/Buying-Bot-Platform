import { bootstrap } from './app.js';

export { bootstrap } from './app.js';

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'bootstrap failed';
  process.stderr.write(
    `${JSON.stringify({ level: 'fatal', service: 'worker', message })}\n`,
  );
  process.exit(1);
});
