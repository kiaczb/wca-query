

import "server-only";

import { randomBytes } from "node:crypto";

type Entry = {
  sid: string;
  sql: string;
  prompt: string;
  explanation: string;
  expiresAt: number;
};

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 500;

const entries = new Map<string, Entry>();

function sweep(now: number): void {
  for (const [id, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(id);
  }

  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

export function rememberQuery(
  sid: string,
  sql: string,
  prompt: string,
  explanation: string,
): string {
  const now = Date.now();
  sweep(now);
  const id = randomBytes(12).toString("base64url");
  entries.set(id, { sid, sql, prompt, explanation, expiresAt: now + TTL_MS });
  return id;
}

export function recallQuery(
  sid: string,
  id: string,
): Omit<Entry, "expiresAt" | "sid"> | null {
  const entry = entries.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(id);
    return null;
  }
  if (entry.sid !== sid) return null;
  return { sql: entry.sql, prompt: entry.prompt, explanation: entry.explanation };
}
