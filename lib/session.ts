

import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { sessionSecret } from "./env";
import { refreshTokens, type WcaTokens, type WcaUser } from "./wca-oauth";

const SESSION_COOKIE = "wca_session";
const STATE_COOKIE = "wca_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

const REFRESH_MARGIN_MS = 60_000;

export type Session = {
  sid: string;
  tokens: WcaTokens;
  user: WcaUser;
};

export type PublicSession = {
  name: string;
  wcaId: string | null;
};

function key(): Buffer {
  return createHash("sha256").update(sessionSecret()).digest();
}

function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

function decrypt(value: string): string | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(parts[0], "base64url"),
    );
    decipher.setAuthTag(Buffer.from(parts[1], "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[2], "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export async function writeSession(
  tokens: WcaTokens,
  user: WcaUser,
  sid = randomBytes(16).toString("base64url"),
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encrypt(JSON.stringify({ sid, tokens, user })), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

function parseSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  const plaintext = decrypt(raw);
  if (!plaintext) return null;
  try {
    const parsed = JSON.parse(plaintext) as Session;
    if (!parsed?.tokens?.accessToken || !parsed.sid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

export async function readActiveSession(): Promise<Session | null> {
  const session = await readSession();
  if (!session) return null;

  if (session.tokens.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return session;
  }

  if (!session.tokens.refreshToken) {
    await clearSession();
    return null;
  }

  try {
    const tokens = await refreshTokens(session.tokens.refreshToken);

    const merged: WcaTokens = {
      ...tokens,
      refreshToken: tokens.refreshToken ?? session.tokens.refreshToken,
    };
    await writeSession(merged, session.user, session.sid);
    return { ...session, tokens: merged };
  } catch {
    await clearSession();
    return null;
  }
}

export function toPublicSession(session: Session): PublicSession {
  return { name: session.user.name, wcaId: session.user.wcaId };
}

export async function writeOAuthState(): Promise<string> {
  const state = randomBytes(16).toString("base64url");
  const store = await cookies();
  store.set(STATE_COOKIE, encrypt(state), { ...cookieOptions, maxAge: 600 });
  return state;
}

export async function consumeOAuthState(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);
  return raw ? decrypt(raw) : null;
}
