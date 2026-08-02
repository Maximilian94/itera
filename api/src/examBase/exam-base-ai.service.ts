import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jsonrepair } from 'jsonrepair';
import { decodeHtmlBody } from '../common/decode-body';
import { PdfOcrService } from '../pdf/pdf-ocr.service';
import type {
  ExtractedEditalConcurso,
  ExtractedExamMetadata,
  ExtractedSyllabusGroup,
} from './dto/extract-metadata.dto';

const SYSTEM_PROMPT = `
Você é um assistente especializado em extrair informações de editais de concursos públicos brasileiros.
Dado um texto de edital, extraia os seguintes campos e retorne SOMENTE um JSON válido, sem markdown, sem explicações.

O edital pode conter múltiplos cargos. Foque EXCLUSIVAMENTE no cargo de Enfermeiro. Extraia salário, nota de corte e demais dados específicos deste cargo.

Campos a extrair:
- name: nome completo do concurso/prova (ex: "Concurso Público Prefeitura de São Paulo 2024")
- role: nome exato do cargo de Enfermeiro conforme consta no edital
- governmentScope: âmbito do governo, um de: "MUNICIPAL", "STATE", "FEDERAL"
- examDate: data da prova no formato ISO 8601 (ex: "2024-06-15")
- institution: nome da instituição/órgão contratante (ex: "Prefeitura Municipal de São Paulo")
- state: sigla do estado brasileiro em maiúsculas (ex: "SP"), null se federal
- city: nome da cidade (ex: "São Paulo"), null se não municipal
- salaryBase: salário base do cargo de Enfermeiro como string numérica com até 2 decimais (ex: "5800.00"), null se não encontrado
- minPassingGradeNonQuota: nota mínima de aprovação para ampla concorrência como string numérica (ex: "60.00"), null se não encontrado
- examBoardName: nome completo da banca organizadora (ex: "Fundação Carlos Chagas"), null se não encontrado
- examBoardAlias: sigla da banca (ex: "FCC"), null se não encontrado
- editalUrl: URL direta para download do PDF do edital, caso encontrada na página, null se não encontrado
- vacancyCount: número total de vagas para o cargo de Enfermeiro (ex: 10), null se não encontrado
- applicantCount: número de inscritos para o cargo de Enfermeiro, null se não encontrado (geralmente não consta no edital)
- registrationFee: taxa de inscrição como string numérica com até 2 decimais (ex: "120.00"), null se não encontrado
- registrationStart: data de abertura das inscrições no formato ISO 8601 (ex: "2024-05-10"), null se não encontrada
- registrationEnd: data limite (encerramento) das inscrições no formato ISO 8601 (ex: "2024-05-20"), null se não encontrada
- resultDate: data prevista do resultado final (homologação) no formato ISO 8601, conforme o cronograma do edital, null se não encontrada
- description: descrição da vaga / atribuições do cargo de Enfermeiro conforme consta no edital, null se não encontrada. Inclua as responsabilidades e funções principais.
- requirements: requisitos/escolaridade exigidos para o cargo de Enfermeiro (ex: "Curso superior em Enfermagem e registro no COREN"), null se não encontrados
- workload: carga horária semanal do cargo (ex: "40h semanais"), null se não encontrada
- hasReserveList: true se o edital prevê cadastro de reserva para o cargo de Enfermeiro, false se explicitamente não prevê, null se não dá para saber

Retorne apenas o JSON. Exemplo:
{"name":"...","role":"Enfermeiro","governmentScope":"MUNICIPAL","examDate":"2024-06-15","institution":"...","state":"SP","city":"São Paulo","salaryBase":"5800.00","minPassingGradeNonQuota":"60.00","examBoardName":"Fundação Carlos Chagas","examBoardAlias":"FCC","editalUrl":null,"vacancyCount":10,"applicantCount":null,"registrationFee":"120.00","registrationStart":"2024-05-10","registrationEnd":"2024-05-20","resultDate":"2024-08-01","description":"Prestar assistência de enfermagem...","requirements":"Curso superior em Enfermagem e registro no COREN","workload":"40h semanais","hasReserveList":true}
`.trim();

const CONCURSO_PROMPT = `
Você é um assistente especializado em extrair informações de editais de concursos públicos brasileiros.
Dado o texto de um edital, extraia os dados do CONCURSO e a lista de TODOS OS CARGOS ofertados. Retorne SOMENTE um JSON válido, sem markdown, sem explicações.

Dados do concurso:
- name: nome completo do concurso (ex: "Concurso Público Prefeitura de Altos (PI) 2026")
- governmentScope: "MUNICIPAL", "STATE" ou "FEDERAL"
- examDate: data da prova objetiva em ISO 8601 ("2026-08-29"), null se não encontrada
- institution: instituição/órgão contratante (ex: "Prefeitura Municipal de Altos")
- state: sigla do estado em maiúsculas (ex: "PI"), null se federal
- city: cidade, null se não municipal
- examBoardName: nome da banca organizadora, null se não encontrado
- examBoardAlias: sigla da banca, null se não encontrada
- editalUrl: URL do PDF do edital se constar no texto, null caso contrário
- registrationStart / registrationEnd: janela de inscrição em ISO 8601, null se não encontradas
- resultDate: data prevista do resultado final/homologação em ISO 8601, null se não encontrada
- etapas: as etapas/fases do certame (o CRONOGRAMA), NA ORDEM do edital (ex: Inscrições, Prova Objetiva, Prova de Títulos, Teste de Aptidão Física, Resultado Final). Para cada etapa: name (nome curto), description (1 frase com o caráter — eliminatório/classificatório — e a quem se aplica; null se o edital não detalha) e date (a data da etapa em ISO 8601 "2026-08-29" conforme o cronograma do edital; null se não houver data). Inclua as principais datas do cronograma como etapas. Lista vazia se o edital não descreve etapas.

cargos: um item para CADA cargo do edital (inclua TODOS, sem exceção — editais municipais costumam ter dezenas). Para cada um:
- role: nome exato do cargo (ex: "Enfermeiro", "Professor de Matemática", "Agente Comunitário de Saúde")
- salaryBase: salário base como string numérica com 2 decimais (ex: "4750.00"), null se não encontrado
- vacancyCount: vagas imediatas (número), null se não encontrado
- hasReserveList: true se há cadastro de reserva para o cargo, null se não dá para saber
- workload: carga horária (ex: "40 horas semanais"), null se não encontrada
- registrationFee: taxa de inscrição do cargo como string numérica (ex: "110.00"), null se não encontrada
- minPassingGradeNonQuota: nota mínima de aprovação (ampla concorrência) como string numérica, null se não encontrada
- requirements: requisitos/escolaridade do cargo, exatamente como constam no edital; se o edital não trouxer, ESCREVA o requisito padrão do cargo no serviço público brasileiro
- description: retorne SEMPRE null aqui (as atribuições literais são extraídas em outra chamada)
- isNursingRelevant: true APENAS para cargos de enfermagem (Enfermeiro e especialidades, Técnico de Enfermagem, Auxiliar de Enfermagem); false para os demais

Retorne apenas o JSON, no formato:
{"name":"...","governmentScope":"MUNICIPAL","examDate":"2026-08-29","institution":"...","state":"PI","city":"Altos","examBoardName":"Instituto Igeduc","examBoardAlias":null,"editalUrl":null,"registrationStart":"2026-05-18","registrationEnd":"2026-07-13","resultDate":null,"etapas":[{"name":"Inscrições","description":"Período de inscrições.","date":"2026-05-18"},{"name":"Prova Objetiva","description":"Caráter eliminatório e classificatório, para todos os cargos.","date":"2026-08-29"},{"name":"Prova de Títulos","description":"Caráter classificatório, para cargos de nível superior.","date":"2026-09-15"}],"cargos":[{"role":"Enfermeiro","salaryBase":"4750.00","vacancyCount":12,"hasReserveList":true,"workload":"40 horas semanais","registrationFee":"110.00","minPassingGradeNonQuota":"70.00","requirements":"Ensino superior em Enfermagem e registro no COREN","description":null,"isNursingRelevant":true},{"role":"Motorista","salaryBase":"1600.00","vacancyCount":5,"hasReserveList":true,"workload":"40 horas semanais","registrationFee":"90.00","minPassingGradeNonQuota":"70.00","requirements":"Ensino fundamental completo e CNH categoria D","description":null,"isNursingRelevant":false}]}
`.trim();

const FICHAS_PROMPT = `
Você é um assistente especializado em transcrever trechos de editais de concursos públicos brasileiros. Sua tarefa é CÓPIA FIEL, não redação.
Você receberá o texto de um edital. Para CADA cargo da lista abaixo, localize no edital e transcreva:
- requirements: os requisitos/escolaridade do cargo EXATAMENTE como escritos no edital (palavra por palavra); null se o edital não os trouxer
- description: as atribuições do cargo transcritas LITERALMENTE do edital, palavra por palavra, DO INÍCIO AO FIM da seção — NÃO resuma, NÃO parafraseie, NÃO omita nem acrescente trechos (apenas junte as linhas/itens em texto corrido, separados por ponto). Se o edital não trouxer as atribuições daquele cargo, retorne null — nunca invente.

Onde procurar: as atribuições costumam ficar num ANEXO no fim do edital (ex.: "ANEXO — ATRIBUIÇÕES DOS CARGOS"), sob um cabeçalho com o nome do cargo, como uma lista de 10 a 25 itens/frases. Copie TODOS os itens, até o último (geralmente "Realizar outras atividades inerentes à profissão...").
Sinal de erro: se a sua description tem só 1-2 frases mas o edital lista muitos itens para o cargo, você resumiu — isso é PROIBIDO; volte ao texto e copie a lista inteira. Comprimento não é problema: transcrições longas são o resultado esperado.

Cargos a transcrever (use o campo "role" EXATAMENTE como listado aqui):
{{ROLES}}

Retorne SOMENTE um JSON válido, sem markdown, no formato:
{"cargos":[{"role":"...","requirements":"...","description":"..."}]}
`.trim();

const SYLLABUS_PROMPT = `
Você é um assistente especializado em ler editais de concursos públicos brasileiros e montar o QUADRO DE MATÉRIAS de UM cargo específico.
Cargo alvo: {{ROLE}}

Junte DUAS fontes do edital, sempre para ESTE cargo:
1) o QUADRO DE PROVAS / DISTRIBUIÇÃO DE QUESTÕES (uma tabela: Disciplina | nº de questões | peso | pontuação), e
2) o CONTEÚDO PROGRAMÁTICO (a lista de matérias com seus tópicos/assuntos).

Para CADA matéria/disciplina da prova objetiva do cargo, retorne:
- name: nome da matéria como no edital (ex.: "Língua Portuguesa", "Legislação do SUS", "Conhecimentos Específicos")
- questionCount: número de questões da matéria (inteiro), null se o edital não informa
- weight: peso de CADA questão da matéria como string numérica (ex.: "1", "2.5"), null se não informado
- maxScore: pontuação máxima da matéria como string numérica (ex.: "60.00"); se o edital não trouxer mas houver nº de questões e peso, calcule questionCount × weight; null se não der para saber
- topics: os tópicos/assuntos do conteúdo programático dessa matéria transcritos do edital em texto corrido (junte os itens separados por "; "); null se o edital não trouxer o programa

ATENÇÃO À TABELA: no texto extraído do PDF o quadro quase sempre vem DESALINHADO (números soltos, colunas fora de ordem). Reconstrua com cuidado, associando cada disciplina ao seu número de questões e peso. Extraia TODAS as disciplinas do cargo, não pare nas primeiras.
Se o edital só traz o conteúdo programático (sem o quadro de questões), retorne as matérias mesmo assim com questionCount/weight/maxScore null. Se não houver NADA sobre matérias deste cargo, retorne lista vazia. NÃO invente matérias nem números.

Retorne SOMENTE um JSON válido, sem markdown, no formato:
{"syllabusGroups":[{"name":"Língua Portuguesa","questionCount":10,"weight":"1","maxScore":"10.00","topics":"Interpretação de texto; ortografia; crase; concordância"},{"name":"Conhecimentos Específicos","questionCount":30,"weight":"2","maxScore":"60.00","topics":"SUS; PNAB; SAE; ..."}]}
`.trim();

@Injectable()
export class ExamBaseAiService {
  private readonly logger = new Logger(ExamBaseAiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly pdfOcr: PdfOcrService,
  ) {}

  /**
   * Extração de edital completo em DUAS fases: (1) concurso + etapas + todos
   * os cargos com ficha compacta; (2) lotes paralelos que transcrevem as
   * atribuições LITERAIS de ~8 cargos por chamada — 60 transcrições numa
   * chamada só estouram o limite de saída do modelo (o edital de Altos
   * voltava com 29 dos 61 cargos).
   */
  async extractEditalConcurso(url: string): Promise<ExtractedEditalConcurso> {
    // O anexo de atribuições costuma morar no fim do edital → lê mais páginas
    // e manda mais texto que a extração de metadados comum.
    const text = await this.fetchUrlContent(url, { maxPdfPages: 200 });
    if (!text.trim()) {
      throw new BadRequestException(
        'Nenhum conteúdo pôde ser extraído da URL fornecida.',
      );
    }
    const parsed = await this.callOpenAI<ExtractedEditalConcurso>(text, {
      systemPrompt: CONCURSO_PROMPT,
      maxTokens: 16_384,
      // O edital de Altos tem 372k chars — corte menor decapita o anexo.
      maxChars: 400_000,
    });

    const etapas = (Array.isArray(parsed.etapas) ? parsed.etapas : [])
      .filter(
        (e): e is NonNullable<typeof e> =>
          typeof e === 'object' &&
          e != null &&
          typeof e.name === 'string' &&
          e.name.trim() !== '',
      )
      .map((e) => ({
        name: e.name.trim(),
        description:
          typeof e.description === 'string' && e.description.trim()
            ? e.description.trim()
            : null,
        date:
          typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.date)
            ? e.date.slice(0, 10)
            : null,
      }));

    // Só cargos com role válido — a IA às vezes emite itens malformados.
    // description é FORÇADA a null: a fase 1 às vezes emite um resumo apesar
    // da instrução, e um resumo que "parece pronto" (a) engana o admin e
    // (b) impedia o retry literal de rodar para o cargo.
    const cargos = (Array.isArray(parsed.cargos) ? parsed.cargos : [])
      .filter(
        (c): c is NonNullable<typeof c> =>
          typeof c === 'object' &&
          c != null &&
          typeof c.role === 'string' &&
          c.role.trim() !== '',
      )
      .map((c) => ({
        ...c,
        role: c.role.trim(),
        description: null as string | null,
      }));

    // Fase 2: transcrição literal de requisitos/atribuições, em lotes
    // paralelos. Lote que falhar não derruba a extração — os cargos dele
    // seguem para o retry e, no limite, ficam sem description (o admin vê o
    // campo vazio no form de revisão em vez de um resumo inventado).
    const BATCH_SIZE = 8;
    const batches: string[][] = [];
    for (let i = 0; i < cargos.length; i += BATCH_SIZE) {
      batches.push(cargos.slice(i, i + BATCH_SIZE).map((c) => c.role));
    }
    const applyFichas = (
      fichas: {
        role: string;
        requirements: string | null;
        description: string | null;
      }[],
    ) => {
      const fichaByRole = new Map(
        fichas.map((f) => [f.role.trim().toLowerCase(), f]),
      );
      for (const cargo of cargos) {
        const ficha = fichaByRole.get(cargo.role.toLowerCase());
        if (!ficha) continue;
        if (ficha.description) cargo.description = ficha.description;
        if (ficha.requirements) cargo.requirements = ficha.requirements;
      }
    };

    applyFichas(
      (
        await Promise.all(
          batches.map((roles) =>
            this.extractFichasLiterais(text, roles).catch(() => []),
          ),
        )
      ).flat(),
    );

    // Retry: cargos ainda sem atribuições ganham uma segunda rodada em lotes
    // menores (melhor recall num edital de centenas de milhares de chars).
    const pendentes = cargos.filter((c) => !c.description).map((c) => c.role);
    if (pendentes.length > 0) {
      const retryBatches: string[][] = [];
      for (let i = 0; i < pendentes.length; i += 4) {
        retryBatches.push(pendentes.slice(i, i + 4));
      }
      applyFichas(
        (
          await Promise.all(
            retryBatches.map((roles) =>
              this.extractFichasLiterais(text, roles).catch(() => []),
            ),
          )
        ).flat(),
      );
    }

    // Fase 3: quadro de matérias (conteúdo programático + distribuição de
    // questões) — SÓ para cargos de enfermagem (os que a plataforma exibe),
    // para não estourar tempo/tokens em editais com dezenas de cargos. Uma
    // chamada focada por cargo (normalmente 1-3). Falha não derruba a extração.
    const nursing = cargos.filter((c) => c.isNursingRelevant);
    await Promise.all(
      nursing.map(async (cargo) => {
        cargo.syllabusGroups = await this.extractSyllabusForCargo(
          text,
          cargo.role,
        ).catch(() => []);
      }),
    );

    return { ...parsed, etapas, cargos };
  }

  /**
   * Fase 3 da extração: para UM cargo, monta o quadro de matérias juntando o
   * quadro de provas (nº de questões/peso/pontuação) e o conteúdo programático
   * (tópicos). Texto focado nas janelas onde o cargo aparece (mesmo recall da
   * fase 2). Retorna [] quando o edital não descreve as matérias do cargo.
   *
   * Público: a análise de documentos (Fase 2 do monitoramento) reusa este
   * mesmo extrator focado, apontando-o para o texto de uma retificação/edital
   * em vez de pedir o quadro dentro do prompt gigante de diff.
   */
  async extractSyllabusForCargo(
    editalText: string,
    role: string,
  ): Promise<ExtractedSyllabusGroup[]> {
    const parsed = await this.callOpenAI<{
      syllabusGroups?: unknown;
    }>(this.buildFocusedText(editalText, [role]), {
      systemPrompt: SYLLABUS_PROMPT.replace('{{ROLE}}', role),
      maxTokens: 16_384,
      maxChars: 400_000,
    });
    const raw = Array.isArray(parsed.syllabusGroups)
      ? parsed.syllabusGroups
      : [];
    return raw
      .filter(
        (g): g is { name: string } & Record<string, unknown> =>
          typeof g === 'object' &&
          g != null &&
          typeof (g as { name?: unknown }).name === 'string' &&
          (g as { name: string }).name.trim() !== '',
      )
      .map((g) => {
        const num = (v: unknown): string | null =>
          typeof v === 'number'
            ? String(v)
            : typeof v === 'string' && v.trim()
              ? v.trim()
              : null;
        const questionCount =
          typeof g.questionCount === 'number'
            ? Math.round(g.questionCount)
            : typeof g.questionCount === 'string' &&
                g.questionCount.trim() !== '' &&
                Number.isFinite(Number(g.questionCount))
              ? Math.round(Number(g.questionCount))
              : null;
        return {
          name: g.name.trim(),
          topics:
            typeof g.topics === 'string' && g.topics.trim()
              ? g.topics.trim()
              : null,
          questionCount,
          weight: num(g.weight),
          maxScore: num(g.maxScore),
        };
      });
  }

  /**
   * Recorta do edital só as janelas de texto onde os cargos do lote aparecem
   * (o anexo de atribuições repete o nome do cargo como cabeçalho). Palheiro
   * menor = recall muito melhor do que mandar as 372k chars inteiras.
   */
  private buildFocusedText(text: string, roles: string[]): string {
    const upper = text.toUpperCase();
    const windows: [number, number][] = [];
    const addWindows = (needle: string) => {
      const hits: number[] = [];
      let from = 0;
      while (true) {
        const idx = upper.indexOf(needle, from);
        if (idx === -1) break;
        hits.push(idx);
        from = idx + needle.length;
      }
      // O anexo de atribuições mora no FIM do edital, mas o cargo aparece
      // muitas vezes ANTES (tabelas de vagas/taxas, conteúdo programático).
      // Cortar só as primeiras ocorrências decapitava o anexo → mantém as
      // primeiras E as últimas.
      const kept =
        hits.length > 8 ? [...hits.slice(0, 4), ...hits.slice(-4)] : hits;
      for (const idx of kept) {
        windows.push([
          Math.max(0, idx - 2_000),
          Math.min(text.length, idx + 8_000),
        ]);
      }
      return hits.length;
    };
    for (const role of roles) {
      const hits = addWindows(role.toUpperCase());
      if (hits === 0) {
        // "Motorista - Categoria B" pode aparecer sem o hífen no anexo:
        // cai para o token mais longo do nome (>=5 letras).
        const token = role
          .toUpperCase()
          .split(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇ]+/)
          .filter((t) => t.length >= 5)
          .sort((a, b) => b.length - a.length)[0];
        if (token) addWindows(token);
      }
    }
    if (windows.length === 0) return text;
    windows.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const w of windows) {
      const last = merged[merged.length - 1];
      if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
      else merged.push([w[0], w[1]]);
    }
    return merged.map(([s, e]) => text.slice(s, e)).join('\n[...]\n');
  }

  /**
   * Fase 2 da extração de edital: para um LOTE de cargos, transcreve do texto
   * do edital os requisitos e as atribuições EXATAMENTE como escritos.
   *
   * Público: a análise de documentos (Fase 2 do monitoramento) reusa este
   * extrator quando o documento é um EDITAL_ABERTURA — o prompt de diff não
   * transcreve textos longos, então a ficha literal vem daqui.
   */
  async extractFichasLiterais(
    editalText: string,
    roles: string[],
  ): Promise<
    { role: string; requirements: string | null; description: string | null }[]
  > {
    const parsed = await this.callOpenAI<{
      cargos?: {
        role?: string;
        requirements?: string | null;
        description?: string | null;
      }[];
    }>(this.buildFocusedText(editalText, roles), {
      systemPrompt: FICHAS_PROMPT.replace(
        '{{ROLES}}',
        roles.map((r) => `- ${r}`).join('\n'),
      ),
      maxTokens: 16_384,
      maxChars: 400_000,
    });
    return (Array.isArray(parsed.cargos) ? parsed.cargos : [])
      .filter(
        (
          c,
        ): c is {
          role: string;
          requirements?: string | null;
          description?: string | null;
        } =>
          typeof c === 'object' &&
          c != null &&
          typeof c.role === 'string' &&
          c.role.trim() !== '',
      )
      .map((c) => ({
        role: c.role.trim(),
        requirements:
          typeof c.requirements === 'string' && c.requirements.trim()
            ? c.requirements.trim()
            : null,
        description:
          typeof c.description === 'string' && c.description.trim()
            ? c.description.trim()
            : null,
      }));
  }

  async extractMetadata(input: {
    url?: string;
    role?: string;
    pdfFile?:
      | { buffer: Buffer; mimetype: string; originalname?: string }
      | undefined;
  }): Promise<ExtractedExamMetadata> {
    let text = '';

    if (input.pdfFile) {
      text = await this.extractTextFromPdf(input.pdfFile.buffer);
    } else if (input.url) {
      text = await this.fetchUrlContent(input.url);
    }

    if (!text.trim()) {
      throw new BadRequestException(
        'Nenhum conteúdo pôde ser extraído da URL ou PDF fornecido.',
      );
    }

    return this.callOpenAI<ExtractedExamMetadata>(text, {
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 1024,
    });
  }

  private async fetchUrlContent(
    url: string,
    opts: { maxPdfPages?: number } = {},
  ): Promise<string> {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'follow',
        // Sem timeout, um site lento/tarpit deixa a extração pendurada para
        // sempre — o admin fica com o spinner infinito no front.
        signal: AbortSignal.timeout(45_000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (err) {
      if ((err as Error).name === 'TimeoutError') {
        throw new BadRequestException(
          'O download do edital demorou mais de 45s — o site pode estar lento ou bloqueando robôs. Tente novamente ou baixe o PDF e faça o upload manualmente.',
        );
      }
      throw new BadRequestException(
        `Não foi possível conectar à URL do edital: ${(err as Error).message?.slice(0, 200)}`,
      );
    }

    if (!res.ok) {
      throw new BadRequestException(
        res.status === 403
          ? `O site bloqueou o acesso direto (403). Faça o upload do PDF manualmente.`
          : `Falha ao buscar URL (${res.status}): ${url.slice(0, 200)}`,
      );
    }

    // Editais gigantes (anexos escaneados) estouram memória/CPU no pdf-parse;
    // 30MB cobre qualquer edital de texto real.
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > 30_000_000) {
      throw new BadRequestException(
        'O arquivo tem mais de 30MB — provavelmente um PDF escaneado. Baixe, extraia as páginas relevantes e faça o upload manualmente.',
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (
      contentType.includes('application/pdf') ||
      buffer.subarray(0, 5).toString('latin1') === '%PDF-'
    ) {
      return this.extractTextFromPdf(buffer, opts.maxPdfPages);
    }

    return decodeHtmlBody(buffer, contentType);
  }

  private async extractTextFromPdf(
    buffer: Buffer,
    maxPages = 80,
  ): Promise<string> {
    // Mistral OCR (com fallback pdf-parse): mantém as TABELAS como markdown —
    // o quadro de provas / conteúdo programático e as tabelas de vagas param
    // de vir embaralhados. `maxPages` só limita o fallback pdf-parse.
    const { text, source } = await this.pdfOcr.pdfToText(buffer, { maxPages });
    this.logger.log(`edital PDF → texto via ${source} (${text.length} chars)`);
    return text;
  }

  private async callOpenAI<T>(
    text: string,
    opts: { systemPrompt: string; maxTokens: number; maxChars?: number },
  ): Promise<T> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'OPENAI_API_KEY não configurada. Configure-a no .env.',
      );
    }

    // Truncate to avoid token limits (approx 120k chars ~ 30k tokens)
    const truncatedText = text.slice(0, opts.maxChars ?? 120_000);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      // Edital grande (60+ cargos com atribuições literais) leva vários minutos.
      signal: AbortSignal.timeout(480_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_tokens: opts.maxTokens,
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: truncatedText },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(
        `OpenAI API error (${res.status}): ${errBody.slice(0, 300)}`,
      );
    }

    const dataRes = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = dataRes.choices?.[0]?.message?.content?.trim() ?? '';

    let jsonStr = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        // Respostas grandes (lista de cargos) às vezes vêm com JSON imperfeito.
        parsed = JSON.parse(jsonrepair(jsonStr));
      } catch {
        throw new BadRequestException(
          'OpenAI retornou JSON inválido na extração de metadados.',
        );
      }
    }

    return (typeof parsed === 'object' && parsed != null ? parsed : {}) as T;
  }
}
