import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function parseOptionalPositiveId(value: unknown): unknown {
  if (value === undefined || value === '' || value === null) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
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

export class CreateTourDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  tourName: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  attractionId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId: number;

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

  /** Required on create; multipart sends numbers as strings. */
  @Transform(({ value }) => parseOptionalPositiveId(value))
  @IsInt()
  @Min(1)
  talentAgencyCompanyId: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') return undefined;
    if (value === null) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 ? n : null;
  })
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
  @IsISO8601()
  tourStartDate?: string;

  @IsOptional()
  @IsISO8601()
  tourEndDate?: string;
}
