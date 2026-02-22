"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  FunnelIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import type { ExamBaseFromApi } from "@/lib/concursos-api";

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
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ESTADOS = ["SP", "RJ", "MG", "PR", "RS", "BA", "SC"] as const;

type Filters = {
  search: string;
  examBoardId: string | null;
  governmentScope: GovernmentScope | null;
  state: string | null;
};

export function ConcursosList({ concursos }: { concursos: ExamBaseFromApi[] }) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    examBoardId: null,
    governmentScope: null,
    state: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return concursos.filter((c) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        !filters.search ||
        c.name.toLowerCase().includes(searchLower) ||
        (c.institution?.toLowerCase().includes(searchLower) ?? false) ||
        c.role.toLowerCase().includes(searchLower);

      const matchesBoard =
        !filters.examBoardId || c.examBoardId === filters.examBoardId;
      const matchesScope =
        !filters.governmentScope ||
        c.governmentScope === filters.governmentScope;
      const matchesState =
        !filters.state || c.state === filters.state;

      return matchesSearch && matchesBoard && matchesScope && matchesState;
    });
  }, [concursos, filters]);

  const clearFilters = () => {
    setFilters({
      search: "",
      examBoardId: null,
      governmentScope: null,
      state: null,
    });
  };

  const hasActiveFilters =
    filters.examBoardId || filters.governmentScope || filters.state;

  return (
    <div className="space-y-8">
      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Busca */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar por nome, instituição ou cargo..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-blue-50 text-blue-700"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            Filtros
            {hasActiveFilters && (
              <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-800">
                {[filters.examBoardId, filters.governmentScope, filters.state].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Painel de filtros expandido */}
        {showFilters && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Banca */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Banca
                </label>
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    new Map(
                      concursos
                        .filter((c) => c.examBoard)
                        .map((c) => [c.examBoard!.id, c.examBoard!])
                    ).values()
                  ).map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          examBoardId:
                            f.examBoardId === board.id ? null : board.id,
                        }))
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        filters.examBoardId === board.id
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {board.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Escopo */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Escopo
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["MUNICIPAL", "STATE", "FEDERAL"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          governmentScope:
                            f.governmentScope === scope ? null : scope,
                        }))
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        filters.governmentScope === scope
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {governmentScopeLabel(scope)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Estado
                </label>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS.map((uf) => (
                    <button
                      key={uf}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          state: f.state === uf ? null : uf,
                        }))
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        filters.state === uf
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {uf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de concursos */}
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          {filtered.length} {filtered.length === 1 ? "concurso encontrado" : "concursos encontrados"}
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <p className="text-slate-500">
              Nenhum concurso encontrado com os filtros selecionados.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-blue-600 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((concurso) => (
              <Link
                key={concurso.id}
                href={`/concursos/${concurso.slug}`}
                className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {concurso.examBoard?.logoUrl && (
                      <img
                        src={concurso.examBoard.logoUrl}
                        alt={concurso.examBoard.name}
                        className="mb-3 h-9 w-9 rounded-lg object-contain"
                      />
                    )}
                    <h3 className="font-semibold text-slate-800 group-hover:text-blue-600">
                      {concurso.institution ?? concurso.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {concurso.role}
                    </p>
                  </div>
                  <span className="text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                    →
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${governmentScopeColor(concurso.governmentScope)}`}
                  >
                    <BuildingLibraryIcon className="h-3 w-3" />
                    {governmentScopeLabel(concurso.governmentScope)}
                  </span>
                  {(concurso.state || concurso.city) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      <MapPinIcon className="h-3 w-3" />
                      {concurso.city ? `${concurso.city} / ` : ""}
                      {concurso.state ?? ""}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    <CalendarDaysIcon className="h-3 w-3" />
                    {formatDate(concurso.examDate)}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                    {concurso._count.questions} questões
                  </span>
                  {concurso.salaryBase && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <BanknotesIcon className="h-4 w-4 text-slate-400" />
                      {formatBRL(concurso.salaryBase)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
