import { metaPixel } from "./init";

/**
 * Helpers de alto nível pros eventos Pixel disparados a partir do wizard.
 * Componentes não devem chamar metaPixel.track diretamente — passam por aqui
 * pra centralizar `content_name` e outros params estáveis.
 */

const CONTENT_NAME = "Diagnostico Edital";

export function firePixelViewContent(): void {
  metaPixel.track("ViewContent", { content_name: CONTENT_NAME });
}

export interface FirePixelLeadInput {
  /**
   * UUID gerado pelo wizard. Mesmo id deve ser enviado pelo backend via CAPI
   * (Fase 8) pra Meta deduplicar Pixel + CAPI como uma única conversão.
   */
  eventId: string;
  email: string;
}

export function firePixelLead(input: FirePixelLeadInput): void {
  metaPixel.track(
    "Lead",
    { content_name: CONTENT_NAME },
    { eventID: input.eventId },
  );
}
