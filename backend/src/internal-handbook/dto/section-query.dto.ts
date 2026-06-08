import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SectionQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sectionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
