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
  buildFirstTrainingCompletedEmailVariables,
  getEmailVerifiedGreeting,
  getInactivityReminderHtml,
  getInactivityReminderSubject,
  getPaymentFailedGreeting,
  getSubscriptionActivatedGreeting,
  getSubscriptionCanceledGreeting,
  getSubscriptionCanceledPlanText,
  getWelcomeGreeting,
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

  /** Welcome email for new users. Uses published Resend template defaults. */
  async sendWelcomeEmail(
    to: string,
    params: { firstName?: string },
  ): Promise<{ id: string }> {
    const trimmedTo = to?.trim();
    if (!trimmedTo) {
      throw new BadRequestException(
        'O destinatário do email (to) não pode estar vazio.',
      );
    }

    const greeting = getWelcomeGreeting(params);
    this.logger.log(`Enviando welcome email para ${trimmedTo}`);

    const { data, error } = await this.resend.emails.send({
      to: trimmedTo,
      template: {
        id: 'welcome',
        variables: {
          GREETING: greeting,
          AUTH_APP_URL: 'https://app.maximizeenfermagem.com.br',
          AUTH_EXAMS_PAGE_URL: 'https://app.maximizeenfermagem.com.br/exams',
          SUPPORT_EMAIL: 'contato@maximizeenfermagem.com.br',
        },
      },
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar welcome email para ${trimmedTo}: ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        `Não foi possível enviar o email. Tente novamente mais tarde. (${error.message ?? 'Erro desconhecido'})`,
      );
    }

    this.logger.log(
      `Welcome email enviado com sucesso para ${trimmedTo} (id: ${data?.id ?? 'N/A'})`,
    );
    return { id: data?.id ?? '' };
  }

  /** Subscription activated confirmation. */
  async sendSubscriptionActivatedEmail(
    to: string,
    params: { planName: string; firstName?: string },
  ): Promise<{ id: string }> {
    const trimmedTo = to?.trim();
    if (!trimmedTo) {
      throw new BadRequestException(
        'O destinatário do email (to) não pode estar vazio.',
      );
    }

    const greeting = getSubscriptionActivatedGreeting(params);
    const subject = `Pagamento confirmado ✅ Plano ${params.planName} ativo`;
    this.logger.log(
      `Enviando subscription-activated email para ${trimmedTo}: ${subject}`,
    );

    const { data, error } = await this.resend.emails.send({
      from: 'Maximize Enfermagem <equipe@mail.maximizeenfermagem.com.br>',
      to: trimmedTo,
      subject,
      replyTo: 'contato@maximizeenfermagem.com.br',
      template: {
        id: 'subscription-activated',
        variables: {
          GREETING: greeting,
          PLAN_NAME: params.planName,
          AUTH_APP_URL: 'https://app.maximizeenfermagem.com.br',
          SUPPORT_EMAIL: 'contato@maximizeenfermagem.com.br',
        },
      },
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar subscription-activated email para ${trimmedTo}: ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        `Não foi possível enviar o email. Tente novamente mais tarde. (${error.message ?? 'Erro desconhecido'})`,
      );
    }

    this.logger.log(
      `Subscription-activated email enviado com sucesso para ${trimmedTo} (id: ${data?.id ?? 'N/A'})`,
    );
    return { id: data?.id ?? '' };
  }

  /** Payment failure alert. */
  async sendPaymentFailedEmail(
    to: string,
    params: { updateBillingUrl: string; firstName?: string },
  ): Promise<{ id: string }> {
    const trimmedTo = to?.trim();
    if (!trimmedTo) {
      throw new BadRequestException(
        'O destinatário do email (to) não pode estar vazio.',
      );
    }

    const greeting = getPaymentFailedGreeting(params);
    const subject = 'Ação necessária: atualizar forma de pagamento';
    this.logger.log(`Enviando payment-failed email para ${trimmedTo}: ${subject}`);

    const { data, error } = await this.resend.emails.send({
      from: 'Maximize Enfermagem <equipe@mail.maximizeenfermagem.com.br>',
      to: trimmedTo,
      subject,
      replyTo: 'contato@maximizeenfermagem.com.br',
      template: {
        id: 'payment-failed',
        variables: {
          GREETING: greeting,
          UPDATE_BILLING_URL: params.updateBillingUrl,
          SUPPORT_EMAIL: 'contato@maximizeenfermagem.com.br',
        },
      },
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar payment-failed email para ${trimmedTo}: ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        `Não foi possível enviar o email. Tente novamente mais tarde. (${error.message ?? 'Erro desconhecido'})`,
      );
    }

    this.logger.log(
      `Payment-failed email enviado com sucesso para ${trimmedTo} (id: ${data?.id ?? 'N/A'})`,
    );
    return { id: data?.id ?? '' };
  }

  /** Subscription cancellation confirmation. */
  async sendSubscriptionCanceledEmail(
    to: string,
    params: { planName?: string; firstName?: string },
  ): Promise<{ id: string }> {
    const trimmedTo = to?.trim();
    if (!trimmedTo) {
      throw new BadRequestException(
        'O destinatário do email (to) não pode estar vazio.',
      );
    }

    const greeting = getSubscriptionCanceledGreeting(params);
    const planText = getSubscriptionCanceledPlanText(params);
    const subject =
      params.planName?.trim()
        ? `Tudo certo ✅ sua assinatura (${params.planName.trim()}) foi cancelada`
        : 'Tudo certo ✅ sua assinatura foi cancelada';
    this.logger.log(
      `Enviando subscription-canceled email para ${trimmedTo}: ${subject}`,
    );

    const { data, error } = await this.resend.emails.send({
      from: 'Maximize Enfermagem <equipe@mail.maximizeenfermagem.com.br>',
      to: trimmedTo,
      subject,
      replyTo: 'contato@maximizeenfermagem.com.br',
      template: {
        id: 'subscription-canceled',
        variables: {
          GREETING: greeting,
          PLAN_NAME: params.planName ?? 'Seu plano',
          PLAN_TEXT: planText,
          AUTH_APP_URL: 'https://app.maximizeenfermagem.com.br',
          SUPPORT_EMAIL: 'contato@maximizeenfermagem.com.br',
        },
      },
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar subscription-canceled email para ${trimmedTo}: ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        `Não foi possível enviar o email. Tente novamente mais tarde. (${error.message ?? 'Erro desconhecido'})`,
      );
    }

    this.logger.log(
      `Subscription-canceled email enviado com sucesso para ${trimmedTo} (id: ${data?.id ?? 'N/A'})`,
    );
    return { id: data?.id ?? '' };
  }

  /** Congratulations for first training completed. */
  async sendFirstTrainingCompletedEmail(
    to: string,
    params: {
      scorePercent: number;
      totalQuestions: number;
      firstName?: string | null;
    },
  ): Promise<{ id: string }> {
    const trimmedTo = to?.trim();
    if (!trimmedTo) {
      throw new BadRequestException(
        'O destinatário do email (to) não pode estar vazio.',
      );
    }

    const subject = 'Parabéns! Você concluiu seu primeiro treino 🎯';
    this.logger.log(
      `Enviando first-training-completed email para ${trimmedTo}: ${subject}`,
    );

    const { data, error } = await this.resend.emails.send({
      from: 'Maximize Enfermagem <equipe@mail.maximizeenfermagem.com.br>',
      to: trimmedTo,
      subject,
      replyTo: 'contato@maximizeenfermagem.com.br',
      template: {
        id: 'first-training-completed',
        variables: buildFirstTrainingCompletedEmailVariables(params),
      },
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar first-training-completed email para ${trimmedTo}: ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        `Não foi possível enviar o email. Tente novamente mais tarde. (${error.message ?? 'Erro desconhecido'})`,
      );
    }

    this.logger.log(
      `First-training-completed email enviado com sucesso para ${trimmedTo} (id: ${data?.id ?? 'N/A'})`,
    );
    return { id: data?.id ?? '' };
  }

  /** Email verified confirmation (when user verifies primary email). */
  async sendEmailVerifiedEmail(
    to: string,
    params: { firstName?: string },
  ): Promise<{ id: string }> {
    const trimmedTo = to?.trim();
    if (!trimmedTo) {
      throw new BadRequestException(
        'O destinatário do email (to) não pode estar vazio.',
      );
    }

    const greeting = getEmailVerifiedGreeting(params);
    const subject = 'E-mail verificado com sucesso! ✅';
    this.logger.log(`Enviando email-verified email para ${trimmedTo}: ${subject}`);

    const { data, error } = await this.resend.emails.send({
      from: 'Maximize Enfermagem <equipe@mail.maximizeenfermagem.com.br>',
      to: trimmedTo,
      subject,
      replyTo: 'contato@maximizeenfermagem.com.br',
      template: {
        id: 'email-verified',
        variables: {
          GREETING: greeting,
          AUTH_APP_URL: 'https://app.maximizeenfermagem.com.br',
        },
      },
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar email-verified email para ${trimmedTo}: ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException(
        `Não foi possível enviar o email. Tente novamente mais tarde. (${error.message ?? 'Erro desconhecido'})`,
      );
    }

    this.logger.log(
      `Email-verified email enviado com sucesso para ${trimmedTo} (id: ${data?.id ?? 'N/A'})`,
    );
    return { id: data?.id ?? '' };
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
