"use client";

import { useEffect } from "react";

/** Registruje servisni radnik (offline tolerancija) — samo u produkciji. */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registracija je poboljšanje, ne sme srušiti sajt
    });
  }, []);
  return null;
}
