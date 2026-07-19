import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { jsonrepair } from 'jsonrepair';
import { PrismaService } from '../prisma/prisma.service';
import { ExamBaseAiService } from '../examBase/exam-base-ai.service';
import { PdfOcrService } from '../pdf/pdf-ocr.service';

/** Campos do CONCURSO que uma retificação pode alterar (+ tipo p/ coerção). */
const CONCURSO_FIELDS = {
  registrationStart: { label: 'Início das inscrições', type: 'date' },
  registrationEnd: { label: 'Fim das inscrições', type: 'date' },
  examDate: { label: 'Data da prova', type: 'date' },
  resultDate: { label: 'Data do resultado', type: 'date' },
  editalUrl: { label: 'URL do edital', type: 'string' },
} as const;

/** Campos do CARGO que uma retificação pode alterar. */
const CARGO_FIELDS = {
  vacancyCount: { label: 'Vagas', type: 'int' },
  salaryBase: { label: 'Salário base', type: 'decimal' },
  registrationFee: { label: 'Taxa de inscrição', type: 'decimal' },
  minPassingGradeNonQuota: { label: 'Nota mínima', type: 'decimal' },
  workload: { label: 'Carga horária', type: 'string' },
  requirements: { label: 'Requisitos', type: 'string' },
  description: { label: 'Atribuições', type: 'string' },
  hasReserveList: { label: 'Cadastro de reserva', type: 'boolean' },
} as const;

type ConcursoField = keyof typeof CONCURSO_FIELDS;
type CargoField = keyof typeof CARGO_FIELDS;

export interface ProposedChange {
  /** Id estável (target+cargo+field) p/ o front casar a seleção no apply. */
  id: string;
  target: 'concurso' | 'cargo';
  cargoId: string | null;
  cargoRole: string | null;
  field: string;
  label: string;
  currentValue: string | null;
  newValue: string | null;
  evidence: string | null;
}

/** Etapa do cronograma (nome + descrição + data date-only). `type` (não
 *  `interface`) p/ ganhar index signature e ser aceito como Json do Prisma. */
export interface Etapa {
  name: string;
  description: string | null;
  date: string | null;
}

/** Etapa como chega do front (campos opcionais) — normalizada no apply. */
export interface EtapaInput {
  name: string;
  description?: string | null;
  date?: string | null;
}

/** Uma matéria do quadro de provas proposto (conteúdo programático + números). */
export interface ProposedSyllabusGroup {
  name: string;
  topics: string | null;
  questionCount: number | null;
  weight: string | null;
  maxScore: string | null;
}

/** Quadro de matérias proposto para UM cargo (substitui o quadro atual dele). */
export interface ProposedCargoSyllabus {
  cargoId: string;
  cargoRole: string;
  groups: ProposedSyllabusGroup[];
}

/** Quadro aprovado como chega do front (validado/normalizado no apply). */
export interface SyllabusInput {
  cargoId: string;
  groups: {
    name: string;
    topics?: string | null;
    questionCount?: number | null;
    weight?: string | null;
    maxScore?: string | null;
  }[];
}

/** Normaliza um Json de matérias (do banco ou da IA) para a forma canônica. */
function normalizeSyllabusGroups(raw: unknown): ProposedSyllabusGroup[] {
  const arr = Array.isArray(raw) ? raw : [];
  const num = (v: unknown): string | null =>
    typeof v === 'number' && Number.isFinite(v)
      ? String(v)
      : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
        ? String(Number(v))
        : null;
  return arr
    .filter(
      (g): g is Record<string, unknown> => typeof g === 'object' && g != null,
    )
    .map((g) => {
      const name = typeof g.name === 'string' ? g.name.trim() : '';
      const topics =
        typeof g.topics === 'string' && g.topics.trim()
          ? g.topics.trim()
          : null;
      const questionCount =
        typeof g.questionCount === 'number' && Number.isFinite(g.questionCount)
          ? Math.round(g.questionCount)
          : typeof g.questionCount === 'string' &&
              g.questionCount.trim() !== '' &&
              Number.isFinite(Number(g.questionCount))
            ? Math.round(Number(g.questionCount))
            : null;
      return {
        name,
        topics,
        questionCount,
        weight: num(g.weight),
        maxScore: num(g.maxScore),
      };
    })
    .filter((g) => g.name !== '');
}

/** Normaliza um Json de etapas (do banco ou da IA) para a forma canônica. */
function normalizeEtapas(raw: unknown): Etapa[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .filter(
      (e): e is Record<string, unknown> => typeof e === 'object' && e != null,
    )
    .map((e) => {
      const name = typeof e.name === 'string' ? e.name.trim() : '';
      const description =
        typeof e.description === 'string' && e.description.trim()
          ? e.description.trim()
          : null;
      const date =
        typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.date)
          ? e.date.slice(0, 10)
          : null;
      return { name, description, date };
    })
    .filter((e) => e.name !== '');
}

export interface AnalyzeResult {
  documentId: string;
  analyzedAt: string;
  changes: ProposedChange[];
  /** Cronograma (etapas datadas) proposto pelo documento; null se não há um
   *  cronograma no PDF ou se ele é idêntico ao atual. */
  cronograma: Etapa[] | null;
  /** Quadro de matérias proposto por cargo (só os cargos cujo quadro o
   *  documento determina E difere do atual); null se nenhum. */
  syllabus: ProposedCargoSyllabus[] | null;
}

/** Só o que o apply precisa de cada mudança aprovada (espelha o DTO). */
export interface ApplyChangeInput {
  target: 'concurso' | 'cargo';
  cargoId?: string | null;
  field: string;
  newValue?: string | null;
}

const SYSTEM_PROMPT = `
Você compara um DOCUMENTO de concurso público (retificação, errata, comunicado, novo edital) com o ESTADO ATUAL já cadastrado do concurso e lista APENAS as alterações que o documento determina.

Você receberá o texto do documento e, em JSON, o estado atual do concurso e de seus cargos.

Regras rígidas:
- Liste SOMENTE mudanças que o documento EXPLICITAMENTE determina (ex.: "onde se lê X, leia-se Y", "ficam prorrogadas as inscrições até DD/MM", "altera-se o número de vagas do cargo Z para N"). NÃO invente, NÃO deduza o que "provavelmente" mudou.
- Só inclua uma mudança se o novo valor for DIFERENTE do valor atual informado.
- Se o documento não altera nada dos campos abaixo, retorne uma lista vazia.
- Para cargo, use em cargoRole o nome EXATO do cargo como está no estado atual.
- Datas em ISO "YYYY-MM-DD". Dinheiro como string decimal com 2 casas ("1600.00"). Vagas como número inteiro. hasReserveList como booleano.
- evidence: a frase do documento que justifica a mudança (curta).

Campos válidos (ignore qualquer outro):
- target "concurso": registrationStart, registrationEnd, examDate, resultDate, editalUrl
- target "cargo": vacancyCount, salaryBase, registrationFee, minPassingGradeNonQuota, workload, requirements, description, hasReserveList

Além das mudanças de campo, extraia o CRONOGRAMA COMPLETO do documento em "cronograma": TODAS as etapas/eventos com data do calendário do certame, do primeiro ao último. O cronograma costuma estar numa TABELA (ex.: "ANEXO — CRONOGRAMA", colunas Evento/Atividade e Data).
ATENÇÃO CRÍTICA: no texto extraído do PDF a tabela quase sempre vem DESALINHADA — as datas podem aparecer separadas dos eventos, em blocos, ou em outra ordem. Reconstrua com cuidado a associação de CADA evento à sua data; não invente, mas também não deixe de fora uma linha que existe na tabela.
Inclua eventos como (quando existirem): Publicação/Divulgação do edital, Período de inscrições (início e fim), Solicitação de isenção de taxa, Resultado da isenção, Pagamento da taxa, Homologação das inscrições, Divulgação dos locais de prova, Prova Objetiva, Prova Prática, Prova de Títulos, Gabarito preliminar, Prazo de recursos, Gabarito/Resultado definitivo, Resultado preliminar, Resultado final, Homologação do concurso.
Regras: extraia a tabela INTEIRA (não pare nas primeiras linhas). Datas do edital em dd/mm/aaaa → converta para ISO "YYYY-MM-DD" (use o ano do concurso do estado atual quando o dia/mês vier sem ano). Se um evento tem período com início e fim, crie DUAS etapas ("Inscrições — início" e "Inscrições — fim"). Para cada etapa: name (nome curto), description (1 frase ou null) e date (ISO ou null só se realmente não houver data). Se o documento NÃO contém cronograma/calendário, retorne "cronograma": [].

Por fim, em "syllabusCargos" liste apenas os NOMES dos cargos (cargoRole EXATO do estado atual) para os quais este documento APRESENTA ou ALTERA o quadro de matérias / conteúdo programático (a tabela "Disciplina | nº de questões | peso" e/ou a lista de conteúdo programático daquele cargo). Só inclua o cargo se o documento realmente traz o quadro dele. NÃO transcreva as matérias aqui — só os nomes dos cargos (a transcrição do quadro é feita depois, numa etapa separada). Se o documento não traz quadro de matérias de nenhum cargo, retorne "syllabusCargos": [].

Retorne SOMENTE JSON, sem markdown:
{"changes":[{"target":"concurso","field":"registrationEnd","newValue":"2026-07-20","evidence":"..."},{"target":"cargo","cargoRole":"Enfermeiro","field":"vacancyCount","newValue":15,"evidence":"..."}],"cronograma":[{"name":"Inscrições","description":null,"date":"2026-07-07"},{"name":"Prova Objetiva","description":"Caráter eliminatório e classificatório.","date":"2026-09-27"}],"syllabusCargos":["Enfermeiro"]}
`.trim();

/**
 * Fase 2 do monitoramento: lê o PDF de um documento (retificação etc.),
 * compara com o estado atual do concurso/cargos e devolve as mudanças
 * propostas — SEM aplicar. O admin revisa e aprova o que aplicar.
 */
@Injectable()
export class ConcursoDocumentAnalysisService {
  private readonly logger = new Logger(ConcursoDocumentAnalysisService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly examBaseAi: ExamBaseAiService,
    private readonly pdfOcr: PdfOcrService,
  ) {}

  async analyze(
    concursoId: string,
    documentId: string,
  ): Promise<AnalyzeResult> {
    const doc = await this.prisma.concursoDocument.findFirst({
      where: { id: documentId, concursoId },
      select: { id: true, url: true, title: true },
    });
    if (!doc) throw new NotFoundException('documento não encontrado');

    const concurso = await this.loadSnapshot(concursoId);
    const text = await this.fetchDocumentText(doc.url);

    const parsed = await this.callOpenAI(text, concurso.snapshotJson);
    const changes = this.buildChanges(parsed, concurso);

    // Cronograma proposto: etapas datadas extraídas do PDF. Só entra quando o
    // documento traz um cronograma E ele difere do atual.
    const proposedEtapas = normalizeEtapas(
      (parsed as { cronograma?: unknown }).cronograma,
    );
    const cronograma =
      proposedEtapas.length > 0 &&
      JSON.stringify(proposedEtapas) !== JSON.stringify(concurso.currentEtapas)
        ? proposedEtapas
        : null;

    // Quadro de matérias: o prompt de diff só APONTA quais cargos o documento
    // altera; a transcrição do quadro é feita por um extrator FOCADO por cargo
    // (o mesmo da criação do edital) — recorta a janela de texto do cargo e
    // reconstrói a tabela sozinho, sem competir com o diff/cronograma no mesmo
    // prompt. Só cargos de enfermagem (os que a plataforma exibe, como na
    // criação do edital) e só quando o quadro difere do atual (replace total).
    const rawCargos = (parsed as { syllabusCargos?: unknown }).syllabusCargos;
    const roles = (Array.isArray(rawCargos) ? rawCargos : [])
      .filter((r): r is string => typeof r === 'string' && r.trim() !== '')
      .map((r) => r.trim());
    const proposedSyllabus: ProposedCargoSyllabus[] = [];
    const seenCargo = new Set<string>();
    for (const role of roles) {
      const cargo = concurso.cargosByRole.get(role.toLowerCase());
      if (!cargo || seenCargo.has(cargo.id) || !cargo.isNursingRelevant)
        continue;
      seenCargo.add(cargo.id);
      const groups = normalizeSyllabusGroups(
        await this.examBaseAi
          .extractSyllabusForCargo(text, cargo.role)
          .catch(() => []),
      );
      if (groups.length === 0) continue;
      const current =
        concurso.currentSyllabusByRole.get(cargo.role.toLowerCase()) ?? [];
      if (JSON.stringify(groups) === JSON.stringify(current)) continue;
      proposedSyllabus.push({
        cargoId: cargo.id,
        cargoRole: cargo.role,
        groups,
      });
    }
    const syllabus = proposedSyllabus.length > 0 ? proposedSyllabus : null;

    const analyzedAt = new Date();
    await this.prisma.concursoDocument.update({
      where: { id: doc.id },
      data: { analyzedAt },
    });
    this.logger.log(
      `analyze doc ${doc.id} (${doc.title}): ${text.length} chars lidos do PDF → ${changes.length} mudança(s) + cronograma ${cronograma ? `${cronograma.length} etapa(s)` : 'sem mudança'} + quadro ${syllabus ? `${syllabus.length} cargo(s)` : 'sem mudança'}`,
    );

    return {
      documentId: doc.id,
      analyzedAt: analyzedAt.toISOString(),
      changes,
      cronograma,
      syllabus,
    };
  }

  /**
   * Aplica ao concurso/cargos apenas as mudanças aprovadas pelo admin (valida
   * cada campo contra a whitelist e coage o tipo). Marca o documento como
   * aplicado.
   */
  async apply(
    concursoId: string,
    documentId: string,
    changes: ApplyChangeInput[],
    cronograma?: EtapaInput[] | null,
    syllabus?: SyllabusInput[] | null,
  ): Promise<{ appliedCount: number }> {
    const doc = await this.prisma.concursoDocument.findFirst({
      where: { id: documentId, concursoId },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException('documento não encontrado');

    let appliedCount = 0;
    for (const change of changes) {
      const applied = await this.applyOne(concursoId, change);
      if (applied) appliedCount++;
    }

    // Cronograma aprovado: substitui as etapas do concurso pelas propostas.
    if (cronograma != null) {
      const etapas = normalizeEtapas(cronograma);
      await this.prisma.concurso.update({
        where: { id: concursoId },
        // Json do Prisma não aceita a interface nomeada direto (sem index
        // signature) — cast p/ InputJsonValue.
        data: { etapas: etapas as unknown as Prisma.InputJsonValue },
      });
      appliedCount++;
    }

    // Quadros de matérias aprovados: replace total do conteúdo programático do
    // cargo (mesma semântica do editor de concurso). Valida o cargo primeiro.
    for (const item of syllabus ?? []) {
      const applied = await this.applyCargoSyllabus(concursoId, item);
      if (applied) appliedCount++;
    }

    await this.prisma.concursoDocument.update({
      where: { id: doc.id },
      data: {
        analyzedAt: new Date(),
        ...(appliedCount > 0 ? { changesAppliedAt: new Date() } : {}),
      },
    });
    return { appliedCount };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async applyOne(
    concursoId: string,
    change: ApplyChangeInput,
  ): Promise<boolean> {
    if (change.target === 'concurso') {
      const field = change.field as ConcursoField;
      const meta = CONCURSO_FIELDS[field];
      if (!meta) return false;
      const value = this.coerce(change.newValue ?? null, meta.type);
      await this.prisma.concurso.update({
        where: { id: concursoId },
        data: { [field]: value },
      });
      return true;
    }
    if (change.target === 'cargo' && change.cargoId) {
      const field = change.field as CargoField;
      const meta = CARGO_FIELDS[field];
      if (!meta) return false;
      // Garante que o cargo é deste concurso antes de escrever.
      const cargo = await this.prisma.cargo.findFirst({
        where: { id: change.cargoId, concursoId },
        select: { id: true },
      });
      if (!cargo) return false;
      const value = this.coerce(change.newValue ?? null, meta.type);
      await this.prisma.cargo.update({
        where: { id: cargo.id },
        data: { [field]: value },
      });
      return true;
    }
    return false;
  }

  /** Replace total do quadro de matérias de UM cargo (valida o dono). */
  private async applyCargoSyllabus(
    concursoId: string,
    item: SyllabusInput,
  ): Promise<boolean> {
    if (!item?.cargoId) return false;
    const cargo = await this.prisma.cargo.findFirst({
      where: { id: item.cargoId, concursoId },
      select: { id: true },
    });
    if (!cargo) return false;
    const groups = normalizeSyllabusGroups(item.groups);

    // Preserva os tópicos existentes: a tabela de uma retificação costuma trazer
    // só os números (nº questões/peso) sem o conteúdo programático. Sem isso, o
    // replace total apagaria o programa já cadastrado — então, quando a matéria
    // proposta vem sem tópicos, herda os do grupo atual de mesmo nome.
    const current = await this.prisma.examSyllabusGroup.findMany({
      where: { cargoId: cargo.id },
      select: { name: true, topics: true },
    });
    const topicsByName = new Map(
      current
        .filter((g) => g.topics.trim() !== '')
        .map((g) => [g.name.trim().toLowerCase(), g.topics]),
    );

    await this.prisma.examSyllabusGroup.deleteMany({
      where: { cargoId: cargo.id },
    });
    if (groups.length > 0) {
      await this.prisma.examSyllabusGroup.createMany({
        data: groups.map((g, i) => ({
          cargoId: cargo.id,
          order: i,
          name: g.name,
          topics: g.topics ?? topicsByName.get(g.name.toLowerCase()) ?? '',
          questionCount: g.questionCount,
          weight: g.weight,
          maxScore: g.maxScore,
        })),
      });
    }
    return true;
  }

  /** Converte a string do front para o tipo do campo (null limpa o campo). */
  private coerce(
    value: string | null,
    type: 'date' | 'int' | 'decimal' | 'string' | 'boolean',
  ): Date | number | string | boolean | null {
    if (value == null || value.trim() === '') return null;
    const v = value.trim();
    switch (type) {
      case 'date': {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return null;
        return d;
      }
      case 'int': {
        const n = parseInt(v, 10);
        return Number.isNaN(n) ? null : n;
      }
      case 'decimal': {
        const n = Number(v);
        return Number.isNaN(n) ? null : n.toFixed(2);
      }
      case 'boolean':
        return v === 'true' || v === '1' || v.toLowerCase() === 'sim';
      default:
        return v;
    }
  }

  /** Estado atual do concurso + cargos e o snapshot enxuto p/ a IA. */
  private async loadSnapshot(concursoId: string) {
    const concurso = await this.prisma.concurso.findUnique({
      where: { id: concursoId },
      select: {
        id: true,
        year: true,
        registrationStart: true,
        registrationEnd: true,
        examDate: true,
        resultDate: true,
        editalUrl: true,
        etapas: true,
        cargos: {
          select: {
            id: true,
            role: true,
            vacancyCount: true,
            salaryBase: true,
            registrationFee: true,
            minPassingGradeNonQuota: true,
            workload: true,
            requirements: true,
            description: true,
            hasReserveList: true,
            isNursingRelevant: true,
            syllabusGroups: {
              orderBy: { order: 'asc' as const },
              select: {
                name: true,
                topics: true,
                questionCount: true,
                weight: true,
                maxScore: true,
              },
            },
          },
        },
      },
    });
    if (!concurso) throw new NotFoundException('concurso não encontrado');

    const isoDate = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
    const currentEtapas = normalizeEtapas(concurso.etapas);
    // Quadro atual por role (normalizado) — base p/ o diff do syllabus proposto.
    const currentSyllabusByRole = new Map<string, ProposedSyllabusGroup[]>(
      concurso.cargos.map((c) => [
        c.role.toLowerCase(),
        normalizeSyllabusGroups(
          c.syllabusGroups.map((g) => ({
            name: g.name,
            topics: g.topics,
            questionCount: g.questionCount,
            weight: g.weight != null ? String(g.weight) : null,
            maxScore: g.maxScore != null ? String(g.maxScore) : null,
          })),
        ),
      ]),
    );
    const snapshot = {
      concurso: {
        year: concurso.year,
        registrationStart: isoDate(concurso.registrationStart),
        registrationEnd: isoDate(concurso.registrationEnd),
        examDate: isoDate(concurso.examDate),
        resultDate: isoDate(concurso.resultDate),
        editalUrl: concurso.editalUrl,
      },
      cronograma: currentEtapas,
      cargos: concurso.cargos.map((c) => ({
        role: c.role,
        vacancyCount: c.vacancyCount,
        salaryBase: c.salaryBase != null ? String(c.salaryBase) : null,
        registrationFee:
          c.registrationFee != null ? String(c.registrationFee) : null,
        minPassingGradeNonQuota:
          c.minPassingGradeNonQuota != null
            ? String(c.minPassingGradeNonQuota)
            : null,
        workload: c.workload,
        requirements: c.requirements,
        description: c.description,
        hasReserveList: c.hasReserveList,
        // Quadro atual para o modelo comparar (só o que importa: matéria +
        // números; sem os tópicos, que incham o prompt sem ajudar no diff).
        syllabusGroups: (
          currentSyllabusByRole.get(c.role.toLowerCase()) ?? []
        ).map((g) => ({
          name: g.name,
          questionCount: g.questionCount,
          weight: g.weight,
          maxScore: g.maxScore,
        })),
      })),
    };

    return {
      cargosByRole: new Map(
        concurso.cargos.map((c) => [c.role.toLowerCase(), c]),
      ),
      currentEtapas,
      currentSyllabusByRole,
      snapshot,
      snapshotJson: JSON.stringify(snapshot),
    };
  }

  /** Constrói as mudanças exibíveis a partir da resposta da IA + snapshot. */
  private buildChanges(
    parsed: { changes?: unknown },
    ctx: Awaited<ReturnType<typeof this.loadSnapshot>>,
  ): ProposedChange[] {
    const raw = Array.isArray(parsed.changes) ? parsed.changes : [];
    const out: ProposedChange[] = [];
    const seen = new Set<string>();

    for (const item of raw) {
      if (typeof item !== 'object' || item == null) continue;
      const c = item as Record<string, unknown>;
      const target = c.target === 'cargo' ? 'cargo' : 'concurso';
      const field = typeof c.field === 'string' ? c.field : '';
      const newValue = this.stringifyNew(c.newValue);
      const evidence =
        typeof c.evidence === 'string' && c.evidence.trim()
          ? c.evidence.trim()
          : null;

      if (target === 'concurso') {
        const meta = CONCURSO_FIELDS[field as ConcursoField];
        if (!meta) continue;
        const current = ctx.snapshot.concurso[field as ConcursoField];
        if (newValue === (current ?? null)) continue;
        const id = `concurso::${field}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          target: 'concurso',
          cargoId: null,
          cargoRole: null,
          field,
          label: meta.label,
          currentValue: current ?? null,
          newValue,
          evidence,
        });
      } else {
        const meta = CARGO_FIELDS[field as CargoField];
        if (!meta) continue;
        const role = typeof c.cargoRole === 'string' ? c.cargoRole : '';
        const cargo = ctx.cargosByRole.get(role.toLowerCase());
        if (!cargo) continue;
        const currentRaw = (
          ctx.snapshot.cargos.find(
            (x) => x.role.toLowerCase() === role.toLowerCase(),
          ) as Record<string, unknown> | undefined
        )?.[field];
        const current =
          currentRaw == null ? null : String(currentRaw as string | number);
        if (newValue === current) continue;
        const id = `cargo:${cargo.id}:${field}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          target: 'cargo',
          cargoId: cargo.id,
          cargoRole: cargo.role,
          field,
          label: meta.label,
          currentValue: current,
          newValue,
          evidence,
        });
      }
    }
    return out;
  }

  private stringifyNew(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string')
      return value.trim() === '' ? null : value.trim();
    return null;
  }

  private async fetchDocumentText(url: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(45_000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/pdf,text/html,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });
    } catch (err) {
      throw new BadRequestException(
        `Não foi possível baixar o documento: ${(err as Error).message?.slice(0, 200)}`,
      );
    }
    if (!res.ok) {
      throw new BadRequestException(
        `Falha ao baixar o documento (HTTP ${res.status}). Alguns sites bloqueiam acesso automatizado ao PDF.`,
      );
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const isPdf =
      (res.headers.get('content-type') ?? '').includes('application/pdf') ||
      buffer.subarray(0, 5).toString('latin1') === '%PDF-';
    if (!isPdf) {
      throw new BadRequestException(
        'O documento não é um PDF legível — a análise automática só cobre PDFs por enquanto.',
      );
    }
    try {
      // Mistral OCR (com fallback pdf-parse): preserva as TABELAS do documento
      // como markdown — essencial para cronograma e quadro de matérias, que o
      // pdf-parse achatava. O OCR ainda lê PDF escaneado (que o pdf-parse não).
      const { text, source } = await this.pdfOcr.pdfToText(buffer, {
        maxPages: 200,
      });
      if (!text.trim()) {
        throw new BadRequestException(
          'O PDF parece ser escaneado ou vazio. Não dá para analisar automaticamente.',
        );
      }
      this.logger.log(
        `documento PDF → texto via ${source} (${text.length} chars)`,
      );
      return text;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Falha ao ler o PDF: ${(err as Error).message?.slice(0, 200)}`,
      );
    }
  }

  private async callOpenAI(
    documentText: string,
    snapshotJson: string,
  ): Promise<{
    changes?: unknown;
    cronograma?: unknown;
    syllabusCargos?: unknown;
  }> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('OPENAI_API_KEY não configurada.');
    }
    const userContent = `ESTADO ATUAL (JSON):\n${snapshotJson}\n\n---\n\nDOCUMENTO:\n${documentText.slice(0, 400_000)}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(300_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_tokens: 8192,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(
        `OpenAI API error (${res.status}): ${errBody.slice(0, 300)}`,
      );
    }
    const dataRes = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    let jsonStr = (dataRes.choices?.[0]?.message?.content ?? '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const first = jsonStr.indexOf('{');
    const last = jsonStr.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      jsonStr = jsonStr.slice(first, last + 1);
    }
    try {
      return JSON.parse(jsonStr) as {
        changes?: unknown;
        cronograma?: unknown;
        syllabusCargos?: unknown;
      };
    } catch {
      try {
        return JSON.parse(jsonrepair(jsonStr)) as {
          changes?: unknown;
          cronograma?: unknown;
        };
      } catch {
        throw new BadRequestException(
          'A IA retornou um JSON inválido na análise do documento.',
        );
      }
    }
  }
}
