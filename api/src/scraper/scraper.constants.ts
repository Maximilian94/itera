export const SCRAPER_QUEUE_NAME = 'scraper';

export const DEFAULT_CARGO_SLUGS = [
  'enfermeiro',
  'enfermeiro-padrao',
  'enfermeiro-esf',
  'enfermeiro-do-trabalho',
  'enfermeiro-caps',
  'enfermeiro-obstetra',
  'enfermeiro-saude-mental',
  'enfermeiro-uti',
  'enfermeiro-socorrista',
  'enfermeiro-auditor',
  'enfermeiro-20h',
  'enfermeiro-30h',
  'enfermeiro-40h',
  'tecnico-de-enfermagem',
  'auxiliar-de-enfermagem',
];

export const EXAM_BOARD_TIER_1 = [
  'cespe',
  'cebraspe',
  'fgv',
  'vunesp',
  'fcc',
];

export const EXAM_BOARD_TIER_2 = [
  'ibfc',
  'aocp',
  'instituto aocp',
  'consulplan',
  'fundep',
  'idecan',
  'fadesp',
  'funcab',
];

export const EXAM_BOARD_TIER_3 = [
  'quadrix',
  'iades',
  'comperve',
  'contemax',
  'fafipa',
  'fau',
  'cops',
  'furb',
  'ufmt',
];

export const HEALTH_KEYWORDS =
  /ebserh|ses\b|sesab|sesa\b|sesau|saude|sa[uú]de|hospital|hc\b|hu\b|hge\b|fhemig|into\b|inca\b|fiocruz|funasa/i;

export const FEDERAL_KEYWORDS =
  /ebserh|minist[eé]rio|inss|ibge|funasa|fiocruz|marinha|ex[eé]rcito|aeron[aá]utica|trf|trt|stf|stj|tcu|cgu|pgr|agu/i;

export const STATE_KEYWORDS =
  /governo do estado|secretaria de estado|sesa\b|ses\b|tribunal de justi[cç]a|pol[ií]cia militar|defensoria|detran/i;

export const MUNICIPAL_KEYWORDS =
  /prefeitura|c[aâ]mara municipal|munic[ií]pio/i;
