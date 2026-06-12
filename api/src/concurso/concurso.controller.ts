import { Controller, Get, Param, Req } from '@nestjs/common';
import { ConcursoService } from './concurso.service';
import { SubjectDistributionService } from './subject-distribution.service';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';

@Controller('exam-bases')
export class ConcursoController {
  constructor(
    private readonly concursos: ConcursoService,
    private readonly subjectDistribution: SubjectDistributionService,
  ) {}

  /**
   * Returns the concurso (edital) an exam base belongs to, plus every sibling
   * prova (cargo) in that concurso with the requesting user's stats.
   */
  @Get(':id/concurso')
  getConcurso(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.concursos.getConcursoProvas(id, req.user?.userId);
  }

  /**
   * Subject distribution for the matérias block (nível 2, MAX-17): real
   * distribution of this exam's questions when it's past (`mode: "actual"`),
   * or the aggregate of previous editions of the same cargo/board/institution
   * when it's future (`mode: "historical"`). Auth is optional: logged users
   * get their per-subject accuracy, anonymous requests get `null`s.
   */
  @OptionalAuth()
  @Get(':id/subject-distribution')
  getSubjectDistribution(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.subjectDistribution.getSubjectDistribution(
      id,
      req.user?.userId,
    );
  }
}
