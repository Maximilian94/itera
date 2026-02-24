import type { Metadata } from "next";
import { ConcursoDetail } from "@/components/concursos/ConcursoDetail";

export const metadata: Metadata = {
  title: "Concurso | Maximize Enfermagem",
  description: "Detalhes do concurso e prova para treino.",
};

export const dynamicParams = true;

export default function ConcursoPage() {
  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <ConcursoDetail />
      </div>
    </div>
  );
}
