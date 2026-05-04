/**
 * Payload de input pra MetaConversionsService.sendLeadEvent.
 * O service hasheia o que precisa antes de mandar pro Graph API.
 */
export interface SendLeadEventInput {
  /**
   * UUID gerado pelo wizard. Mesmo id que foi enviado pelo Pixel
   * (event_id / eventID). Meta dedupica os dois canais por esse valor.
   */
  eventId: string;
  /** Epoch em segundos. Se omitido, usa now. Meta aceita até 7 dias atrás. */
  eventTime?: number;
  /** URL completa onde o evento aconteceu (ex: https://.../diagnostico). */
  eventSourceUrl?: string;

  /** PII bruta — service hasheia antes de mandar. */
  email: string;
  phone?: string;
  firstName?: string;

  /** Cookies do Pixel: enviados sem hash (são identificadores opacos). */
  fbp?: string;
  fbc?: string;

  /** Headers do request HTTP original. Não hasheia. */
  ipAddress?: string;
  userAgent?: string;

  /**
   * external_id: identificador estável do usuário no nosso lado (leadId).
   * Hasheado antes de enviar; melhora match quality.
   */
  externalId?: string;
}

/**
 * Body que mandamos pro Graph API. Documentado em:
 * https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api
 */
export interface CapiBody {
  data: CapiEvent[];
  test_event_code?: string;
}

export interface CapiEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: 'website' | 'app' | 'email' | 'chat' | 'phone_call' | 'physical_store' | 'system_generated' | 'other';
  user_data: CapiUserData;
  custom_data?: Record<string, unknown>;
}

export interface CapiUserData {
  /** SHA256(email) */
  em?: string[];
  /** SHA256(phone) */
  ph?: string[];
  /** SHA256(first name) */
  fn?: string[];
  /** SHA256(external id) */
  external_id?: string[];
  /** Raw cookie value */
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}
