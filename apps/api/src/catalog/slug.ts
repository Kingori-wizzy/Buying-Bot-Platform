/** URL-safe slug from a display name; appends short suffix when needed. */
export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base.length > 0 ? base : 'item';
}

export function slugWithSuffix(input: string, suffix: string): string {
  const base = slugify(input).slice(0, 70);
  const cleanSuffix = suffix.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  return `${base}-${cleanSuffix}`;
}

/** True when `value` is a UUID (used to avoid Prisma UUID parse errors on slugs). */
export function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
