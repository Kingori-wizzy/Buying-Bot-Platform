import { jwtVerify, SignJWT } from 'jose';

export interface ServiceJwtClaims {
  readonly sub: string;
  readonly aud: string;
  readonly iss: string;
}

export async function issueServiceJwt(options: {
  readonly secret: string;
  readonly serviceName: string;
  readonly audience: string;
  readonly issuer?: string;
  readonly ttlSeconds?: number;
}): Promise<string> {
  const key = new TextEncoder().encode(options.secret);
  const ttl = options.ttlSeconds ?? 300;
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(options.serviceName)
    .setAudience(options.audience)
    .setIssuer(options.issuer ?? 'buying-bot-platform')
    .setIssuedAt()
    .setExpirationTime(`${String(ttl)}s`)
    .sign(key);
}

export async function verifyServiceJwt(options: {
  readonly token: string;
  readonly secret: string;
  readonly audience: string;
  readonly issuer?: string;
}): Promise<ServiceJwtClaims> {
  const key = new TextEncoder().encode(options.secret);
  const { payload } = await jwtVerify(options.token, key, {
    algorithms: ['HS256'],
    audience: options.audience,
    issuer: options.issuer ?? 'buying-bot-platform',
  });
  if (typeof payload.sub !== 'string') {
    throw new Error('Invalid service JWT subject');
  }

  let aud: string | undefined;
  if (typeof payload.aud === 'string') {
    aud = payload.aud;
  } else if (Array.isArray(payload.aud)) {
    const first = payload.aud.find(
      (value): value is string => typeof value === 'string',
    );
    aud = first;
  }
  if (!aud) {
    throw new Error('Invalid service JWT audience');
  }

  return {
    sub: payload.sub,
    aud,
    iss: typeof payload.iss === 'string' ? payload.iss : 'buying-bot-platform',
  };
}
