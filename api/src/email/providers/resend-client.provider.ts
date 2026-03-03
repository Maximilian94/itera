import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/** NestJS injection token for ResendClient. */
export const RESEND_CLIENT = 'RESEND_CLIENT';

/**
 * Provider factory that instantiates the Resend SDK.
 * Validates RESEND_API_KEY_PROD on boot: if missing, throws and prevents
 * the app from starting (fail-fast to avoid silent send failures).
 */
export const ResendClientProvider = {
  provide: RESEND_CLIENT,
  useFactory: (config: ConfigService): Resend => {
    const apiKey = config.get<string>('email.resendApiKey') ?? config.get<string>('RESEND_API_KEY_PROD');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'RESEND_API_KEY_PROD é obrigatória para o módulo de email. Configure no .env e reinicie a aplicação.',
      );
    }
    return new Resend(apiKey);
  },
  inject: [ConfigService],
};
