"use client";

import { useEffect, useState } from "react";
import type { ExamBaseFromApi } from "@/lib/concursos-api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchConcursoBySlug } from "@/lib/concursos-api";
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  BanknotesIcon,
  TrophyIcon,
  BuildingLibraryIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const SCOPE_LABELS: Record<string, string> = {
  MUNICIPAL: "Municipal",
  STATE: "Estadual",
  FEDERAL: "Federal",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ConcursoContent({ concurso }: { concurso: ExamBaseFromApi }) {
  const year = new Date(concurso.examDate).getFullYear();

  useEffect(() => {
    document.title = `${concurso.name} | Maximize Enfermagem`;
  }, [concurso.name]);

  return (
    <>
      <Link
        href="/concursos"
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← Voltar para concursos
      </Link>

      <article className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900">
          <span>{year}</span>
          <span className="text-slate-400 font-normal">·</span>
          {concurso.governmentScope === "MUNICIPAL" && concurso.city && (
            <>
              <span>{concurso.city}</span>
              <span className="text-slate-400 font-normal">·</span>
            </>
          )}
          {concurso.governmentScope === "STATE" && concurso.state && (
            <>
              <span>{concurso.state}</span>
              <span className="text-slate-400 font-normal">·</span>
            </>
          )}
          <span>{concurso.institution ?? "Concurso"}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
            <BuildingLibraryIcon className="h-4 w-4 text-slate-500" />
            {SCOPE_LABELS[concurso.governmentScope] ?? concurso.governmentScope}
          </span>
          {concurso.state && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              <MapPinIcon className="h-4 w-4 text-slate-500" />
              {concurso.state}
            </span>
          )}
          {concurso.city && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              <BuildingOffice2Icon className="h-4 w-4 text-slate-500" />
              {concurso.city}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
            <BriefcaseIcon className="h-4 w-4 text-slate-500" />
            {concurso.role}
          </span>
          {concurso.examBoard && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              <AcademicCapIcon className="h-4 w-4 text-slate-500" />
              {concurso.examBoard.name}
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Data da prova</p>
              <p className="mt-1 font-semibold text-gray-900">{formatDate(concurso.examDate)}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <DocumentTextIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Questões</p>
              <p className="mt-1 font-semibold text-gray-900">{concurso._count.questions}</p>
            </div>
          </div>
          {concurso.salaryBase && (
            <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <BanknotesIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Remuneração base</p>
                <p className="mt-1 font-semibold text-gray-900">{concurso.salaryBase}</p>
              </div>
            </div>
          )}
          {concurso.minPassingGradeNonQuota && (
            <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <TrophyIcon className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nota mínima (ampla)</p>
                <p className="mt-1 font-semibold text-gray-900">{concurso.minPassingGradeNonQuota}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col overflow-hidden rounded-xl border border-blue-100 bg-blue-50 sm:flex-row sm:items-center">
          <div className="relative shrink-0 p-4 sm:pl-4 sm:pt-4 sm:pb-4 sm:pr-0">
            <img
              src="/enfermeira-estudando.png"
              alt="Enfermeira estudando"
              className="h-48 w-full object-cover object-center sm:h-56 sm:w-64"
            />
            {/* Fade na borda direita (desktop) — transição suave para o fundo azul */}
            <div
              className="absolute inset-y-0 right-0 hidden w-24 pointer-events-none sm:block"
              style={{
                background: "linear-gradient(to right, transparent 0%, rgb(239 246 255) 100%)",
              }}
            />
            {/* Fade na borda inferior (mobile) — transição suave para o conteúdo abaixo */}
            <div
              className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none sm:hidden"
              style={{
                background: "linear-gradient(to top, rgb(239 246 255) 0%, transparent 100%)",
              }}
            />
          </div>
          <div className="flex flex-1 flex-col p-6">
            <h3 className="font-semibold text-gray-900">
              Simule a prova e descubra se você teria passado
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Treine com questões reais desta prova e receba feedback imediato. Ideal para se preparar para o próximo concurso.
            </p>
            <Link
              href="https://app.maximizeenfermagem.com.br"
              className="mt-4 inline-flex w-fit rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Fazer meu primeiro treino grátis
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}

type ConcursoDetailProps = {
  /** Concurso pré-carregado no servidor (SSR/SSG). Quando fornecido, não faz fetch no cliente. */
  concurso?: ExamBaseFromApi | null;
};

export function ConcursoDetail({ concurso: initialConcurso }: ConcursoDetailProps = {}) {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [concurso, setConcurso] = useState<ExamBaseFromApi | null | "loading">(
    initialConcurso ?? "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialConcurso) return;
    if (!slug) {
      setConcurso(null);
      return;
    }
    setConcurso("loading");
    setError(null);
    fetchConcursoBySlug(slug)
      .then((data) => setConcurso(data))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar");
        setConcurso(null);
      });
  }, [slug, initialConcurso]);

  if (initialConcurso) {
    return <ConcursoContent concurso={initialConcurso} />;
  }

  if (!slug) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-800">Slug inválido</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-800">{error}</p>
      </div>
    );
  }

  if (concurso === "loading") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
        Carregando concurso…
      </div>
    );
  }

  if (!concurso) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="font-medium text-gray-900">Concurso não encontrado</p>
        <Link href="/concursos" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700">
          ← Voltar para concursos
        </Link>
      </div>
    );
  }

  return <ConcursoContent concurso={concurso} />;
}
