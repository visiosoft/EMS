import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

function toOptionalInt(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

/** POST dbo.EngagementRetailPartner — add a retail partnership to an engagement. */
export class CreateEngagementRetailPartnerDto {
  /** dbo.Company.CompanyID of the retail partner company (required) */
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  companyId!: number;

  /** dbo.CompanyType.CompanyTypeID (optional — filter/classify the company type) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  companyTypeId?: number | null;

  /** dbo.Contact.ContactID of the contact at that company (optional) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  contactId?: number | null;
}
