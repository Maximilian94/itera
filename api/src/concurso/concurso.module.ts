import { Module } from '@nestjs/common';
import { ConcursoController } from './concurso.controller';
import { ConcursosController } from './concursos.controller';
import { ConcursoService } from './concurso.service';
import { ConcursoAdminService } from './concurso-admin.service';
import { ConcursoLinkService } from './concurso-link.service';
import { SubjectDistributionService } from './subject-distribution.service';
import { CompetitionHistoryService } from './competition-history.service';

@Module({
  controllers: [ConcursoController, ConcursosController],
  providers: [
    ConcursoService,
    ConcursoAdminService,
    ConcursoLinkService,
    SubjectDistributionService,
    CompetitionHistoryService,
  ],
  // O find-or-create do Concurso é compartilhado com CargoModule/ExamBaseModule
  // (Concurso eager na criação da prova — remodelagem R3.1).
  exports: [ConcursoLinkService],
})
export class ConcursoModule {}
