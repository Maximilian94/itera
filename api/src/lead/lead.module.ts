import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EmailModule } from '../email/email.module';
import { DiagnosticoService } from './diagnostico.service';
import { LeadController } from './lead.controller';
import { LeadEventService } from './lead-event.service';
import { LeadService } from './lead.service';
import { TagService } from './tag.service';

/**
 * Infraestrutura de leads (pré-conversão). Capturados pelo wizard de
 * diagnóstico em `/diagnostico` via LPs.
 *
 * Importa EmailModule (pra enfileirar diagnostico_resultado) e
 * AnalyticsModule (pra capturar diagnostico_concluido autoritativo).
 */
@Module({
  imports: [EmailModule, AnalyticsModule],
  controllers: [LeadController],
  providers: [
    LeadService,
    TagService,
    LeadEventService,
    DiagnosticoService,
  ],
  exports: [LeadService, TagService, LeadEventService, DiagnosticoService],
})
export class LeadModule {}
