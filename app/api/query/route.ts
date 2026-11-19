

import { NextResponse } from "next/server";

import { pageSize } from "@/lib/env";
import { correctSql, generateSql, GroqError, type SqlDraft } from "@/lib/groq";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { recallQuery, rememberQuery } from "@/lib/query-store";
import { cachedSql, cacheSql, forgetSql } from "@/lib/sql-cache";
import { readActiveSession } from "@/lib/session";
import { validateSql } from "@/lib/sql-validator";
import { runQuery, WcaApiError } from "@/lib/wca-api";

const MAX_PROMPT_LENGTH = 500;

const MAX_GROQ_ATTEMPTS = 2;

type Stage = "auth" | "rate_limit" | "input" | "groq" | "validation" | "wca";

function fail(stage: Stage, error: string, status: number, extra: object = {}) {
  return NextResponse.json({ stage, error, ...extra }, { status });
}

export async function POST(request: Request) {
  const session = await readActiveSession();
  if (!session) {
    return fail(
      "auth",
      "A lekérdezéshez jelentkezz be a WCA-fiókoddal.",
      401,
    );
  }

  const perSession = rateLimit(`query:${session.sid}`, 20, 60_000);
  const perAddress = rateLimit(`ip:${clientKey(request)}`, 40, 60_000);
  if (!perSession.allowed || !perAddress.allowed) {
    const retryAfter = Math.max(perSession.retryAfter, perAddress.retryAfter);
    return fail(
      "rate_limit",
      `Túl sok lekérdezés. Próbáld újra ${retryAfter} másodperc múlva.`,
      429,
      { retryAfter },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("input", "A kérés törzse nem érvényes JSON.", 400);
  }

  const { prompt, queryId, page } = (body ?? {}) as {
    prompt?: unknown;
    queryId?: unknown;
    page?: unknown;
  };

  const requestedPage =
    typeof page === "number" && Number.isInteger(page) && page >= 0 ? page : 0;
  const size = pageSize();

  if (typeof queryId === "string" && queryId.length > 0) {
    const remembered = recallQuery(session.sid, queryId);
    if (!remembered) {
      return fail(
        "input",
        "Ez a lekérdezés már nem érhető el. Futtasd újra.",
        410,
      );
    }

    const validation = validateSql(remembered.sql);
    if (!validation.ok) {
      return fail("validation", validation.reason, 400);
    }

    try {
      const results = await runQuery(
        validation.sql,
        requestedPage,
        size,
        session.tokens.accessToken,
      );
      return NextResponse.json({
        queryId,
        query: validation.sql,
        explanation: remembered.explanation,
        results,
      });
    } catch (error) {
      return wcaFailure(error, validation.sql);
    }
  }

  if (typeof prompt !== "string") {
    return fail("input", "Írj be egy kérdést a lekérdezés futtatásához.", 400);
  }

  const question = prompt.trim().replace(/\s+/g, " ");
  if (question.length === 0) {
    return fail("input", "Írj be egy kérdést a lekérdezés futtatásához.", 400);
  }
  if (question.length > MAX_PROMPT_LENGTH) {
    return fail(
      "input",
      `A kérdés legfeljebb ${MAX_PROMPT_LENGTH} karakter lehet.`,
      400,
    );
  }

  // Same question asked before: reuse the SQL the WCA API already accepted and
  // skip Groq entirely.
  const cached = cachedSql(question);
  if (cached) {
    const validation = validateSql(cached.sql);
    if (validation.ok) {
      try {
        const results = await runQuery(
          validation.sql,
          requestedPage,
          size,
          session.tokens.accessToken,
        );
        const id = rememberQuery(
          session.sid,
          validation.sql,
          question,
          cached.explanation,
        );
        return NextResponse.json({
          queryId: id,
          query: validation.sql,
          explanation: cached.explanation,
          results,
        });
      } catch (error) {
        // A 400 means the stored SQL no longer works; regenerate it below.
        if (!(error instanceof WcaApiError) || error.status !== 400) {
          return wcaFailure(error, validation.sql);
        }
      }
    }
    forgetSql(question);
  }

  let draft: SqlDraft;
  try {
    draft = await generateSql(question);
  } catch (error) {
    return groqFailure(error);
  }

  let attempt = 1;
  let lastQuery = "";

  while (attempt <= MAX_GROQ_ATTEMPTS) {
    if (!draft.ok) {
      return fail(
        "groq",
        draft.error ||
          "Erre a kérdésre a WCA eredmény-adatbázisból nem lehet válaszolni.",
        422,
      );
    }

    const validation = validateSql(draft.query);
    lastQuery = draft.query;

    if (!validation.ok) {
      if (attempt >= MAX_GROQ_ATTEMPTS) {
        return fail("validation", validation.reason, 422, { query: lastQuery });
      }
      attempt += 1;
      try {
        draft = await correctSql(question, lastQuery, validation.reason);
      } catch (error) {
        return groqFailure(error);
      }
      continue;
    }

    try {
      const results = await runQuery(
        validation.sql,
        requestedPage,
        size,
        session.tokens.accessToken,
      );
      const id = rememberQuery(
        session.sid,
        validation.sql,
        question,
        draft.explanation,
      );
      cacheSql(question, validation.sql, draft.explanation);
      return NextResponse.json({
        queryId: id,
        query: validation.sql,
        explanation: draft.explanation,
        results,
      });
    } catch (error) {
      const retryable =
        error instanceof WcaApiError &&
        error.status === 400 &&
        attempt < MAX_GROQ_ATTEMPTS;

      if (!retryable) {
        return wcaFailure(error, validation.sql);
      }

      attempt += 1;
      try {
        draft = await correctSql(question, validation.sql, error.message);
      } catch (groqError) {
        return groqFailure(groqError);
      }
    }
  }

  return fail(
    "validation",
    "Nem sikerült olyan lekérdezést készíteni, amit a WCA API elfogad.",
    422,
    { query: lastQuery },
  );
}

function groqFailure(error: unknown) {
  if (error instanceof GroqError) {
    console.error("Groq request failed:", error.message);
    if (error.status === 429) {
      return fail("rate_limit", error.message, 429, {
        retryAfter: error.retryAfter,
      });
    }
    return fail("groq", error.message, error.status);
  }
  console.error("Unexpected error while generating SQL:", error);
  return fail("groq", "Nem sikerült lekérdezést készíteni.", 500);
}

function wcaFailure(error: unknown, query: string) {
  if (error instanceof WcaApiError) {
    if (error.isAuthError) {
      return fail("auth", "A WCA-munkameneted lejárt. Jelentkezz be újra.", 401);
    }
    return fail("wca", error.message, error.status === 429 ? 429 : 400, {
      query,
    });
  }
  console.error("Unexpected error while querying WCA:", error);
  return fail("wca", "A lekérdezést nem sikerült lefuttatni.", 500, { query });
}
