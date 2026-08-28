const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'i',
  'me',
  'my',
  'we',
  'our',
  'you',
  'your',
  'need',
  'want',
  'for',
  'to',
  'is',
  'are',
  'am',
  'be',
  'do',
  'does',
  'did',
  'can',
  'could',
  'would',
  'should',
  'which',
  'one',
  'what',
  'that',
  'this',
  'with',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'it',
  'have',
  'has',
  'had',
  'about',
  'under',
  'below',
  'budget',
  'kes',
  'recommend',
  'recommendation',
  'product',
  'products',
  'something',
  'actually',
  'lower',
  'better',
  'best',
  'business',
]);

/**
 * Derive a catalog search query from conversational user messages.
 * Used by deterministic provider and search fallbacks when raw text misses FTS.
 */
export function deriveCatalogSearchQuery(
  userMessages: readonly string[],
): string {
  const joined = userMessages.join(' ').toLowerCase();

  const hints: string[] = [];
  if (/academic|writing|essay/i.test(joined)) {
    hints.push('academic writing');
  }
  if (/payout|disbursement/i.test(joined)) {
    hints.push('payout');
  }
  if (/survey|feedback|research/i.test(joined)) {
    hints.push('survey');
  }
  if (/moderation|community|chat/i.test(joined)) {
    hints.push('moderation');
  }
  if (/business|shop|buy/i.test(joined)) {
    hints.push('platform');
  }

  if (hints.length > 0) {
    return [...new Set(hints)].join(' ');
  }

  const tokens = joined
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  if (tokens.length > 0) {
    return tokens.slice(0, 4).join(' ');
  }

  return 'staging platform';
}
