import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** One company link for a contact, with roles/departments scoped to that company. */
export class ContactCompanyAssignmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId: number;

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds: number[];

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  departmentIds: number[];
}

export class ManageContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cellPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  workPhone?: string | null;

  /**
   * Complete desired set of company links for this contact — one entry per company,
   * each carrying its own roles/departments. A contact can belong to multiple
   * companies at once (e.g. a Venue Management Company and one of its Venues); the
   * server replaces the contact's entire assignment set with exactly this list, so
   * callers must include every company the contact should keep, not just the one
   * being edited.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactCompanyAssignmentDto)
  assignments?: ContactCompanyAssignmentDto[];

  /** @deprecated Use `assignments`. Kept for older callers of this DTO shape. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId?: number | null;

  /** @deprecated Use `assignments`. */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds?: number[];

  /** @deprecated Use `assignments`. */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  departmentIds?: number[];
}

export class UpdateManagedContactDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cellPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  workPhone?: string | null;

  /** Same full-replace semantics as {@link ManageContactDto.assignments}. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactCompanyAssignmentDto)
  assignments?: ContactCompanyAssignmentDto[];

  /** @deprecated Use `assignments`. Kept for older callers of this DTO shape. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId?: number | null;

  /** @deprecated Use `assignments`. */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds?: number[];

  /** @deprecated Use `assignments`. */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  departmentIds?: number[];
}
