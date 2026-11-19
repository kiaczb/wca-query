import "server-only";

// Remembers the SQL Groq wrote for a question, so asking the same thing again
// (the example chips, a re-run, another user) costs no Groq tokens. Only
// queries the WCA API actually accepted are stored. The SQL does not depend on
// who asked, so the cache is shared across sessions.

type Entry = { sql: string; explanation: string; expiresAt: number };

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 1000;

const entries = new Map<string, Entry>();

export function normalizeQuestion(question: string): string {
  return question
    .toLocaleLowerCase("hu-HU")
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cachedSql(
  question: string,
): { sql: string; explanation: string } | null {
  const key = normalizeQuestion(question);
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return null;
  }
  // Re-insert to keep the Map ordered by recency (LRU).
  entries.delete(key);
  entries.set(key, entry);
  return { sql: entry.sql, explanation: entry.explanation };
}

export function cacheSql(question: string, sql: string, explanation: string) {
  const key = normalizeQuestion(question);
  entries.delete(key);
  entries.set(key, { sql, explanation, expiresAt: Date.now() + TTL_MS });
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

export function forgetSql(question: string) {
  entries.delete(normalizeQuestion(question));
}
