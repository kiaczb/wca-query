import { redirect } from "next/navigation";

import { consumeOAuthState, writeSession } from "@/lib/session";
import { exchangeCodeForTokens, fetchWcaUser } from "@/lib/wca-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = new URL("/", url);

  const failure = (reason: string) => {
    home.searchParams.set("auth_error", reason);
    return home.toString();
  };

  const denial = url.searchParams.get("error");
  if (denial) {
    redirect(
      failure(
        denial === "access_denied"
          ? "Nem adtál hozzáférést a WCA-fiókodhoz."
          : "A WCA elutasította a bejelentkezési kérést.",
      ),
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = await consumeOAuthState();

  if (!code) {
    redirect(failure("A WCA nem küldött vissza engedélyezési kódot."));
  }
  if (!state || !expectedState || state !== expectedState) {
    redirect(failure("A bejelentkezési link lejárt. Próbáld újra."));
  }

  let target: string;
  try {
    const tokens = await exchangeCodeForTokens(code, url.origin);
    const user = await fetchWcaUser(tokens.accessToken);
    await writeSession(tokens, user);
    target = home.toString();
  } catch (error) {
    console.error("WCA OAuth callback failed:", (error as Error).message);
    target = failure("Nem sikerült befejezni a WCA-s bejelentkezést.");
  }

  redirect(target);
}
