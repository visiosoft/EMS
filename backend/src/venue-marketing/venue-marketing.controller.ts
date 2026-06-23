import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { VenueMarketingService } from './venue-marketing.service';
import { SaveVenueMarketingDto } from './dto/save-venue-marketing.dto';

@Controller('venue-marketing')
export class VenueMarketingController {
  constructor(private readonly venueMarketingService: VenueMarketingService) {}

  // ── Lookups ──────────────────────────────────────────────────────────────

  @Get('lookups/placement-categories')
  getPlacementCategories() {
    return this.venueMarketingService.getPlacementCategories();
  }

  @Get('lookups/mediums')
  getMediums() {
    return this.venueMarketingService.getMediums();
  }

  @Get('lookups/localization-options')
  getLocalizationOptions() {
    return this.venueMarketingService.getLocalizationOptions();
  }

  @Get('lookups/tag-options')
  getTagOptions() {
    return this.venueMarketingService.getTagOptions();
  }

  @Get('lookups/file-spec-options')
  getFileSpecOptions() {
    return this.venueMarketingService.getFileSpecOptions();
  }

  @Get('lookups/file-format-options')
  getFileFormatOptions() {
    return this.venueMarketingService.getFileFormatOptions();
  }

  // ── Venue-specific marketing data ────────────────────────────────────────

  @Get(':venueId')
  getVenueMarketing(@Param('venueId', ParseIntPipe) venueId: number) {
    return this.venueMarketingService.getVenueMarketing(venueId);
  }

  @Post(':venueId')
  @HttpCode(HttpStatus.OK)
  saveVenueMarketing(
    @Param('venueId', ParseIntPipe) venueId: number,
    @Body() dto: SaveVenueMarketingDto,
  ) {
    return this.venueMarketingService.saveVenueMarketing(venueId, dto);
  }

  @Delete(':venueId/specs/:specId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSpec(
    @Param('venueId', ParseIntPipe) venueId: number,
    @Param('specId', ParseIntPipe) specId: number,
  ) {
    return this.venueMarketingService.deleteSpec(venueId, specId);
  }
}
