"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { analytics } from "@/lib/analytics";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (analytics.getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    analytics.optIn();
    // Re-fire the pageview for the current route — the initial one was
    // swallowed while we waited for consent.
    analytics.pageview();
    setVisible(false);
  };

  const handleReject = () => {
    analytics.optOut();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur shadow-lg"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-sm text-slate-700 flex-1">
          Usamos cookies e ferramentas de análise (PostHog) para entender como
          você navega no site e melhorar a experiência. Saiba mais em nossa{" "}
          <Link
            href="/politica-de-privacidade"
            className="text-cyan-600 hover:text-cyan-500 underline"
          >
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReject}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Rejeitar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
