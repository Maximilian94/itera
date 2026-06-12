import { Module } from '@nestjs/common';
import { ConcursoController } from './concurso.controller';
import { ConcursosController } from './concursos.controller';
import { ConcursoService } from './concurso.service';

@Module({
  controllers: [ConcursoController, ConcursosController],
  providers: [ConcursoService],
})
export class ConcursoModule {}
