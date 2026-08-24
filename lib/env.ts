

import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export const wcaBaseUrl = () =>
  optional("WCA_BASE_URL", "https://www.worldcubeassociation.org").replace(/\/+$/, "");

export const wcaStatisticsApiUrl = () =>
  optional(
    "WCA_STATISTICS_API_URL",
    "https://statistics-api.worldcubeassociation.org",
  ).replace(/\/+$/, "");

export const wcaClientId = () => required("WCA_CLIENT_ID");
export const wcaClientSecret = () => required("WCA_CLIENT_SECRET");

export function wcaRedirectUri(origin: string): string {
  return optional("WCA_OAUTH_REDIRECT_URI", `${origin}/api/auth/callback`);
}

export const wcaScope = () => optional("WCA_OAUTH_SCOPE", "public");

export const groqApiKey = () => required("GROQ_API_KEY");
export const groqModel = () => optional("GROQ_MODEL", "openai/gpt-oss-120b");

export const sessionSecret = () => required("SESSION_SECRET");

export function pageSize(): number {
  const parsed = Number.parseInt(optional("RESULTS_PAGE_SIZE", "25"), 10);
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(100, Math.max(1, parsed));
}
