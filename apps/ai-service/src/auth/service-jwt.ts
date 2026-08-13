import { jwtVerify } from 'jose';

export async function verifyBearerServiceJwt(options: {
  readonly authorization: string | undefined;
  readonly secret: string;
  readonly audience: string;
  readonly issuer?: string;
}): Promise<{ readonly sub: string }> {
  if (!options.authorization?.startsWith('Bearer ')) {
    throw new Error('Missing bearer token');
  }
  const token = options.authorization.slice('Bearer '.length).trim();
  const key = new TextEncoder().encode(options.secret);
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['HS256'],
    audience: options.audience,
    issuer: options.issuer ?? 'buying-bot-platform',
  });
  if (typeof payload.sub !== 'string') {
    throw new Error('Invalid subject');
  }
  return { sub: payload.sub };
}
