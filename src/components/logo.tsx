/** TVS logo — teniska loptica (ball gradient) sa mrežicom, po specifikaciji. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative grid place-items-center overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "radial-gradient(circle at 32% 30%, var(--color-ball), var(--color-ball-deep) 70%)",
        boxShadow: "inset 0 0 0 3px rgba(255,255,255,.18), var(--shadow-tvs)",
      }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
        <path
          d="M6 20a14 14 0 0 1 8-12.6A14 14 0 0 0 14 32.6 14 14 0 0 1 6 20Z"
          stroke="rgba(20,35,58,.55)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M34 20a14 14 0 0 0-8-12.6A14 14 0 0 1 26 32.6 14 14 0 0 0 34 20Z"
          stroke="rgba(20,35,58,.55)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </span>
  );
}
