import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCertificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  description?: string;

  @IsNumber()
  platformId: number;

  @IsNumber()
  departmentId: number;

  @IsString()
  @IsNotEmpty()
  difficultyLevel: string; // Beginner, Intermediate, Advanced

  @IsNumber()
  @Min(0)
  pointsAwarded: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  estimatedDuration?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  externalCourseUrl: string;

  @IsString()
  @IsOptional()
  tags?: string; // comma-separated
}

export class UpdateCertificationDto {
  @IsString()
  @IsOptional()
  @MaxLength(300)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  description?: string;

  @IsNumber()
  @IsOptional()
  platformId?: number;

  @IsNumber()
  @IsOptional()
  departmentId?: number;

  @IsString()
  @IsOptional()
  difficultyLevel?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pointsAwarded?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  estimatedDuration?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  externalCourseUrl?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  status?: string; // Active, Archived
}

export class CreateSubmissionDto {
  @IsNumber()
  certificationId: number;

  @IsNumber()
  departmentId: number;

  @IsNumber()
  contactId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  certificationName: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  issuingOrganization?: string;

  @IsString()
  @IsNotEmpty()
  dateCompleted: string; // ISO date string

  @IsString()
  @IsOptional()
  @MaxLength(200)
  credentialId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  credentialUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  additionalNotes?: string;
}

export class ReviewSubmissionDto {
  @IsString()
  @IsNotEmpty()
  action: string; // VERIFIED, REJECTED

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  adminNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}
