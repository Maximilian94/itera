import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConcursoDetail } from "@/components/concursos/ConcursoDetail";
import { fetchConcursos, fetchConcursoBySlug, formatExamBaseTitle } from "@/lib/concursos-api";

type Props = {
  params: Promise<{ slug: string }>;
};

/** Gera páginas estáticas no build para todos os concursos publicados. */
export async function generateStaticParams() {
  try {
    const concursos = await fetchConcursos();
    return concursos
      .filter((c) => c.slug)
      .map((c) => ({ slug: c.slug! }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const concurso = await fetchConcursoBySlug(slug);
  if (!concurso) return { title: "Concurso não encontrado" };
  const title = formatExamBaseTitle(concurso);
  return {
    title: `${title} | Maximize Enfermagem`,
    description: `Prova de ${concurso.role} - ${concurso.institution ?? "Concurso"} - ${new Date(concurso.examDate).getFullYear()}. Treine com questões reais.`,
  };
}

/** Novos slugs (concursos adicionados após o build) são renderizados sob demanda. */
export const dynamicParams = true;

export default async function ConcursoPage({ params }: Props) {
  const { slug } = await params;
  const concurso = await fetchConcursoBySlug(slug);

  if (!concurso) {
    notFound();
  }

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="w-full max-w-full px-6 lg:px-8">
        <ConcursoDetail concurso={concurso} />
      </div>
    </div>
  );
}
