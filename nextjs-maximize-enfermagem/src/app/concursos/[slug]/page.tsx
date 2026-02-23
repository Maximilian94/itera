import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  MapPinIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { fetchConcursoBySlug, fetchConcursos } from "@/lib/concursos-api";

type GovernmentScope = "MUNICIPAL" | "STATE" | "FEDERAL";

function governmentScopeLabel(scope: GovernmentScope) {
  if (scope === "MUNICIPAL") return "Municipal";
  if (scope === "STATE") return "Estadual";
  return "Federal";
}

function governmentScopeColor(scope: GovernmentScope) {
  if (scope === "MUNICIPAL") return "bg-blue-50 text-blue-700";
  if (scope === "STATE") return "bg-violet-50 text-violet-700";
  return "bg-amber-50 text-amber-700";
}

function formatBRL(value: string | null) {
  if (!value) return null;
  const num = parseFloat(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const revalidate = false;

export async function generateStaticParams() {
  const concursos = await fetchConcursos();
  return concursos.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const concurso = await fetchConcursoBySlug(slug);

  if (!concurso) {
    return { title: "Concurso não encontrado" };
  }

  const title = `${concurso.name} | Concursos de Enfermagem`;
  const dateShort = new Date(concurso.examDate).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const description = `Concurso ${concurso.institution ?? concurso.name} - ${concurso.role}. ${concurso._count.questions} questões de enfermagem. Data da prova: ${dateShort}.`;

  return {
    title,
    description,
  };
}

export default async function ConcursoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concurso = await fetchConcursoBySlug(slug);

  if (!concurso) {
    notFound();
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50 py-8">
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 lg:px-8">
        <Link
          href="/concursos"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar aos concursos
        </Link>

        <article className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="space-y-4">
            {/* Primeira linha: imagem, ano, instituição */}
            <div className="flex flex-wrap items-center gap-6">
              {concurso.examBoard?.logoUrl && (
                <img
                  src={concurso.examBoard.logoUrl}
                  alt={concurso.examBoard.name}
                  className="h-12 w-12 rounded-xl object-contain"
                />
              )}

              <div className="flex items-center gap-2">
                <span className="text-3xl text-slate-500 sm:text-4xl">
                  {new Date(concurso.examDate).getFullYear()}
                </span>
                <span className="text-slate-300" aria-hidden>
                  •
                </span>
                <span className="text-3xl font-bold text-slate-900 sm:text-4xl">
                  {concurso.institution ?? concurso.name}
                </span>
              </div>
            </div>

            {/* Segunda linha: chips */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${governmentScopeColor(concurso.governmentScope)}`}
              >
                <BuildingLibraryIcon className="h-4 w-4" />
                {governmentScopeLabel(concurso.governmentScope)}
              </span>
              {concurso.state && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                  <MapPinIcon className="h-4 w-4" />
                  {concurso.state}
                </span>
              )}
              {concurso.city && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                  <MapPinIcon className="h-4 w-4" />
                  {concurso.city}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                {concurso.role}
              </span>
            </div>
          </div>

          {/* Detalhes */}
          <div className="mt-8 grid gap-6 border-t border-slate-100 pt-8 sm:grid-cols-2">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <CalendarDaysIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Data da prova
                </p>
                <p className="mt-0.5 text-slate-900">
                  {formatDate(concurso.examDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <DocumentTextIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Quantidade de questões
                </p>
                <p className="mt-0.5 text-slate-900">
                  {concurso._count.questions} questões de enfermagem
                </p>
              </div>
            </div>

            {concurso.salaryBase && (
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <BanknotesIcon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Salário base
                  </p>
                  <p className="mt-0.5 text-slate-900">
                    {formatBRL(concurso.salaryBase)}
                  </p>
                </div>
              </div>
            )}

            {concurso.minPassingGradeNonQuota && (
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <DocumentTextIcon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Nota mínima (ampla concorrência)
                  </p>
                  <p className="mt-0.5 text-slate-900">
                    {concurso.minPassingGradeNonQuota}%
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Spacer + CTA */}
          <div className="mt-10 flex-1" />
          <div className="mt-10 rounded-xl bg-blue-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Simule a prova e descubra se você teria passado
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Faça sua tentativa, compare com a nota de corte e receba um plano
              de estudo personalizado por IA.
            </p>
            <Link
              href="https://app.maximizeenfermagem.com.br"
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Fazer meu primeiro treino grátis
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
