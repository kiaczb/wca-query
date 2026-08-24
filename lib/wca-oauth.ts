

import "server-only";

import {
  wcaBaseUrl,
  wcaClientId,
  wcaClientSecret,
  wcaRedirectUri,
  wcaScope,
} from "./env";

export type WcaTokens = {
  accessToken: string;
  refreshToken?: string;

  expiresAt: number;
};

export type WcaUser = {
  id: number;
  name: string;
  wcaId: string | null;
};

export class WcaOAuthError extends Error {}

export function buildAuthorizeUrl(origin: string, state: string): string {
  const url = new URL(`${wcaBaseUrl()}/oauth/authorize`);
  url.searchParams.set("client_id", wcaClientId());
  url.searchParams.set("redirect_uri", wcaRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", wcaScope());
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function requestTokens(body: URLSearchParams): Promise<WcaTokens> {
  const response = await fetch(`${wcaBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  let payload: TokenResponse;
  try {
    payload = (await response.json()) as TokenResponse;
  } catch {
    throw new WcaOAuthError(
      `A WCA értelmezhetetlen token-választ adott (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || !payload.access_token) {
    throw new WcaOAuthError(
      payload.error_description ??
        payload.error ??
        `A WCA elutasította a token-kérést (HTTP ${response.status}).`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + (payload.expires_in ?? 7200) * 1000,
  };
}

export function exchangeCodeForTokens(
  code: string,
  origin: string,
): Promise<WcaTokens> {
  return requestTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: wcaClientId(),
      client_secret: wcaClientSecret(),
      redirect_uri: wcaRedirectUri(origin),
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<WcaTokens> {
  return requestTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: wcaClientId(),
      client_secret: wcaClientSecret(),
    }),
  );
}

export async function fetchWcaUser(accessToken: string): Promise<WcaUser> {
  const response = await fetch(`${wcaBaseUrl()}/api/v0/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new WcaOAuthError(
      `A WCA nem tudta azonosítani a token tulajdonosát (HTTP ${response.status}).`,
    );
  }

  const payload = (await response.json()) as {
    me?: { id?: number; name?: string; wca_id?: string | null };
  };

  if (!payload.me) {
    throw new WcaOAuthError("A WCA váratlan profilválaszt adott.");
  }

  return {
    id: payload.me.id ?? 0,
    name: payload.me.name ?? "WCA user",
    wcaId: payload.me.wca_id ?? null,
  };
}
