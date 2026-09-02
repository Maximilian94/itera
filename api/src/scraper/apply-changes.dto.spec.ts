import { ValidationPipe } from '@nestjs/common';
import { ApplyChangesDto } from './scraper.controller';

/**
 * O front reenvia ao `apply` **o objeto que o `analyze` devolveu**, inteiro.
 * Com `forbidNonWhitelisted: true`, qualquer campo do analyze que não exista no
 * DTO derruba a requisição com 400 — foi o que aconteceu com `evidence` em
 * `newCargos`, depois de o admin revisar um edital inteiro.
 *
 * Este teste roda o MESMO pipe do `main.ts` sobre um payload real.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const meta = {
  type: 'body' as const,
  metatype: ApplyChangesDto,
  data: '',
};

const validate = (payload: unknown) => pipe.transform(payload, meta);

describe('ApplyChangesDto — payload do analyze é aceito pelo apply', () => {
  it('aceita newCargos com evidence (regressão do 400)', async () => {
    await expect(
      validate({
        changes: [],
        newCargos: [
          {
            role: 'Enfermeiro - PSF',
            salaryBase: '7587.70',
            vacancyCount: null,
            registrationFee: '130.00',
            minPassingGradeNonQuota: '4.00',
            workload: '40 horas',
            requirements: 'Curso superior em Enfermagem.',
            hasReserveList: true,
            isNursingRelevant: true,
            evidence: 'Cargo listado no documento e ausente do concurso.',
          },
        ],
      }),
    ).resolves.toBeDefined();
  });

  it('aceita o payload completo: changes + cronograma + syllabus + newCargos', async () => {
    await expect(
      validate({
        changes: [
          {
            id: 'concurso::examDate',
            target: 'concurso',
            cargoId: null,
            cargoRole: null,
            field: 'examDate',
            label: 'Data da prova',
            currentValue: null,
            newValue: '2026-09-27',
            evidence: '8.2. A prova objetiva será aplicada no dia 27/09/2026.',
          },
        ],
        cronograma: [
          {
            name: 'Prova Objetiva',
            description: 'Local informado no ensalamento.',
            date: '2026-09-27',
          },
        ],
        syllabus: [
          {
            cargoId: '2ed05bab-8c27-4f1a-99a0-a29a2670fbe3',
            cargoRole: 'Enfermeiro',
            groups: [
              {
                name: 'Língua Portuguesa',
                topics: 'Compreensão e interpretação de textos.',
                questionCount: 10,
                weight: '1.5',
                maxScore: '15',
              },
            ],
          },
        ],
        newCargos: [
          {
            role: 'Técnico em Enfermagem',
            vacancyCount: 1,
            isNursingRelevant: true,
            evidence: 'Cargo listado no documento.',
          },
        ],
      }),
    ).resolves.toBeDefined();
  });

  it('ainda barra campo que ninguém declarou (a proteção segue de pé)', async () => {
    await expect(
      validate({ changes: [], campoInventado: 1 }),
    ).rejects.toThrow();
  });
});
