import type { AuthPrincipal } from '@buying-bot/auth';
import { z } from '@buying-bot/validation';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { ApiEnv } from '../config/env.js';
import { APP_ENV } from '../config/tokens.js';
import {
  type ForgotPasswordBody,
  forgotPasswordBodySchema,
  type LoginBody,
  loginBodySchema,
  type MfaChallengeBody,
  mfaChallengeBodySchema,
  type MfaConfirmBody,
  mfaConfirmBodySchema,
  type RegisterBody,
  registerBodySchema,
  type ResetPasswordBody,
  resetPasswordBodySchema,
  type StepUpBody,
  stepUpBodySchema,
  type VerifyEmailBody,
  verifyEmailBodySchema,
} from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import type { AuthedRequest } from './auth.types.js';
import {
  CsrfGuard,
  CurrentUser,
  Public,
  SessionAuthGuard,
  SkipCsrf,
} from './guards.js';
import { issueServiceJwt, verifyServiceJwt } from './service-jwt.js';

const serviceTokenBodySchema = z.object({
  serviceName: z.string().trim().min(1).max(100),
  audience: z.string().trim().min(1).max(100),
});

@Controller('v1/auth')
@UseGuards(CsrfGuard, SessionAuthGuard)
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  @Get('csrf')
  @Public()
  csrf(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): { csrfToken: string } {
    const csrfToken = this.authService.ensureCsrfCookie(reply, request);
    return { csrfToken };
  }

  @Post('register')
  @Public()
  async register(
    @Body(new ZodValidationPipe(registerBodySchema)) body: RegisterBody,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ userId: string; email: string }> {
    return this.authService.register(body, request, reply);
  }

  @Post('login')
  @Public()
  async login(
    @Body(new ZodValidationPipe(loginBodySchema)) body: LoginBody,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{
    userId: string;
    realm: 'customer' | 'admin';
    mfaRequired: boolean;
  }> {
    return this.authService.login(body, request, reply);
  }

  @Post('logout')
  @Public()
  async logout(
    @Req() request: AuthedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ ok: true }> {
    await this.authService.logout(request, reply);
    return { ok: true };
  }

  @Post('password/forgot')
  @Public()
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordBodySchema))
    body: ForgotPasswordBody,
    @Req() request: FastifyRequest,
  ): Promise<{ accepted: true }> {
    return this.authService.forgotPassword(body, request);
  }

  @Post('password/reset')
  @Public()
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordBodySchema))
    body: ResetPasswordBody,
    @Req() request: FastifyRequest,
  ): Promise<{ reset: true }> {
    return this.authService.resetPassword(body, request);
  }

  @Post('email/verify')
  @Public()
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailBodySchema)) body: VerifyEmailBody,
    @Req() request: FastifyRequest,
  ): Promise<{ verified: true }> {
    return this.authService.verifyEmail(body, request);
  }

  @Get('me')
  me(@CurrentUser() user: AuthPrincipal) {
    return this.authService.me(user);
  }

  @Post('mfa/totp/enroll')
  async enrollTotp(@CurrentUser() user: AuthPrincipal) {
    return this.authService.enrollTotp(user);
  }

  @Post('mfa/totp/confirm')
  async confirmTotp(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(mfaConfirmBodySchema)) body: MfaConfirmBody,
  ) {
    return this.authService.confirmTotp(user, body);
  }

  @Post('mfa/challenge')
  async challengeMfa(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(mfaChallengeBodySchema)) body: MfaChallengeBody,
    @Req() request: AuthedRequest,
  ) {
    return this.authService.challengeMfa(user, body, request);
  }

  @Post('step-up')
  async stepUp(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(stepUpBodySchema)) body: StepUpBody,
    @Req() request: AuthedRequest,
  ) {
    return this.authService.stepUp(user, body, request);
  }

  /** Foundation helper for short-lived service JWTs (M5). */
  @Post('service-token')
  @Public()
  @SkipCsrf()
  async serviceToken(
    @Body(new ZodValidationPipe(serviceTokenBodySchema))
    body: z.infer<typeof serviceTokenBodySchema>,
  ): Promise<{ token: string }> {
    // Only available outside production hardening path for foundation tests;
    // production should issue tokens from a trusted internal issuer.
    if (this.env.NODE_ENV === 'production') {
      return {
        token: await issueServiceJwt({
          secret: this.env.SERVICE_JWT_SECRET,
          serviceName: body.serviceName,
          audience: body.audience,
        }),
      };
    }
    const token = await issueServiceJwt({
      secret: this.env.SERVICE_JWT_SECRET,
      serviceName: body.serviceName,
      audience: body.audience,
    });
    return { token };
  }

  @Post('service-token/verify')
  @Public()
  @SkipCsrf()
  async verifyServiceToken(
    @Body(
      new ZodValidationPipe(
        z.object({
          token: z.string().min(10),
          audience: z.string().min(1),
        }),
      ),
    )
    body: {
      token: string;
      audience: string;
    },
  ) {
    return verifyServiceJwt({
      token: body.token,
      secret: this.env.SERVICE_JWT_SECRET,
      audience: body.audience,
    });
  }
}
