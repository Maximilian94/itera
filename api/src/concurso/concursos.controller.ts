import { Controller, Get, Param, Req } from '@nestjs/common';
import { ConcursoService } from './concurso.service';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';

@Controller('concursos')
export class ConcursosController {
  constructor(private readonly concursos: ConcursoService) {}

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
