import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitDiagnosticoDto } from './submit-diagnostico.dto';

const VALID_RESULTADO = {
  totalScore: 18,
  perfil: {
    slug: 'em_evolucao',
    nome: 'Estudante em Evolução',
    mensagemPrincipal: 'Você já tem uma boa base...',
  },
  scores: [
    { categoria: 'clarezaDirecao', score: 6, maxScore: 9, percentage: 67 },
    { categoria: 'consistencia', score: 2, maxScore: 3, percentage: 67 },
    { categoria: 'qualidadeMetodo', score: 6, maxScore: 9, percentage: 67 },
    { categoria: 'retencao', score: 4, maxScore: 6, percentage: 67 },
  ],
  pontoForte: {
    categoria: 'clarezaDirecao',
    score: 6,
    maxScore: 9,
    percentage: 67,
  },
  pontoAtencao: {
    categoria: 'retencao',
    score: 4,
    maxScore: 6,
    percentage: 67,
  },
  proximoPasso: 'Use seus erros como guia.',
};

const VALID_PAYLOAD = {
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
  resultado: VALID_RESULTADO,
  eventId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  consentMarketing: true,
};

async function expectValid(payload: unknown): Promise<void> {
  const dto = plainToInstance(SubmitDiagnosticoDto, payload);
  const errors = await validate(dto);
  expect(errors).toEqual([]);
}

async function expectInvalid(
  payload: unknown,
  property?: string,
): Promise<void> {
  const dto = plainToInstance(SubmitDiagnosticoDto, payload);
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
  if (property) {
    const flat = JSON.stringify(errors);
    expect(flat).toContain(property);
  }
}

describe('SubmitDiagnosticoDto', () => {
  it('aceita payload válido', async () => {
    await expectValid(VALID_PAYLOAD);
  });

  it('rejeita email inválido', async () => {
    await expectInvalid({ ...VALID_PAYLOAD, email: 'nao-eh-email' }, 'email');
  });

  it('rejeita fonteLp fora do whitelist', async () => {
    await expectInvalid({ ...VALID_PAYLOAD, fonteLp: 'outra' }, 'fonteLp');
  });

  it('rejeita eventId que não é UUID', async () => {
    await expectInvalid({ ...VALID_PAYLOAD, eventId: 'abc' }, 'eventId');
  });

  it('rejeita totalScore acima de 30', async () => {
    await expectInvalid({
      ...VALID_PAYLOAD,
      resultado: { ...VALID_RESULTADO, totalScore: 99 },
    });
  });

  it('rejeita perfil.slug fora dos 4 conhecidos', async () => {
    await expectInvalid({
      ...VALID_PAYLOAD,
      resultado: {
        ...VALID_RESULTADO,
        perfil: { ...VALID_RESULTADO.perfil, slug: 'inexistente' },
      },
    });
  });

  it('rejeita scores com tamanho diferente de 4', async () => {
    await expectInvalid({
      ...VALID_PAYLOAD,
      resultado: {
        ...VALID_RESULTADO,
        scores: VALID_RESULTADO.scores.slice(0, 3),
      },
    });
  });

  it('rejeita score com categoria desconhecida', async () => {
    await expectInvalid({
      ...VALID_PAYLOAD,
      resultado: {
        ...VALID_RESULTADO,
        scores: [
          ...VALID_RESULTADO.scores.slice(0, 3),
          {
            categoria: 'inexistente',
            score: 1,
            maxScore: 3,
            percentage: 33,
          },
        ],
      },
    });
  });

  it('aceita payload sem name e sem attribution (campos opcionais)', async () => {
    const { name: _name, ...rest } = VALID_PAYLOAD;
    await expectValid(rest);
  });

  it('valida respostas via static helper (rejeita alternativa fora de A-D)', () => {
    const dto = plainToInstance(SubmitDiagnosticoDto, {
      ...VALID_PAYLOAD,
      respostas: { q1: 'A', q2: 'X' },
    });
    expect(SubmitDiagnosticoDto.validateRespostas(dto)).toBe(false);
  });

  it('static helper aceita respostas válidas', () => {
    const dto = plainToInstance(SubmitDiagnosticoDto, VALID_PAYLOAD);
    expect(SubmitDiagnosticoDto.validateRespostas(dto)).toBe(true);
  });
});
