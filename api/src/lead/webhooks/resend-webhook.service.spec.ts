import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadEventService } from '../lead-event.service';
import { TagService } from '../tag.service';
import { ResendWebhookService } from './resend-webhook.service';

describe('ResendWebhookService', () => {
  let service: ResendWebhookService;
  let prisma: {
    webhookEvent: { create: jest.Mock };
    lead: { findUnique: jest.Mock; update: jest.Mock };
  };
  let leadEventService: { record: jest.Mock };
  let tagService: { applyTag: jest.Mock };

  beforeEach(async () => {
    prisma = {
      webhookEvent: { create: jest.fn().mockResolvedValue({}) },
      lead: {
        findUnique: jest.fn().mockResolvedValue({ id: 'lead-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    leadEventService = { record: jest.fn().mockResolvedValue(undefined) };
    tagService = { applyTag: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ResendWebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: LeadEventService, useValue: leadEventService },
        { provide: TagService, useValue: tagService },
      ],
    }).compile();

    service = moduleRef.get(ResendWebhookService);
  });

  it('email.opened registra event email_aberto + aplica tag email_aberto', async () => {
    await service.process({
      eventId: 'evt_1',
      type: 'email.opened',
      data: { email_id: 'msg-123', to: 'fulana@example.com' },
    });

    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: 'resend',
        eventId: 'evt_1',
        eventType: 'email.opened',
      }),
    });
    expect(leadEventService.record).toHaveBeenCalledWith(
      'lead-1',
      'email_aberto',
      expect.objectContaining({ resendMessageId: 'msg-123' }),
    );
    expect(tagService.applyTag).toHaveBeenCalledWith('lead-1', 'email_aberto');
  });

  it('email.clicked inclui link no payload', async () => {
    await service.process({
      eventId: 'evt_2',
      type: 'email.clicked',
      data: {
        email_id: 'msg-456',
        to: ['fulana@example.com'],
        click: { link: 'https://app.maximizeenfermagem.com.br' },
      },
    });

    expect(leadEventService.record).toHaveBeenCalledWith(
      'lead-1',
      'email_clicado',
      expect.objectContaining({
        resendMessageId: 'msg-456',
        link: 'https://app.maximizeenfermagem.com.br',
      }),
    );
    expect(tagService.applyTag).toHaveBeenCalledWith('lead-1', 'email_clicado');
  });

  it('email.bounced registra event sem aplicar tag', async () => {
    await service.process({
      eventId: 'evt_3',
      type: 'email.bounced',
      data: {
        email_id: 'msg-789',
        to: 'fulana@example.com',
        bounce: { type: 'hard_bounce', message: 'mailbox not found' },
      },
    });

    expect(leadEventService.record).toHaveBeenCalledWith(
      'lead-1',
      'email_bounced',
      expect.objectContaining({ reason: 'mailbox not found' }),
    );
    expect(tagService.applyTag).not.toHaveBeenCalled();
  });

  it('email.complained marca unsubscribedAt e aplica tag unsubscribed', async () => {
    await service.process({
      eventId: 'evt_4',
      type: 'email.complained',
      data: { email_id: 'msg-abc', to: 'fulana@example.com' },
    });

    expect(leadEventService.record).toHaveBeenCalledWith(
      'lead-1',
      'email_complained',
      expect.any(Object),
    );
    expect(tagService.applyTag).toHaveBeenCalledWith('lead-1', 'unsubscribed');
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { unsubscribedAt: expect.any(Date) },
    });
  });

  it('idempotência: P2002 no WebhookEvent.create vira no-op silencioso', async () => {
    prisma.webhookEvent.create.mockRejectedValue({ code: 'P2002' });

    await service.process({
      eventId: 'evt_dup',
      type: 'email.opened',
      data: { to: 'fulana@example.com' },
    });

    expect(leadEventService.record).not.toHaveBeenCalled();
    expect(tagService.applyTag).not.toHaveBeenCalled();
  });

  it('tipos não-mapeados (ex: email.delivered) são descartados sem WebhookEvent', async () => {
    await service.process({
      eventId: 'evt_x',
      type: 'email.delivered',
      data: { to: 'fulana@example.com' },
    });

    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    expect(leadEventService.record).not.toHaveBeenCalled();
  });

  it('email não-rastreado (lead não existe) é descartado após registrar dedup', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    await service.process({
      eventId: 'evt_5',
      type: 'email.opened',
      data: { to: 'desconhecido@example.com' },
    });

    expect(prisma.webhookEvent.create).toHaveBeenCalled();
    expect(leadEventService.record).not.toHaveBeenCalled();
    expect(tagService.applyTag).not.toHaveBeenCalled();
  });
});
