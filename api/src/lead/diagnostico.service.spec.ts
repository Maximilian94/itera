import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { DiagnosticoSubmissionPayload } from '@domain/diagnostico/diagnostico.interface';
import { DiagnosticoService } from './diagnostico.service';
import { LeadService } from './lead.service';
import { TagService } from './tag.service';
import { LeadEventService } from './lead-event.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailProducerService } from '../email/email.producer';
import { AnalyticsService } from '../analytics/analytics.service';
import { MetaConversionsService } from '../meta-conversions/meta-conversions.service';

const PAYLOAD: DiagnosticoSubmissionPayload = {
  email: 'fulana@example.com',
  name: 'Fulana',
  fonteLp: 'edital',
  respostas: {
    q1: 'A',
    q2: 'B',
    q3: 'A',
    q4: 'C',
    q5: 'A',
    q6: 'B',
    q7: 'B',
    q8: 'A',
    q9: 'C',
    q10: 'B',
  },
  resultado: {
    totalScore: 18,
    perfil: {
      slug: 'em_evolucao',
      nome: 'Estudante em Evolução',
      mensagemPrincipal: 'Você já tem boa base...',
    },
    scores: [
      { categoria: 'clarezaDirecao', score: 6, maxScore: 9, percentage: 67 },
      { categoria: 'consistencia', score: 2, maxScore: 3, percentage: 67 },
      { categoria: 'qualidadeMetodo', score: 6, maxScore: 9, percentage: 67 },
      { categoria: 'retencao', score: 4, maxScore: 6, percentage: 67 },
    ],
    pontoForte: { categoria: 'clarezaDirecao', score: 6, maxScore: 9, percentage: 67 },
    pontoAtencao: { categoria: 'retencao', score: 4, maxScore: 6, percentage: 67 },
    proximoPasso: 'Use seus erros como guia.',
  },
  attribution: {
    utmSource: 'instagram',
    utmMedium: 'cpc',
    fbclid: 'IwAR_x',
  },
  eventId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  consentMarketing: true,
};

describe('DiagnosticoService.submit', () => {
  let service: DiagnosticoService;
  let leadService: { upsertByEmail: jest.Mock };
  let tagService: { applyTags: jest.Mock };
  let leadEventService: { record: jest.Mock };
  let prisma: { diagnosticoResposta: { create: jest.Mock } };
  let emailProducer: { enqueueDiagnosticoResultadoEmail: jest.Mock };
  let analytics: { capture: jest.Mock };
  let metaConversions: { sendLeadEvent: jest.Mock };

  beforeEach(async () => {
    leadService = {
      upsertByEmail: jest
        .fn()
        .mockResolvedValue({ id: 'lead-1', email: 'fulana@example.com' }),
    };
    tagService = { applyTags: jest.fn().mockResolvedValue(undefined) };
    leadEventService = { record: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      diagnosticoResposta: {
        create: jest.fn().mockResolvedValue({ id: 'resposta-1' }),
      },
    };
    emailProducer = {
      enqueueDiagnosticoResultadoEmail: jest.fn().mockResolvedValue(true),
    };
    analytics = { capture: jest.fn() };
    metaConversions = { sendLeadEvent: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DiagnosticoService,
        { provide: LeadService, useValue: leadService },
        { provide: TagService, useValue: tagService },
        { provide: LeadEventService, useValue: leadEventService },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailProducerService, useValue: emailProducer },
        { provide: AnalyticsService, useValue: analytics },
        { provide: MetaConversionsService, useValue: metaConversions },
      ],
    }).compile();

    service = moduleRef.get(DiagnosticoService);
  });

  it('orquestra os 6 passos do submit (lead → resposta → tags → email → event → analytics)', async () => {
    const result = await service.submit(PAYLOAD, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(leadService.upsertByEmail).toHaveBeenCalledWith(
      'fulana@example.com',
      expect.objectContaining({
        name: 'Fulana',
        fonteLp: 'edital',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        attribution: PAYLOAD.attribution,
      }),
    );

    expect(prisma.diagnosticoResposta.create).toHaveBeenCalledWith({
      data: {
        leadId: 'lead-1',
        respostas: PAYLOAD.respostas,
        resultado: PAYLOAD.resultado,
      },
    });

    expect(tagService.applyTags).toHaveBeenCalledWith(
      'lead-1',
      expect.arrayContaining([
        'lp_edital',
        'diagnostico_concluido',
        'perfil_em_evolucao',
        'paid_meta',
      ]),
    );

    expect(emailProducer.enqueueDiagnosticoResultadoEmail).toHaveBeenCalledWith(
      'fulana@example.com',
      { firstName: 'Fulana', resultado: PAYLOAD.resultado },
      { leadId: 'lead-1', diagnosticoRespostaId: 'resposta-1' },
    );

    expect(leadEventService.record).toHaveBeenCalledWith(
      'lead-1',
      'diagnostico_concluido',
      expect.objectContaining({
        totalScore: 18,
        perfil: 'em_evolucao',
      }),
    );

    expect(analytics.capture).toHaveBeenCalledWith({
      userId: 'fulana@example.com',
      event: 'diagnostico_concluido',
      properties: expect.objectContaining({
        email: 'fulana@example.com',
        leadId: 'lead-1',
        fonteLp: 'edital',
        paidSource: 'paid_meta',
        perfil: 'em_evolucao',
      }),
    });

    expect(result).toEqual({ leadId: 'lead-1', diagnosticoRespostaId: 'resposta-1' });
  });

  it('aplica tag direct quando attribution está ausente', async () => {
    await service.submit({ ...PAYLOAD, attribution: undefined }, {});

    expect(tagService.applyTags).toHaveBeenCalledWith(
      'lead-1',
      expect.arrayContaining(['direct']),
    );
  });

  it('falha do PostHog não bloqueia submit', async () => {
    analytics.capture.mockImplementation(() => {
      throw new Error('posthog down');
    });

    const result = await service.submit(PAYLOAD, {});
    expect(result.leadId).toBe('lead-1');
  });

  it('dispara CAPI Lead com event_id, hashes e metadata do request', async () => {
    await service.submit(PAYLOAD, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      eventSourceUrl: 'https://maximizeenfermagem.com.br/diagnostico',
    });

    expect(metaConversions.sendLeadEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: PAYLOAD.eventId,
        email: 'fulana@example.com',
        firstName: 'Fulana',
        externalId: 'lead-1',
        fbp: undefined,
        fbc: undefined,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        eventSourceUrl: 'https://maximizeenfermagem.com.br/diagnostico',
      }),
    );
  });

  it('NÃO dispara CAPI quando consentMarketing=false (LGPD)', async () => {
    await service.submit({ ...PAYLOAD, consentMarketing: false }, {});

    expect(metaConversions.sendLeadEvent).not.toHaveBeenCalled();
  });
});
