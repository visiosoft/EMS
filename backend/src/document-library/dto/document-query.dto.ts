import { IsIn, IsOptional, IsString } from 'class-validator';
import type { DocumentSource } from '../document-library.service';

export class FolderQueryDto {
  @IsString()
  @IsOptional()
  path?: string;

  @IsIn(['sharepoint', 'onedrive'])
  @IsOptional()
  source?: DocumentSource;
}

export class DownloadQueryDto {
  @IsString()
  id!: string;

  @IsIn(['sharepoint', 'onedrive'])
  @IsOptional()
  source?: DocumentSource;
}
