import type {
  DiagnosticoResultado,
  ProfileSlug,
  ScoreSecundario,
  SecondaryScoreCategoria,
} from '@domain/diagnostico/diagnostico.interface';

/**
 * Variables for the published Resend `seu-perfil-de-estudo` template.
 *
 * Refator (2026-05): antes tínhamos 4 templates no Resend, uma por perfil
 * (PERFIL_TO_RESEND_TEMPLATE_ID). Agora é **uma única template** com todo o
 * conteúdo textual entrando como variável, derivado de PROFILE_CONTENT_MAP +
 * scores do resultado. Manter 4 HTMLs sincronizados era frágil — cada mudança
 * visual rolava 4x.
 *
 * Por que content map em código (vs CMS): copy é coupled ao scoring + UX do
 * wizard, muda junto. Migra pra CMS quando o time editorial quiser autonomia.
 *
 * Scores vão como número ("67"); template adiciona o "%". Cor e label são
 * derivados do percentage em scoreToLabelAndColors() — faixas fixas:
 *   < 50      → "Precisa de atenção" / #C4582A
 *   50-69     → "Bom"                / #256B8F
 *   ≥ 70      → "Forte"              / #2D8F5B
 *
 * CTA_URL vai como base com utm_source/medium; o HTML da template é quem
 * appenda &utm_content=early_cta no link de texto do meio e
 * &utm_content=final_cta no botão final.
 */

export const DIAGNOSTICO_RESULTADO_TEMPLATE_ID = 'seu-perfil-de-estudo';

const CTA_BASE_URL =
  'https://app.maximizeenfermagem.com.br/?utm_source=diagnostico&utm_medium=email';

export interface DiagnosticoResultadoTemplateParams {
  firstName?: string;
  resultado: DiagnosticoResultado;
}

interface ProfileEmailContent {
  profileName: string;
  profileTagline: string;
  profileDescription: string;
  heroSubtitle: string;
  strengths: readonly [string, string, string];
  improvements: readonly [string, string, string];
  reveals: readonly [
    { lead: string; body: string },
    { lead: string; body: string },
  ];
  focusIntro: string;
  focusSteps: readonly [string, string, string];
  roadmap: readonly [string, string, string, string];
}

const PROFILE_CONTENT_MAP: Record<ProfileSlug, ProfileEmailContent> = {
  sobrecarregado: {
    profileName: 'Estudante Sobrecarregado',
    profileTagline: 'Mais conteúdo não é o que você precisa agora.',
    profileDescription:
      'Você sente que o edital cresce a cada dia e que o tempo não acompanha. Esse perfil mostra que o que está faltando é direção e rotina — não esforço. Antes de adicionar mais conteúdo à sua rotina, vale dar um passo atrás e organizar o que merece prioridade hoje.',
    heroSubtitle:
      'Aqui está o que descobrimos sobre seu estilo de estudo — e o que pode destravar sua evolução.',
    strengths: [
      'Você reconhece que precisa ajustar algo — esse é o primeiro passo de quem evolui.',
      'Apesar da sensação de excesso, você ainda não desistiu.',
      'Você está disposto a olhar pra dentro do seu processo (esse próprio diagnóstico prova isso).',
    ],
    improvements: [
      'Falta clareza sobre o que estudar primeiro dentro do edital.',
      'A rotina é inconsistente — o estudo acontece de forma fragmentada.',
      'A prática estruturada de questões e revisão é pouca.',
    ],
    reveals: [
      {
        lead: 'O que está te travando',
        body: 'Não é falta de conteúdo. Você provavelmente já está absorvendo mais teoria do que consegue consolidar. O gargalo é falta de mapa: sem priorizar, todo conteúdo parece igualmente urgente — e quando tudo é prioridade, nada é.',
      },
      {
        lead: 'Por onde começar de verdade',
        body: 'Escolha 2 ou 3 assuntos do edital com maior peso histórico e foque neles nas próximas 2 semanas. Não tente cobrir tudo — confiar que você volta nos outros depois é melhor do que tocar em todos por cima agora.',
      },
    ],
    focusIntro:
      'Pra sair do modo "correndo atrás do edital", priorize estes três movimentos nas próximas 4 semanas:',
    focusSteps: [
      'Monte uma matriz de prioridade: liste os assuntos do edital e classifique por peso histórico em provas similares + seu nível atual de domínio.',
      'Estabeleça uma rotina mínima viável — 30 minutos por dia rende mais que 4 horas no domingo. Consistência ganha de intensidade.',
      'Comece a fazer questões já, mesmo sem ter "terminado" a teoria. Erro é o sinal mais honesto do que precisa de mais profundidade.',
    ],
    roadmap: [
      'Semana 1-2: monte sua matriz de prioridades do edital e identifique os 3 assuntos mais críticos.',
      'Semana 3-4: estabeleça rotina diária de 30 min e foque exclusivamente nos 3 prioritários.',
      'Semana 5-6: introduza questões de provas anteriores e um sistema simples de revisão programada.',
      'Mês 2 em diante: ajuste o foco com base no que seus erros revelam — não no que você "sente" que precisa.',
    ],
  },

  esforcado_sem_direcao: {
    profileName: 'Esforçado Sem Direção',
    profileTagline: 'Você tem combustível. Falta GPS.',
    profileDescription:
      'Você não tem problema com dedicação — pelo contrário, estuda mais do que muita gente. Mas o esforço se dilui em frentes simultâneas e o resultado nas provas não reflete o tempo investido. O que está faltando é estratégia: priorizar, acompanhar desempenho e usar os erros como guia.',
    heroSubtitle:
      'Aqui está o que descobrimos sobre seu estilo de estudo — e onde concentrar pra acelerar resultados.',
    strengths: [
      'Disciplina pra estudar regularmente, mesmo sem uma rotina perfeita.',
      'Conhecimento amplo — você já passou por bastante conteúdo.',
      'Resiliência: você não desiste fácil quando algo não rende de primeira.',
    ],
    improvements: [
      'Estudo disperso em muitas frentes simultâneas, sem priorização clara.',
      'Não há acompanhamento sistemático do seu desempenho ao longo do tempo.',
      'Os erros são corrigidos, mas não viram combustível pra ajustar a rotina.',
    ],
    reveals: [
      {
        lead: 'O que está te travando',
        body: 'Você está estudando como se todos os conteúdos pesassem igual no resultado final — e não pesam. Alguns assuntos cobram 5 a 10 vezes mais questões que outros. Priorizar esses é o atalho mais honesto que existe.',
      },
      {
        lead: 'O que mudar primeiro',
        body: 'Pare de tentar cobrir o edital inteiro com a mesma profundidade. Pesa pra você o que cai mais, o que você erra mais, e o que está na sua zona de "quase acerto". Foque ali. O resto rende com revisão e prática.',
      },
    ],
    focusIntro:
      'Sua direção precisa ficar mais nítida. Priorize estes três movimentos nas próximas 4 semanas:',
    focusSteps: [
      'Identifique os 5 assuntos do edital que mais aparecem em provas do seu concurso-alvo — esses ganham peso 3x maior na sua rotina.',
      'Faça pelo menos 30 questões por dia, mesmo nos assuntos que você "já viu". Acertar de primeira não é prova de domínio; consistência é.',
      'Crie uma planilha simples: assunto, % de acerto, último dia que estudou. Olha ela toda semana. Vai mudar como você decide o que fazer.',
    ],
    roadmap: [
      'Semana 1: mapeie os 5 assuntos prioritários e crie a planilha de acompanhamento.',
      'Semana 2-3: bloco de 1h por dia exclusivo pros 5 prioritários, sem desviar.',
      'Semana 4: revisão dos erros acumulados — entender a causa, não só corrigir a resposta.',
      'Mês 2: aprofunde nos assuntos onde você está em "quase acerto" (>50% mas <80%).',
    ],
  },

  em_evolucao: {
    profileName: 'Estudante em Evolução',
    profileTagline: 'Você está no caminho. Falta refinar.',
    profileDescription:
      'Você já tem uma base sólida: rotina razoável, alguma estratégia, e clareza maior que a média dos candidatos. O que separa você do próximo nível é mais consistência na revisão, análise mais profunda dos erros e ajuste de prioridade conforme o desempenho evolui — não conforme a intuição manda.',
    heroSubtitle:
      'Aqui está o que descobrimos sobre seu estilo de estudo — e como acelerar a curva.',
    strengths: [
      'Rotina consistente o suficiente pra começar a construir consolidação real.',
      'Clareza sobre o que é importante — você já filtra o ruído sozinho.',
      'Prática de questões integrada ao seu processo, não como atividade isolada.',
    ],
    improvements: [
      'A revisão poderia ser mais sistemática (e não só quando você percebe que esqueceu).',
      'A análise de erros ainda fica na superfície — corrige a resposta, mas não investiga a causa.',
      'A prioridade ainda é definida mais pela suspeita do que pelo resultado real.',
    ],
    reveals: [
      {
        lead: 'O detalhe que muda tudo',
        body: 'Quem está nesse perfil costuma travar não por falta de método, mas por revisar pouco e não destrinchar o erro. Você corrige a resposta, mas raramente investiga o porquê — e o mesmo erro volta meses depois disfarçado em outra questão.',
      },
      {
        lead: 'O próximo nível',
        body: 'Use seus erros como o principal sinal pra escolher o que estudar. Toda vez que errar, anota: foi conteúdo, foi interpretação, foi atenção? A categoria do erro muda completamente o que você faz na semana seguinte.',
      },
    ],
    focusIntro:
      'Você está pronto pra refinar. Concentre nestes três movimentos:',
    focusSteps: [
      'Implemente revisão espaçada: D+1, D+3, D+7, D+15 dos conteúdos novos. Um calendário simples já resolve.',
      'Pra cada erro, classifique a causa: conteúdo (preciso reestudar), interpretação (preciso ler com mais cuidado) ou atenção (preciso descansar mais). A categoria muda a ação.',
      'Toda semana, escolha o assunto pra aprofundar com base nos % de acerto da semana anterior — não no que você "sente" que está fraco.',
    ],
    roadmap: [
      'Semana 1: monte calendário de revisão espaçada e comece a anotar a categoria de cada erro.',
      'Semana 2-4: ajuste a rotina com base nos sinais reais — não na intuição.',
      'Mês 2: introduza simulados completos a cada 15 dias pra ver o desempenho integrado, não só por assunto.',
      'Mês 3: foco em assuntos onde o acerto está entre 60-80% — é ali que mora o ganho mais rápido.',
    ],
  },

  estrategico: {
    profileName: 'Estudante Estratégico',
    profileTagline: 'Você joga em outro nível. Agora é otimizar o fino.',
    profileDescription:
      'Você já estuda com mais consciência do que a grande maioria dos candidatos. Tem método, prioriza, revisa, analisa erros. Pra dar o próximo salto, o trabalho é fino: identificar onde sua performance ainda não está em "quase 100%" e fechar essas brechas com precisão.',
    heroSubtitle:
      'Aqui está o que descobrimos sobre seu estilo de estudo — e onde está sua margem de crescimento.',
    strengths: [
      'Método estruturado e consistente — você não estuda no improviso.',
      'Forte capacidade de análise de desempenho e uso ativo dos erros.',
      'Clareza estratégica sobre o que priorizar dentro do edital.',
    ],
    improvements: [
      'Pode ganhar com simulados mais frequentes — resistência mental pra prova longa é treinável.',
      'Vale revisar pontos cegos: assuntos que você "acha que sabe" mas raramente pratica de verdade.',
      'A revisão de assuntos já consolidados talvez consuma mais tempo do que deveria.',
    ],
    reveals: [
      {
        lead: 'Onde estão seus ganhos restantes',
        body: 'Você não está mais na curva de "aprender mais" — está na curva de "render mais". Pequenos ajustes em prioridade fina, gestão de energia e simulados estratégicos podem ser a diferença entre primeiro lugar e top 10.',
      },
      {
        lead: 'O risco invisível desse perfil',
        body: 'Excesso de confiança em assuntos que parecem "dominados". Faça questões neles do mesmo jeito que faz nos difíceis — o ganho é descobrir furos que sua intuição esconde até a prova.',
      },
    ],
    focusIntro:
      'Sua margem de ganho está no fino. Foque nestes três pontos:',
    focusSteps: [
      'Simulados completos semanais. Não pra estudar conteúdo, pra treinar resistência e calibração de tempo de prova.',
      'Identifique seus pontos cegos: assuntos sem questões erradas em 30 dias, mas também sem questões feitas. Esses são suspeitos.',
      'Revise o ritmo das suas revisões — talvez você esteja revisando demais o que já consolidou. Realoque esse tempo pros assuntos com % de acerto entre 70-85%.',
    ],
    roadmap: [
      'Semana 1: faça o primeiro simulado completo e identifique seus pontos cegos.',
      'Semana 2-4: ajuste prioridades pras zonas de 70-85% de acerto (maior ROI de estudo).',
      'Mês 2: simulados quinzenais + análise integrada de desempenho — não só por assunto isolado.',
      'Mês 3: refine gestão de tempo na prova (treine quando pular questão e quando voltar).',
    ],
  },
};

interface ScoreVisual {
  label: string;
  labelColor: string;
  barColor: string;
}

const SCORE_VISUAL = {
  attention: { label: 'Precisa de atenção', labelColor: '#C4582A', barColor: '#C4582A' },
  good: { label: 'Bom', labelColor: '#256B8F', barColor: '#256B8F' },
  strong: { label: 'Forte', labelColor: '#2D8F5B', barColor: '#2D8F5B' },
} as const satisfies Record<string, ScoreVisual>;

/**
 * Faixas fixas: <50 atenção, 50-69 bom, ≥70 forte. Cores e labels alinhados
 * com o que o template HTML do Resend espera (#hex, sem `#` ele renderiza
 * texto literal).
 */
export function scoreToLabelAndColors(percentage: number): ScoreVisual {
  if (percentage >= 70) return SCORE_VISUAL.strong;
  if (percentage >= 50) return SCORE_VISUAL.good;
  return SCORE_VISUAL.attention;
}

const CATEGORIA_TO_VAR_PREFIX: Record<SecondaryScoreCategoria, string> = {
  clarezaDirecao: 'DIRECTION',
  consistencia: 'CONSISTENCY',
  qualidadeMetodo: 'METHOD',
  retencao: 'RETENTION',
};

function buildScoreVariables(scores: ScoreSecundario[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const score of scores) {
    const prefix = CATEGORIA_TO_VAR_PREFIX[score.categoria];
    if (!prefix) continue;
    const pct = Math.round(score.percentage);
    const visual = scoreToLabelAndColors(pct);
    vars[`${prefix}_SCORE`] = String(pct);
    vars[`${prefix}_LABEL`] = visual.label;
    vars[`${prefix}_LABEL_COLOR`] = visual.labelColor;
    vars[`${prefix}_BAR_COLOR`] = visual.barColor;
  }
  return vars;
}

export function buildDiagnosticoResultadoVariables(
  params: DiagnosticoResultadoTemplateParams,
): Record<string, string> {
  const { resultado } = params;
  const leadName = params.firstName?.trim() || 'estudante';

  const profile = PROFILE_CONTENT_MAP[resultado.perfil.slug];
  if (!profile) {
    throw new Error(
      `PROFILE_CONTENT_MAP missing entry for slug: ${resultado.perfil.slug}`,
    );
  }

  return {
    LEAD_NAME: leadName,
    PROFILE_NAME: profile.profileName,
    PROFILE_TAGLINE: profile.profileTagline,
    PROFILE_DESCRIPTION: profile.profileDescription,
    HERO_SUBTITLE: profile.heroSubtitle,
    ...buildScoreVariables(resultado.scores),
    STRENGTH_1: profile.strengths[0],
    STRENGTH_2: profile.strengths[1],
    STRENGTH_3: profile.strengths[2],
    IMPROVEMENT_1: profile.improvements[0],
    IMPROVEMENT_2: profile.improvements[1],
    IMPROVEMENT_3: profile.improvements[2],
    REVEAL_LEAD_1: profile.reveals[0].lead,
    REVEAL_BODY_1: profile.reveals[0].body,
    REVEAL_LEAD_2: profile.reveals[1].lead,
    REVEAL_BODY_2: profile.reveals[1].body,
    FOCUS_INTRO: profile.focusIntro,
    FOCUS_STEP_1: profile.focusSteps[0],
    FOCUS_STEP_2: profile.focusSteps[1],
    FOCUS_STEP_3: profile.focusSteps[2],
    ROADMAP_STEP_1: profile.roadmap[0],
    ROADMAP_STEP_2: profile.roadmap[1],
    ROADMAP_STEP_3: profile.roadmap[2],
    ROADMAP_STEP_4: profile.roadmap[3],
    CTA_URL: CTA_BASE_URL,
  };
}
