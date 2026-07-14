/** Inicijali-avatar u court krugu. `onDark` za hero na navy podlozi. */
export function Avatar({
  ime,
  prezime,
  size = 44,
  onDark = false,
}: {
  ime: string;
  prezime: string;
  size?: number;
  onDark?: boolean;
}) {
  const initials = `${ime[0] ?? ""}${prezime[0] ?? ""}`.toUpperCase();
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-display font-bold ${
        onDark ? "bg-white/15 text-white" : "bg-court/12 text-court-dark"
      }`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
