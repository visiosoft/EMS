import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CompanyServiceAreaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dmaid: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceProvidedId: number;
}

