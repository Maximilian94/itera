import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { GoalService } from './goal.service';
import { CreateGoalDto } from './dto/create-goal.dto';

/**
 * Metas de estudo do usuário autenticado (âncora da home "Mesa do dia").
 * Escopo implícito no token — mesmo padrão de /preferences: sem decorator,
 * o guard global exige JWT Clerk válido (401 para anônimo).
 */
@Controller('goals')
export class GoalsController {
  constructor(private readonly service: GoalService) {}

  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.service.list(req.user.userId);
  }

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateGoalDto,
  ) {
    return this.service.create(req.user.userId, dto);
  }

  /** "Parar de treinar" — arquiva a meta (não apaga o histórico). */
  @Delete(':id')
  archive(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.service.archive(req.user.userId, id);
  }
}
