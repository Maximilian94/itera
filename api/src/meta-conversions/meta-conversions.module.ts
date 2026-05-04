import { Module } from '@nestjs/common';
import { MetaConversionsService } from './meta-conversions.service';

/**
 * Integração com Conversions API do Meta. Importado por LeadModule pra
 * disparar `Lead` server-side em paralelo ao Pixel client-side, ambos
 * deduplicados pelo mesmo event_id.
 */
@Module({
  providers: [MetaConversionsService],
  exports: [MetaConversionsService],
})
export class MetaConversionsModule {}
