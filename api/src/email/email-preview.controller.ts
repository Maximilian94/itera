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
  getWelcomeHtml,
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
    welcome: getWelcomeHtml,
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
