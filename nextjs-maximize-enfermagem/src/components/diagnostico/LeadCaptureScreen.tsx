"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { firePixelLead } from "@/lib/meta-pixel/events";

export interface LeadCaptureValues {
  name: string;
  email: string;
  consentMarketing: boolean;
}

interface LeadCaptureScreenProps {
  /** UUID gerado pelo Wizard. Usado pra deduplicar Pixel + CAPI no Meta. */
  eventId: string;
  onSubmit: (values: LeadCaptureValues) => Promise<void> | void;
  submitting?: boolean;
  errorMessage?: string;
}

export function LeadCaptureScreen({
  eventId,
  onSubmit,
  submitting,
  errorMessage,
}: LeadCaptureScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);

  const handleEmailBlur = () => {
    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setEmailSuggestion(null);
      return;
    }
    setEmailSuggestion(suggestEmailFix(trimmed));
  };

  const acceptSuggestion = () => {
    if (!emailSuggestion) return;
    setEmail(emailSuggestion);
    setEmailSuggestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) {
      setValidationError("Por favor, informe seu nome.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setValidationError("Por favor, informe um e-mail válido.");
      return;
    }

    // Fire-and-forget: Pixel Lead com mesmo event_id que o backend manda
    // pro CAPI. Não awaitamos pra não bloquear submit por latência do
    // facebook.com/tr (que pode levar centenas de ms).
    firePixelLead({ eventId, email: trimmedEmail });

    await onSubmit({
      name: trimmedName,
      email: trimmedEmail,
      consentMarketing: consent,
    });
  };

  const message = validationError ?? errorMessage;

  return (
    <div className="flex w-full max-w-xl flex-col">
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-700">
        Última etapa
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight text-sky-900 sm:text-4xl">
        Pra onde devemos enviar seu diagnóstico?
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Mandamos seu diagnóstico completo por e-mail — com seu perfil, pontos
        de atenção e os próximos passos certos pra você. Antes, só mais{" "}
        <span className="font-medium text-sky-900">
          4 perguntas rápidas de contexto
        </span>{" "}
        pra personalizar.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="diag-name"
            className="block text-sm font-medium text-slate-700"
          >
            Nome
          </label>
          <input
            id="diag-name"
            type="text"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-0 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600"
            placeholder="Como prefere ser chamado(a)"
          />
        </div>

        <div>
          <label
            htmlFor="diag-email"
            className="block text-sm font-medium text-slate-700"
          >
            E-mail
          </label>
          <input
            id="diag-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailSuggestion) setEmailSuggestion(null);
            }}
            onBlur={handleEmailBlur}
            required
            className="mt-1 block w-full rounded-md border-0 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600"
            placeholder="seu@email.com"
          />
          {emailSuggestion ? (
            <p className="mt-1.5 text-sm text-amber-800">
              Quis dizer{" "}
              <button
                type="button"
                onClick={acceptSuggestion}
                className="cursor-pointer font-semibold underline underline-offset-2 hover:text-amber-900"
              >
                {emailSuggestion}
              </button>
              ?
            </p>
          ) : null}
        </div>

        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600"
          />
          <span>
            Aceito receber comunicações da Maximize Enfermagem com dicas de
            estudo e ofertas. Consulte nossa{" "}
            <Link
              href="/politica-de-privacidade"
              className="font-medium text-cyan-700 underline hover:text-cyan-800"
              target="_blank"
            >
              política de privacidade
            </Link>
            .
          </span>
        </label>

        {message ? (
          <p
            role="alert"
            className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Continuar"}
          {submitting ? null : (
            <ArrowRightIcon aria-hidden="true" className="size-5" />
          )}
        </button>
      </form>
    </div>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "live.com",
  "bol.com.br",
  "uol.com.br",
  "terra.com.br",
];

function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || !local) return null;
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    if (domain === candidate) return null;
    const dist = levenshtein(domain, candidate);
    if (dist > 0 && dist <= 2) {
      return `${local}@${candidate}`;
    }
  }
  return null;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
