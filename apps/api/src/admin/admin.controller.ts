import {
  type PrismaDatabaseClient,
  requeueFailedOutbox,
} from '@buying-bot/database';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from '@buying-bot/validation';

import {
  CsrfGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
  RealmGuard,
  RequireAnyPermissions,
  RequireMfa,
  RequirePermissions,
  RequireRealm,
  SessionAuthGuard,
} from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { DATABASE_CLIENT } from '../config/tokens.js';

const listCustomersQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z
    .enum([
      'PENDING_VERIFICATION',
      'ACTIVE',
      'SUSPENDED',
      'LOCKED',
      'DEACTIVATED',
      'DELETED',
      'COMPROMISED',
    ])
    .optional(),
});

const patchCustomerStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'LOCKED']),
});

const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  type: z.string().trim().max(120).optional(),
  userId: z.string().uuid().optional(),
});

type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
type PatchCustomerStatusBody = z.infer<typeof patchCustomerStatusSchema>;
type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

@Controller('v1/admin')
@UseGuards(
  CsrfGuard,
  SessionAuthGuard,
  RealmGuard,
  MfaSatisfiedGuard,
  PermissionsGuard,
)
export class AdminController {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
  ) {}

  private get prisma() {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }

  @Get('ping')
  @RequireRealm('admin')
  @RequireMfa()
  @RequireAnyPermissions('system:manage', 'audit:read')
  ping(): { ok: true; realm: 'admin' } {
    return { ok: true, realm: 'admin' };
  }

  @Get('dashboard')
  @RequireRealm('admin')
  @RequireMfa()
  @RequireAnyPermissions('catalog:read', 'orders:read', 'inventory:read', 'audit:read')
  async dashboard(): Promise<unknown> {
    const prisma = this.prisma;
    const [
      productsTotal,
      productsActive,
      productsDraft,
      productsArchived,
      ordersPending,
      ordersRecent,
      inventoryOut,
      inventoryLow,
      auditRecent,
    ] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({
        where: { deletedAt: null, status: 'ACTIVE' },
      }),
      prisma.product.count({
        where: { deletedAt: null, status: 'DRAFT' },
      }),
      prisma.product.count({
        where: { deletedAt: null, status: 'ARCHIVED' },
      }),
      prisma.order.count({
        where: {
          status: {
            in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'FULFILLING'],
          },
        },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          status: true,
          currency: true,
          createdAt: true,
          financialSnapshot: {
            select: { payableMinor: true, currency: true },
          },
        },
      }),
      prisma.inventoryBalance.count({ where: { onHand: 0 } }),
      prisma.inventoryBalance.count({
        where: { onHand: { gt: 0, lte: 5 } },
      }),
      prisma.securityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          userId: true,
          createdAt: true,
          ip: true,
        },
      }),
    ]);

    return {
      products: {
        total: productsTotal,
        active: productsActive,
        draft: productsDraft,
        archived: productsArchived,
      },
      inventory: {
        outOfStock: inventoryOut,
        lowStock: inventoryLow,
      },
      orders: {
        pending: ordersPending,
        recent: ordersRecent,
      },
      audit: {
        recent: auditRecent,
      },
    };
  }

  @Get('customers')
  @RequireRealm('admin')
  @RequireMfa()
  @RequirePermissions('customers:read')
  async listCustomers(
    @Query(new ZodValidationPipe(listCustomersQuerySchema))
    query: ListCustomersQuery,
  ): Promise<unknown> {
    const prisma = this.prisma;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              {
                emailNormalized: {
                  contains: query.q.trim().toLowerCase(),
                },
              },
              { email: { contains: query.q.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        select: {
          id: true,
          email: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            select: {
              roles: { select: { role: { select: { name: true } } } },
            },
          },
          _count: { select: { orders: true } },
        },
      }),
    ]);

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: items.map((user) => ({
        id: user.id,
        email: user.email,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        orderCount: user._count.orders,
        roles: [
          ...new Set(
            user.memberships.flatMap((m) =>
              m.roles.map((r) => r.role.name),
            ),
          ),
        ],
      })),
    };
  }

  @Get('customers/:id')
  @RequireRealm('admin')
  @RequireMfa()
  @RequirePermissions('customers:read')
  async getCustomer(@Param('id') id: string): Promise<unknown> {
    const prisma = this.prisma;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            organization: { select: { id: true, name: true, slug: true } },
            roles: { select: { role: { select: { name: true } } } },
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            currency: true,
            createdAt: true,
            financialSnapshot: {
              select: { payableMinor: true, currency: true },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found',
      });
    }
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberships: user.memberships.map((m) => ({
        organization: m.organization,
        roles: m.roles.map((r) => r.role.name),
      })),
      recentOrders: user.orders,
    };
  }

  @Patch('customers/:id/status')
  @RequireRealm('admin')
  @RequireMfa()
  @RequirePermissions('customers:update')
  async patchCustomerStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchCustomerStatusSchema))
    body: PatchCustomerStatusBody,
  ): Promise<unknown> {
    const prisma = this.prisma;
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found',
      });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { status: body.status },
      select: {
        id: true,
        email: true,
        status: true,
        updatedAt: true,
      },
    });
    await prisma.securityEvent.create({
      data: {
        userId: id,
        type: 'admin.customer.status_changed',
        metadata: {
          from: existing.status,
          to: body.status,
        },
      },
    });
    return updated;
  }

  @Get('audit/events')
  @RequireRealm('admin')
  @RequireMfa()
  @RequirePermissions('audit:read')
  async listAuditEvents(
    @Query(new ZodValidationPipe(listAuditQuerySchema)) query: ListAuditQuery,
  ): Promise<unknown> {
    const prisma = this.prisma;
    const where = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [total, items] = await Promise.all([
      prisma.securityEvent.count({ where }),
      prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        select: {
          id: true,
          type: true,
          userId: true,
          ip: true,
          userAgent: true,
          metadata: true,
          correlationId: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: items.map((event) => ({
        id: event.id,
        type: event.type,
        userId: event.userId,
        userEmail: event.user?.email ?? null,
        ip: event.ip,
        userAgent: event.userAgent,
        metadata: event.metadata,
        correlationId: event.correlationId,
        createdAt: event.createdAt,
      })),
    };
  }

  @Post('outbox/reprocess')
  @RequireRealm('admin')
  @RequireMfa()
  @RequireAnyPermissions('system:manage')
  async reprocessOutbox(): Promise<{ requeued: number }> {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    const requeued = await requeueFailedOutbox(this.database.prisma, 100);
    return { requeued };
  }
}
