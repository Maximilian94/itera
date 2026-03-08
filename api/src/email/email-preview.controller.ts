import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import {
  getEmailVerifiedHtml,
  getFirstTrainingCompletedHtml,
  getInactivityReminderHtml,
  getPaymentFailedHtml,
  getSubscriptionActivatedHtml,
  getSubscriptionCanceledHtml,
  getWelcomeGreeting,
} from './templates';

/**
 * Dev-only controller to preview email templates in the browser.
 * GET /email/preview/:template returns the rendered HTML.
 * Does not send any email.
 */
@Controller('email')
export class EmailPreviewController {
  /** Sample params for each template. */
  private static readonly SAMPLE_PARAMS: Record<string, object> = {
    welcome: { firstName: 'Maria' },
    'subscription-activated': { planName: 'Estratégico' },
    'payment-failed': {
      updateBillingUrl: 'https://billing.stripe.com/session/example',
    },
    'subscription-canceled': { planName: 'Elite' },
    'first-training-completed': { scorePercent: 75, totalQuestions: 20 },
    'inactivity-reminder': {
      daysInactive: 7,
      resumeUrl: 'https://app.maximizeenfermagem.com.br',
    },
    'email-verified': {
      firstName: 'Maria',
      dashboardUrl: 'https://app.maximizeenfermagem.com.br',
    },
  };

  private static readonly TEMPLATE_RENDERERS: Record<
    string,
    (params: unknown) => string
  > = {
    welcome: (params) => {
      const greeting = getWelcomeGreeting(params as { firstName?: string });
      return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Welcome (Resend template)</title></head>
<body style="font-family:sans-serif;padding:24px;max-width:600px;">
  <h2>Welcome Email — Resend Template</h2>
  <p>Este template é renderizado pelo Resend (alias: <code>welcome</code>). O HTML não é mais gerado no backend.</p>
  <h3>Variáveis enviadas:</h3>
  <ul>
    <li><strong>GREETING:</strong> ${greeting}</li>
    <li><strong>AUTH_APP_URL:</strong> https://app.maximizeenfermagem.com.br</li>
    <li><strong>AUTH_EXAMS_PAGE_URL:</strong> https://app.maximizeenfermagem.com.br/exams</li>
    <li><strong>SUPPORT_EMAIL:</strong> contato@maximizeenfermagem.com.br</li>
  </ul>
</body>
</html>`.trim();
    },
    'subscription-activated': getSubscriptionActivatedHtml,
    'payment-failed': getPaymentFailedHtml,
    'subscription-canceled': getSubscriptionCanceledHtml,
    'first-training-completed': getFirstTrainingCompletedHtml,
    'inactivity-reminder': getInactivityReminderHtml,
    'email-verified': getEmailVerifiedHtml,
  };

  @Get('preview/:template')
  @Public()
  async preview(
    @Param('template') template: string,
    @Res() res: Response,
  ): Promise<void> {
    const renderer = EmailPreviewController.TEMPLATE_RENDERERS[template];
    if (!renderer) {
      const valid = Object.keys(
        EmailPreviewController.TEMPLATE_RENDERERS,
      ).join(', ');
      throw new BadRequestException(
        `Unknown template "${template}". Valid: ${valid}`,
      );
    }

    const params = EmailPreviewController.SAMPLE_PARAMS[template] ?? {};
    const html = renderer(params as never);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
