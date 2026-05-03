import { Test } from '@nestjs/testing';
import { LeadService } from './lead.service';
import { PrismaService } from '../prisma/prisma.service';

const FIXED_LEAD = {
  id: 'lead-1',
  email: 'fulana@example.com',
  name: null,
  phone: null,
  fonteLp: null,
  unsubscribedAt: null,
  createdAt: new Date(),
  utmSource: 'instagram',
  utmMedium: 'cpc',
  utmCampaign: 'q2',
  utmContent: null,
  utmTerm: null,
  fbclid: 'IwAR-original',
  gclid: null,
  landingPage: '/lp/edital',
  referrer: null,
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
  fbp: null,
  fbc: null,
  qualificacao: null,
};

describe('LeadService', () => {
  let service: LeadService;
  let prisma: {
    lead: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      lead: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(LeadService);
  });

  describe('upsertByEmail', () => {
    it('cria lead novo persistindo attribution + ip + userAgent', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      prisma.lead.create.mockResolvedValue(FIXED_LEAD);

      await service.upsertByEmail('Fulana@Example.COM', {
        name: 'Fulana',
        fonteLp: 'edital',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        attribution: {
          utmSource: 'instagram',
          utmMedium: 'cpc',
          fbclid: 'IwAR-original',
          landingPage: '/lp/edital',
        },
      });

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'fulana@example.com',
          name: 'Fulana',
          fonteLp: 'edital',
          utmSource: 'instagram',
          utmMedium: 'cpc',
          fbclid: 'IwAR-original',
          landingPage: '/lp/edital',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }),
      });
    });

    it('não sobrescreve attribution em lead existente (first-touch)', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        ...FIXED_LEAD,
        name: 'Fulana',
      });

      await service.upsertByEmail('fulana@example.com', {
        attribution: {
          utmSource: 'google',
          utmMedium: 'cpc',
          fbclid: 'IwAR-NOVO',
        },
      });

      expect(prisma.lead.create).not.toHaveBeenCalled();
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('preenche apenas campos vazios em lead existente (name/phone/fonteLp)', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        ...FIXED_LEAD,
        name: 'Fulana',
        phone: null,
        fonteLp: null,
      });
      prisma.lead.update.mockResolvedValue({ ...FIXED_LEAD });

      await service.upsertByEmail('fulana@example.com', {
        name: 'Outra',
        phone: '+5511999999999',
        fonteLp: 'plantao',
      });

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { phone: '+5511999999999', fonteLp: 'plantao' },
      });
    });

    it('é no-op quando lead existente já tem todos os campos preenchidos', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        ...FIXED_LEAD,
        name: 'Fulana',
        phone: '+55',
        fonteLp: 'edital',
      });

      await service.upsertByEmail('fulana@example.com', {
        name: 'Outra',
        phone: '+99',
        fonteLp: 'plantao',
      });

      expect(prisma.lead.update).not.toHaveBeenCalled();
    });
  });

  describe('updateQualificacao', () => {
    it('persiste payload como JSONB', async () => {
      prisma.lead.update.mockResolvedValue(FIXED_LEAD);

      await service.updateQualificacao('lead-1', {
        jaEnfermeiro: 'formado',
        trabalhaSaude: 'enfermeiro',
        estudandoConcurso: 'ativamente',
        intencaoConcurso: '3m',
      });

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: {
          qualificacao: {
            jaEnfermeiro: 'formado',
            trabalhaSaude: 'enfermeiro',
            estudandoConcurso: 'ativamente',
            intencaoConcurso: '3m',
          },
        },
      });
    });
  });
});
