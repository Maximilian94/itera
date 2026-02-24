import type { Metadata } from "next";
import { ConcursosList } from "@/components/concursos/ConcursosList";

export const metadata: Metadata = {
  title: "Concursos",
  description:
    "Lista de concursos públicos de enfermagem. Encontre provas anteriores, simulados e questões para estudar.",
};

export default function ConcursosPage() {
  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Concursos</h1>
        <p className="mt-2 text-gray-600">
          Encontre provas anteriores de concursos de enfermagem e treine com questões reais.
        </p>
        <div className="mt-8">
          <ConcursosList />
        </div>
      </div>
    </div>
  );
}
