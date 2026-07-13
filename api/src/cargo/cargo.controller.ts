import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CargoService } from './cargo.service';
import {
  CreateCargoDto,
  LinkProvaDto,
  ListCargosQueryDto,
  UpdateCargoDto,
  UpdateProvaLinkDto,
} from './dto/cargo.dto';

/**
 * Gestão ADMIN de cargos (remodelagem Cargo↔Prova, R4.1). A leitura pública
 * dos cargos continua nos endpoints de concurso (`GET /concursos/...`).
 */
@Controller('cargos')
export class CargoController {
  constructor(private readonly cargos: CargoService) {}

  @Get()
  @Roles('ADMIN')
  list(@Query() query: ListCargosQueryDto) {
    return this.cargos.list({ concursoId: query.concursoId });
  }

  @Get(':id')
  @Roles('ADMIN')
  getOne(@Param('id') id: string) {
    return this.cargos.getOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateCargoDto) {
    return this.cargos.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCargoDto) {
    return this.cargos.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.cargos.remove(id);
  }

  /** Vincula uma prova ao cargo ("compartilhar prova" = mesmo endpoint). */
  @Post(':id/provas/:examBaseId')
  @Roles('ADMIN')
  linkProva(
    @Param('id') id: string,
    @Param('examBaseId') examBaseId: string,
    @Body() dto: LinkProvaDto,
  ) {
    return this.cargos.linkProva(id, examBaseId, dto);
  }

  @Patch(':id/provas/:examBaseId')
  @Roles('ADMIN')
  updateProvaLink(
    @Param('id') id: string,
    @Param('examBaseId') examBaseId: string,
    @Body() dto: UpdateProvaLinkDto,
  ) {
    return this.cargos.updateProvaLink(id, examBaseId, dto);
  }

  @Delete(':id/provas/:examBaseId')
  @Roles('ADMIN')
  unlinkProva(
    @Param('id') id: string,
    @Param('examBaseId') examBaseId: string,
  ) {
    return this.cargos.unlinkProva(id, examBaseId);
  }

  /** Elege a prova oficial (rebaixa a atual e promove esta, em transação). */
  @Post(':id/provas/:examBaseId/oficial')
  @Roles('ADMIN')
  setOficial(
    @Param('id') id: string,
    @Param('examBaseId') examBaseId: string,
  ) {
    return this.cargos.setOficial(id, examBaseId);
  }
}
