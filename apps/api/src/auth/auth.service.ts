import type { AuthPrincipal } from '@buying-bot/auth';
import type { ApiEnv } from '@buying-bot/config';
import {
  DEFAULT_ORG_SLUG,
  hashOpaqueToken,
  normalizeEmail,
  type PrismaClient,
  type PrismaDatabaseClient,
} from '@buying-bot/database';
import type { Permission } from '@buying-bot/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Secret, TOTP } from 'otpauth';

import type { EmailPort } from '../common/email/email.port.js';
import type { RateLimiter } from '../common/rate-limit/rate-limiter.js';
import {
  APP_ENV,
  DATABASE_CLIENT,
  EMAIL_PORT,
  RATE_LIMITER,
} from '../config/tokens.js';
import type {
  ForgotPasswordBody,
  LoginBody,
  MfaChallengeBody,
  MfaConfirmBody,
  RegisterBody,
  ResetPasswordBody,
  StepUpBody,
  VerifyEmailBody,
} from './auth.schemas.js';
import type { AuthedRequest } from './auth.types.js';
import {
  createCsrfToken,
  createRecoveryCode,
  createSessionToken,
  decryptSecret,
  encryptSecret,
  hashPassword,
  hashToken,
  verifyPassword,
} from './crypto.js';

type SessionRealmDb = 'CUSTOMER' | 'ADMIN';

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  private get prisma(): PrismaClient {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DB_UNAVAILABLE',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }

  ensureCsrfCookie(reply: FastifyReply, request: FastifyRequest): string {
    const existing = request.cookies[this.env.CSRF_COOKIE];
    if (existing) {
      return existing;
    }
    const token = createCsrfToken();
    this.setCookie(reply, this.env.CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      maxAgeSeconds: 60 * 60 * 24,
    });
    return token;
  }

  async register(
    body: RegisterBody,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<{ userId: string; email: string }> {
    await this.enforceRateLimit(`auth:register:${request.ip}`, 5, 60);
    const emailNormalized = normalizeEmail(body.email);

    const existing = await this.prisma.user.findUnique({
      where: { emailNormalized },
    });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_IN_USE',
        message: 'Email already registered',
      });
    }

    const passwordHash = await hashPassword(body.password);
    const org = await this.prisma.organization.findUnique({
      where: { slug: DEFAULT_ORG_SLUG },
    });
    if (!org) {
      throw new BadRequestException({
        code: 'ORG_MISSING',
        message: 'Platform organization is not seeded',
      });
    }
    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });
    if (!customerRole) {
      throw new BadRequestException({
        code: 'ROLE_MISSING',
        message: 'CUSTOMER role is not seeded',
      });
    }

    const verifyToken = createSessionToken();
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: body.email.trim(),
          emailNormalized,
          status: 'PENDING_VERIFICATION',
          credentials: {
            create: {
              type: 'PASSWORD',
              secretHash: passwordHash,
            },
          },
          memberships: {
            create: {
              organizationId: org.id,
              roles: {
                create: { roleId: customerRole.id },
              },
            },
          },
          emailVerificationTokens: {
            create: {
              tokenHash: hashOpaqueToken(verifyToken),
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            },
          },
        },
      });
      await tx.securityEvent.create({
        data: {
          userId: created.id,
          type: 'register',
          ip: request.ip,
          userAgent: this.headerValue(request.headers['user-agent']),
          correlationId: this.headerValue(request.headers['x-correlation-id']),
        },
      });
      return created;
    });

    await this.email.send({
      to: user.email,
      subject: 'Verify your email',
      template: 'email_verification',
      data: { token: verifyToken, userId: user.id },
    });

    this.ensureCsrfCookie(reply, request);
    return { userId: user.id, email: user.email };
  }

  async login(
    body: LoginBody,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<{
    userId: string;
    realm: 'customer' | 'admin';
    mfaRequired: boolean;
  }> {
    await this.enforceRateLimit(`auth:login:${request.ip}`, 10, 60);
    const emailNormalized = normalizeEmail(body.email);
    const realmDb: SessionRealmDb =
      body.realm === 'admin' ? 'ADMIN' : 'CUSTOMER';

    const user = await this.prisma.user.findUnique({
      where: { emailNormalized },
      include: {
        credentials: { where: { type: 'PASSWORD' } },
        memberships: {
          include: {
            roles: { include: { role: true } },
          },
        },
        mfaFactors: { where: { type: 'TOTP', verifiedAt: { not: null } } },
      },
    });

    const passwordCredential = user?.credentials[0];
    const passwordOk =
      passwordCredential !== undefined &&
      (await verifyPassword(passwordCredential.secretHash, body.password));

    if (!user || !passwordOk) {
      await this.recordSecurityEvent({
        userId: user?.id,
        type: 'login_failure',
        request,
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (
      user.status === 'SUSPENDED' ||
      user.status === 'LOCKED' ||
      user.status === 'DEACTIVATED' ||
      user.status === 'DELETED' ||
      user.status === 'COMPROMISED'
    ) {
      throw new ForbiddenException({
        code: 'ACCOUNT_DISABLED',
        message: 'Account cannot sign in',
      });
    }

    const roleNames = user.memberships.flatMap((membership) =>
      membership.roles.map((row) => row.role.name),
    );
    const isAdmin =
      roleNames.includes('ADMIN') || roleNames.includes('SUPER_ADMIN');

    if (realmDb === 'ADMIN' && !isAdmin) {
      await this.recordSecurityEvent({
        userId: user.id,
        type: 'login_failure',
        request,
        metadata: { reason: 'not_admin' },
      });
      throw new ForbiddenException({
        code: 'ADMIN_REQUIRED',
        message: 'Admin role required',
      });
    }

    const mfaRequired = realmDb === 'ADMIN' && this.env.ADMIN_MFA_REQUIRED;
    const sessionToken = createSessionToken();
    const ttl =
      realmDb === 'ADMIN'
        ? this.env.ADMIN_SESSION_TTL_SECONDS
        : this.env.CUSTOMER_SESSION_TTL_SECONDS;
    const absolute =
      realmDb === 'ADMIN'
        ? this.env.ADMIN_SESSION_ABSOLUTE_SECONDS
        : this.env.CUSTOMER_SESSION_ABSOLUTE_SECONDS;

    await this.prisma.session.create({
      data: {
        userId: user.id,
        realm: realmDb,
        tokenHash: hashToken(sessionToken),
        expiresAt: new Date(Date.now() + ttl * 1000),
        absoluteExpiresAt: new Date(Date.now() + absolute * 1000),
        ip: request.ip,
        userAgent: this.headerValue(request.headers['user-agent']),
        mfaSatisfiedAt: mfaRequired ? null : new Date(),
      },
    });

    const cookieName =
      realmDb === 'ADMIN'
        ? this.env.ADMIN_SESSION_COOKIE
        : this.env.CUSTOMER_SESSION_COOKIE;

    this.clearRealmCookies(reply);
    this.setCookie(reply, cookieName, sessionToken, {
      httpOnly: true,
      sameSite: realmDb === 'ADMIN' ? 'strict' : 'lax',
      maxAgeSeconds: ttl,
    });
    this.ensureCsrfCookie(reply, request);

    await this.recordSecurityEvent({
      userId: user.id,
      type: 'login_success',
      request,
      metadata: { realm: body.realm },
    });

    return {
      userId: user.id,
      realm: body.realm,
      mfaRequired,
    };
  }

  async logout(request: AuthedRequest, reply: FastifyReply): Promise<void> {
    const token = this.readSessionToken(request);
    const principal = token ? await this.authenticateSessionToken(token) : null;
    if (token) {
      await this.prisma.session.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.clearRealmCookies(reply);
    if (principal) {
      await this.recordSecurityEvent({
        userId: principal.subjectId,
        type: 'logout',
        request,
      });
    }
  }

  async forgotPassword(
    body: ForgotPasswordBody,
    request: FastifyRequest,
  ): Promise<{ accepted: true }> {
    await this.enforceRateLimit(`auth:forgot:${request.ip}`, 5, 60);
    const emailNormalized = normalizeEmail(body.email);
    const user = await this.prisma.user.findUnique({
      where: { emailNormalized },
    });
    if (user) {
      const token = createSessionToken();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashOpaqueToken(token),
          expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        },
      });
      await this.email.send({
        to: user.email,
        subject: 'Password reset',
        template: 'password_reset',
        data: { token, userId: user.id },
      });
      await this.recordSecurityEvent({
        userId: user.id,
        type: 'password_reset_requested',
        request,
      });
    }
    return { accepted: true };
  }

  async resetPassword(
    body: ResetPasswordBody,
    request: FastifyRequest,
  ): Promise<{ reset: true }> {
    await this.enforceRateLimit(`auth:reset:${request.ip}`, 5, 60);
    const tokenHash = hashOpaqueToken(body.token);
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Reset token is invalid or expired',
      });
    }

    const passwordHash = await hashPassword(body.password);
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      const credential = await tx.credential.findFirst({
        where: { userId: row.userId, type: 'PASSWORD' },
      });
      if (credential) {
        await tx.credential.update({
          where: { id: credential.id },
          data: { secretHash: passwordHash },
        });
      } else {
        await tx.credential.create({
          data: {
            userId: row.userId,
            type: 'PASSWORD',
            secretHash: passwordHash,
          },
        });
      }
      await tx.session.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.securityEvent.create({
        data: {
          userId: row.userId,
          type: 'password_reset',
          ip: request.ip,
          userAgent: this.headerValue(request.headers['user-agent']),
        },
      });
    });

    return { reset: true };
  }

  async verifyEmail(
    body: VerifyEmailBody,
    request: FastifyRequest,
  ): Promise<{ verified: true }> {
    await this.enforceRateLimit(`auth:verify:${request.ip}`, 10, 60);
    const tokenHash = hashOpaqueToken(body.token);
    const row = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Verification token is invalid or expired',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      await tx.user.update({
        where: { id: row.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
        },
      });
      await tx.securityEvent.create({
        data: {
          userId: row.userId,
          type: 'email_verified',
          ip: request.ip,
          userAgent: this.headerValue(request.headers['user-agent']),
        },
      });
    });

    return { verified: true };
  }

  me(principal: AuthPrincipal): {
    subjectId: string;
    roles: readonly string[];
    permissions: readonly Permission[];
    realm: AuthPrincipal['realm'];
    mfaSatisfied: boolean;
    steppedUp: boolean;
  } {
    return {
      subjectId: principal.subjectId,
      roles: principal.roles,
      permissions: principal.permissions,
      realm: principal.realm,
      mfaSatisfied: principal.mfaSatisfied === true,
      steppedUp: principal.steppedUp === true,
    };
  }

  async enrollTotp(principal: AuthPrincipal): Promise<{
    factorId: string;
    otpauthUrl: string;
    /** Secret returned once for enrollment UX; never logged. */
    secret: string;
  }> {
    if (principal.realm !== 'admin') {
      throw new ForbiddenException({
        code: 'ADMIN_ONLY',
        message: 'TOTP enrollment is admin-only in M5',
      });
    }

    const secret = new Secret({ size: 20 });
    const encrypted = encryptSecret(secret.base32, this.env.SESSION_SECRET);
    const factor = await this.prisma.mfaFactor.create({
      data: {
        userId: principal.subjectId,
        type: 'TOTP',
        secretEncrypted: encrypted,
      },
    });

    const totp = new TOTP({
      issuer: 'BuyingBot',
      label: principal.subjectId,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    return {
      factorId: factor.id,
      otpauthUrl: totp.toString(),
      secret: secret.base32,
    };
  }

  async confirmTotp(
    principal: AuthPrincipal,
    body: MfaConfirmBody,
  ): Promise<{ recoveryCodes: string[] }> {
    const factor = await this.prisma.mfaFactor.findFirst({
      where: {
        userId: principal.subjectId,
        type: 'TOTP',
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!factor) {
      throw new BadRequestException({
        code: 'NO_PENDING_FACTOR',
        message: 'No pending TOTP enrollment',
      });
    }

    const secret = decryptSecret(
      factor.secretEncrypted,
      this.env.SESSION_SECRET,
    );
    if (!this.verifyTotp(secret, body.code)) {
      throw new UnauthorizedException({
        code: 'INVALID_MFA_CODE',
        message: 'Invalid MFA code',
      });
    }

    const recoveryCodes = Array.from({ length: 8 }, () => createRecoveryCode());
    await this.prisma.$transaction(async (tx) => {
      await tx.mfaFactor.update({
        where: { id: factor.id },
        data: { verifiedAt: new Date() },
      });
      await tx.mfaRecoveryCode.deleteMany({
        where: { userId: principal.subjectId },
      });
      await tx.mfaRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          userId: principal.subjectId,
          codeHash: hashToken(code),
        })),
      });
      await tx.securityEvent.create({
        data: {
          userId: principal.subjectId,
          type: 'mfa_enabled',
        },
      });
    });

    return { recoveryCodes };
  }

  async challengeMfa(
    principal: AuthPrincipal,
    body: MfaChallengeBody,
    request: AuthedRequest,
  ): Promise<{ mfaSatisfied: true }> {
    const sessionId = principal.sessionId;
    if (!sessionId) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Session required',
      });
    }

    const factors = await this.prisma.mfaFactor.findMany({
      where: {
        userId: principal.subjectId,
        type: 'TOTP',
        verifiedAt: { not: null },
      },
    });

    let ok = false;
    for (const factor of factors) {
      const secret = decryptSecret(
        factor.secretEncrypted,
        this.env.SESSION_SECRET,
      );
      if (this.verifyTotp(secret, body.code)) {
        ok = true;
        break;
      }
    }

    if (!ok) {
      const recovery = await this.prisma.mfaRecoveryCode.findFirst({
        where: {
          userId: principal.subjectId,
          usedAt: null,
          codeHash: hashToken(body.code.trim().toLowerCase()),
        },
      });
      if (recovery) {
        await this.prisma.mfaRecoveryCode.update({
          where: { id: recovery.id },
          data: { usedAt: new Date() },
        });
        ok = true;
      }
    }

    if (!ok) {
      await this.recordSecurityEvent({
        userId: principal.subjectId,
        type: 'mfa_failure',
        request,
      });
      throw new UnauthorizedException({
        code: 'INVALID_MFA_CODE',
        message: 'Invalid MFA code',
      });
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { mfaSatisfiedAt: new Date() },
    });

    await this.recordSecurityEvent({
      userId: principal.subjectId,
      type: 'mfa_success',
      request,
    });

    return { mfaSatisfied: true };
  }

  async stepUp(
    principal: AuthPrincipal,
    body: StepUpBody,
    request: AuthedRequest,
  ): Promise<{ steppedUp: true }> {
    const sessionId = principal.sessionId;
    if (!sessionId) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Session required',
      });
    }

    let ok = false;
    if (body.password) {
      const credential = await this.prisma.credential.findFirst({
        where: { userId: principal.subjectId, type: 'PASSWORD' },
      });
      if (
        credential &&
        (await verifyPassword(credential.secretHash, body.password))
      ) {
        ok = true;
      }
    }
    if (!ok && body.totp) {
      const factors = await this.prisma.mfaFactor.findMany({
        where: {
          userId: principal.subjectId,
          type: 'TOTP',
          verifiedAt: { not: null },
        },
      });
      for (const factor of factors) {
        const secret = decryptSecret(
          factor.secretEncrypted,
          this.env.SESSION_SECRET,
        );
        if (this.verifyTotp(secret, body.totp)) {
          ok = true;
          break;
        }
      }
    }

    if (!ok) {
      throw new UnauthorizedException({
        code: 'STEP_UP_FAILED',
        message: 'Step-up authentication failed',
      });
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { steppedUpAt: new Date() },
    });

    await this.recordSecurityEvent({
      userId: principal.subjectId,
      type: 'step_up',
      request,
    });

    return { steppedUp: true };
  }

  async resolvePrincipalFromRequest(
    request: AuthedRequest,
  ): Promise<AuthPrincipal | null> {
    const token = this.readSessionToken(request);
    if (!token) {
      return null;
    }
    request.rawSessionToken = token;
    return this.authenticateSessionToken(token);
  }

  async authenticateSessionToken(token: string): Promise<AuthPrincipal | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                roles: {
                  include: {
                    role: {
                      include: {
                        permissions: {
                          include: { permission: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt) {
      return null;
    }
    const now = Date.now();
    if (
      session.expiresAt.getTime() < now ||
      session.absoluteExpiresAt.getTime() < now
    ) {
      return null;
    }

    const roles = new Set<string>();
    const permissionMap = new Map<string, Permission>();
    for (const membership of session.user.memberships) {
      for (const membershipRole of membership.roles) {
        roles.add(membershipRole.role.name);
        for (const rolePermission of membershipRole.role.permissions) {
          const permission: Permission = {
            resource: rolePermission.permission.resource,
            action: rolePermission.permission.action as Permission['action'],
          };
          permissionMap.set(
            `${permission.resource}:${permission.action}`,
            permission,
          );
        }
      }
    }

    const realm = session.realm === 'ADMIN' ? 'admin' : 'customer';
    if (realm === 'customer') {
      // Customer cookie never grants admin permissions.
      roles.delete('ADMIN');
      roles.delete('SUPER_ADMIN');
      permissionMap.clear();
    }

    const steppedUp =
      session.steppedUpAt !== null &&
      now - session.steppedUpAt.getTime() <=
        this.env.STEP_UP_TTL_SECONDS * 1000;

    return {
      subjectId: session.userId,
      roles: [...roles],
      permissions: [...permissionMap.values()],
      realm,
      sessionId: session.id,
      mfaSatisfied: session.mfaSatisfiedAt !== null,
      steppedUp,
    };
  }

  private readSessionToken(request: FastifyRequest): string | undefined {
    const admin = request.cookies[this.env.ADMIN_SESSION_COOKIE];
    const customer = request.cookies[this.env.CUSTOMER_SESSION_COOKIE];
    // Prefer admin cookie only when present; never elevate customer cookie.
    if (typeof admin === 'string' && admin.length > 0) {
      return admin;
    }
    if (typeof customer === 'string' && customer.length > 0) {
      return customer;
    }
    return undefined;
  }

  private setCookie(
    reply: FastifyReply,
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: 'lax' | 'strict';
      maxAgeSeconds: number;
    },
  ): void {
    void reply.setCookie(name, value, {
      path: '/',
      httpOnly: options.httpOnly,
      secure: this.env.COOKIE_SECURE,
      sameSite: options.sameSite,
      maxAge: options.maxAgeSeconds,
    });
  }

  private clearRealmCookies(reply: FastifyReply): void {
    void reply.clearCookie(this.env.CUSTOMER_SESSION_COOKIE, { path: '/' });
    void reply.clearCookie(this.env.ADMIN_SESSION_COOKIE, { path: '/' });
  }

  private verifyTotp(secretBase32: string, code: string): boolean {
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secretBase32),
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  }

  private async enforceRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<void> {
    const result = await this.rateLimiter.consume(key, limit, windowSeconds);
    if (!result.allowed) {
      throw new ForbiddenException({
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        details: { retryAfterSeconds: result.retryAfterSeconds },
      });
    }
  }

  private headerValue(value: string | string[] | undefined): string | null {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (Array.isArray(value) && value[0]) {
      return value[0];
    }
    return null;
  }

  private async recordSecurityEvent(input: {
    userId?: string | undefined;
    type: string;
    request: FastifyRequest;
    metadata?: Record<string, string> | undefined;
  }): Promise<void> {
    await this.prisma.securityEvent.create({
      data: {
        userId: input.userId ?? null,
        type: input.type,
        ip: input.request.ip,
        userAgent: this.headerValue(input.request.headers['user-agent']),
        correlationId: this.headerValue(
          input.request.headers['x-correlation-id'],
        ),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }
}
