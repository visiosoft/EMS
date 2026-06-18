import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

function toOptionalInt(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : undefined;
}

export class UpdateIaeMarketingTeamDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  iaeMarketingDirectorContactId?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  iaeMarketingManagerContactId?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  iaeMarketingCoordinatorContactId?: number | null;
}
