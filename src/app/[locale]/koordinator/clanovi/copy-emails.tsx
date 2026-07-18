"use client";

import { useState } from "react";

/** Kopira sve email adrese članova u clipboard (za BCC u email klijentu). */
export function CopyEmails({ emails, labels }: { emails: string; labels: { copy: string; copied: string; show: string } }) {
  const [done, setDone] = useState(false);
  const count = emails ? emails.split(",").length : 0;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(emails);
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        }}
        className="rounded-xl bg-court px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-court-dark"
      >
        {done ? `✓ ${labels.copied}` : `${labels.copy} (${count})`}
      </button>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">{labels.show}</summary>
        <textarea
          readOnly
          value={emails}
          rows={6}
          className="mt-2 w-full rounded-xl border border-line2 bg-bg p-2 font-mono text-[0.7rem]"
        />
      </details>
    </div>
  );
}
