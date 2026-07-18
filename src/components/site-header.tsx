"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";

const NAV = [
  { key: "calendar", href: "/kalendar" },
  { key: "rankings", href: "/rang-liste" },
  { key: "players", href: "/igraci" },
  { key: "rules", href: "/pravilnik" },
  { key: "news", href: "/vesti" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const tb = useTranslations("brand");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // Stanje prijave se čita u browseru da bi statične stranice ostale statične.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setLoggedIn(!!session),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const authHref = loggedIn ? "/nalog" : "/prijava";
  const authLabel = loggedIn ? t("myAccount") : t("login");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 text-white backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Logo size={38} />
          <span className="leading-tight">
            <span className="block font-display text-sm font-extrabold tracking-tight">
              {tb("name")}
            </span>
            <span className="block text-[0.62rem] uppercase tracking-[0.16em] text-white/50">
              {tb("tagline")}
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map(({ key, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={key}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/8 hover:text-white"
                }`}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          <LocaleSwitcher />
          <Link
            href={authHref}
            className="hidden rounded-lg bg-clay px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-clay-dark sm:inline-block"
          >
            {authLabel}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t("menu")}
            className="rounded-lg border border-white/20 bg-white/10 p-2 lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-white/10 bg-navy px-4 pb-4 pt-2 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {NAV.map(({ key, href }) => (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/8 hover:text-white"
              >
                {t(key)}
              </Link>
            ))}
            <Link
              href={authHref}
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-clay px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              {authLabel}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
