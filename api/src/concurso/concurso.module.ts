import { Module } from '@nestjs/common';
import { ConcursoController } from './concurso.controller';
import { ConcursosController } from './concursos.controller';
import { ConcursoService } from './concurso.service';
import { SubjectDistributionService } from './subject-distribution.service';
import { CompetitionHistoryService } from './competition-history.service';

@Module({
  controllers: [ConcursoController, ConcursosController],
  providers: [
    ConcursoService,
    SubjectDistributionService,
    CompetitionHistoryService,
  ],
})
export class ConcursoModule {}
