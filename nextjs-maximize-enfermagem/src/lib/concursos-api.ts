/**
 * API client for concursos (exam bases).
 * Usa o endpoint público /public/exam-bases (sem autenticação, apenas publicados).
 */

const getApiBaseUrl = () => {
  const url =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
};

export type ExamBaseFromApi = {
  id: string;
  name: string;
  slug: string;
  institution: string | null;
  role: string;
  governmentScope: "MUNICIPAL" | "STATE" | "FEDERAL";
  state: string | null;
  city: string | null;
  salaryBase: string | null;
  examDate: string;
  minPassingGradeNonQuota: string | null;
  published: boolean;
  examBoardId: string | null;
  examBoard: { id: string; name: string; logoUrl: string } | null;
  _count: { questions: number };
};

export async function fetchConcursos(examBoardId?: string): Promise<ExamBaseFromApi[]> {
  const base = getApiBaseUrl();
  const params = examBoardId ? `?examBoardId=${examBoardId}` : "";
  const res = await fetch(`${base}/public/exam-bases${params}`, {
    next: { revalidate: false },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch concursos: ${res.status}`);
  }
  return res.json();
}

export async function fetchConcursoBySlug(slug: string): Promise<ExamBaseFromApi | null> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/public/exam-bases/slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: false },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch concurso: ${res.status}`);
  }
  return res.json();
}
