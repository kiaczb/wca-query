

import "server-only";

import { wcaStatisticsApiUrl } from "./env";
import type { QueryResults } from "./types";

export type { QueryResults } from "./types";

export class WcaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function extractMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.length > 0) {
      return record.message;
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") {
        const nested = extractMessage(value, status);
        if (nested && !nested.startsWith("A WCA Statisztika API")) return nested;
      }
    }
  }
  return `A WCA Statisztika API HTTP ${status} hibát adott.`;
}

export async function runQuery(
  sqlQuery: string,
  page: number,
  size: number,
  accessToken: string,
): Promise<QueryResults> {
  let response: Response;
  try {
    response = await fetch(`${wcaStatisticsApiUrl()}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sqlQuery, page, size }),
      cache: "no-store",
      signal: AbortSignal.timeout(125_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new WcaApiError("A lekérdezés túl sokáig futott, ezért megszakítottuk.", 504);
    }
    throw new WcaApiError("Nem sikerült elérni a WCA Statisztika API-t.", 502);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new WcaApiError(extractMessage(payload, response.status), response.status);
  }

  const results = payload as QueryResults | null;
  if (!results || !Array.isArray(results.headers)) {
    throw new WcaApiError(
      "A WCA Statisztika API váratlan választ adott.",
      502,
    );
  }
  return results;
}
