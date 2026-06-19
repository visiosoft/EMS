import { IsOptional, IsString } from 'class-validator';

export class FolderQueryDto {
  @IsString()
  @IsOptional()
  path?: string;
}
