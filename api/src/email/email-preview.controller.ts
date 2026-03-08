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
  buildFirstTrainingCompletedEmailVariables,
  getEmailVerifiedGreeting,
  getInactivityReminderHtml,
  getPaymentFailedGreeting,
  getSubscriptionActivatedGreeting,
  getSubscriptionCanceledGreeting,
  getSubscriptionCanceledPlanText,
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
    'subscription-activated': { firstName: 'Maria', planName: 'Estratégico' },
    'payment-failed': {
      firstName: 'Maria',
      updateBillingUrl: 'https://billing.stripe.com/session/example',
    },
    'subscription-canceled': { firstName: 'Maria', planName: 'Elite' },
    'first-training-completed': {
      firstName: 'Maria',
      scorePercent: 75,
      totalQuestions: 20,
    },
    'inactivity-reminder': {
      daysInactive: 7,
      resumeUrl: 'https://app.maximizeenfermagem.com.br',
    },
    'email-verified': {
      firstName: 'Maria',
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
    'subscription-activated': (params) => {
      const typedParams = params as {
        planName: string;
        firstName?: string;
      };
      const greeting = getSubscriptionActivatedGreeting(typedParams);
      return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Subscription Activated (Resend template)</title></head>
<body style="font-family:sans-serif;padding:24px;max-width:600px;">
  <h2>Subscription Activated — Resend Template</h2>
  <p>Este template é renderizado pelo Resend (alias: <code>subscription-activated</code>). O HTML não é mais gerado no backend.</p>
  <h3>Variáveis enviadas:</h3>
  <ul>
    <li><strong>GREETING:</strong> ${greeting}</li>
    <li><strong>PLAN_NAME:</strong> ${typedParams.planName}</li>
    <li><strong>AUTH_APP_URL:</strong> https://app.maximizeenfermagem.com.br</li>
    <li><strong>SUPPORT_EMAIL:</strong> contato@maximizeenfermagem.com.br</li>
  </ul>
</body>
</html>`.trim();
    },
    'payment-failed': (params) => {
      const typedParams = params as {
        updateBillingUrl: string;
        firstName?: string;
      };
      const greeting = getPaymentFailedGreeting(typedParams);
      return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Payment Failed (Resend template)</title></head>
<body style="font-family:sans-serif;padding:24px;max-width:600px;">
  <h2>Payment Failed — Resend Template</h2>
  <p>Este template é renderizado pelo Resend (alias: <code>payment-failed</code>). O HTML não é mais gerado no backend.</p>
  <h3>Variáveis enviadas:</h3>
  <ul>
    <li><strong>GREETING:</strong> ${greeting}</li>
    <li><strong>UPDATE_BILLING_URL:</strong> ${typedParams.updateBillingUrl}</li>
    <li><strong>SUPPORT_EMAIL:</strong> contato@maximizeenfermagem.com.br</li>
  </ul>
</body>
</html>`.trim();
    },
    'subscription-canceled': (params) => {
      const typedParams = params as {
        planName?: string;
        firstName?: string;
      };
      const greeting = getSubscriptionCanceledGreeting(typedParams);
      const planText = getSubscriptionCanceledPlanText(typedParams);
      return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Subscription Canceled (Resend template)</title></head>
<body style="font-family:sans-serif;padding:24px;max-width:600px;">
  <h2>Subscription Canceled — Resend Template</h2>
  <p>Este template é renderizado pelo Resend (alias: <code>subscription-canceled</code>). O HTML não é mais gerado no backend.</p>
  <h3>Variáveis enviadas:</h3>
  <ul>
    <li><strong>GREETING:</strong> ${greeting}</li>
    <li><strong>PLAN_NAME:</strong> ${typedParams.planName ?? 'Seu plano'}</li>
    <li><strong>PLAN_TEXT:</strong> ${planText || '(string vazia)'}</li>
    <li><strong>AUTH_APP_URL:</strong> https://app.maximizeenfermagem.com.br</li>
    <li><strong>SUPPORT_EMAIL:</strong> contato@maximizeenfermagem.com.br</li>
  </ul>
</body>
</html>`.trim();
    },
    'first-training-completed': (params) => {
      const variables = buildFirstTrainingCompletedEmailVariables(
        params as {
          scorePercent: number;
          totalQuestions: number;
          firstName?: string | null;
        },
      );
      return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>First Training Completed (Resend template)</title></head>
<body style="font-family:sans-serif;padding:24px;max-width:700px;">
  <h2>First Training Completed — Resend Template</h2>
  <p>Este template é renderizado pelo Resend (alias: <code>first-training-completed</code>). O HTML não é mais gerado no backend.</p>
  <h3>Variáveis enviadas:</h3>
  <pre>${JSON.stringify(variables, null, 2)}</pre>
</body>
</html>`.trim();
    },
    'inactivity-reminder': getInactivityReminderHtml,
    'email-verified': (params) => {
      const greeting = getEmailVerifiedGreeting(
        params as { firstName?: string },
      );
      return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Email Verified (Resend template)</title></head>
<body style="font-family:sans-serif;padding:24px;max-width:600px;">
  <h2>Email Verified — Resend Template</h2>
  <p>Este template é renderizado pelo Resend (alias: <code>email-verified</code>). O HTML não é mais gerado no backend.</p>
  <h3>Variáveis enviadas:</h3>
  <ul>
    <li><strong>GREETING:</strong> ${greeting}</li>
    <li><strong>AUTH_APP_URL:</strong> https://app.maximizeenfermagem.com.br</li>
  </ul>
</body>
</html>`.trim();
    },
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
