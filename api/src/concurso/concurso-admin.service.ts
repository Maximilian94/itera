import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConcursoLinkService } from './concurso-link.service';
import type {
  ConcursoSyllabusGroupDto,
  CreateConcursoDto,
  UpdateConcursoDto,
} from './dto/create-concurso.dto';

const trimOrNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
};

/** Normaliza uma etapa do cronograma (nome + descrição + data date-only). */
const mapEtapa = (e: {
  name: string;
  description?: string | null;
  date?: string | null;
}) => ({
  name: e.name.trim(),
  description: trimOrNull(e.description),
  date: e.date ? e.date.slice(0, 10) : null,
});

/**
 * Escrita admin de Concurso (fluxo "criar concurso a partir do edital", do
 * scraper de documentos): cria/atualiza o Concurso ANTES de existir qualquer
 * prova e garante a ficha do Cargo. Quando a primeira ExamBase for criada pelo
 * wizard com a mesma tupla (institution + ano + banca), o find-or-create do
 * lazy-link reencontra este mesmo Concurso — nada duplica.
 */
@Injectable()
export class ConcursoAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly concursoLink: ConcursoLinkService,
  ) {}

  /**
   * Substitui o conteúdo programático (quadro de matérias) de um cargo pela
   * lista informada. Undefined = não mexe (retrocompatível com payloads sem o
   * campo); array = replace total dos grupos DO CARGO (dono é o Cargo na R4.2).
   * Grava só cargoId — o concurso pode não ter prova ainda (examBaseId null).
   */
  private async replaceCargoSyllabus(
    cargoId: string,
    groups: ConcursoSyllabusGroupDto[] | undefined,
  ): Promise<void> {
    if (groups === undefined) return;
    await this.prisma.examSyllabusGroup.deleteMany({ where: { cargoId } });
    const valid = groups.filter((g) => g.name.trim() !== '');
    if (valid.length === 0) return;
    await this.prisma.examSyllabusGroup.createMany({
      data: valid.map((g, i) => ({
        cargoId,
        order: i,
        name: g.name.trim(),
        topics: trimOrNull(g.topics) ?? '',
        questionCount: g.questionCount ?? null,
        weight: g.weight ?? null,
        maxScore: g.maxScore ?? null,
      })),
    });
  }

  async createFromEdital(dto: CreateConcursoDto) {
    const board = dto.examBoardId
      ? await this.prisma.examBoard.findUnique({
          where: { id: dto.examBoardId },
          select: { alias: true, name: true },
        })
      : null;

    // Mesma identidade do lazy-link: reutiliza o concurso se a tupla já existe
    // (ex.: uma prova antiga do mesmo órgão/banca/ano já o criou).
    const concurso = await this.concursoLink.findOrCreateConcurso({
      institution: dto.institution.trim(),
      year: dto.year,
      governmentScope: dto.governmentScope,
      state: trimOrNull(dto.state),
      city: trimOrNull(dto.city),
      examBoardId: dto.examBoardId ?? null,
      boardLabel: board ? (board.alias ?? board.name) : null,
    });

    // Campos que o Concurso é dono (remodelagem R3.1): edital + janela de
    // inscrição + resultado. Admin manda → sobrescreve; omitido → preserva.
    const updated = await this.prisma.concurso.update({
      where: { id: concurso.id },
      data: {
        ...(dto.editalUrl !== undefined
          ? { editalUrl: trimOrNull(dto.editalUrl) }
          : {}),
        ...(dto.registrationStart !== undefined
          ? {
              registrationStart: dto.registrationStart
                ? new Date(dto.registrationStart)
                : null,
            }
          : {}),
        ...(dto.registrationEnd !== undefined
          ? {
              registrationEnd: dto.registrationEnd
                ? new Date(dto.registrationEnd)
                : null,
            }
          : {}),
        ...(dto.examDate !== undefined
          ? { examDate: dto.examDate ? new Date(dto.examDate) : null }
          : {}),
        ...(dto.resultDate !== undefined
          ? { resultDate: dto.resultDate ? new Date(dto.resultDate) : null }
          : {}),
        ...(dto.state !== undefined ? { state: trimOrNull(dto.state) } : {}),
        ...(dto.city !== undefined ? { city: trimOrNull(dto.city) } : {}),
        // Etapas do certame (name + description opcional), como vieram do form.
        ...(dto.etapas !== undefined
          ? {
              etapas: dto.etapas
                .filter((e) => e.name.trim() !== '')
                .map(mapEtapa),
            }
          : {}),
        // Página de origem dos documentos → "verificar novas publicações". A
        // raspagem inicial conta como a primeira verificação.
        ...(() => {
          const src = dto.documents?.map((d) => d.sourceUrl).find(Boolean);
          return src
            ? { documentsSourceUrl: src, documentsCheckedAt: new Date() }
            : {};
        })(),
      },
      select: { id: true, slug: true, institution: true, year: true },
    });

    // Fichas dos cargos: idempotente por (concursoId, role) — re-extrair o
    // mesmo edital atualiza cada ficha em vez de duplicar.
    const cargos: { id: string; role: string; created: boolean }[] = [];
    for (const cargoDto of dto.cargos) {
      const role = cargoDto.role.trim();
      if (!role) continue;
      const existingCargo = await this.prisma.cargo.findFirst({
        where: {
          concursoId: concurso.id,
          role: { equals: role, mode: 'insensitive' },
        },
        select: { id: true },
      });

      const fichaData = {
        role,
        description: trimOrNull(cargoDto.description),
        requirements: trimOrNull(cargoDto.requirements),
        salaryBase: cargoDto.salaryBase ?? null,
        workload: trimOrNull(cargoDto.workload),
        vacancyCount: cargoDto.vacancyCount ?? null,
        hasReserveList: cargoDto.hasReserveList ?? false,
        applicantCount: cargoDto.applicantCount ?? null,
        registrationFee: cargoDto.registrationFee ?? null,
        minPassingGradeNonQuota: cargoDto.minPassingGradeNonQuota ?? null,
        isNursingRelevant: cargoDto.isNursingRelevant ?? false,
      };

      const cargo = existingCargo
        ? await this.prisma.cargo.update({
            where: { id: existingCargo.id },
            data: fichaData,
            select: { id: true, role: true },
          })
        : await this.prisma.cargo.create({
            data: { ...fichaData, concursoId: concurso.id },
            select: { id: true, role: true },
          });
      await this.replaceCargoSyllabus(cargo.id, cargoDto.syllabusGroups);
      cargos.push({ ...cargo, created: !existingCargo });
    }

    // Documentos do concurso (edital, retificações, gabaritos...): a timeline
    // de Notícias do nível 1. Upsert por (concursoId, url) — re-extrair o mesmo
    // edital atualiza título/resumo em vez de duplicar, e é o mesmo caminho que
    // o monitoramento futuro usará para inserir só os documentos novos.
    let documentCount = 0;
    if (dto.documents !== undefined) {
      for (const doc of dto.documents) {
        const url = doc.url.trim();
        if (!url) continue;
        const data = {
          title: doc.title.trim() || url,
          summary: trimOrNull(doc.summary),
          kind: trimOrNull(doc.kind) ?? 'OUTRO',
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
          sourceUrl: trimOrNull(doc.sourceUrl),
        };
        await this.prisma.concursoDocument.upsert({
          where: { concursoId_url: { concursoId: concurso.id, url } },
          create: { ...data, url, concursoId: concurso.id },
          update: data,
        });
        documentCount++;
      }
    }

    return {
      concurso: updated,
      cargos,
      createdCount: cargos.filter((c) => c.created).length,
      updatedCount: cargos.filter((c) => !c.created).length,
      documentCount,
    };
  }

  /** Payload de edição (ADMIN): concurso + TODOS os cargos com ficha completa. */
  async getForEdit(id: string) {
    const concurso = await this.prisma.concurso.findUnique({
      where: { id },
      select: {
        id: true,
        institution: true,
        year: true,
        governmentScope: true,
        state: true,
        city: true,
        examBoardId: true,
        editalUrl: true,
        documentsSourceUrl: true,
        registrationStart: true,
        registrationEnd: true,
        examDate: true,
        resultDate: true,
        etapas: true,
        cargos: {
          orderBy: { role: 'asc' as const },
          select: {
            id: true,
            role: true,
            description: true,
            requirements: true,
            salaryBase: true,
            workload: true,
            vacancyCount: true,
            hasReserveList: true,
            registrationFee: true,
            minPassingGradeNonQuota: true,
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
            _count: { select: { provas: true } },
          },
        },
      },
    });
    if (!concurso) throw new NotFoundException('concurso not found');

    const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
    return {
      concurso: {
        id: concurso.id,
        institution: concurso.institution,
        year: concurso.year,
        governmentScope: concurso.governmentScope,
        state: concurso.state,
        city: concurso.city,
        examBoardId: concurso.examBoardId,
        editalUrl: concurso.editalUrl,
        documentsSourceUrl: concurso.documentsSourceUrl,
        registrationStart: iso(concurso.registrationStart),
        registrationEnd: iso(concurso.registrationEnd),
        examDate: iso(concurso.examDate),
        resultDate: iso(concurso.resultDate),
        etapas:
          (concurso.etapas as
            | {
                name: string;
                description: string | null;
                date: string | null;
              }[]
            | null) ?? [],
      },
      cargos: concurso.cargos.map((c) => ({
        id: c.id,
        role: c.role,
        description: c.description,
        requirements: c.requirements,
        salaryBase: c.salaryBase != null ? String(c.salaryBase) : null,
        workload: c.workload,
        vacancyCount: c.vacancyCount,
        hasReserveList: c.hasReserveList,
        registrationFee:
          c.registrationFee != null ? String(c.registrationFee) : null,
        minPassingGradeNonQuota:
          c.minPassingGradeNonQuota != null
            ? String(c.minPassingGradeNonQuota)
            : null,
        isNursingRelevant: c.isNursingRelevant,
        syllabusGroups: c.syllabusGroups.map((g) => ({
          name: g.name,
          topics: g.topics,
          questionCount: g.questionCount,
          weight: g.weight != null ? String(g.weight) : null,
          maxScore: g.maxScore != null ? String(g.maxScore) : null,
        })),
        // Cargo com prova vinculada não pode ser removido aqui (é gerido pelo
        // wizard de provas) — o front desabilita o botão de remover.
        provaCount: c._count.provas,
      })),
    };
  }

  /**
   * Edita um concurso já criado: atualiza os campos do concurso + etapas e faz
   * o upsert da lista de cargos (id → update; sem id → create). Cargos SEM
   * prova que sumiram da lista são removidos; cargos com prova são preservados.
   */
  async updateConcurso(id: string, dto: UpdateConcursoDto) {
    const existing = await this.prisma.concurso.findUnique({
      where: { id },
      select: { id: true, cargos: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('concurso not found');

    await this.prisma.concurso.update({
      where: { id },
      data: {
        institution: dto.institution.trim(),
        year: dto.year,
        governmentScope: dto.governmentScope,
        state: trimOrNull(dto.state),
        city: trimOrNull(dto.city),
        examBoardId: dto.examBoardId ?? null,
        editalUrl: trimOrNull(dto.editalUrl),
        documentsSourceUrl: trimOrNull(dto.documentsSourceUrl),
        registrationStart: dto.registrationStart
          ? new Date(dto.registrationStart)
          : null,
        registrationEnd: dto.registrationEnd
          ? new Date(dto.registrationEnd)
          : null,
        examDate: dto.examDate ? new Date(dto.examDate) : null,
        resultDate: dto.resultDate ? new Date(dto.resultDate) : null,
        etapas: (dto.etapas ?? [])
          .filter((e) => e.name.trim() !== '')
          .map(mapEtapa),
      },
    });

    // Cargos: upsert por id (ou por role, p/ os novos) e remoção dos que saíram.
    const keptIds = new Set<string>();
    const cargos: { id: string; role: string; created: boolean }[] = [];
    for (const cargoDto of dto.cargos) {
      const role = cargoDto.role.trim();
      if (!role) continue;
      const fichaData = {
        role,
        description: trimOrNull(cargoDto.description),
        requirements: trimOrNull(cargoDto.requirements),
        salaryBase: cargoDto.salaryBase ?? null,
        workload: trimOrNull(cargoDto.workload),
        vacancyCount: cargoDto.vacancyCount ?? null,
        hasReserveList: cargoDto.hasReserveList ?? false,
        registrationFee: cargoDto.registrationFee ?? null,
        minPassingGradeNonQuota: cargoDto.minPassingGradeNonQuota ?? null,
        isNursingRelevant: cargoDto.isNursingRelevant ?? false,
      };
      // id informado e pertencente ao concurso → update; senão → create.
      const owned =
        cargoDto.id != null &&
        existing.cargos.some((c) => c.id === cargoDto.id);
      const cargo = owned
        ? await this.prisma.cargo.update({
            where: { id: cargoDto.id },
            data: fichaData,
            select: { id: true, role: true },
          })
        : await this.prisma.cargo.create({
            data: { ...fichaData, concursoId: id },
            select: { id: true, role: true },
          });
      await this.replaceCargoSyllabus(cargo.id, cargoDto.syllabusGroups);
      keptIds.add(cargo.id);
      cargos.push({ ...cargo, created: !owned });
    }

    // Remove cargos que sumiram da lista — só os SEM prova vinculada.
    const removable = await this.prisma.cargo.findMany({
      where: {
        concursoId: id,
        id: { notIn: [...keptIds] },
        provas: { none: {} },
      },
      select: { id: true },
    });
    if (removable.length > 0) {
      await this.prisma.cargo.deleteMany({
        where: { id: { in: removable.map((c) => c.id) } },
      });
    }

    return {
      concurso: { id },
      cargos,
      createdCount: cargos.filter((c) => c.created).length,
      updatedCount: cargos.filter((c) => !c.created).length,
      removedCount: removable.length,
    };
  }
}
