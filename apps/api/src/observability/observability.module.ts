import { Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller.js';

@Module({ controllers: [MetricsController] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module
export class ObservabilityModule {}
