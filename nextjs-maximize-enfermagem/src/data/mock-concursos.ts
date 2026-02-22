/**
 * Mock data - estrutura idêntica à API (ExamBase) para facilitar migração na Fase 3.
 * Inclui slug (será adicionado ao banco na Fase 2).
 */

export type GovernmentScope = "MUNICIPAL" | "STATE" | "FEDERAL";

export type MockExamBase = {
  id: string;
  name: string;
  institution: string | null;
  role: string;
  governmentScope: GovernmentScope;
  state: string | null;
  city: string | null;
  salaryBase: string | null;
  examDate: string;
  minPassingGradeNonQuota: string | null;
  published: boolean;
  examBoardId: string | null;
  examBoard: { id: string; name: string; logoUrl: string } | null;
  _count: { questions: number };
  slug: string;
};

export const MOCK_EXAM_BOARDS = [
  {
    id: "board-1",
    name: "CESPE",
    logoUrl: "https://ui-avatars.com/api/?name=CESPE&size=80&background=1e3a5f&color=fff&bold=true",
  },
  {
    id: "board-2",
    name: "FGV",
    logoUrl: "https://ui-avatars.com/api/?name=FGV&size=80&background=0f766e&color=fff&bold=true",
  },
  {
    id: "board-3",
    name: "VUNESP",
    logoUrl: "https://ui-avatars.com/api/?name=VUNESP&size=80&background=7c3aed&color=fff&bold=true",
  },
];

export const MOCK_CONCURSOS: MockExamBase[] = [
  {
    id: "1",
    name: "SES-SP 2024",
    institution: "Secretaria de Estado da Saúde de São Paulo",
    role: "Enfermeiro",
    governmentScope: "STATE",
    state: "SP",
    city: null,
    salaryBase: "7856.00",
    examDate: "2024-03-15",
    minPassingGradeNonQuota: "60.00",
    published: true,
    examBoardId: "board-2",
    examBoard: MOCK_EXAM_BOARDS[1],
    _count: { questions: 50 },
    slug: "ses-sp-2024",
  },
  {
    id: "2",
    name: "Prefeitura de São Paulo",
    institution: "Prefeitura Municipal de São Paulo",
    role: "Enfermeiro",
    governmentScope: "MUNICIPAL",
    state: "SP",
    city: "São Paulo",
    salaryBase: "8920.00",
    examDate: "2024-03-20",
    minPassingGradeNonQuota: "60.00",
    published: true,
    examBoardId: "board-3",
    examBoard: MOCK_EXAM_BOARDS[2],
    _count: { questions: 50 },
    slug: "prefeitura-sao-paulo-2024",
  },
  {
    id: "3",
    name: "Ministério da Saúde",
    institution: "Ministério da Saúde",
    role: "Enfermeiro",
    governmentScope: "FEDERAL",
    state: null,
    city: null,
    salaryBase: "12500.00",
    examDate: "2024-03-10",
    minPassingGradeNonQuota: "60.00",
    published: true,
    examBoardId: "board-1",
    examBoard: MOCK_EXAM_BOARDS[0],
    _count: { questions: 60 },
    slug: "ministerio-saude-2024",
  },
  {
    id: "4",
    name: "SES-RJ 2024",
    institution: "Secretaria de Estado de Saúde do Rio de Janeiro",
    role: "Enfermeiro",
    governmentScope: "STATE",
    state: "RJ",
    city: null,
    salaryBase: "7200.00",
    examDate: "2024-02-28",
    minPassingGradeNonQuota: "60.00",
    published: true,
    examBoardId: "board-1",
    examBoard: MOCK_EXAM_BOARDS[0],
    _count: { questions: 60 },
    slug: "ses-rj-2024",
  },
  {
    id: "5",
    name: "Prefeitura de Campinas",
    institution: "Prefeitura Municipal de Campinas",
    role: "Técnico de Enfermagem",
    governmentScope: "MUNICIPAL",
    state: "SP",
    city: "Campinas",
    salaryBase: "4500.00",
    examDate: "2024-04-05",
    minPassingGradeNonQuota: "60.00",
    published: true,
    examBoardId: "board-2",
    examBoard: MOCK_EXAM_BOARDS[1],
    _count: { questions: 40 },
    slug: "prefeitura-campinas-2024",
  },
];
