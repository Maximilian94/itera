import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { GovernmentScope } from '@prisma/client';
import { ConcursoService } from './concurso.service';
import type { ConcursoStatus } from './concurso-status';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';

const SCOPES = new Set<GovernmentScope>([
  GovernmentScope.MUNICIPAL,
  GovernmentScope.STATE,
  GovernmentScope.FEDERAL,
]);
const STATUSES = new Set<ConcursoStatus>(['open', 'future', 'past']);

@Controller('concursos')
export class ConcursosController {
  constructor(private readonly concursos: ConcursoService) {}

  /**
   * Discovery listing (MAX-28, nova porta de entrada): one card per concurso,
   * aggregated from ExamBase by institution + board + exam year. Server-side
   * filters (q, scope, state, city, examBoardId, status) match the old /exams
   * filters. Auth is optional: logged users get aggregate per-concurso stats.
   */
  @OptionalAuth()
  @Get()
  listConcursos(
    @Req() req: { user?: { userId: string } },
    @Query('q') q?: string,
    @Query('scope') scope?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('examBoardId') examBoardId?: string,
    @Query('status') status?: string,
  ) {
    return this.concursos.listConcursos(
      {
        q,
        scope:
          scope && SCOPES.has(scope as GovernmentScope)
            ? (scope as GovernmentScope)
            : undefined,
        state,
        city,
        examBoardId,
        status:
          status && STATUSES.has(status as ConcursoStatus)
            ? (status as ConcursoStatus)
            : undefined,
      },
      req.user?.userId,
    );
  }

  /**
   * Canonical concurso page payload (nível 1): identity, derived temporal
   * status, timeline, aggregates and one card per nursing-relevant cargo.
   * Accepts slug or UUID. Auth is optional: anonymous requests get the same
   * payload with zeroed user stats.
   */
  @OptionalAuth()
  @Get(':slug')
  getConcurso(
    @Param('slug') slug: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.concursos.getConcursoDetail(slug, req.user?.userId);
  }

  /**
   * Cargo page payload (nível 2): full cargo sheet, syllabus groups (empty
   * for past exams), previous editions of the same cargo/board/institution
   * and the user's study plan. `cargoSlug` is the ExamBase slug (UUID also
   * accepted). 404 when the cargo doesn't belong to the concurso or isn't
   * nursing-relevant. Anonymous requests get a zeroed `diagnostico` plan.
   */
  @OptionalAuth()
  @Get(':slug/cargos/:cargoSlug')
  getCargo(
    @Param('slug') slug: string,
    @Param('cargoSlug') cargoSlug: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.concursos.getCargoDetail(slug, cargoSlug, req.user?.userId);
  }
}
