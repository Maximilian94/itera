import { Module } from '@nestjs/common';
import { LeadService } from './lead.service';
import { TagService } from './tag.service';
import { LeadEventService } from './lead-event.service';

/**
 * Infraestrutura de leads (pré-conversão). Capturados pelo wizard de
 * diagnóstico em `/diagnostico` via LPs.
 *
 * Fase 1: services + helpers. Controller + DiagnosticoService entram nas
 * fases seguintes (ver vibe-coding/2026-05-diagnostico-edital.md).
 */
@Module({
  providers: [LeadService, TagService, LeadEventService],
  exports: [LeadService, TagService, LeadEventService],
})
export class LeadModule {}
