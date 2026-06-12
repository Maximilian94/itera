import { Controller, Get, Param, Req } from '@nestjs/common';
import { ConcursoService } from './concurso.service';

@Controller('exam-bases')
export class ConcursoController {
  constructor(private readonly concursos: ConcursoService) {}

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
}
