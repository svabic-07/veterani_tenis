import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Potvrda prijave iz email linka (magic link).
 * Podržava oba oblika: PKCE `?code=` (podrazumevani Supabase šablon) i
 * `?token_hash=&type=` (prilagođen šablon). Posle potvrde vodi na `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Samo relativne putanje — sprečava open redirect.
  const nextParam = searchParams.get("next") ?? "/nalog";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/nalog";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/prijava?greska=link", origin));
}
