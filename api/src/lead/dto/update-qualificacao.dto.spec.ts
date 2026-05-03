import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateQualificacaoDto } from './update-qualificacao.dto';

describe('UpdateQualificacaoDto', () => {
  it('aceita payload válido', async () => {
    const dto = plainToInstance(UpdateQualificacaoDto, {
      qualificacao: {
        jaEnfermeiro: 'formado',
        trabalhaSaude: 'enfermeiro',
        estudandoConcurso: 'ativamente',
        intencaoConcurso: '3m',
      },
    });
    expect(await validate(dto)).toEqual([]);
  });

  it('rejeita valor desconhecido em jaEnfermeiro', async () => {
    const dto = plainToInstance(UpdateQualificacaoDto, {
      qualificacao: {
        jaEnfermeiro: 'talvez',
        trabalhaSaude: 'enfermeiro',
        estudandoConcurso: 'ativamente',
        intencaoConcurso: '3m',
      },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(JSON.stringify(errors)).toContain('jaEnfermeiro');
  });

  it('rejeita intencao_concurso fora do whitelist', async () => {
    const dto = plainToInstance(UpdateQualificacaoDto, {
      qualificacao: {
        jaEnfermeiro: 'formado',
        trabalhaSaude: 'nao',
        estudandoConcurso: 'nao',
        intencaoConcurso: '24m',
      },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(JSON.stringify(errors)).toContain('intencaoConcurso');
  });

  it('rejeita qualificacao ausente', async () => {
    const dto = plainToInstance(UpdateQualificacaoDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
