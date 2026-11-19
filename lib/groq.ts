

import "server-only";

import { groqApiKey, groqMaxTokens, groqModel, groqReasoningEffort } from "./env";
import { buildSystemPrompt } from "./wca-schema";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export type SqlDraft = {
  ok: boolean;
  query: string;
  explanation: string;
  error: string;
};

export class GroqError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly retryAfter = 0,
  ) {
    super(message);
  }
}

// gpt-oss models spend most of their output on hidden reasoning. "low" cuts
// that by a large factor and is plenty for a single SQL statement. Other model
// families reject or ignore these fields, so only send them where they apply.
function reasoningOptions(model: string): Record<string, unknown> {
  if (!model.startsWith("openai/gpt-oss")) return {};
  return { reasoning_effort: groqReasoningEffort(), include_reasoning: false };
}

const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "wca_sql_query",
    strict: true,
    schema: {
      type: "object",
      properties: {
        ok: {
          type: "boolean",
          description:
            "true when the question can be answered with the given schema.",
        },
        query: {
          type: "string",
          description:
            "The single read-only SQL statement, or an empty string when ok is false.",
        },
        explanation: {
          type: "string",
          description:
            "One or two plain sentences describing what the query returns.",
        },
        error: {
          type: "string",
          description:
            "Why the question cannot be answered, or an empty string when ok is true.",
        },
      },
      required: ["ok", "query", "explanation", "error"],
      additionalProperties: false,
    },
  },
} as const;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function complete(messages: ChatMessage[]): Promise<SqlDraft> {
  let response: Response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey()}`,
      },
      body: JSON.stringify({
        model: groqModel(),
        messages,
        temperature: 0.1,
        max_completion_tokens: groqMaxTokens(),
        response_format: RESPONSE_FORMAT,
        ...reasoningOptions(groqModel()),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new GroqError("A Groq nem válaszolt időben.");
    }
    throw new GroqError("Nem sikerült elérni a Groqot.");
  }

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    if (response.status === 429) {
      const header = Number.parseFloat(response.headers.get("retry-after") ?? "");
      const retryAfter =
        Number.isFinite(header) && header > 0 ? Math.ceil(header) : 60;
      throw new GroqError(
        `Elfogyott a Groq keret. Próbáld újra kb. ${retryAfter} másodperc múlva.`,
        429,
        retryAfter,
      );
    }

    throw new GroqError(
      detail?.error?.message ?? `A Groq HTTP ${response.status} hibát adott.`,
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new GroqError("A Groq üres választ adott.");
  }

  let parsed: Partial<SqlDraft>;
  try {
    parsed = JSON.parse(content) as Partial<SqlDraft>;
  } catch {
    throw new GroqError("A Groq nem érvényes JSON választ adott.");
  }

  return {
    ok: parsed.ok === true,
    query: typeof parsed.query === "string" ? parsed.query : "",
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
    error: typeof parsed.error === "string" ? parsed.error : "",
  };
}

export function generateSql(prompt: string): Promise<SqlDraft> {
  return complete([
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: prompt },
  ]);
}

export function correctSql(
  prompt: string,
  previousQuery: string,
  failure: string,
): Promise<SqlDraft> {
  return complete([
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: prompt },
    {
      role: "assistant",
      content: JSON.stringify({ ok: true, query: previousQuery, explanation: "", error: "" }),
    },
    {
      role: "user",
      content: `That query was rejected:

${failure}

Rewrite it so it runs. Change only what the failure requires, keep answering the
original question, and stay within the schema and rules above. If the question
cannot be answered after all, set ok to false and explain why. Keep writing
"explanation" and "error" in the language the original question used.`,
    },
  ]);
}
