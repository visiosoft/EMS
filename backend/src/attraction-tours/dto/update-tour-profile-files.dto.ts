import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * All fields are optional. Any field whose value is `undefined` will be
 * ignored; any explicitly-set field (including empty string / null → treated
 * as "clear") will be persisted.
 */
export class UpdateTourProfileFilesDto {
  // ── Text fields ────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seatHoldRequirements?: string | null;

  @IsOptional() @IsString() @MaxLength(1000) bookingDocumentTypes?: string | null;

  // ── Link URLs (paired with `*File` uploads and `*Name` display labels) ──
  @IsOptional() @IsString() @MaxLength(2048) techRiderUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) techRiderName?: string | null;

  @IsOptional() @IsString() @MaxLength(2048) dealSheetUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) dealSheetName?: string | null;

  @IsOptional() @IsString() @MaxLength(2048) agencySalesUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) agencySalesName?: string | null;

  @IsOptional() @IsString() @MaxLength(2048) stagehandListUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) stagehandListName?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) linesetScheduleUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) linesetScheduleName?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) cateringRiderUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) cateringRiderName?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) stageDimensionsUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) stageDimensionsName?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) travelRequirementsUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) travelRequirementsName?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) soundRequirementsUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) soundRequirementsName?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) videoRequirementsUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) videoRequirementsName?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) lightingRequirementsUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) lightingRequirementsName?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) heavyEquipmentRequirementsUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) heavyEquipmentRequirementsName?: string | null;

  @IsOptional() @IsString() @MaxLength(2048) marketingManualUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) marketingManualName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  marketingMaterialUrl?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  marketingMaterialName?: string | null;

  @IsOptional() @IsString() @MaxLength(2048) vipPdfUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) vipPdfName?: string | null;

  // ── "remove" flags (clears the link column) ────────────────────────────
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  removeTechRider?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  removeDealSheet?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  removeAgencySales?: boolean;

  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeStagehandList?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeLinesetSchedule?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeCateringRider?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeStageDimensions?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeTravelRequirements?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeSoundRequirements?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeVideoRequirements?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeLightingRequirements?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') removeHeavyEquipmentRequirements?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  removeMarketingManual?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  removeMarketingMaterial?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  removeVipPdf?: boolean;
}
