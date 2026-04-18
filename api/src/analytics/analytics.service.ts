import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

export type CaptureInput = {
  userId: string;
  event: string;
  properties?: Record<string, unknown>;
};

/**
 * Emits authoritative analytics events to PostHog from the backend.
 *
 * No-ops when POSTHOG_KEY is absent so local dev without a key keeps
 * working. Use for exam lifecycle events (started, answered, finished,
 * abandoned) that must survive tab-close / network loss on the client.
 */
@Injectable()
export class AnalyticsService implements OnApplicationShutdown {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly client: PostHog | null;

  constructor(config: ConfigService) {
    const key = config.get<string>('POSTHOG_KEY');
    const host =
      config.get<string>('POSTHOG_HOST') ?? 'https://eu.i.posthog.com';

    if (!key) {
      this.logger.warn(
        'POSTHOG_KEY is not set — analytics events will be dropped.',
      );
      this.client = null;
      return;
    }

    this.client = new PostHog(key, { host });
  }

  capture({ userId, event, properties }: CaptureInput): void {
    if (!this.client) return;
    this.client.capture({
      distinctId: userId,
      event,
      properties,
    });
  }

  /**
   * Flushes and closes the PostHog connection so queued events are sent
   * before the process exits. Called automatically on shutdown.
   */
  async onApplicationShutdown(): Promise<void> {
    if (!this.client) return;
    await this.client.shutdown();
  }
}
