/**
 * API client for concursos (exam bases).
 * Uses only published concursos - the API filters by published: true for unauthenticated requests.
 */

const getApiBaseUrl = () => {
  const url =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
};

/** Formato do título da prova: Ano · Cidade/Estado · Instituição */
export type ExamBaseTitleInput = {
  examDate: string;
  governmentScope?: "MUNICIPAL" | "STATE" | "FEDERAL";
  city?: string | null;
  state?: string | null;
  institution?: string | null;
  name?: string;
};

export function formatExamBaseTitle(exam: ExamBaseTitleInput): string {
  const year = new Date(exam.examDate).getFullYear();
  const institution = exam.institution ?? exam.name ?? "Concurso";

  let locationPart = "";
  const scope =
    exam.governmentScope ??
    (exam.city && exam.state ? "MUNICIPAL" : exam.state ? "STATE" : "FEDERAL");
  if (scope === "MUNICIPAL" && (exam.city || exam.state)) {
    locationPart =
      exam.city && exam.state
        ? `${exam.city}/${exam.state}`
        : (exam.city ?? exam.state ?? "");
  } else if (scope === "STATE" && exam.state) {
    locationPart = exam.state;
  }
  // Federal: não mostra cidade/estado

  const parts = [String(year), locationPart, institution].filter(Boolean);
  return parts.join(" · ");
}

export type ExamBaseFromApi = {
  id: string;
  name: string;
  slug: string | null;
  institution: string | null;
  role: string;
  governmentScope: "MUNICIPAL" | "STATE" | "FEDERAL";
  state: string | null;
  city: string | null;
  salaryBase: string | null;
  examDate: string;
  minPassingGradeNonQuota: string | null;
  published: boolean;
  editalUrl: string | null;
  examBoardId: string | null;
  examBoard: { id: string; name: string; alias?: string | null; logoUrl: string; websiteUrl?: string | null } | null;
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
