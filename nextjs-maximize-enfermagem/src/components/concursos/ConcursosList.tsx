"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchConcursos, formatExamBaseTitle, type ExamBaseFromApi } from "@/lib/concursos-api";

const SCOPE_LABELS: Record<string, string> = {
  MUNICIPAL: "Municipal",
  STATE: "Estadual",
  FEDERAL: "Federal",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ConcursosList() {
  const [concursos, setConcursos] = useState<ExamBaseFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchConcursos()
      .then(setConcursos)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);
  const [search, setSearch] = useState("");
  const [banca, setBanca] = useState<string>("");
  const [escopo, setEscopo] = useState<string>("");
  const [estado, setEstado] = useState<string>("");

  const bancas = useMemo(() => {
    const set = new Set<string>();
    for (const c of concursos) {
      const label = c.examBoard?.alias ?? c.examBoard?.name;
      if (label) set.add(label);
    }
    return Array.from(set).sort();
  }, [concursos]);

  const estados = useMemo(() => {
    const set = new Set<string>();
    for (const c of concursos) {
      if (c.state) set.add(c.state);
    }
    return Array.from(set).sort();
  }, [concursos]);

  const filtered = useMemo(() => {
    return concursos.filter((c) => {
      const bancaLabel = c.examBoard?.alias ?? c.examBoard?.name;
      const matchSearch =
        !search ||
        [
          c.name,
          c.institution,
          c.role,
          c.examBoard?.name,
          c.examBoard?.alias,
          c.state,
          c.city,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
      const matchBanca = !banca || bancaLabel === banca;
      const matchEscopo = !escopo || c.governmentScope === escopo;
      const matchEstado = !estado || c.state === estado;
      return matchSearch && matchBanca && matchEscopo && matchEstado;
    });
  }, [concursos, search, banca, escopo, estado]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
        Carregando concursos…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="font-medium text-rose-800">{error}</p>
        <p className="mt-2 text-sm text-rose-600">
          Verifique se a API está rodando e se NEXT_PUBLIC_API_URL está correto no .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar por nome, instituição, cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <select
          value={banca}
          onChange={(e) => setBanca(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">Todas as bancas</option>
          {bancas.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={escopo}
          onChange={(e) => setEscopo(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">Todos os escopos</option>
          <option value="FEDERAL">Federal</option>
          <option value="STATE">Estadual</option>
          <option value="MUNICIPAL">Municipal</option>
        </select>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">Todos os estados</option>
          {estados.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          Nenhum concurso encontrado com os filtros selecionados.
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={c.slug ? `/concursos/${c.slug}` : "#"}
                className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{formatExamBaseTitle(c)}</h3>
                    <p className="mt-1 text-sm text-gray-600">{c.role}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.examBoard && (
                        <span
                          className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 cursor-default"
                          title={c.examBoard.name}
                        >
                          {c.examBoard.alias ?? c.examBoard.name}
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {SCOPE_LABELS[c.governmentScope] ?? c.governmentScope}
                      </span>
                      {c.state && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {c.state}
                          {c.city ? ` - ${c.city}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Prova: {formatDate(c.examDate)}</div>
                    <div>{c._count.questions} questões</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
