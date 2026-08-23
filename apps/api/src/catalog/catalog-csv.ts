/**
 * Parse admin catalog CSV (header row required).
 * Columns: name, slug, shortDescription, description, brand, category,
 * internalSku, listPriceMinor, currency, initialStock, status
 */
export interface CatalogCsvRow {
  readonly rowNumber: number;
  readonly name: string;
  readonly slug?: string;
  readonly shortDescription?: string;
  readonly description?: string;
  readonly brand?: string;
  readonly category?: string;
  readonly internalSku?: string;
  readonly listPriceMinor?: number;
  readonly currency?: string;
  readonly initialStock?: number;
  readonly status?: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export interface CatalogCsvParseResult {
  readonly rows: CatalogCsvRow[];
  readonly errors: { rowNumber: number; error: string }[];
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch ?? '';
  }
  cells.push(current.trim());
  return cells;
}

export function parseCatalogCsv(csvText: string): CatalogCsvParseResult {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const headerLine = lines[0];
  if (lines.length < 2 || headerLine === undefined) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, error: 'CSV must include a header and at least one data row' }],
    };
  }
  const header = splitCsvLine(headerLine).map((h) => h.toLowerCase());
  const idx = (name: string): number => header.indexOf(name.toLowerCase());
  const nameIdx = idx('name');
  if (nameIdx < 0) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, error: 'Missing required column: name' }],
    };
  }

  const rows: CatalogCsvRow[] = [];
  const errors: { rowNumber: number; error: string }[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const line = lines[i];
    if (line === undefined) {
      continue;
    }
    const cells = splitCsvLine(line);
    const name = cells[nameIdx]?.trim() ?? '';
    if (!name) {
      errors.push({ rowNumber, error: 'name is required' });
      continue;
    }
    const priceIdx = header.findIndex(
      (h) => h === 'listpriceminor' || h === 'list_price_minor',
    );
    const stockIdx = header.findIndex(
      (h) => h === 'initialstock' || h === 'initial_stock',
    );
    const statusIdx = idx('status');
    const listPriceMinor =
      priceIdx >= 0 && cells[priceIdx]
        ? Number.parseInt(cells[priceIdx], 10)
        : undefined;
    if (listPriceMinor !== undefined && (!Number.isFinite(listPriceMinor) || listPriceMinor < 0)) {
      errors.push({ rowNumber, error: 'listPriceMinor must be a non-negative integer' });
      continue;
    }
    const initialStock =
      stockIdx >= 0 && cells[stockIdx]
        ? Number.parseInt(cells[stockIdx], 10)
        : undefined;
    if (initialStock !== undefined && (!Number.isFinite(initialStock) || initialStock < 0)) {
      errors.push({ rowNumber, error: 'initialStock must be a non-negative integer' });
      continue;
    }
    const statusRaw = statusIdx >= 0 ? cells[statusIdx]?.toUpperCase() : undefined;
    const allowed = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
    const status = allowed.find((s) => s === statusRaw);

    rows.push({
      rowNumber,
      name,
      ...(idx('slug') >= 0 && cells[idx('slug')]
        ? { slug: cells[idx('slug')] }
        : {}),
      ...(idx('shortdescription') >= 0 && cells[idx('shortdescription')]
        ? { shortDescription: cells[idx('shortdescription')] }
        : {}),
      ...(idx('description') >= 0 && cells[idx('description')]
        ? { description: cells[idx('description')] }
        : {}),
      ...(idx('brand') >= 0 && cells[idx('brand')]
        ? { brand: cells[idx('brand')] }
        : {}),
      ...(idx('category') >= 0 && cells[idx('category')]
        ? { category: cells[idx('category')] }
        : {}),
      ...(idx('internalsku') >= 0 && cells[idx('internalsku')]
        ? { internalSku: cells[idx('internalsku')] }
        : {}),
      ...(listPriceMinor !== undefined ? { listPriceMinor } : {}),
      ...(idx('currency') >= 0 && cells[idx('currency')]
        ? { currency: (cells[idx('currency')] ?? '').toUpperCase() }
        : {}),
      ...(initialStock !== undefined ? { initialStock } : {}),
      ...(status ? { status } : {}),
    });
  }

  return { rows, errors };
}
