import { redirect } from "next/navigation";

import { buildAuthorizeUrl } from "@/lib/wca-oauth";
import { writeOAuthState } from "@/lib/session";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const state = await writeOAuthState();
  redirect(buildAuthorizeUrl(origin, state));
}
