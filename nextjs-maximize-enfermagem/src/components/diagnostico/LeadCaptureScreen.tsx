"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

export interface LeadCaptureValues {
  name: string;
  email: string;
  phone?: string;
  consentMarketing: boolean;
}

interface LeadCaptureScreenProps {
  onSubmit: (values: LeadCaptureValues) => Promise<void> | void;
  submitting?: boolean;
  errorMessage?: string;
}

export function LeadCaptureScreen({
  onSubmit,
  submitting,
  errorMessage,
}: LeadCaptureScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

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

    await onSubmit({
      name: trimmedName,
      email: trimmedEmail,
      phone: phone.trim() || undefined,
      consentMarketing: consent,
    });
  };

  const message = validationError ?? errorMessage;

  return (
    <div className="flex w-full max-w-xl flex-col">
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
        Última etapa
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight text-sky-900 sm:text-4xl">
        Pra onde devemos enviar seu diagnóstico?
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Você verá o resultado completo na próxima tela e também receberá uma
        cópia por e-mail.
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
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-0 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="diag-phone"
            className="block text-sm font-medium text-slate-700"
          >
            WhatsApp <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            id="diag-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600"
            placeholder="(11) 9 9999-9999"
          />
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Ver meu diagnóstico"}
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
