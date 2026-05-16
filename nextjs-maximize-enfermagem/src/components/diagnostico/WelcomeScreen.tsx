"use client";

import { ArrowRightIcon, ClockIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/20/solid";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center text-center">
      <p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700 ring-1 ring-cyan-200">
        <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-cyan-500" />
        Diagnóstico gratuito
      </p>

      <h1 className="mt-6 text-pretty text-4xl font-semibold tracking-tight text-sky-900 sm:text-5xl">
        Descubra seu perfil de estudo para concursos de Enfermagem
      </h1>

      <p className="mt-5 text-lg leading-relaxed text-slate-600">
        Em ~4 minutos respondendo 10 perguntas rápidas, você recebe no e-mail
        um diagnóstico personalizado: como está sua rotina, seu método e o
        que mudar primeiro pra render mais.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="mt-10 inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-8 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
      >
        Começar diagnóstico
        <ArrowRightIcon aria-hidden="true" className="size-5" />
      </button>

      <ul role="list" className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
        <li className="flex items-center gap-2">
          <ClockIcon aria-hidden="true" className="size-4 text-cyan-500" />
          ~4 minutos
        </li>
        <li className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon aria-hidden="true" className="size-4 text-cyan-500" />
          10 perguntas + perfil rápido
        </li>
      </ul>
    </div>
  );
}
