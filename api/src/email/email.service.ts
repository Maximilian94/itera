import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { RESEND_CLIENT } from './providers/resend-client.provider';
import {
  getFirstTrainingCompletedHtml,
  getFirstTrainingCompletedSubject,
  getInactivityReminderHtml,
  getInactivityReminderSubject,
  getPaymentFailedHtml,
  getPaymentFailedSubject,
  getSubscriptionActivatedHtml,
  getSubscriptionActivatedSubject,
  getSubscriptionCanceledHtml,
  getSubscriptionCanceledSubject,
  getWelcomeHtml,
  getWelcomeSubject,
} from './templates';

/**
 * Central service for sending transactional emails.
 * Uses Resend SDK via injected ResendClient.
 *
 * Design decisions:
 * - Empty "to" validation: avoids unnecessary calls and noisy logs
 * - Nest Logger: traceability without polluting stdout
 * - Resend errors: wrapped in InternalServerErrorException with helpful message
 * - Templates in separate files: easier maintenance and future React Email migration
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor(
    @Inject(RESEND_CLIENT) private readonly resend: Resend,
    private readonly config: ConfigService,
  ) {
    this.from =
      this.config.get<string>('email.from') ??
      'Maximize Enfermagem <equipe@mail.maximizeenfermagem.com.br>';
  }

  /**
   * Sends a generic email. Public methods delegate to this.
   * Skips sending if "to" is empty (validated beforehand).
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ id: string }> {
    const trimmedTo = to?.trim();
    if (!trimmedTo) {
      throw new BadRequestException(
        'O destinatário do email (to) não pode estar vazio.',
      );
    }

    this.logger.log(`Enviando email para ${trimmedTo}: ${subject}`);

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: trimmedTo,
      subject,
      html,
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar email para ${trimmedTo}: ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        `Não foi possível enviar o email. Tente novamente mais tarde. (${error.message ?? 'Erro desconhecido'})`,
      );
    }

    this.logger.log(`Email enviado com sucesso para ${trimmedTo} (id: ${data?.id ?? 'N/A'})`);
    return { id: data?.id ?? '' };
  }

  /** Welcome email for new users. */
  async sendWelcomeEmail(
    to: string,
    params: { firstName?: string },
  ): Promise<{ id: string }> {
    return this.sendEmail(
      to,
      getWelcomeSubject(params),
      getWelcomeHtml(params),
    );
  }

  /** Subscription activated confirmation. */
  async sendSubscriptionActivatedEmail(
    to: string,
    params: { planName: string },
  ): Promise<{ id: string }> {
    return this.sendEmail(
      to,
      getSubscriptionActivatedSubject(params),
      getSubscriptionActivatedHtml(params),
    );
  }

  /** Payment failure alert. */
  async sendPaymentFailedEmail(
    to: string,
    params: { updateBillingUrl: string },
  ): Promise<{ id: string }> {
    return this.sendEmail(
      to,
      getPaymentFailedSubject(params),
      getPaymentFailedHtml(params),
    );
  }

  /** Subscription cancellation confirmation. */
  async sendSubscriptionCanceledEmail(
    to: string,
    params: { planName?: string },
  ): Promise<{ id: string }> {
    return this.sendEmail(
      to,
      getSubscriptionCanceledSubject(params),
      getSubscriptionCanceledHtml(params),
    );
  }

  /** Congratulations for first training completed. */
  async sendFirstTrainingCompletedEmail(
    to: string,
    params: { scorePercent: number; totalQuestions: number },
  ): Promise<{ id: string }> {
    return this.sendEmail(
      to,
      getFirstTrainingCompletedSubject(params),
      getFirstTrainingCompletedHtml(params),
    );
  }

  /** Inactivity reminder (3 or 7 days). */
  async sendInactivityReminderEmail(
    to: string,
    params: { daysInactive: 3 | 7; resumeUrl: string },
  ): Promise<{ id: string }> {
    return this.sendEmail(
      to,
      getInactivityReminderSubject(params),
      getInactivityReminderHtml(params),
    );
  }
}
