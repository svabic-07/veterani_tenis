/** Velika brojka + labela. Value uvek mono (potpis sistema). */
export function Metric({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <b
        className={`block font-mono text-[26px] font-extrabold leading-none ${
          accent ? "text-clay-dark" : "text-navy"
        }`}
      >
        {value}
      </b>
      <span className="mt-1.5 block text-[13px] text-muted">{label}</span>
    </div>
  );
}
