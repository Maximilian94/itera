import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { PreferenceService } from './preference.service';
import { UpsertPreferenceDto } from './dto/upsert-preference.dto';

/**
 * Preference profile of the authenticated user (concurso recommendations).
 * Scope is implicit in the token — same pattern as /training. No decorator =
 * the global guard requires a valid Clerk JWT (401 for anonymous).
 */
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly service: PreferenceService) {}

  @Get()
  get(@Req() req: { user: { userId: string } }) {
    return this.service.get(req.user.userId);
  }

  /** Full-document upsert — the form always sends every field. */
  @Put()
  upsert(
    @Req() req: { user: { userId: string } },
    @Body() dto: UpsertPreferenceDto,
  ) {
    return this.service.upsert(req.user.userId, dto);
  }
}
