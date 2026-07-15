import type { ReactNode } from "react";
import Image from "next/image";

/**
 * Potpisni TVS hero — navy gradijent sa dva radijalna sjaja (ball gore-desno,
 * clay levo). Eyebrow sa ball tačkicom, veliki Sora naslov, lead, CTA slot i
 * opciona mono traka statistike. `image` = foto hero (navy overlay radi
 * čitljivosti). `crumb` = mono putanja. `compact` = niži hero za podstranice.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  crumb,
  image,
  stats,
  children,
  badge,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  crumb?: string;
  image?: string;
  stats?: { value: string; label: string }[];
  children?: ReactNode;
  badge?: ReactNode;
  compact?: boolean;
}) {
  // Compact hero podrazumevano koristi letterbox foto traku; početna prosleđuje svoju.
  const bgImage = image ?? (compact ? "/tvs-hero-compact.webp" : undefined);
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      {bgImage ? (
        <>
          <Image
            src={bgImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                // horizontalno: jako levo (zona teksta) → svetlije desno (slika);
                // + blagi vrh→dno sloj da naslov/stat ostanu čitljivi preko sunčevog flare-a
                "linear-gradient(90deg, rgba(21,35,58,.97) 0%, rgba(21,35,58,.90) 34%, rgba(21,35,58,.60) 60%, rgba(21,35,58,.24) 100%)," +
                "linear-gradient(180deg, rgba(21,35,58,.28) 0%, rgba(21,35,58,0) 34%, rgba(21,35,58,.34) 100%)",
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(680px 320px at 88% -10%, rgba(214,232,75,.18), transparent 65%)," +
              "radial-gradient(560px 300px at 0% 20%, rgba(200,85,61,.34), transparent 66%)," +
              "linear-gradient(135deg, #16263E 0%, #13314A 52%, #1C5340 100%)",
          }}
        />
      )}

      <div
        className={`relative z-[1] mx-auto max-w-6xl px-4 sm:px-6 ${
          compact ? "py-10 sm:py-12" : "py-14 sm:py-20"
        }`}
      >
        {crumb && <div className="mb-3 font-mono text-sm font-bold text-ball">{crumb}</div>}
        {eyebrow && (
          <div className="mb-3.5 inline-flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-ball shadow-[0_0_10px_rgba(214,232,75,.7)]" />
            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/80">
              {eyebrow}
            </span>
          </div>
        )}
        {badge && <div className="mb-3">{badge}</div>}
        <h1
          className={`max-w-3xl font-display font-extrabold leading-[1.08] tracking-tight text-white ${
            compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
          }`}
        >
          {title}
        </h1>
        {lead && <p className="mt-3.5 max-w-2xl text-lg leading-relaxed text-white/75">{lead}</p>}
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
        {stats && stats.length > 0 && (
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-mono text-2xl font-extrabold leading-none text-white">
                  {s.value}
                </dt>
                <dd className="mt-1.5 text-sm text-white/60">{s.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
