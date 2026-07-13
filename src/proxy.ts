import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

/**
 * Proxy: (1) osveži Supabase sesiju (refresh istekao JWT → novi cookie),
 * (2) next-intl rutiranje. Supabase piše cookie-je i u request (da ih RSC
 * u istom zahtevu vidi kroz i18n response) i u finalni response.
 */
export default async function proxy(request: NextRequest) {
  let pendingCookies: { name: string; value: string; options?: object }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          pendingCookies = cookiesToSet;
        },
      },
    },
  );

  // Ne uklanjati: obnavlja istekli token pre renderovanja.
  await supabase.auth.getClaims();

  const response = handleI18n(request);
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}

export const config = {
  // Sve rute osim API, Next internih fajlova, i fajlova sa ekstenzijom.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
