import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { DiagnosticoService } from './diagnostico.service';
import { LeadService } from './lead.service';
import { SubmitDiagnosticoDto } from './dto/submit-diagnostico.dto';
import { UpdateQualificacaoDto } from './dto/update-qualificacao.dto';

/**
 * Endpoints públicos (sem Clerk auth) consumidos pelo wizard standalone.
 *
 * - POST /leads/diagnostico       → cria lead + resposta + tags + email
 * - PATCH /leads/:id/qualificacao → adiciona qualificação comercial ao lead
 */
@Controller('leads')
export class LeadController {
  constructor(
    private readonly diagnosticoService: DiagnosticoService,
    private readonly leadService: LeadService,
  ) {}

  @Public()
  @Post('diagnostico')
  async submitDiagnostico(
    @Body() dto: SubmitDiagnosticoDto,
    @Req() req: Request,
  ): Promise<{ ok: true; leadId: string }> {
    if (!SubmitDiagnosticoDto.validateRespostas(dto)) {
      throw new BadRequestException(
        'respostas precisa ser um objeto não-vazio com valores ∈ {A,B,C,D}.',
      );
    }

    const ipAddress = extractIp(req);
    const userAgent = req.headers['user-agent'];
    // event_source_url do CAPI: URL onde o submit aconteceu, não a do request.
    // O wizard fica em /diagnostico, então o referer é exatamente isso.
    const eventSourceUrl =
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined;

    const { leadId } = await this.diagnosticoService.submit(dto, {
      ipAddress,
      userAgent,
      eventSourceUrl,
    });

    return { ok: true, leadId };
  }

  @Public()
  @Patch(':id/qualificacao')
  async updateQualificacao(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQualificacaoDto,
  ): Promise<{ ok: true }> {
    await this.leadService.updateQualificacao(id, dto.qualificacao);
    return { ok: true };
  }
}

/** Honra X-Forwarded-For quando atrás de proxy (Cloudflare/Vercel/Heroku). */
function extractIp(req: Request): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0]?.trim();
  }
  return req.ip;
}
