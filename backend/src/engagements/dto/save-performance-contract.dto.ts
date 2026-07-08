import { IsArray, IsDateString, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

function toOptionalDecimal(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** One performance/show date within a contract's schedule. */
export class PerformanceItemDto {
  @IsOptional()
  @IsString()
  date?: string | null;

  @IsOptional()
  @IsString()
  time?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  formatted?: string | null;
}

export class SavePerformanceContractDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  agency?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  agent?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  attraction?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  venueName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  venueAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  venueCity?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  venueState?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  venueCountry?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  producer?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  producerAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  producerFedId?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalDecimal(value))
  @IsNumber()
  guaranteeAmount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  guaranteeCurrency?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalDecimal(value))
  @IsNumber()
  depositAmount?: number | null;

  @IsOptional()
  @IsDateString()
  depositDueDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalDecimal(value))
  @IsNumber()
  balanceAmount?: number | null;

  @IsOptional()
  @IsDateString()
  balanceDueDate?: string | null;

  @IsOptional()
  @IsString()
  royaltyDescription?: string | null;

  @IsOptional()
  @IsString()
  overageDescription?: string | null;

  @IsOptional()
  @IsString()
  paymentTerms?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethodType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentPayableTo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentBankName?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceItemDto)
  performances?: PerformanceItemDto[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionallyInsured?: string[] | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  oneDrivePdfUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  originalFilename?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  annotatedPdfBlobName?: string | null;
}
