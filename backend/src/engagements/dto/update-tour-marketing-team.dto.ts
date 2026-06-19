import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

function toOptionalInt(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : undefined;
}

export class UpdateTourMarketingTeamDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  tourMarketingDirectorContactId?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  tourMarketingManagerContactId?: number | null;
}
