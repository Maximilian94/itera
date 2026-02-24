"use client";

import { useEffect, useState } from "react";
import type { ExamBaseFromApi } from "@/lib/concursos-api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchConcursoBySlug } from "@/lib/concursos-api";

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
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>{year}</span>
          <span>·</span>
          <span>{concurso.institution ?? "Concurso"}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {SCOPE_LABELS[concurso.governmentScope] ?? concurso.governmentScope}
          </span>
          {concurso.state && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {concurso.state}
              {concurso.city ? ` - ${concurso.city}` : ""}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {concurso.role}
          </span>
          {concurso.examBoard && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {concurso.examBoard.name}
            </span>
          )}
        </div>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">{concurso.name}</h1>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Data da prova</dt>
            <dd className="mt-1 text-gray-900">{formatDate(concurso.examDate)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Questões</dt>
            <dd className="mt-1 text-gray-900">{concurso._count.questions}</dd>
          </div>
          {concurso.salaryBase && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Remuneração base</dt>
              <dd className="mt-1 text-gray-900">{concurso.salaryBase}</dd>
            </div>
          )}
          {concurso.minPassingGradeNonQuota && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Nota mínima (ampla)</dt>
              <dd className="mt-1 text-gray-900">{concurso.minPassingGradeNonQuota}</dd>
            </div>
          )}
        </dl>

        <div className="mt-10 rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h3 className="font-semibold text-gray-900">
            Simule a prova e descubra se você teria passado
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Treine com questões reais desta prova e receba feedback imediato. Ideal para se preparar para o próximo concurso.
          </p>
          <Link
            href="https://app.maximizeenfermagem.com.br"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Fazer meu primeiro treino grátis
          </Link>
        </div>
      </article>
    </>
  );
}

export function ConcursoDetail() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [concurso, setConcurso] = useState<ExamBaseFromApi | null | "loading">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [slug]);

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
