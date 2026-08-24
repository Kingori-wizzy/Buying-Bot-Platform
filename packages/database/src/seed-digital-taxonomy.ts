import type { PrismaClient } from '@prisma/client';

/**
 * Five top-level shop categories for the admin-managed digital catalog.
 * Idempotent. Does NOT invent commercial products or prices.
 */
export const DIGITAL_SHOP_ROOT_CATEGORIES = [
  {
    name: 'AI Platforms',
    slug: 'ai-platforms',
    description: 'AI tools and platform digital products',
    sortOrder: 10,
  },
  {
    name: 'Payout Platforms',
    slug: 'payout-platforms',
    description: 'Payout-related digital platforms',
    sortOrder: 20,
  },
  {
    name: 'Academic Writing Accounts',
    slug: 'academic-writing-accounts',
    description: 'Academic writing platform digital accounts',
    sortOrder: 30,
  },
  {
    name: 'Survey Platforms',
    slug: 'survey-platforms',
    description: 'Survey platform digital products',
    sortOrder: 40,
  },
  {
    name: 'Chat Moderation Platforms',
    slug: 'chat-moderation-platforms',
    description: 'Chat moderation platform digital products',
    sortOrder: 50,
  },
] as const;

export async function seedDigitalShopTaxonomy(
  prisma: PrismaClient,
): Promise<{ categoryIds: readonly string[] }> {
  const categoryIds: string[] = [];
  for (const row of DIGITAL_SHOP_ROOT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { slug: row.slug, deletedAt: null },
    });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: row.name,
          description: row.description,
          sortOrder: row.sortOrder,
          active: true,
          parentId: null,
        },
      });
      categoryIds.push(existing.id);
      continue;
    }
    const created = await prisma.category.create({
      data: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        sortOrder: row.sortOrder,
        active: true,
        parentId: null,
      },
    });
    categoryIds.push(created.id);
  }
  return { categoryIds };
}
