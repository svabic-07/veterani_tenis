"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";

/** Prekidač jezika SR/EN — čuva trenutnu putanju. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale) return;
    startTransition(() => {
      // @ts-expect-error -- params tip je generički, rute prihvataju
      router.replace({ pathname, params }, { locale: next });
    });
  }

  return (
    <div
      className="inline-flex items-center rounded-full border border-white/25 bg-white/10 p-0.5 text-xs font-semibold"
      role="group"
      aria-label="Jezik / Language"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={isPending}
          aria-current={l === locale ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            l === locale ? "bg-white text-navy" : "text-white/80 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
