import { Body, Controller, Get, Post } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './skills.dto';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Get()
  list() {
    return this.skills.listSkillsHierarchy();
  }

  @Post()
  create(@Body() dto: CreateSkillDto) {
    return this.skills.createSkill(dto);
  }
}
