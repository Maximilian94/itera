import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashEmail, hashName, hashPhone, sha256 } from './hash.helper';
import type {
  CapiBody,
  CapiEvent,
  CapiUserData,
  SendLeadEventInput,
} from './meta-conversions.types';

/**
 * Conversions API server-side (Fase 8 do doc).
 *
 * Espelha o evento `Lead` que o Pixel mandou no front, com o mesmo `event_id`,
 * pra Meta deduplicar os dois lados como uma única conversão. Imune a
 * adblocker e iOS 14 ATT — recupera 30-50% das conversões que o Pixel sozinho
 * perde.
 *
 * Configuração (env):
 *  - META_PIXEL_ID            (também usado pelo front)
 *  - META_CAPI_ACCESS_TOKEN   (Bearer token do Business Manager)
 *  - META_TEST_EVENT_CODE     (opcional; quando setado, eventos vão pra
 *                              aba Test Events com latência segundos)
 *  - META_GRAPH_API_VERSION   (opcional; default v18.0)
 *
 * Sem PIXEL_ID ou ACCESS_TOKEN, todas as chamadas viram no-op silencioso —
 * mesmo padrão do AnalyticsService quando POSTHOG_KEY ausente.
 *
 * Falhas (rede, 4xx, 5xx) são logadas como warning mas NUNCA propagadas:
 * o caller (DiagnosticoService.submit) não pode quebrar por falha do Meta.
 */
@Injectable()
export class MetaConversionsService {
  private readonly logger = new Logger(MetaConversionsService.name);
  private readonly pixelId: string | undefined;
  private readonly accessToken: string | undefined;
  private readonly testEventCode: string | undefined;
  private readonly graphVersion: string;

  constructor(config: ConfigService) {
    this.pixelId = config.get<string>('META_PIXEL_ID');
    this.accessToken = config.get<string>('META_CAPI_ACCESS_TOKEN');
    this.testEventCode = config.get<string>('META_TEST_EVENT_CODE');
    this.graphVersion =
      config.get<string>('META_GRAPH_API_VERSION') ?? 'v18.0';

    if (!this.isConfigured()) {
      this.logger.warn(
        'META_PIXEL_ID e/ou META_CAPI_ACCESS_TOKEN ausentes — CAPI ficará em no-op.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.pixelId && this.accessToken);
  }

  async sendLeadEvent(input: SendLeadEventInput): Promise<void> {
    if (!this.isConfigured()) return;

    const userData = this.buildUserData(input);
    const event: CapiEvent = {
      event_name: 'Lead',
      event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      event_source_url: input.eventSourceUrl,
      action_source: 'website',
      user_data: userData,
      custom_data: { content_name: 'Diagnostico Edital' },
    };

    const body: CapiBody = {
      data: [event],
      ...(this.testEventCode ? { test_event_code: this.testEventCode } : {}),
    };

    const url = `https://graph.facebook.com/${this.graphVersion}/${this.pixelId}/events`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await safeText(res);
        this.logger.warn(
          `CAPI Lead (event_id=${input.eventId}) retornou ${res.status}: ${text}`,
        );
        return;
      }

      const json = (await res.json().catch(() => null)) as
        | { events_received?: number; fbtrace_id?: string }
        | null;
      this.logger.log(
        `CAPI Lead enviado (event_id=${input.eventId}, events_received=${json?.events_received ?? '?'}, fbtrace_id=${json?.fbtrace_id ?? '?'})`,
      );
    } catch (e) {
      this.logger.warn(
        `CAPI Lead (event_id=${input.eventId}) falhou: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private buildUserData(input: SendLeadEventInput): CapiUserData {
    const data: CapiUserData = {};

    if (input.email) data.em = [hashEmail(input.email)];
    if (input.phone) data.ph = [hashPhone(input.phone)];
    if (input.firstName) data.fn = [hashName(input.firstName)];
    if (input.externalId) data.external_id = [sha256(input.externalId)];
    if (input.fbp) data.fbp = input.fbp;
    if (input.fbc) data.fbc = input.fbc;
    if (input.ipAddress) data.client_ip_address = input.ipAddress;
    if (input.userAgent) data.client_user_agent = input.userAgent;

    return data;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}
