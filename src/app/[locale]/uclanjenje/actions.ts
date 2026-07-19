"use server";

import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

const KATEGORIJE = ["I", "II", "III", "IV", "V"] as const;

/** Javni zahtev za učlanjenje — upis u membership_requests (RLS: public insert). */
export async function membershipRequestAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "sr");
  const s = (name: string, max: number) =>
    String(formData.get(name) ?? "").trim().slice(0, max);

  const ime = s("ime", 60);
  const prezime = s("prezime", 60);
  const email = s("email", 120).toLowerCase();
  const godisteRaw = s("godiste", 4);
  const godiste = /^\d{4}$/.test(godisteRaw) ? Number(godisteRaw) : null;
  const katRaw = s("kategorija", 4);
  const kategorija = (KATEGORIJE as readonly string[]).includes(katRaw)
    ? (katRaw as (typeof KATEGORIJE)[number])
    : null;

  if (ime.length < 2 || prezime.length < 2 || !email.includes("@")) {
    redirect({ href: "/uclanjenje?greska=1", locale });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("membership_requests").insert({
    ime,
    prezime,
    godiste,
    grad: s("grad", 80) || null,
    klub: s("klub", 120) || null,
    kategorija,
    email,
    telefon: s("telefon", 40) || null,
    napomena: s("napomena", 500) || null,
  });

  redirect({ href: error ? "/uclanjenje?greska=1" : "/uclanjenje?poslato=1", locale });
}
