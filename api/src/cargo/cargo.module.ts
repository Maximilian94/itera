import { Module } from '@nestjs/common';
import { ConcursoModule } from '../concurso/concurso.module';
import { CargoController } from './cargo.controller';
import { CargoService } from './cargo.service';

@Module({
  imports: [ConcursoModule],
  controllers: [CargoController],
  providers: [CargoService],
  exports: [CargoService],
})
export class CargoModule {}
