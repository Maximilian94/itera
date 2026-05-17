import { Injectable } from '@nestjs/common';
import { GovernmentScope } from '@prisma/client';
import {
  FEDERAL_KEYWORDS,
  MUNICIPAL_KEYWORDS,
  STATE_KEYWORDS,
} from './scraper.constants';

const UF_FROM_SUFFIX = /[\/\-\(]\s*([A-Z]{2})\s*\)?$/;

const STATE_NAME_TO_UF: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso do sul': 'MS',
  'mato grosso': 'MT',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

const VALID_UFS = new Set(Object.values(STATE_NAME_TO_UF));

@Injectable()
export class NormalizerService {
  inferState(institution: string): string | null {
    const suffixMatch = institution.match(UF_FROM_SUFFIX);
    if (suffixMatch && VALID_UFS.has(suffixMatch[1])) {
      return suffixMatch[1];
    }

    const normalized = institution
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

    for (const [name, uf] of Object.entries(STATE_NAME_TO_UF)) {
      if (normalized.includes(name)) return uf;
    }

    return null;
  }

  inferGovernmentScope(institution: string): GovernmentScope {
    if (FEDERAL_KEYWORDS.test(institution)) return GovernmentScope.FEDERAL;
    if (STATE_KEYWORDS.test(institution)) return GovernmentScope.STATE;
    if (MUNICIPAL_KEYWORDS.test(institution)) return GovernmentScope.MUNICIPAL;
    return GovernmentScope.MUNICIPAL;
  }

  inferCity(institution: string): string | null {
    // "Prefeitura de Terra Roxa/PR" → "Terra Roxa"
    const match = institution.match(
      /[Pp]refeitura\s+(?:Municipal\s+)?(?:de|do|da)\s+(.+?)(?:\s*[\/\-\(]\s*[A-Z]{2})?$/,
    );
    if (match) return match[1].trim();
    return null;
  }

  normalizeExamBoardName(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
