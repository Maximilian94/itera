import { registerAs } from '@nestjs/config';

/**
 * Centralized configuration for the email module.
 * Uses registerAs for namespacing (email.*) and strong typing.
 *
 * Environment variables:
 * - RESEND_API_KEY_PROD: required — fails on boot if missing
 * - EMAIL_FROM: optional — safe fallback for default sender
 */
export const emailConfig = registerAs('email', () => {
  const apiKey = process.env.RESEND_API_KEY_PROD;
  const from =
    process.env.EMAIL_FROM ||
    'Maximize Enfermagem <equipe@mail.maximizeenfermagem.com.br>';

  return {
    /** Resend API key (production). Required for sending. */
    resendApiKey: apiKey,
    /** Default sender in "Name <email@domain.com>" format. */
    from,
  };
});

export type EmailConfigType = {
  resendApiKey: string | undefined;
  from: string;
};
