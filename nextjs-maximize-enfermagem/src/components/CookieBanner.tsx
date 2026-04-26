"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { analytics } from "@/lib/analytics";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (analytics.getConsent() === null) setVisible(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  const handleAccept = () => {
    analytics.optIn();
    analytics.pageview();
    setVisible(false);
  };

  const handleReject = () => {
    analytics.optOut();
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      aria-modal="true"
      role="dialog"
      aria-label="Consentimento de cookies"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Sua privacidade importa
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Usamos cookies e ferramentas de análise (PostHog) para entender como
            você navega no site e melhorar a experiência. Ao continuar, você
            concorda com o uso descrito em nossa{" "}
            <Link
              href="/politica-de-privacidade"
              className="text-cyan-600 hover:text-cyan-500 underline"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Rejeitar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
          >
            Aceitar cookies
          </button>
        </div>
      </div>
    </div>
  );
}
