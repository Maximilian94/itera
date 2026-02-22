import type { Metadata } from "next";
import { ConcursosList } from "@/components/concursos/ConcursosList";
import { fetchConcursos } from "@/lib/concursos-api";

export const metadata: Metadata = {
  title: "Concursos de Enfermagem",
  description:
    "Lista de concursos públicos de enfermagem com provas reais. Filtre por banca, escopo e estado. Estude com questões comentadas e treinos inteligentes.",
};

export const revalidate = false;

export default async function ConcursosPage() {
  const concursos = await fetchConcursos();
  return (
    <div className="bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Concursos de Enfermagem
          </h1>
          <p className="mt-2 text-slate-600">
            Encontre provas reais de concursos públicos para praticar. Todas as
            questões são exclusivamente de enfermagem.
          </p>
        </div>

        <ConcursosList concursos={concursos} />
      </div>
    </div>
  );
}
