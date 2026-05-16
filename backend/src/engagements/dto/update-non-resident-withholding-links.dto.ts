import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNonResidentWithholdingLinksDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  iaeWaiverInstructionsUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  artistWaiverInstructionsUrl?: string | null;
}
