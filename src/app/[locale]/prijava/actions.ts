"use server";

import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Pošalji magic link za prijavu/aktivaciju na uneti email. */
export async function sendLoginLink(formData: FormData) {
  const locale = String(formData.get("locale") ?? "sr");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    redirect({ href: "/prijava?greska=email", locale });
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/api/auth/confirm?next=/nalog` },
  });

  if (error) {
    redirect({
      href: `/prijava?greska=${error.status === 429 ? "limit" : "slanje"}`,
      locale,
    });
  }

  redirect({ href: `/prijava?poslato=${encodeURIComponent(email)}`, locale });
}
