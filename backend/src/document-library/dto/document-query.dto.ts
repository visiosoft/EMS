import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type { DocumentSource } from '../document-library.service';

export class FolderQueryDto {
  @IsString()
  @IsOptional()
  path?: string;

  @IsIn(['sharepoint', 'onedrive'])
  @IsOptional()
  source?: DocumentSource;

  /**
   * When true, returns the folder's full contents without the per-user ownership
   * filter. Used for shared engagement folders, which are team spaces rather than
   * personal libraries. Query strings arrive as 'true'/'false', so coerce them.
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  shared?: boolean;

  /**
   * When true (with source=onedrive), targets the CALLING user's own OneDrive instead of
   * the fixed ONEDRIVE_USER account — used by the Hub sidebar so each user sees their own files.
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  self?: boolean;
}

export class UploadBodyDto {
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

  /** When true (with source=onedrive), downloads from the CALLING user's own OneDrive. */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  self?: boolean;
}
