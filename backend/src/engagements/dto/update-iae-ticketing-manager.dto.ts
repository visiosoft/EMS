import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateIaeTicketingManagerDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === '') return null;
    if (value === undefined) return undefined;
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : undefined;
  })
  @IsInt()
  @Min(1)
  iaeTicketingManagerContactId?: number | null;
}
