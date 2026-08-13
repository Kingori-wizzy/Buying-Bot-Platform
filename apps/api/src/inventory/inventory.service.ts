import {
  DEFAULT_LOCATION_CODE,
  type PrismaClient,
  type PrismaDatabaseClient,
} from '@buying-bot/database';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATABASE_CLIENT } from '../config/tokens.js';
import type {
  AdjustInventoryBody,
  ListInventoryQuery,
  ReserveInventoryBody,
} from './inventory.schemas.js';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
  ) {}

  private prisma(): PrismaClient {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }

  async resolveDefaultLocationId(): Promise<string> {
    const location = await this.prisma().location.findUnique({
      where: { code: DEFAULT_LOCATION_CODE },
    });
    if (!location) {
      throw new BadRequestException({
        code: 'LOCATION_MISSING',
        message: 'Default inventory location missing',
      });
    }
    return location.id;
  }

  async list(query: ListInventoryQuery): Promise<{
    items: unknown[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const prisma = this.prisma();
    const where = {
      ...(query.skuId ? { skuId: query.skuId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.inventoryBalance.count({ where }),
      prisma.inventoryBalance.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return {
      items: items.map((row) => ({
        ...row,
        available: row.onHand - row.reserved,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async adjust(body: AdjustInventoryBody, actorId?: string): Promise<unknown> {
    const prisma = this.prisma();
    const existing = await prisma.inventoryMovement.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
    });
    if (existing) {
      return { idempotent: true, movement: existing };
    }

    const locationId =
      body.locationId ?? (await this.resolveDefaultLocationId());

    try {
      return await prisma.$transaction(async (tx) => {
        const again = await tx.inventoryMovement.findUnique({
          where: { idempotencyKey: body.idempotencyKey },
        });
        if (again) {
          return { idempotent: true, movement: again };
        }

        let balance = await tx.inventoryBalance.findUnique({
          where: {
            skuId_locationId: { skuId: body.skuId, locationId },
          },
        });
        balance ??= await tx.inventoryBalance.create({
          data: {
            skuId: body.skuId,
            locationId,
            onHand: 0,
            reserved: 0,
            version: 0,
          },
        });

        const nextOnHand = balance.onHand + body.quantityDelta;
        if (nextOnHand < balance.reserved) {
          throw new ConflictException({
            code: 'INSUFFICIENT_STOCK',
            message: 'Adjustment would make on_hand < reserved',
          });
        }
        if (nextOnHand < 0) {
          throw new ConflictException({
            code: 'NEGATIVE_STOCK',
            message: 'Adjustment would make on_hand negative',
          });
        }

        const updated = await tx.inventoryBalance.updateMany({
          where: { id: balance.id, version: balance.version },
          data: {
            onHand: nextOnHand,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new ConflictException({
            code: 'OPTIMISTIC_LOCK',
            message: 'Inventory balance changed concurrently',
          });
        }

        const movement = await tx.inventoryMovement.create({
          data: {
            skuId: body.skuId,
            locationId,
            type: body.quantityDelta >= 0 ? 'RECEIPT' : 'ADJUSTMENT',
            quantity: Math.abs(body.quantityDelta),
            reason: body.reason,
            idempotencyKey: body.idempotencyKey,
            actorId: actorId ?? null,
          },
        });

        const fresh = await tx.inventoryBalance.findUniqueOrThrow({
          where: { id: balance.id },
        });
        return {
          idempotent: false,
          movement,
          balance: {
            ...fresh,
            available: fresh.onHand - fresh.reserved,
          },
        };
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        const movement = await prisma.inventoryMovement.findUnique({
          where: { idempotencyKey: body.idempotencyKey },
        });
        return { idempotent: true, movement };
      }
      throw error;
    }
  }

  async reserve(
    body: ReserveInventoryBody,
  ): Promise<{ reservationId: string }> {
    const prisma = this.prisma();
    const locationId =
      body.locationId ?? (await this.resolveDefaultLocationId());

    return prisma.$transaction(async (tx) => {
      const existingMovement = await tx.inventoryMovement.findUnique({
        where: { idempotencyKey: body.idempotencyKey },
      });
      if (existingMovement) {
        const existing = await tx.reservation.findFirst({
          where: {
            skuId: body.skuId,
            locationId,
            status: 'HELD',
            ...(body.orderId ? { orderId: body.orderId } : {}),
            ...(body.cartId ? { cartId: body.cartId } : {}),
          },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) {
          return { reservationId: existing.id };
        }
      }

      const balance = await tx.inventoryBalance.findUnique({
        where: { skuId_locationId: { skuId: body.skuId, locationId } },
      });
      if (!balance) {
        throw new NotFoundException({
          code: 'BALANCE_NOT_FOUND',
          message: 'No inventory balance for SKU/location',
        });
      }
      const available = balance.onHand - balance.reserved;
      if (available < body.quantity) {
        throw new ConflictException({
          code: 'INSUFFICIENT_AVAILABLE',
          message: 'Not enough available inventory to reserve',
        });
      }

      const locked = await tx.inventoryBalance.updateMany({
        where: { id: balance.id, version: balance.version },
        data: {
          reserved: { increment: body.quantity },
          version: { increment: 1 },
        },
      });
      if (locked.count !== 1) {
        throw new ConflictException({
          code: 'OPTIMISTIC_LOCK',
          message: 'Inventory balance changed concurrently',
        });
      }

      await tx.inventoryMovement.create({
        data: {
          skuId: body.skuId,
          locationId,
          type: 'RESERVATION',
          quantity: body.quantity,
          reason: 'reserve',
          idempotencyKey: body.idempotencyKey,
          correlationId: body.orderId ?? body.cartId ?? null,
        },
      });

      const reservation = await tx.reservation.create({
        data: {
          skuId: body.skuId,
          locationId,
          quantity: body.quantity,
          status: 'HELD',
          expiresAt: body.expiresAt,
          orderId: body.orderId ?? null,
          cartId: body.cartId ?? null,
        },
      });
      return { reservationId: reservation.id };
    });
  }

  async release(reservationId: string, idempotencyKey: string): Promise<void> {
    const prisma = this.prisma();
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });
      if (reservation?.status !== 'HELD') {
        return;
      }
      const existing = await tx.inventoryMovement.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return;
      }

      const balance = await tx.inventoryBalance.findUnique({
        where: {
          skuId_locationId: {
            skuId: reservation.skuId,
            locationId: reservation.locationId,
          },
        },
      });
      if (!balance) {
        throw new NotFoundException({
          code: 'BALANCE_NOT_FOUND',
          message: 'Balance missing',
        });
      }

      const locked = await tx.inventoryBalance.updateMany({
        where: { id: balance.id, version: balance.version },
        data: {
          reserved: { decrement: reservation.quantity },
          version: { increment: 1 },
        },
      });
      if (locked.count !== 1) {
        throw new ConflictException({
          code: 'OPTIMISTIC_LOCK',
          message: 'Inventory balance changed concurrently',
        });
      }

      await tx.inventoryMovement.create({
        data: {
          skuId: reservation.skuId,
          locationId: reservation.locationId,
          type: 'RELEASE',
          quantity: reservation.quantity,
          reason: 'release',
          idempotencyKey,
        },
      });
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED' },
      });
    });
  }

  async commitToSale(
    reservationId: string,
    idempotencyKey: string,
  ): Promise<void> {
    const prisma = this.prisma();
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });
      if (!reservation) {
        throw new NotFoundException({
          code: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found',
        });
      }
      if (reservation.status === 'COMMITTED') {
        return;
      }
      if (reservation.status !== 'HELD') {
        throw new ConflictException({
          code: 'INVALID_RESERVATION',
          message: `Reservation status ${reservation.status}`,
        });
      }

      const existing = await tx.inventoryMovement.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return;
      }

      const balance = await tx.inventoryBalance.findUnique({
        where: {
          skuId_locationId: {
            skuId: reservation.skuId,
            locationId: reservation.locationId,
          },
        },
      });
      if (!balance) {
        throw new NotFoundException({
          code: 'BALANCE_NOT_FOUND',
          message: 'Balance missing',
        });
      }

      const locked = await tx.inventoryBalance.updateMany({
        where: { id: balance.id, version: balance.version },
        data: {
          onHand: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
          version: { increment: 1 },
        },
      });
      if (locked.count !== 1) {
        throw new ConflictException({
          code: 'OPTIMISTIC_LOCK',
          message: 'Inventory balance changed concurrently',
        });
      }

      await tx.inventoryMovement.create({
        data: {
          skuId: reservation.skuId,
          locationId: reservation.locationId,
          type: 'SALE',
          quantity: reservation.quantity,
          reason: 'commit_to_sale',
          idempotencyKey,
        },
      });
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'COMMITTED' },
      });
    });
  }
}
