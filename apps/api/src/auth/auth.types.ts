import type { AuthPrincipal } from '@buying-bot/auth';
import type { FastifyRequest } from 'fastify';

export type AuthedRequest = FastifyRequest & {
  authPrincipal?: AuthPrincipal;
  rawSessionToken?: string;
};
