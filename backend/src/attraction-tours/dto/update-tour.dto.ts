import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export interface MediaMixEntry {
  advertisingSubTypeId: number;
  companyId: number | null;
}

function parseMediaMix(value: unknown): MediaMixEntry[] | unknown {
  if (value === undefined || value === null || value === '') return undefined;
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(raw)) return raw;
  const out: MediaMixEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const ast = Number(o.advertisingSubTypeId);
    if (!Number.isInteger(ast) || ast < 1) continue;
    const cid = Number(o.companyId);
    const companyId =
      o.companyId == null ||
      o.companyId === '' ||
      !Number.isInteger(cid) ||
      cid < 1
        ? null
        : cid;
    const key = `${ast}:${companyId ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ advertisingSubTypeId: ast, companyId });
  }
  return out;
}

function parsePositiveIdArray(value: unknown): number[] | unknown {
  if (value === undefined || value === null || value === '') return undefined;
  const raw =
    typeof value === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed) ? parsed : value.split(',');
          } catch {
            return value.split(',');
          }
        })()
      : value;
  if (!Array.isArray(raw)) return raw;
  return [
    ...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
  ];
}

export class UpdateTourDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tourName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(1)
  attractionId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(1)
  classId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  ascap?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  bmi?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  sesac?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  gmr?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  talentAgencyCompanyId?: number | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return null;
    return Number(value);
  })
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  tourManagementCompanyId?: number | null;

  @IsOptional()
  @Transform(({ value }) => parsePositiveIdArray(value))
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  talentAgentContactIds?: number[];

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsIn(['All', 'Male', 'Female'])
  audienceGender?: string | null;

  @IsOptional()
  @Transform(({ value }) => parsePositiveIdArray(value))
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  audienceAgeRangeIds?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  audienceAgeRange?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobName?: string | null;

  @IsOptional()
  @IsString()
  tourInsuranceLanguage?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 ? n : null;
  })
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  venueTypePreferenceId?: number | null;

  /** When true, clears Tour.BannerLinkID (multipart field). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  removeBanner?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseMediaMix(value))
  @IsArray()
  mediaMix?: MediaMixEntry[];

  @IsOptional()
  @IsISO8601()
  tourStartDate?: string | null;

  @IsOptional()
  @IsISO8601()
  tourEndDate?: string | null;
}
