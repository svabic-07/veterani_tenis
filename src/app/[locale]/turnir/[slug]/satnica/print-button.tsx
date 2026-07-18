"use client";

export function PrintButton({ label }: Readonly<{ label: string }>) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 print:hidden"
    >
      🖨️ {label}
    </button>
  );
}
