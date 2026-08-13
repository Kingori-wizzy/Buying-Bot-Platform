/**
 * Simple paragraph / size splitter for knowledge ingest (M16).
 */

export interface ChunkOptions {
  readonly maxChars?: number;
  readonly overlapChars?: number;
}

export interface TextChunk {
  readonly ordinal: number;
  readonly content: string;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {},
): readonly TextChunk[] {
  const maxChars = options.maxChars ?? 800;
  const overlapChars = options.overlapChars ?? 80;
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: TextChunk[] = [];
  let buffer = '';

  const flush = (): void => {
    const content = buffer.trim();
    if (!content) {
      return;
    }
    chunks.push({ ordinal: chunks.length, content });
    if (overlapChars > 0 && content.length > overlapChars) {
      buffer = content.slice(-overlapChars);
    } else {
      buffer = '';
    }
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (buffer) {
        flush();
      }
      for (let i = 0; i < paragraph.length; i += maxChars - overlapChars) {
        const slice = paragraph.slice(i, i + maxChars);
        chunks.push({ ordinal: chunks.length, content: slice });
      }
      buffer = '';
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && buffer) {
      flush();
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }

  if (buffer.trim()) {
    const content = buffer.trim();
    chunks.push({ ordinal: chunks.length, content });
  }

  return chunks;
}

export function contentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash * 31 + content.charCodeAt(i)) >>> 0;
  }
  return `h${hash.toString(16).padStart(8, '0')}`;
}
