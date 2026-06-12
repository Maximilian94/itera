import { Module } from '@nestjs/common';
import { ConcursoController } from './concurso.controller';
import { ConcursoService } from './concurso.service';

@Module({
  controllers: [ConcursoController],
  providers: [ConcursoService],
})
export class ConcursoModule {}
