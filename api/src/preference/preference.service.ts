import { Injectable } from '@nestjs/common';
import { PreferenceMobility, UserPreference } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_SCOPED_MOBILITIES,
  UpsertPreferenceDto,
} from './dto/upsert-preference.dto';

/** Serialized shape: Decimal → string, dates → ISO (same convention as salaryMin/Max on /concursos). */
export interface PreferencePayload {
  state: string | null;
  city: string | null;
  mobility: UserPreference['mobility'];
  careerStage: UserPreference['careerStage'];
  minSalary: string | null;
  horizon: UserPreference['horizon'];
  updatedAt: string;
}

function serialize(row: UserPreference): PreferencePayload {
  return {
    state: row.state,
    city: row.city,
    mobility: row.mobility,
    careerStage: row.careerStage,
    minSalary: row.minSalary == null ? null : String(row.minSalary),
    horizon: row.horizon,
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<{ preference: PreferencePayload | null }> {
    const row = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    return { preference: row ? serialize(row) : null };
  }

  async upsert(
    userId: string,
    dto: UpsertPreferenceDto,
  ): Promise<{ preference: PreferencePayload }> {
    /* A âncora segue o escopo: ANYWHERE não tem nenhuma; STATE só a UF.
     * Normalizado aqui (não só no DTO) p/ nunca persistir âncora órfã. */
    const data = {
      state:
        dto.mobility === PreferenceMobility.ANYWHERE
          ? null
          : (dto.state as string).toUpperCase(),
      city: CITY_SCOPED_MOBILITIES.includes(dto.mobility)
        ? (dto.city as string).trim()
        : null,
      mobility: dto.mobility,
      careerStage: dto.careerStage,
      minSalary: dto.minSalary ?? null,
      horizon: dto.horizon,
    };
    const row = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return { preference: serialize(row) };
  }
}
