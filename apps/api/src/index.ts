import 'reflect-metadata';

import { bootstrap } from './app.js';

export { bootstrap } from './app.js';

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'bootstrap failed';
  let issues: unknown;
  if (error && typeof error === 'object' && 'issues' in error) {
    issues = error.issues;
  }
  process.stderr.write(
    `${JSON.stringify({ level: 'fatal', service: 'api', message, issues })}\n`,
  );
  process.exit(1);
});
